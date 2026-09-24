const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Load questions
let questionsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'preguntas.json'), 'utf8'));

// Server state
let gameState = {
  teams: {},
  board: [],
  currentQuestion: null,
  buzzerState: 'idle',
  buzzerActivatedAt: null,
  buzzedTeam: null,
  attemptedTeams: [],
  isFinalJeopardy: false
};

// Initialize board state
function initBoard() {
  gameState.board = questionsData.categorias.map(cat => cat.preguntas.map(() => false));
  gameState.currentQuestion = null;
  gameState.buzzerState = 'idle';
  gameState.buzzedTeam = null;
  gameState.attemptedTeams = [];
  gameState.isFinalJeopardy = false;
}
initBoard();

// Network IPs
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();
let publicUrl = null;
let localBuzzerUrl = `http://${localIp}:${PORT}/buzzer`;
let activeBuzzerUrl = localBuzzerUrl;
let qrCodeDataUrl = null;
let cfProcess = null;

async function updateQr(targetUrl) {
  try {
    qrCodeDataUrl = await QRCode.toDataURL(targetUrl, {
      margin: 2,
      width: 300,
      color: {
        dark: '#0a192f',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Error generando QR:', err);
  }
}
updateQr(localBuzzerUrl);

// Middleware & Routes
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Explicit route handlers
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/buzzer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'buzzer.html'));
});

// API Routes
app.get('/api/connection-info', (req, res) => {
  res.json({
    localIp,
    port: PORT,
    localBuzzerUrl,
    publicUrl: publicUrl ? `${publicUrl}/buzzer` : null,
    activeBuzzerUrl,
    qrCodeDataUrl
  });
});

app.get('/api/questions', (req, res) => {
  res.json(questionsData);
});

app.get('/api/state', (req, res) => {
  res.json({
    teams: gameState.teams,
    board: gameState.board,
    currentQuestion: gameState.currentQuestion,
    buzzerState: gameState.buzzerState,
    buzzedTeam: gameState.buzzedTeam,
    attemptedTeams: gameState.attemptedTeams,
    isFinalJeopardy: gameState.isFinalJeopardy
  });
});

