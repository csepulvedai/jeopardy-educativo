// Web Audio API Sound Synthesizer (Zero external dependencies)
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
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    
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
      { f: 392.00, t: 0, d: 0.16 },    // G4
      { f: 523.25, t: 0.16, d: 0.16 }, // C5
      { f: 659.25, t: 0.32, d: 0.16 }, // E5
      { f: 783.99, t: 0.48, d: 0.35 }, // G5
      { f: 659.25, t: 0.83, d: 0.14 }, // E5
      { f: 1046.50, t: 0.97, d: 1.2 }  // C6 (Triumphant final chord)
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

// Socket and State
const socket = io();
let questions = null;
let currentGameState = null;
let activeConnectionUrl = '';

// DOM Elements
const boardGrid = document.getElementById('board-grid');
const teamsContainer = document.getElementById('teams-container');
const teamCount = document.getElementById('team-count');
const connStatusText = document.getElementById('conn-status-text');
const activeUrlText = document.getElementById('active-url-text');
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
const btnCopyZoom = document.getElementById('btn-copy-zoom');
const btnShowQr = document.getElementById('btn-show-qr');
const btnReset = document.getElementById('btn-reset');
const btnSoundToggle = document.getElementById('btn-sound-toggle');
const btnFullscreen = document.getElementById('btn-fullscreen');

// QR Modal Elements
const qrModal = document.getElementById('qr-modal');
const qrCodeImg = document.getElementById('qr-code-img');
const qrUrlInput = document.getElementById('qr-url-input');
const btnCopyQrUrl = document.getElementById('btn-copy-qr-url');
const btnCloseQr = document.getElementById('btn-close-qr');

// Final Jeopardy Elements
const btnFinalJeopardy = document.getElementById('btn-final-jeopardy');
const finalModal = document.getElementById('final-modal');
const finalCategory = document.getElementById('final-category');
const finalQuestionText = document.getElementById('final-question-text');
const finalGuideBox = document.getElementById('final-guide-box');
const finalAnswerText = document.getElementById('final-answer-text');
const btnFinalActivate = document.getElementById('btn-final-activate');
const btnFinalReveal = document.getElementById('btn-final-reveal');
const btnCloseFinal = document.getElementById('btn-close-final');

// Toast
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2800);
}

