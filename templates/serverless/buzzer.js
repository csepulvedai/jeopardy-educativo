// PeerJS and State
let peer = null;
let hostConn = null;
let myTeam = null;
let currentBuzzerState = 'idle';

// DOM Elements
const screenRegister = document.getElementById('screen-register');
const screenBuzzer = document.getElementById('screen-buzzer');
const screenPodium = document.getElementById('screen-podium');

const formRegister = document.getElementById('form-register');
const inputRoomCode = document.getElementById('input-room-code');
const inputTeamName = document.getElementById('input-team-name');
const btnSubmitJoin = document.getElementById('btn-submit-join');
const joinStatusMsg = document.getElementById('join-status-msg');

const headerAvatar = document.getElementById('header-avatar');
const headerTeamName = document.getElementById('header-team-name');
const headerScore = document.getElementById('header-score');

const promptStatus = document.getElementById('prompt-status');
const mainBuzzerBtn = document.getElementById('main-buzzer-btn');
const buzzerIcon = document.getElementById('buzzer-icon');
const buzzerLabel = document.getElementById('buzzer-label');
const reactionNotice = document.getElementById('reaction-notice');
const reactionText = document.getElementById('reaction-text');

// Auto-fill room code from URL query param
const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('sala') || urlParams.get('room');
if (roomParam) {
  inputRoomCode.value = roomParam.toUpperCase();
}

// Check saved team name
const savedTeamName = localStorage.getItem('jeopardy_team_name');
if (savedTeamName) {
  inputTeamName.value = savedTeamName;
}

// Join Room via PeerJS
formRegister.addEventListener('submit', (e) => {
  e.preventDefault();
  const roomCode = inputRoomCode.value.trim().toUpperCase();
  const teamName = inputTeamName.value.trim();

  if (!roomCode || !teamName) return;

  localStorage.setItem('jeopardy_team_name', teamName);

  btnSubmitJoin.disabled = true;
  btnSubmitJoin.textContent = 'Conectando...';
  joinStatusMsg.textContent = `Conectando con la sala ${roomCode}...`;
  joinStatusMsg.classList.remove('hidden');

  const targetHostId = 'jeopardy-ia-' + roomCode.toLowerCase();

  peer = new Peer({ debug: 1 });

  peer.on('open', (myPeerId) => {
    hostConn = peer.connect(targetHostId, {
      reliable: true
    });

    hostConn.on('open', () => {
      // Register with host
      hostConn.send({
        type: 'register',
        name: teamName
      });
    });

    hostConn.on('data', (data) => {
      handleHostMessage(data);
    });

    hostConn.on('close', () => {
      setBuzzerLocked('Conexión cerrada por el profesor.');
    });

    hostConn.on('error', (err) => {
      console.error('Error de conexión:', err);
      joinStatusMsg.textContent = 'No se pudo conectar con la sala. Verifica el código.';
      btnSubmitJoin.disabled = false;
      btnSubmitJoin.textContent = '¡Entrar al Juego!';
    });
  });

  peer.on('error', (err) => {
    console.error('Peer error:', err);
    joinStatusMsg.textContent = 'Error de conexión. Intenta recargar la página.';
    btnSubmitJoin.disabled = false;
    btnSubmitJoin.textContent = '¡Entrar al Juego!';
  });
});

// Handle incoming messages from Host
function handleHostMessage(msg) {
  switch (msg.type) {
    case 'welcome':
      myTeam = msg.team;
      headerTeamName.textContent = myTeam.name;
      headerScore.textContent = `${myTeam.score} pts`;
      headerAvatar.textContent = myTeam.name.substring(0, 2).toUpperCase();
      headerAvatar.style.backgroundColor = myTeam.color || '#3b82f6';

      screenRegister.classList.add('hidden');
      screenBuzzer.classList.remove('hidden');

      if (msg.gameState?.buzzerState === 'active') {
        setBuzzerActive();
      } else {
        setBuzzerIdle('Conectado a la sala. Atento a la pantalla...');
      }
      break;

    case 'teams-updated':
      if (myTeam && msg.teams?.[myTeam.id]) {
        myTeam = msg.teams[myTeam.id];
        headerScore.textContent = `${myTeam.score} pts`;
      }
      break;

    case 'question-opened':
      setBuzzerIdle(`Pregunta por $${msg.puntos} en pantalla...`);
      break;

    case 'buzzer-activated':
      const attempted = msg.attemptedTeams || [];
      if (myTeam && attempted.includes(myTeam.id)) {
        setBuzzerLocked('Tu equipo ya intentó esta pregunta (esperando rebote para otros).');
      } else {
        setBuzzerActive();
      }
      break;

    case 'team-buzzed':
      if (myTeam && msg.buzzedTeam?.teamId === myTeam.id) {
        setBuzzerWinner(msg.buzzedTeam.reactionMs);
        if (navigator.vibrate) navigator.vibrate([150, 60, 200]);
      } else {
        setBuzzerLocked(`¡Pulsó ${msg.buzzedTeam?.teamName || 'otro equipo'}!`);
      }
      break;

    case 'answer-judged':
      if (msg.correct) {
        setBuzzerIdle('¡Pregunta completada!');
        if (myTeam && msg.teams?.[myTeam.id]) {
          myTeam = msg.teams[myTeam.id];
          headerScore.textContent = `${myTeam.score} pts`;
        }
      } else {
        if (myTeam && msg.teamId === myTeam.id) {
          setBuzzerLocked('Respuesta incorrecta. Esperando rebote...');
        } else {
          setBuzzerIdle('Respuesta fallida. Atento al posible REBOTE...');
        }
      }
      break;

    case 'question-closed':
      setBuzzerIdle('Volviendo al tablero de preguntas...');
      break;

    case 'final-jeopardy-started':
      setBuzzerIdle('¡RONDA FINAL JEOPARDY!');
      break;

    case 'game-ended':
      showPodium(msg.ranking);
      break;

    case 'game-reset':
      if (screenPodium) screenPodium.classList.add('hidden');
      screenBuzzer.classList.remove('hidden');
      setBuzzerIdle('¡Nueva partida iniciada! Atento a la pantalla...');
      break;
  }
}

// Press Buzzer
function pressBuzzer() {
  if (currentBuzzerState === 'active' && hostConn && hostConn.open) {
    if (navigator.vibrate) navigator.vibrate([100]);
    hostConn.send({
      type: 'buzz',
      time: Date.now()
    });
  }
}

mainBuzzerBtn.addEventListener('click', pressBuzzer);
mainBuzzerBtn.addEventListener('touchstart', (e) => {
  if (currentBuzzerState === 'active') {
    e.preventDefault();
    pressBuzzer();
  }
}, { passive: false });

// State Helpers
function setBuzzerIdle(msg = 'Atento a la pantalla...') {
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
  if (navigator.vibrate) navigator.vibrate([40]);
}

function setBuzzerWinner(ms) {
  currentBuzzerState = 'winner';
  mainBuzzerBtn.className = 'big-buzzer state-winner';
  mainBuzzerBtn.disabled = true;
  buzzerIcon.textContent = '🎉';
  buzzerLabel.textContent = '¡TU TURNO!';
  promptStatus.textContent = '¡Pulsaste primero! Da tu respuesta...';
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

function showPodium(ranking) {
  if (!myTeam || !ranking) return;

  const found = ranking.find(t => t.id === myTeam.id || t.name.toLowerCase() === myTeam.name.toLowerCase());
  const myRank = found ? found.rank : '?';
  const myScore = found ? found.score : myTeam.score;

  screenRegister.classList.add('hidden');
  screenBuzzer.classList.add('hidden');

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
}
