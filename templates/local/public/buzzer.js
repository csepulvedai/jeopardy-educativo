const socket = io();

// State
let myTeam = null;
let currentBuzzerState = 'idle';

// DOM Elements
const screenRegister = document.getElementById('screen-register');
const screenBuzzer = document.getElementById('screen-buzzer');
const formRegister = document.getElementById('form-register');
const inputTeamName = document.getElementById('input-team-name');

const headerAvatar = document.getElementById('header-avatar');
const headerTeamName = document.getElementById('header-team-name');
const headerScore = document.getElementById('header-score');

const promptStatus = document.getElementById('prompt-status');
const mainBuzzerBtn = document.getElementById('main-buzzer-btn');
const buzzerIcon = document.getElementById('buzzer-icon');
const buzzerLabel = document.getElementById('buzzer-label');
const reactionNotice = document.getElementById('reaction-notice');
const reactionText = document.getElementById('reaction-text');

// Check localStorage for saved team name
const savedTeamName = localStorage.getItem('jeopardy_team_name');
if (savedTeamName) {
  inputTeamName.value = savedTeamName;
}

// Register Team
formRegister.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = inputTeamName.value.trim();
  if (!name) return;

  localStorage.setItem('jeopardy_team_name', name);
  socket.emit('register-team', { name });
});

socket.on('team-registered', (data) => {
  myTeam = data.team;
  headerTeamName.textContent = myTeam.name;
  headerScore.textContent = `${myTeam.score} pts`;
  headerAvatar.textContent = myTeam.name.substring(0, 2).toUpperCase();
  headerAvatar.style.backgroundColor = myTeam.color || '#3b82f6';

  screenRegister.classList.add('hidden');
  screenBuzzer.classList.remove('hidden');

  // Handle current game state if joining mid-game
  if (data.gameState?.buzzerState === 'active' && !data.gameState?.isAttempted) {
    setBuzzerActive();
  } else {
    setBuzzerIdle('Atento a la pantalla de Zoom...');
  }
});

// Teams Updated
socket.on('teams-updated', (teams) => {
  if (myTeam && teams[myTeam.id]) {
    myTeam = teams[myTeam.id];
    headerScore.textContent = `${myTeam.score} pts`;
  }
});

// Question Opened
socket.on('question-opened', (data) => {
  setBuzzerIdle(`Pregunta por $${data.puntos} en pantalla...`);
});

// Buzzer Activated by Host
socket.on('buzzer-activated', (data) => {
  const attempted = data.attemptedTeams || [];
  if (myTeam && attempted.includes(myTeam.id)) {
    setBuzzerLocked('Tu equipo ya intentó esta pregunta (Rebote cerrado para ti).');
  } else {
    setBuzzerActive();
  }
});

// Tap Buzzer
mainBuzzerBtn.addEventListener('click', () => {
  if (currentBuzzerState === 'active') {
    // Tactile vibration
    if (navigator.vibrate) {
      navigator.vibrate([100]);
    }
    socket.emit('press-buzzer');
  }
});

// Also support touchstart for fastest possible millisecond reaction on mobile
mainBuzzerBtn.addEventListener('touchstart', (e) => {
  if (currentBuzzerState === 'active') {
    e.preventDefault();
    if (navigator.vibrate) {
      navigator.vibrate([100]);
    }
    socket.emit('press-buzzer');
  }
}, { passive: false });

// Team Buzzed
socket.on('team-buzzed', (buzzedData) => {
  if (myTeam && buzzedData.teamId === myTeam.id) {
    // We won the buzz!
    setBuzzerWinner(buzzedData.reactionMs);
    if (navigator.vibrate) {
      navigator.vibrate([150, 60, 200]);
    }
  } else {
    // Another team won the buzz
    setBuzzerLocked(`¡Pulsó ${buzzedData.teamName}!`);
  }
});

// Answer Judged
socket.on('answer-judged', (data) => {
  if (data.correct) {
    setBuzzerIdle('¡Pregunta completada!');
  } else {
    // Incorrect answer -> if our team was the one that failed, lock us out
    if (myTeam && data.teamId === myTeam.id) {
      setBuzzerLocked('Respuesta incorrecta. Esperando rebote...');
    } else {
      setBuzzerIdle('Respuesta fallida. Atento al posible REBOTE...');
    }
  }
});

// Question Closed
socket.on('question-closed', () => {
  setBuzzerIdle('Volviendo al tablero de preguntas...');
});

// Final Jeopardy
socket.on('final-jeopardy-started', () => {
  setBuzzerIdle('¡RONDA FINAL JEOPARDY!');
});

