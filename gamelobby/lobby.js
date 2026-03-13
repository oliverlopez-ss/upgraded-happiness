/* ===== GameVerse Lobby System ===== */

// ---- Particle Background ----
const particleCanvas = document.getElementById('particles');
const pCtx = particleCanvas.getContext('2d');
let particles = [];

function resizeParticles() {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
}
resizeParticles();
window.addEventListener('resize', resizeParticles);

function createParticle() {
    return {
        x: Math.random() * particleCanvas.width,
        y: Math.random() * particleCanvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.1,
        color: ['#7c3aed', '#3b82f6', '#06b6d4', '#a78bfa'][Math.floor(Math.random() * 4)]
    };
}

for (let i = 0; i < 80; i++) particles.push(createParticle());

function drawParticles() {
    pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    particles.forEach(p => {
        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        pCtx.fillStyle = p.color;
        pCtx.globalAlpha = p.opacity;
        pCtx.fill();
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0 || p.x > particleCanvas.width) p.speedX *= -1;
        if (p.y < 0 || p.y > particleCanvas.height) p.speedY *= -1;
    });
    // Draw connections
    pCtx.globalAlpha = 0.05;
    pCtx.strokeStyle = '#7c3aed';
    pCtx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                pCtx.beginPath();
                pCtx.moveTo(particles[i].x, particles[i].y);
                pCtx.lineTo(particles[j].x, particles[j].y);
                pCtx.stroke();
            }
        }
    }
    pCtx.globalAlpha = 1;
    requestAnimationFrame(drawParticles);
}
drawParticles();

// ---- Player Data ----
let playerData = {
    name: '',
    level: 1,
    xp: 30,
    gamesPlayed: 0
};

// ---- Welcome Modal ----
const welcomeModal = document.getElementById('welcomeModal');
const nameInput = document.getElementById('nameInput');
const startBtn = document.getElementById('startBtn');

// Check saved name
const savedName = localStorage.getItem('gv_playerName');
if (savedName) {
    playerData.name = savedName;
    playerData.level = parseInt(localStorage.getItem('gv_playerLevel') || '1');
    playerData.xp = parseInt(localStorage.getItem('gv_playerXp') || '30');
    welcomeModal.classList.add('hidden');
    updatePlayerUI();
}

startBtn.addEventListener('click', enterLobby);
nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') enterLobby();
});

function enterLobby() {
    const name = nameInput.value.trim();
    if (!name) {
        nameInput.style.borderColor = '#ef4444';
        nameInput.placeholder = 'Ange ett namn!';
        return;
    }
    playerData.name = name;
    localStorage.setItem('gv_playerName', name);
    welcomeModal.classList.add('hidden');
    updatePlayerUI();
}

function updatePlayerUI() {
    document.getElementById('playerName').textContent = playerData.name;
    document.getElementById('playerAvatar').textContent = playerData.name[0].toUpperCase();
    document.getElementById('playerLevel').textContent = playerData.level;
    document.getElementById('xpFill').style.width = playerData.xp + '%';
}

// ---- Fake Online Players Counter ----
function updateOnlinePlayers() {
    const base = 200;
    const variation = Math.floor(Math.random() * 100);
    document.getElementById('onlinePlayers').textContent = base + variation;
    document.getElementById('brPlayers').textContent = 60 + Math.floor(Math.random() * 50);
}
setInterval(updateOnlinePlayers, 5000);

// ---- Loading Screen ----
const loadingScreen = document.getElementById('loadingScreen');
const loadingBarFill = document.getElementById('loadingBarFill');
const loadingGameName = document.getElementById('loadingGameName');
const loadingTip = document.getElementById('loadingTip');

const tips = [
    'Tips: Samla resurser tidigt i spelet!',
    'Tips: Håll koll på minikartan.',
    'Tips: Bygg högt för bättre överblick!',
    'Tips: Lagarbete ger bäst resultat.',
    'Tips: Utforska hela kartan för dolda skatter!',
    'Tips: Uppgradera dina torn regelbundet.',
    'Tips: Använd boost-pads för extra fart!',
    'Tips: Timing är allt i parkour!',
];

const gameNames = {
    'battle-royale': 'Battle Royale',
    'tower-defense': 'Tower Defense',
    'racing': 'Turbo Racing',
    'parkour': 'Parkour Obby'
};

function showLoading(gameId, callback) {
    loadingGameName.textContent = 'Laddar ' + gameNames[gameId] + '...';
    loadingTip.textContent = tips[Math.floor(Math.random() * tips.length)];
    loadingBarFill.style.width = '0%';
    loadingScreen.classList.add('active');

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(() => {
                loadingScreen.classList.remove('active');
                callback();
            }, 300);
        }
        loadingBarFill.style.width = progress + '%';
    }, 200);
}

// ---- Game Launching ----
let currentGame = null;
let currentGameCleanup = null;

function launchGame(gameId) {
    showLoading(gameId, () => {
        // Hide lobby, show game
        document.getElementById('lobbyContainer').style.display = 'none';
        document.querySelector('.top-bar').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'block';
        document.getElementById('backToLobby').style.display = 'block';
        particleCanvas.style.display = 'none';

        currentGame = gameId;

        // Load and start the game
        switch (gameId) {
            case 'battle-royale':
                currentGameCleanup = startBattleRoyale(document.getElementById('gameContainer'));
                break;
            case 'tower-defense':
                currentGameCleanup = startTowerDefense(document.getElementById('gameContainer'));
                break;
            case 'racing':
                currentGameCleanup = startRacing(document.getElementById('gameContainer'));
                break;
            case 'parkour':
                currentGameCleanup = startParkour(document.getElementById('gameContainer'));
                break;
        }

        // Add XP for playing
        addXP(10);
    });
}

function returnToLobby() {
    // Cleanup current game
    if (currentGameCleanup) {
        currentGameCleanup();
        currentGameCleanup = null;
    }
    document.getElementById('gameContainer').innerHTML = '';
    document.getElementById('gameContainer').style.display = 'none';
    document.getElementById('backToLobby').style.display = 'none';
    document.getElementById('lobbyContainer').style.display = '';
    document.querySelector('.top-bar').style.display = '';
    particleCanvas.style.display = '';
    currentGame = null;
}

function addXP(amount) {
    playerData.xp += amount;
    if (playerData.xp >= 100) {
        playerData.xp -= 100;
        playerData.level++;
    }
    playerData.gamesPlayed++;
    localStorage.setItem('gv_playerLevel', playerData.level);
    localStorage.setItem('gv_playerXp', playerData.xp);
    updatePlayerUI();
}

// ---- Card Hover Sound Effect (visual pulse) ----
document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
    });
});
