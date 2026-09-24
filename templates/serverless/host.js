// Web Audio API Sound Synthesizer
class SoundFx {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
  }

  playBuzzer() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(440, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    osc2.frequency.setValueAtTime(445, now);
    osc2.frequency.exponentialRampToValueAtTime(890, now + 0.15);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  playCorrect() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);
      gain.gain.setValueAtTime(0, now + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.3, now + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.4);
    });
  }

  playWrong() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(130, now + 0.4);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  playActivate() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playChampionFanfare() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const notes = [
      { f: 392.00, t: 0, d: 0.16 },
      { f: 523.25, t: 0.16, d: 0.16 },
      { f: 659.25, t: 0.32, d: 0.16 },
      { f: 783.99, t: 0.48, d: 0.35 },
      { f: 659.25, t: 0.83, d: 0.14 },
      { f: 1046.50, t: 0.97, d: 1.2 }
    ];
    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      gain.gain.setValueAtTime(0, now + n.t);
      gain.gain.linearRampToValueAtTime(0.35, now + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d);
    });
  }
}

const sound = new SoundFx();

// Serverless State
let questions = null;
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

// Peer Connections Map
const studentConnections = {};

// Room Setup
const urlParams = new URLSearchParams(window.location.search);
const roomCode = (urlParams.get('sala') || Math.random().toString(36).substring(2, 6)).toUpperCase();
const hostPeerId = 'jeopardy-ia-' + roomCode.toLowerCase();

// DOM Elements
const boardGrid = document.getElementById('board-grid');
const teamsContainer = document.getElementById('teams-container');
const teamCount = document.getElementById('team-count');
const roomCodeDisplay = document.getElementById('room-code-display');
const studentUrlDisplay = document.getElementById('student-url-display');
const connDot = document.getElementById('conn-dot');
const toastEl = document.getElementById('toast');

// Modal Elements
const questionModal = document.getElementById('question-modal');
const modalCategory = document.getElementById('modal-category');
const modalPoints = document.getElementById('modal-points');
const modalQuestionText = document.getElementById('modal-question-text');
const buzzerBanner = document.getElementById('buzzer-status-banner');
const buzzerHeadline = document.getElementById('buzzer-headline');
const buzzerSubtext = document.getElementById('buzzer-subtext');
const buzzerReactionTime = document.getElementById('buzzer-reaction-time');
const teacherGuideBox = document.getElementById('teacher-guide-box');
const modalAnswerText = document.getElementById('modal-answer-text');
const modalGuideText = document.getElementById('modal-guide-text');

// Buttons
const btnActivateBuzzer = document.getElementById('btn-activate-buzzer');
const btnCorrect = document.getElementById('btn-correct');
const btnIncorrect = document.getElementById('btn-incorrect');
const btnToggleAnswer = document.getElementById('btn-toggle-answer');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnShowQr = document.getElementById('btn-show-qr');
const btnReset = document.getElementById('btn-reset');
const btnSoundToggle = document.getElementById('btn-sound-toggle');
const btnFullscreen = document.getElementById('btn-fullscreen');

// QR Modal
const qrModal = document.getElementById('qr-modal');
const qrContainer = document.getElementById('qr-container');
const qrUrlInput = document.getElementById('qr-url-input');
const btnCopyQrUrl = document.getElementById('btn-copy-qr-url');
const btnCloseQr = document.getElementById('btn-close-qr');

// Final Jeopardy
const btnFinalJeopardy = document.getElementById('btn-final-jeopardy');
const finalModal = document.getElementById('final-modal');
const finalCategory = document.getElementById('final-category');
const finalQuestionText = document.getElementById('final-question-text');
const finalGuideBox = document.getElementById('final-guide-box');
const finalAnswerText = document.getElementById('final-answer-text');
const btnFinalActivate = document.getElementById('btn-final-activate');
const btnFinalReveal = document.getElementById('btn-final-reveal');
const btnCloseFinal = document.getElementById('btn-close-final');

// Podium
const btnEndGame = document.getElementById('btn-end-game');
const podiumModal = document.getElementById('podium-modal');
const podiumStage = document.getElementById('podium-stage');
const otherTeamsList = document.getElementById('other-teams-list');
const btnClosePodium = document.getElementById('btn-close-podium');
const btnNewGame = document.getElementById('btn-new-game');

// Compute Student URL
const currentUrl = window.location.href.split('?')[0].replace('index.html', '');
const studentBuzzerUrl = `${currentUrl}${currentUrl.endsWith('/') ? '' : '/'}buzzer.html?sala=${roomCode}`;