// Game Ended (Show student personal results)
socket.on('game-ended', ({ ranking }) => {
  if (!myTeam || !ranking) return;

  const found = ranking.find(t => t.id === myTeam.id || t.name.toLowerCase() === myTeam.name.toLowerCase());
  const myRank = found ? found.rank : '?';
  const myScore = found ? found.score : myTeam.score;

  screenRegister.classList.add('hidden');
  screenBuzzer.classList.add('hidden');
  
  const screenPodium = document.getElementById('screen-podium');
  const podiumTrophy = document.getElementById('podium-trophy');
  const podiumStatusTitle = document.getElementById('podium-status-title');
  const podiumMyRank = document.getElementById('podium-my-rank');
  const podiumMyTeam = document.getElementById('podium-my-team');
  const podiumMyScore = document.getElementById('podium-my-score');
  const podiumMyMsg = document.getElementById('podium-my-msg');

  podiumMyTeam.textContent = myTeam.name;
  podiumMyScore.textContent = `${myScore} pts`;
  podiumMyRank.textContent = `${myRank}º LUGAR`;

  if (myRank === 1) {
    podiumTrophy.textContent = '🏆';
    podiumStatusTitle.textContent = '¡CAMPEONES!';
    podiumMyMsg.textContent = '¡Felicitaciones! Demostraron el máximo dominio en la evaluación con IA.';
    podiumMyRank.className = 'my-rank-badge rank-gold';
  } else if (myRank === 2) {
    podiumTrophy.textContent = '🥈';
    podiumStatusTitle.textContent = '¡SUBCAMPEONES!';
    podiumMyMsg.textContent = '¡Excelente desempeño y trabajo en equipo!';
    podiumMyRank.className = 'my-rank-badge rank-silver';
  } else if (myRank === 3) {
    podiumTrophy.textContent = '🥉';
    podiumStatusTitle.textContent = '¡TERCER LUGAR!';
    podiumMyMsg.textContent = '¡Muy buena participación en la sesión de síntesis!';
    podiumMyRank.className = 'my-rank-badge rank-bronze';
  } else {
    podiumTrophy.textContent = '🎖️';
    podiumStatusTitle.textContent = '¡GRAN PARTICIPACIÓN!';
    podiumMyMsg.textContent = '¡Gracias por participar y debatir en esta sesión de repaso!';
    podiumMyRank.className = 'my-rank-badge rank-other';
  }

  screenPodium.classList.remove('hidden');

  if (navigator.vibrate) {
    navigator.vibrate([150, 80, 150, 80, 300]);
  }
});

// Game Reset
socket.on('game-reset', () => {
  const screenPodium = document.getElementById('screen-podium');
  if (screenPodium) screenPodium.classList.add('hidden');
  screenBuzzer.classList.remove('hidden');
  setBuzzerIdle('¡Nueva partida iniciada! Atento a Zoom...');
});

// State Helpers
function setBuzzerIdle(msg = 'Atento a la pantalla de Zoom...') {
  currentBuzzerState = 'idle';
  mainBuzzerBtn.className = 'big-buzzer state-idle';
  mainBuzzerBtn.disabled = true;
  buzzerIcon.textContent = '⏸️';
  buzzerLabel.textContent = 'ESPERA';
  promptStatus.textContent = msg;
  reactionNotice.classList.add('hidden');
}

function setBuzzerActive() {
  currentBuzzerState = 'active';
  mainBuzzerBtn.className = 'big-buzzer state-active';
  mainBuzzerBtn.disabled = false;
  buzzerIcon.textContent = '⚡';
  buzzerLabel.textContent = '¡PULSA!';
  promptStatus.textContent = '¡Buzzer habilitado! ¡PULSA AHORA!';
  reactionNotice.classList.add('hidden');

  if (navigator.vibrate) {
    navigator.vibrate([40]);
  }
}

function setBuzzerWinner(ms) {
  currentBuzzerState = 'winner';
  mainBuzzerBtn.className = 'big-buzzer state-winner';
  mainBuzzerBtn.disabled = true;
  buzzerIcon.textContent = '🎉';
  buzzerLabel.textContent = '¡TU TURNO!';
  promptStatus.textContent = '¡Pulsaste primero! Habla por el micrófono de Zoom...';

  const secs = (ms / 1000).toFixed(2);
  reactionText.textContent = `Tiempo: ${secs}s`;
  reactionNotice.classList.remove('hidden');
}

function setBuzzerLocked(msg) {
  currentBuzzerState = 'locked';
  mainBuzzerBtn.className = 'big-buzzer state-locked';
  mainBuzzerBtn.disabled = true;
  buzzerIcon.textContent = '🔒';
  buzzerLabel.textContent = 'BLOQUEADO';
  promptStatus.textContent = msg;
  reactionNotice.classList.add('hidden');
}