// Copy URL for Zoom chat
function copyZoomMessage() {
  if (!activeConnectionUrl) return;
  const text = `🎮 Únanse al Jeopardy con su celular aquí: ${activeConnectionUrl}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('¡Enlace de Zoom copiado al portapapeles!');
  }).catch(() => {
    prompt('Copia este enlace para el chat de Zoom:', text);
  });
}

btnCopyZoom.addEventListener('click', copyZoomMessage);
btnCopyQrUrl.addEventListener('click', copyZoomMessage);

// Socket Event Handlers
socket.on('connect', () => {
  connStatusText.textContent = 'En línea (Servidor activo)';
  socket.emit('join-host');
});

socket.on('init-host', (data) => {
  questions = data.questions;
  currentGameState = data.gameState;
  renderBoard();
  renderTeams(currentGameState.teams);
  updateConnectionInfo(data.connectionInfo);
});

socket.on('connection-updated', (data) => {
  updateConnectionInfo(data);
});

socket.on('teams-updated', (teams) => {
  renderTeams(teams);
});

function updateConnectionInfo(info) {
  if (info.publicUrl) {
    activeConnectionUrl = info.publicUrl;
    activeUrlText.textContent = info.publicUrl;
  } else if (info.activeBuzzerUrl) {
    activeConnectionUrl = info.activeBuzzerUrl;
    activeUrlText.textContent = info.activeBuzzerUrl;
  }

  if (info.qrCodeDataUrl) {
    qrCodeImg.src = info.qrCodeDataUrl;
    qrUrlInput.value = activeConnectionUrl;
  }
}

// Render the 5x5 Board
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
      const isAnswered = currentGameState?.board?.[catIdx]?.[qIdx];
      if (isAnswered) {
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

// Open Question
function openQuestion(catIdx, qIdx) {
  sound.init();
  socket.emit('open-question', { catIndex: catIdx, qIndex: qIdx });
}

socket.on('question-opened', (data) => {
  modalCategory.textContent = data.categoria;
  modalPoints.textContent = `$${data.puntos}`;
  modalQuestionText.textContent = data.pregunta;

  const qData = questions.categorias[data.catIndex].preguntas[data.qIndex];
  modalAnswerText.textContent = qData.respuesta;
  modalGuideText.textContent = qData.guia_docente;

  teacherGuideBox.classList.add('hidden');
  btnToggleAnswer.textContent = '👁️ Ver Respuesta [R]';
  setBuzzerBannerIdle();

  btnActivateBuzzer.disabled = false;
  btnCorrect.disabled = true;
  btnIncorrect.disabled = true;

  questionModal.classList.remove('hidden');
});

// Activate Buzzer
btnActivateBuzzer.addEventListener('click', () => {
  socket.emit('activate-buzzer');
});

socket.on('buzzer-activated', () => {
  sound.playActivate();
  setBuzzerBannerActive();
  btnActivateBuzzer.disabled = true;
  btnCorrect.disabled = true;
  btnIncorrect.disabled = true;
});

// Team Buzzed
socket.on('team-buzzed', (buzzedData) => {
  sound.playBuzzer();
  setBuzzerBannerBuzzed(buzzedData);
  btnCorrect.disabled = false;
  btnIncorrect.disabled = false;
  highlightTeamCard(buzzedData.teamId);
});

// Judge Answer
btnCorrect.addEventListener('click', () => {
  socket.emit('judge-answer', { correct: true });
});

btnIncorrect.addEventListener('click', () => {
  socket.emit('judge-answer', { correct: false });
});

socket.on('answer-judged', (data) => {
  currentGameState.board = data.board;
  renderTeams(data.teams);
  renderBoard();

  if (data.correct) {
    sound.playCorrect();
    buzzerBanner.className = 'buzzer-banner state-active';
    buzzerHeadline.textContent = `¡RESPUESTA CORRECTA! (+${data.points} pts)`;
    buzzerSubtext.textContent = 'Presiona "Volver al Tablero" para continuar.';
    btnCorrect.disabled = true;
    btnIncorrect.disabled = true;
    teacherGuideBox.classList.remove('hidden');
  } else {
    sound.playWrong();
    buzzerBanner.className = 'buzzer-banner state-idle';
    buzzerHeadline.textContent = 'Respuesta Incorrecta';
    buzzerSubtext.textContent = 'Presiona "Activar Buzzer" para abrir el REBOTE a los demás equipos.';
    btnActivateBuzzer.disabled = false;
    btnCorrect.disabled = true;
    btnIncorrect.disabled = true;
    removeTeamHighlight();
  }
});

// Answer Toggle
btnToggleAnswer.addEventListener('click', () => {
  teacherGuideBox.classList.toggle('hidden');
  const isHidden = teacherGuideBox.classList.contains('hidden');
  btnToggleAnswer.textContent = isHidden ? '👁️ Ver Respuesta [R]' : '🙈 Ocultar Respuesta [R]';
});

// Close Modal
btnCloseModal.addEventListener('click', () => {
  socket.emit('close-question');
});

socket.on('question-closed', (data) => {
  currentGameState.board = data.board;
  questionModal.classList.add('hidden');
  removeTeamHighlight();
  renderBoard();
});

// Buzzer Banner State Setters
function setBuzzerBannerIdle() {
  buzzerBanner.className = 'buzzer-banner state-idle';
  buzzerBanner.querySelector('.buzzer-status-icon').textContent = '⏸️';
  buzzerHeadline.textContent = 'Buzzer en Espera';
  buzzerSubtext.textContent = 'Lee la pregunta en Zoom y presiona "Activar Buzzer".';
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
  buzzerSubtext.textContent = 'Dale la palabra en Zoom para que responda con su micrófono.';
  
  const seconds = (teamData.reactionMs / 1000).toFixed(2);
  buzzerReactionTime.textContent = `${seconds}s`;
  buzzerReactionTime.classList.remove('hidden');
}

// Render Scoreboard Teams
function renderTeams(teams) {
  const teamIds = Object.keys(teams || {});
  teamCount.textContent = teamIds.length;

  if (teamIds.length === 0) {
    teamsContainer.innerHTML = '<div class="empty-teams-msg">Esperando a que los alumnos se unan desde sus móviles...</div>';
    return;
  }

  teamsContainer.innerHTML = '';
  teamIds.forEach(id => {
    const t = teams[id];
    const card = document.createElement('div');
    card.className = 'team-card';
    card.id = `team-card-${id}`;

    card.innerHTML = `
      <div class="team-avatar" style="background: ${t.color}">
        ${t.name.substring(0, 2).toUpperCase()}
      </div>
      <div class="team-info">
        <div class="team-name" title="${t.name}">${t.name}</div>
        <div class="team-score">${t.score}</div>
      </div>
      <div class="team-score-controls">
        <button class="btn-score-adjust" onclick="adjustScore('${id}', 100)" title="+100">+</button>
        <button class="btn-score-adjust" onclick="adjustScore('${id}', -100)" title="-100">-</button>
      </div>
    `;
    teamsContainer.appendChild(card);
  });
}

window.adjustScore = function(teamId, delta) {
  socket.emit('adjust-score', { teamId, delta });
};

function highlightTeamCard(teamId) {
  removeTeamHighlight();
  const el = document.getElementById(`team-card-${teamId}`);
  if (el) el.classList.add('buzzed');
}

function removeTeamHighlight() {
  document.querySelectorAll('.team-card').forEach(c => c.classList.remove('buzzed'));
}

// QR Modal toggling
btnShowQr.addEventListener('click', () => {
  qrModal.classList.remove('hidden');
});
btnCloseQr.addEventListener('click', () => {
  qrModal.classList.add('hidden');
});

// Final Jeopardy
btnFinalJeopardy.addEventListener('click', () => {
  if (confirm('¿Deseas iniciar la ronda de FINAL JEOPARDY?')) {
    socket.emit('start-final-jeopardy');
  }
});

socket.on('final-jeopardy-started', (data) => {
  finalCategory.textContent = data.categoria;
  finalQuestionText.textContent = data.pregunta;
  finalAnswerText.textContent = data.respuesta_esperada;
  finalGuideBox.classList.add('hidden');
  finalModal.classList.remove('hidden');
});

btnFinalActivate.addEventListener('click', () => {
  socket.emit('activate-buzzer');
});
btnFinalReveal.addEventListener('click', () => {
  finalGuideBox.classList.toggle('hidden');
});
btnCloseFinal.addEventListener('click', () => {
  finalModal.classList.add('hidden');
});

// Game Reset
btnReset.addEventListener('click', () => {
  if (confirm('¿Estás seguro de reiniciar los puntajes y el tablero para una nueva partida?')) {
    socket.emit('reset-game');
  }
});

socket.on('game-reset', (data) => {
  currentGameState.board = data.board;
  renderTeams(data.teams);
  renderBoard();
  showToast('Partida reiniciada.');
});

// Sound and Fullscreen
btnSoundToggle.addEventListener('click', () => {
  sound.muted = !sound.muted;
  btnSoundToggle.textContent = sound.muted ? '🔇' : '🔊';
  showToast(sound.muted ? 'Sonido silenciado' : 'Sonido activado');
});

btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  if (!questionModal.classList.contains('hidden')) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!btnActivateBuzzer.disabled) {
        socket.emit('activate-buzzer');
      }
    } else if (e.code === 'KeyC') {
      if (!btnCorrect.disabled) {
        socket.emit('judge-answer', { correct: true });
      }
    } else if (e.code === 'KeyX') {
      if (!btnIncorrect.disabled) {
        socket.emit('judge-answer', { correct: false });
      }
    } else if (e.code === 'KeyR') {
      btnToggleAnswer.click();
    } else if (e.code === 'Escape') {
      btnCloseModal.click();
    }
  }
});

// Confetti Particle System
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

// Podium Controls
const btnEndGame = document.getElementById('btn-end-game');
const podiumModal = document.getElementById('podium-modal');
const podiumStage = document.getElementById('podium-stage');
const otherTeamsList = document.getElementById('other-teams-list');
const btnClosePodium = document.getElementById('btn-close-podium');
const btnNewGame = document.getElementById('btn-new-game');

if (btnEndGame) {
  btnEndGame.addEventListener('click', () => {
    if (confirm('¿Deseas finalizar la partida y mostrar el PODIO DE GANADORES a toda la clase?')) {
      socket.emit('end-game');
    }
  });
}

socket.on('game-ended', ({ ranking }) => {
  if (!ranking || ranking.length === 0) {
    alert('No hay equipos registrados para mostrar el podio.');
    return;
  }

  sound.playChampionFanfare();
  startConfetti();

  // Render top 3
  podiumStage.innerHTML = '';
  const top3 = ranking.slice(0, 3);
  
  // Arrange top3 in visual order: 2nd (left), 1st (center), 3rd (right)
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

  // Render 4th and beyond
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
});

if (btnClosePodium) {
  btnClosePodium.addEventListener('click', () => {
    stopConfetti();
    podiumModal.classList.add('hidden');
  });
}

if (btnNewGame) {
  btnNewGame.addEventListener('click', () => {
    stopConfetti();
    podiumModal.classList.add('hidden');
    socket.emit('reset-game');
  });
}