roomCodeDisplay.textContent = roomCode;
studentUrlDisplay.textContent = studentBuzzerUrl;
qrUrlInput.value = studentBuzzerUrl;

// Generate QR Code
new QRCode(qrContainer, {
  text: studentBuzzerUrl,
  width: 250,
  height: 250,
  colorDark: "#0a192f",
  colorLight: "#ffffff"
});

// Toast
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 2800);
}

function copyStudentUrl() {
  const text = `🎮 Únete al Jeopardy con tu celular aquí: ${studentBuzzerUrl}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('¡Enlace copiado al portapapeles!');
  }).catch(() => {
    prompt('Copia este enlace para tus alumnos:', studentBuzzerUrl);
  });
}
btnCopyLink.addEventListener('click', copyStudentUrl);
btnCopyQrUrl.addEventListener('click', copyStudentUrl);

// Broadcast Helper
function broadcast(data) {
  Object.values(studentConnections).forEach(conn => {
    if (conn.open) {
      try { conn.send(data); } catch (e) {}
    }
  });
}

// Initialize PeerJS Host
let peer = null;
function initHostPeer() {
  peer = new Peer(hostPeerId, {
    debug: 1
  });

  peer.on('open', (id) => {
    connDot.style.background = '#10b981';
    connDot.style.boxShadow = '0 0 8px #10b981';
    console.log('Host PeerJS iniciado. ID de sala:', id);
  });

  peer.on('connection', (conn) => {
    let assignedTeamId = null;

    conn.on('data', (data) => {
      if (data.type === 'register') {
        const teamName = (data.name || '').trim();
        assignedTeamId = conn.peer;

        if (!gameState.teams[assignedTeamId]) {
          const colors = ['#e63946', '#2a9d8f', '#e76f51', '#457b9d', '#9b5de5', '#00bbf9', '#f15bb5', '#fee440'];
          const colorIdx = Object.keys(gameState.teams).length % colors.length;
          gameState.teams[assignedTeamId] = {
            id: assignedTeamId,
            name: teamName,
            score: 0,
            color: colors[colorIdx]
          };
        }

        studentConnections[assignedTeamId] = conn;
        renderTeams();

        // Send welcome
        conn.send({
          type: 'welcome',
          team: gameState.teams[assignedTeamId],
          gameState: {
            buzzerState: gameState.buzzerState,
            currentQuestion: gameState.currentQuestion ? { puntos: gameState.currentQuestion.puntos } : null
          }
        });

        // Broadcast updated team list
        broadcast({ type: 'teams-updated', teams: gameState.teams });
      }

      if (data.type === 'buzz') {
        if (gameState.buzzerState === 'active' && !gameState.attemptedTeams.includes(assignedTeamId)) {
          gameState.buzzerState = 'buzzed';
          const reactionMs = Date.now() - (gameState.buzzerActivatedAt || Date.now());
          const winner = gameState.teams[assignedTeamId];

          gameState.buzzedTeam = {
            teamId: assignedTeamId,
            teamName: winner.name,
            reactionMs: reactionMs
          };

          sound.playBuzzer();
          setBuzzerBannerBuzzed(gameState.buzzedTeam);
          btnCorrect.disabled = false;
          btnIncorrect.disabled = false;
          highlightTeamCard(assignedTeamId);

          broadcast({ type: 'team-buzzed', buzzedTeam: gameState.buzzedTeam });
        }
      }
    });

    conn.on('close', () => {
      if (assignedTeamId && studentConnections[assignedTeamId]) {
        delete studentConnections[assignedTeamId];
        renderTeams();
      }
    });
  });

  peer.on('error', (err) => {
    console.warn('PeerJS warning/error:', err);
    if (err.type === 'unavailable-id') {
      alert(`La sala ${roomCode} ya está en uso. Recarga para generar otra clave.`);
    }
  });
}

// Load Questions
fetch('preguntas.json')
  .then(res => res.json())
  .then(data => {
    questions = data;
    initBoard();
    renderBoard();
    initHostPeer();
  })
  .catch(err => {
    console.error('Error cargando preguntas.json:', err);
  });

function initBoard() {
  gameState.board = questions.categorias.map(cat => cat.preguntas.map(() => false));
  gameState.currentQuestion = null;
  gameState.buzzerState = 'idle';
}

function renderBoard() {
  if (!questions) return;
  boardGrid.innerHTML = '';

  questions.categorias.forEach((cat, catIdx) => {
    const col = document.createElement('div');
    col.className = 'category-column';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `<h2>${cat.nombre}</h2>`;
    col.appendChild(header);

    cat.preguntas.forEach((q, qIdx) => {
      const card = document.createElement('div');
      card.className = 'question-card';
      if (gameState.board[catIdx]?.[qIdx]) {
        card.classList.add('answered');
      }

      card.innerHTML = `<span class="points">$${q.puntos}</span>`;
      card.addEventListener('click', () => {
        if (!card.classList.contains('answered')) {
          openQuestion(catIdx, qIdx);
        }
      });
      col.appendChild(card);
    });

    boardGrid.appendChild(col);
  });
}

function openQuestion(catIdx, qIdx) {
  sound.init();
  const cat = questions.categorias[catIdx];
  const q = cat.preguntas[qIdx];

  gameState.currentQuestion = {
    catIndex: catIdx,
    qIndex: qIdx,
    categoria: cat.nombre,
    ...q
  };
  gameState.buzzerState = 'idle';
  gameState.buzzedTeam = null;
  gameState.attemptedTeams = [];

  modalCategory.textContent = cat.nombre;
  modalPoints.textContent = `$${q.puntos}`;
  modalQuestionText.textContent = q.pregunta;
  modalAnswerText.textContent = q.respuesta;
  modalGuideText.textContent = q.guia_docente;

  teacherGuideBox.classList.add('hidden');
  btnToggleAnswer.textContent = '👁️ Ver Respuesta [R]';
  setBuzzerBannerIdle();

  btnActivateBuzzer.disabled = false;
  btnCorrect.disabled = true;
  btnIncorrect.disabled = true;

  questionModal.classList.remove('hidden');

  broadcast({
    type: 'question-opened',
    categoria: cat.nombre,
    puntos: q.puntos,
    pregunta: q.pregunta
  });
}

// Activate Buzzer
btnActivateBuzzer.addEventListener('click', activateBuzzer);
function activateBuzzer() {
  gameState.buzzerState = 'active';
  gameState.buzzerActivatedAt = Date.now();
  gameState.buzzedTeam = null;

  sound.playActivate();
  setBuzzerBannerActive();

  btnActivateBuzzer.disabled = true;
  btnCorrect.disabled = true;
  btnIncorrect.disabled = true;

  broadcast({
    type: 'buzzer-activated',
    attemptedTeams: gameState.attemptedTeams
  });
}

// Judge Correct
btnCorrect.addEventListener('click', () => {
  if (!gameState.buzzedTeam) return;
  const teamId = gameState.buzzedTeam.teamId;
  const pts = gameState.currentQuestion.puntos === 'FINAL' ? 500 : gameState.currentQuestion.puntos;

  if (gameState.teams[teamId]) {
    gameState.teams[teamId].score += pts;
  }
  if (gameState.currentQuestion.catIndex !== undefined) {
    gameState.board[gameState.currentQuestion.catIndex][gameState.currentQuestion.qIndex] = true;
  }
  gameState.buzzerState = 'idle';

  sound.playCorrect();
  buzzerBanner.className = 'buzzer-banner state-active';
  buzzerHeadline.textContent = `¡RESPUESTA CORRECTA! (+${pts} pts)`;
  buzzerSubtext.textContent = 'Presiona "Volver al Tablero" para continuar.';
  btnCorrect.disabled = true;
  btnIncorrect.disabled = true;
  teacherGuideBox.classList.remove('hidden');

  renderTeams();
  renderBoard();

  broadcast({
    type: 'answer-judged',
    correct: true,
    teamId,
    points: pts,
    teams: gameState.teams
  });
});

// Judge Incorrect
btnIncorrect.addEventListener('click', () => {
  if (!gameState.buzzedTeam) return;
  const teamId = gameState.buzzedTeam.teamId;
  gameState.attemptedTeams.push(teamId);
  gameState.buzzedTeam = null;
  gameState.buzzerState = 'idle';

  sound.playWrong();
  buzzerBanner.className = 'buzzer-banner state-idle';
  buzzerHeadline.textContent = 'Respuesta Incorrecta';
  buzzerSubtext.textContent = 'Presiona "Activar Buzzer" para abrir el REBOTE a los demás equipos.';
  btnActivateBuzzer.disabled = false;
  btnCorrect.disabled = true;
  btnIncorrect.disabled = true;
  removeTeamHighlight();

  broadcast({
    type: 'answer-judged',
    correct: false,
    teamId,
    attemptedTeams: gameState.attemptedTeams
  });
});

// Close Question
btnCloseModal.addEventListener('click', () => {
  gameState.currentQuestion = null;
  gameState.buzzerState = 'idle';
  gameState.buzzedTeam = null;
  gameState.attemptedTeams = [];
  questionModal.classList.add('hidden');
  removeTeamHighlight();
  renderBoard();
  broadcast({ type: 'question-closed' });
});

// Toggle Answer
btnToggleAnswer.addEventListener('click', () => {
  teacherGuideBox.classList.toggle('hidden');
  btnToggleAnswer.textContent = teacherGuideBox.classList.contains('hidden') ? '👁️ Ver Respuesta [R]' : '🙈 Ocultar Respuesta [R]';
});

// Scoreboard
function renderTeams() {
  const ids = Object.keys(gameState.teams);
  teamCount.textContent = ids.length;

  if (ids.length === 0) {
    teamsContainer.innerHTML = '<div class="empty-teams-msg">Esperando a que los alumnos se unan desde sus móviles...</div>';
    return;
  }

  teamsContainer.innerHTML = '';
  ids.forEach(id => {
    const t = gameState.teams[id];
    const card = document.createElement('div');
    card.className = 'team-card';
    card.id = `team-card-${id}`;
    card.innerHTML = `
      <div class="team-avatar" style="background: ${t.color}">${t.name.substring(0, 2).toUpperCase()}</div>
      <div class="team-info">
        <div class="team-name" title="${t.name}">${t.name}</div>
        <div class="team-score">${t.score}</div>
      </div>
      <div class="team-score-controls">
        <button class="btn-score-adjust" onclick="adjustScore('${id}', 100)">+</button>
        <button class="btn-score-adjust" onclick="adjustScore('${id}', -100)">-</button>
      </div>
    `;
    teamsContainer.appendChild(card);
  });
}

window.adjustScore = function(teamId, delta) {
  if (gameState.teams[teamId]) {
    gameState.teams[teamId].score += delta;
    renderTeams();
    broadcast({ type: 'teams-updated', teams: gameState.teams });
  }
};

function highlightTeamCard(teamId) {
  removeTeamHighlight();
  const el = document.getElementById(`team-card-${teamId}`);
  if (el) el.classList.add('buzzed');
}
function removeTeamHighlight() {
  document.querySelectorAll('.team-card').forEach(c => c.classList.remove('buzzed'));
}

// Buzzer Banner Helpers
function setBuzzerBannerIdle() {
  buzzerBanner.className = 'buzzer-banner state-idle';
  buzzerBanner.querySelector('.buzzer-status-icon').textContent = '⏸️';
  buzzerHeadline.textContent = 'Buzzer en Espera';
  buzzerSubtext.textContent = 'Lee la pregunta a la clase y presiona "Activar Buzzer".';
  buzzerReactionTime.classList.add('hidden');
}

function setBuzzerBannerActive() {
  buzzerBanner.className = 'buzzer-banner state-active';
  buzzerBanner.querySelector('.buzzer-status-icon').textContent = '⚡';
  buzzerHeadline.textContent = '¡BUZZER HABILITADO!';
  buzzerSubtext.textContent = 'Esperando a que los alumnos pulsen en sus celulares...';
  buzzerReactionTime.classList.add('hidden');
}

function setBuzzerBannerBuzzed(teamData) {
  buzzerBanner.className = 'buzzer-banner state-buzzed';
  buzzerBanner.querySelector('.buzzer-status-icon').textContent = '🚨';
  buzzerHeadline.textContent = `¡${teamData.teamName.toUpperCase()} PULSÓ PRIMERO!`;
  buzzerSubtext.textContent = 'Dale la palabra para que responda.';
  const seconds = (teamData.reactionMs / 1000).toFixed(2);
  buzzerReactionTime.textContent = `${seconds}s`;
  buzzerReactionTime.classList.remove('hidden');
}

// Modals toggling
btnShowQr.addEventListener('click', () => qrModal.classList.remove('hidden'));
btnCloseQr.addEventListener('click', () => qrModal.classList.add('hidden'));

// Final Jeopardy
btnFinalJeopardy.addEventListener('click', () => {
  if (confirm('¿Deseas iniciar la ronda de FINAL JEOPARDY?')) {
    gameState.isFinalJeopardy = true;
    finalCategory.textContent = questions.final_jeopardy.categoria;
    finalQuestionText.textContent = questions.final_jeopardy.pregunta;
    finalAnswerText.textContent = questions.final_jeopardy.respuesta_esperada;
    finalGuideBox.classList.add('hidden');
    finalModal.classList.remove('hidden');
    broadcast({ type: 'final-jeopardy-started' });
  }
});
btnFinalActivate.addEventListener('click', activateBuzzer);
btnFinalReveal.addEventListener('click', () => finalGuideBox.classList.toggle('hidden'));
btnCloseFinal.addEventListener('click', () => finalModal.classList.add('hidden'));

// Podium & Confetti
let confettiAnimationId = null;
function startConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const pieces = [];
  const colors = ['#ffd700', '#ff4d4d', '#00e676', '#00b0ff', '#e040fb', '#ffffff', '#ff9100'];

  for (let i = 0; i < 160; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 11 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3.5 + 2.5,
      speedX: Math.random() * 2.5 - 1.25,
      rotation: Math.random() * 360,
      rotSpeed: Math.random() * 8 - 4
    });
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;
      if (p.y > canvas.height) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    confettiAnimationId = requestAnimationFrame(loop);
  }
  loop();
}

function stopConfetti() {
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }
  const canvas = document.getElementById('confetti-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

btnEndGame.addEventListener('click', () => {
  const sorted = Object.values(gameState.teams).sort((a, b) => b.score - a.score);
  if (sorted.length === 0) {
    alert('No hay equipos registrados para mostrar el podio.');
    return;
  }
  if (confirm('¿Deseas finalizar la partida y mostrar el PODIO DE GANADORES a toda la clase?')) {
    const ranking = sorted.map((t, idx) => ({ ...t, rank: idx + 1 }));

    sound.playChampionFanfare();
    startConfetti();

    podiumStage.innerHTML = '';
    const top3 = ranking.slice(0, 3);
    top3.forEach(t => {
      const pillar = document.createElement('div');
      pillar.className = `podium-pillar pillar-${t.rank}`;
      const medal = t.rank === 1 ? '🥇' : (t.rank === 2 ? '🥈' : '🥉');
      pillar.innerHTML = `
        <div class="podium-team-badge">
          <div class="podium-avatar" style="background: ${t.color}">${t.name.substring(0, 2).toUpperCase()}</div>
          <div class="podium-name" title="${t.name}">${medal} ${t.name}</div>
          <div class="podium-score">${t.score} pts</div>
        </div>
        <div class="pillar-block">
          <span class="rank-number">#${t.rank}</span>
        </div>
      `;
      podiumStage.appendChild(pillar);
    });

    otherTeamsList.innerHTML = '';
    const others = ranking.slice(3);
    if (others.length > 0) {
      others.forEach(t => {
        const chip = document.createElement('div');
        chip.className = 'other-team-chip';
        chip.innerHTML = `<span>#${t.rank}</span> <span>${t.name}:</span> <strong>${t.score} pts</strong>`;
        otherTeamsList.appendChild(chip);
      });
    }

    podiumModal.classList.remove('hidden');
    broadcast({ type: 'game-ended', ranking });
  }
});