// Socket.io handlers
io.on('connection', (socket) => {
  // Join Host
  socket.on('join-host', () => {
    socket.join('host');
    socket.emit('init-host', {
      questions: questionsData,
      gameState,
      connectionInfo: {
        localIp,
        port: PORT,
        localBuzzerUrl,
        publicUrl: publicUrl ? `${publicUrl}/buzzer` : null,
        activeBuzzerUrl,
        qrCodeDataUrl
      }
    });
  });

  // Student register team
  socket.on('register-team', (data) => {
    const teamName = (data.name || '').trim();
    if (!teamName) return;

    let existingId = Object.keys(gameState.teams).find(
      id => gameState.teams[id].name.toLowerCase() === teamName.toLowerCase()
    );

    let teamId = existingId || socket.id;
    if (!gameState.teams[teamId]) {
      const colors = ['#e63946', '#2a9d8f', '#e76f51', '#457b9d', '#9b5de5', '#00bbf9', '#f15bb5', '#fee440'];
      const colorIndex = Object.keys(gameState.teams).length % colors.length;
      gameState.teams[teamId] = {
        id: teamId,
        name: teamName,
        score: 0,
        color: colors[colorIndex],
        connected: true
      };
    } else {
      gameState.teams[teamId].connected = true;
    }

    socket.teamId = teamId;
    socket.join('team-' + teamId);

    socket.emit('team-registered', {
      team: gameState.teams[teamId],
      gameState: {
        buzzerState: gameState.buzzerState,
        buzzedTeam: gameState.buzzedTeam,
        isAttempted: gameState.attemptedTeams.includes(teamId),
        currentQuestionPoints: gameState.currentQuestion ? gameState.currentQuestion.puntos : null
      }
    });

    io.emit('teams-updated', gameState.teams);
  });

  // Host opens a question
  socket.on('open-question', ({ catIndex, qIndex }) => {
    const cat = questionsData.categorias[catIndex];
    if (!cat || !cat.preguntas[qIndex]) return;

    gameState.currentQuestion = {
      catIndex,
      qIndex,
      categoria: cat.nombre,
      ...cat.preguntas[qIndex]
    };
    gameState.buzzerState = 'idle';
    gameState.buzzedTeam = null;
    gameState.attemptedTeams = [];
    gameState.buzzerActivatedAt = null;

    io.emit('question-opened', {
      categoria: cat.nombre,
      puntos: cat.preguntas[qIndex].puntos,
      pregunta: cat.preguntas[qIndex].pregunta,
      catIndex,
      qIndex
    });
  });

  // Host activates the buzzer
  socket.on('activate-buzzer', () => {
    if (!gameState.currentQuestion && !gameState.isFinalJeopardy) return;

    gameState.buzzerState = 'active';
    gameState.buzzerActivatedAt = Date.now();
    gameState.buzzedTeam = null;

    io.emit('buzzer-activated', {
      attemptedTeams: gameState.attemptedTeams,
      timestamp: gameState.buzzerActivatedAt
    });
  });

  // Student presses buzzer
  socket.on('press-buzzer', () => {
    const teamId = socket.teamId;
    if (!teamId || !gameState.teams[teamId]) return;

    if (gameState.buzzerState === 'active' && !gameState.attemptedTeams.includes(teamId)) {
      gameState.buzzerState = 'buzzed';
      const reactionMs = Date.now() - (gameState.buzzerActivatedAt || Date.now());
      
      gameState.buzzedTeam = {
        teamId: teamId,
        teamName: gameState.teams[teamId].name,
        color: gameState.teams[teamId].color,
        reactionMs: reactionMs
      };

      io.emit('team-buzzed', gameState.buzzedTeam);
    }
  });

  // Host judges answer
  socket.on('judge-answer', ({ correct }) => {
    if (!gameState.currentQuestion || !gameState.buzzedTeam) return;

    const teamId = gameState.buzzedTeam.teamId;
    const points = gameState.currentQuestion.puntos === 'FINAL' ? 500 : gameState.currentQuestion.puntos;

    if (correct) {
      if (gameState.teams[teamId]) {
        gameState.teams[teamId].score += points;
      }
      if (gameState.currentQuestion.catIndex !== undefined) {
        gameState.board[gameState.currentQuestion.catIndex][gameState.currentQuestion.qIndex] = true;
      }
      gameState.buzzerState = 'idle';

      io.emit('answer-judged', {
        correct: true,
        teamId,
        points,
        teams: gameState.teams,
        board: gameState.board,
        respuesta: gameState.currentQuestion.respuesta
      });
    } else {
      gameState.attemptedTeams.push(teamId);
      gameState.buzzedTeam = null;
      gameState.buzzerState = 'idle';

      io.emit('answer-judged', {
        correct: false,
        teamId,
        points: 0,
        teams: gameState.teams,
        board: gameState.board,
        attemptedTeams: gameState.attemptedTeams
      });
    }
  });

  // Host closes question modal
  socket.on('close-question', () => {
    gameState.currentQuestion = null;
    gameState.buzzerState = 'idle';
    gameState.buzzedTeam = null;
    gameState.attemptedTeams = [];
    io.emit('question-closed', { board: gameState.board });
  });

  // Manual score adjust
  socket.on('adjust-score', ({ teamId, delta }) => {
    if (gameState.teams[teamId]) {
      gameState.teams[teamId].score += delta;
      io.emit('teams-updated', gameState.teams);
    }
  });

  // Reset game
  socket.on('reset-game', () => {
    initBoard();
    Object.keys(gameState.teams).forEach(id => {
      gameState.teams[id].score = 0;
    });
    io.emit('game-reset', {
      teams: gameState.teams,
      board: gameState.board
    });
  });

  // Host ends game and proclaims winner
  socket.on('end-game', () => {
    const sorted = Object.values(gameState.teams).sort((a, b) => b.score - a.score);
    const ranking = sorted.map((t, idx) => ({
      ...t,
      rank: idx + 1
    }));
    io.emit('game-ended', { ranking });
  });

  // Final Jeopardy
  socket.on('start-final-jeopardy', () => {
    gameState.isFinalJeopardy = true;
    gameState.currentQuestion = {
      categoria: questionsData.final_jeopardy.categoria,
      pregunta: questionsData.final_jeopardy.pregunta,
      respuesta: questionsData.final_jeopardy.respuesta_esperada,
      puntos: 'FINAL'
    };
    gameState.buzzerState = 'idle';
    gameState.buzzedTeam = null;
    io.emit('final-jeopardy-started', questionsData.final_jeopardy);
  });

  socket.on('disconnect', () => {
    if (socket.teamId && gameState.teams[socket.teamId]) {
      gameState.teams[socket.teamId].connected = false;
      io.emit('teams-updated', gameState.teams);
    }
  });
});

// Clean exit
function cleanup() {
  if (cfProcess) {
    try { cfProcess.kill(); } catch (e) {}
  }
  process.exit();
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// Start Server & Cloudflare Tunnel
server.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`🎓 JEOPARDY EDUCATIVO: IA EN PROCESOS EVALUATIVOS`);
  console.log(`======================================================`);
  console.log(`🖥️  Pantalla del Docente (Proyector/Zoom):`);
  console.log(`    👉 http://localhost:${PORT}`);
  console.log(`📱 Vista Alumnos (Red Local):`);
  console.log(`    👉 ${localBuzzerUrl}`);
  console.log(`------------------------------------------------------`);
  console.log(`Conectando túnel seguro de Cloudflare para Zoom...`);

  const cfPath = path.join(__dirname, 'cloudflared.exe');
  if (fs.existsSync(cfPath)) {
    cfProcess = spawn(cfPath, ['tunnel', '--url', `http://localhost:${PORT}`]);

    cfProcess.stderr.on('data', async (data) => {
      const output = data.toString();
      const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !publicUrl) {
        publicUrl = match[0];
        activeBuzzerUrl = `${publicUrl}/buzzer`;
        await updateQr(activeBuzzerUrl);

        console.log(`\n🌍 ¡ENLACE DIRECTO PARA ZOOM LISTO (SIN CLAVES NI AVISOS)!`);
        console.log(`    👉 ${activeBuzzerUrl}`);
        console.log(`    (Copia y pega este enlace en el chat de Zoom)\n`);
        console.log(`======================================================\n`);

        io.to('host').emit('connection-updated', {
          publicUrl: activeBuzzerUrl,
          qrCodeDataUrl
        });
      }
    });

    cfProcess.on('error', (err) => {
      console.error('Error al ejecutar cloudflared:', err.message);
    });
  } else {
    console.log('cloudflared.exe no encontrado. Usando enlace local.');
  }
});