btnClosePodium.addEventListener('click', () => {
  stopConfetti();
  podiumModal.classList.add('hidden');
});

btnNewGame.addEventListener('click', () => {
  stopConfetti();
  podiumModal.classList.add('hidden');
  resetGame();
});

btnReset.addEventListener('click', () => {
  if (confirm('¿Reiniciar la partida y puntajes?')) {
    resetGame();
  }
});

function resetGame() {
  initBoard();
  Object.keys(gameState.teams).forEach(id => gameState.teams[id].score = 0);
  renderTeams();
  renderBoard();
  showToast('Partida reiniciada.');
  broadcast({ type: 'game-reset' });
}

// Sound & Fullscreen
btnSoundToggle.addEventListener('click', () => {
  sound.muted = !sound.muted;
  btnSoundToggle.textContent = sound.muted ? '🔇' : '🔊';
});
btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen().catch(() => {});
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  if (!questionModal.classList.contains('hidden')) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!btnActivateBuzzer.disabled) activateBuzzer();
    } else if (e.code === 'KeyC') {
      if (!btnCorrect.disabled) btnCorrect.click();
    } else if (e.code === 'KeyX') {
      if (!btnIncorrect.disabled) btnIncorrect.click();
    } else if (e.code === 'KeyR') {
      btnToggleAnswer.click();
    } else if (e.code === 'Escape') {
      btnCloseModal.click();
    }
  }
});
