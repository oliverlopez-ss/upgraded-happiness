/* ===== BATTLE ROYALE - Top-down survival shooter ===== */

function startBattleRoyale(container) {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Game state
    const state = {
        running: true,
        player: {
            x: 400, y: 400,
            size: 16,
            speed: 3,
            hp: 100,
            maxHp: 100,
            ammo: 30,
            kills: 0,
            shield: 0,
            weapon: 'Pistol',
            color: '#7c3aed'
        },
        bullets: [],
        enemies: [],
        items: [],
        storm: { radius: 2000, targetRadius: 200, shrinkSpeed: 0.05, centerX: 0, centerY: 0 },
        camera: { x: 0, y: 0 },
        map: { width: 3000, height: 3000 },
        keys: {},
        mouse: { x: 0, y: 0 },
        alive: 50,
        time: 0,
        buildings: [],
        trees: [],
        shootCooldown: 0,
        gameOver: false,
        won: false
    };

    // Generate map
    state.storm.centerX = state.map.width / 2;
    state.storm.centerY = state.map.height / 2;
    state.player.x = state.map.width / 2 + (Math.random() - 0.5) * 800;
    state.player.y = state.map.height / 2 + (Math.random() - 0.5) * 800;

    // Buildings
    for (let i = 0; i < 30; i++) {
        state.buildings.push({
            x: Math.random() * state.map.width,
            y: Math.random() * state.map.height,
            w: 60 + Math.random() * 80,
            h: 60 + Math.random() * 80,
            color: `hsl(${220 + Math.random() * 20}, 20%, ${15 + Math.random() * 10}%)`
        });
    }

    // Trees
    for (let i = 0; i < 100; i++) {
        state.trees.push({
            x: Math.random() * state.map.width,
            y: Math.random() * state.map.height,
            size: 10 + Math.random() * 15
        });
    }

    // Enemies (bots)
    for (let i = 0; i < 49; i++) {
        state.enemies.push({
            x: Math.random() * state.map.width,
            y: Math.random() * state.map.height,
            size: 16,
            hp: 60 + Math.random() * 40,
            speed: 1 + Math.random() * 1.5,
            dir: Math.random() * Math.PI * 2,
            changeTimer: 0,
            shootTimer: 0,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
            name: 'Bot_' + (i + 1)
        });
    }

    // Items
    for (let i = 0; i < 40; i++) {
        const types = ['ammo', 'health', 'shield', 'weapon'];
        const type = types[Math.floor(Math.random() * types.length)];
        state.items.push({
            x: Math.random() * state.map.width,
            y: Math.random() * state.map.height,
            type,
            collected: false
        });
    }

    // Input handlers
    function onKeyDown(e) { state.keys[e.key.toLowerCase()] = true; }
    function onKeyUp(e) { state.keys[e.key.toLowerCase()] = false; }
    function onMouseMove(e) {
        state.mouse.x = e.clientX;
        state.mouse.y = e.clientY;
    }
    function onMouseDown(e) {
        if (e.button === 0 && !state.gameOver) shoot();
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);

    function shoot() {
        if (state.shootCooldown > 0 || state.player.ammo <= 0) return;
        const angle = Math.atan2(
            state.mouse.y - canvas.height / 2,
            state.mouse.x - canvas.width / 2
        );
        state.bullets.push({
            x: state.player.x,
            y: state.player.y,
            vx: Math.cos(angle) * 8,
            vy: Math.sin(angle) * 8,
            life: 80,
            friendly: true
        });
        state.player.ammo--;
        state.shootCooldown = 12;
    }

    // Game loop
    let animId;
    function update() {
        if (!state.running) return;
        animId = requestAnimationFrame(update);
        state.time++;

        if (state.gameOver) {
            drawGameOver();
            return;
        }

        const p = state.player;

        // Movement
        if (state.keys['w'] || state.keys['arrowup']) p.y -= p.speed;
        if (state.keys['s'] || state.keys['arrowdown']) p.y += p.speed;
        if (state.keys['a'] || state.keys['arrowleft']) p.x -= p.speed;
        if (state.keys['d'] || state.keys['arrowright']) p.x += p.speed;
        p.x = Math.max(0, Math.min(state.map.width, p.x));
        p.y = Math.max(0, Math.min(state.map.height, p.y));

        if (state.shootCooldown > 0) state.shootCooldown--;

        // Camera
        state.camera.x = p.x - canvas.width / 2;
        state.camera.y = p.y - canvas.height / 2;

        // Storm
        if (state.storm.radius > state.storm.targetRadius) {
            state.storm.radius -= state.storm.shrinkSpeed;
        }
        const distToStormCenter = Math.hypot(p.x - state.storm.centerX, p.y - state.storm.centerY);
        if (distToStormCenter > state.storm.radius) {
            p.hp -= 0.3;
        }

        // Bullets
        state.bullets.forEach(b => {
            b.x += b.vx;
            b.y += b.vy;
            b.life--;
        });
        state.bullets = state.bullets.filter(b => b.life > 0);

        // Enemies AI
        state.enemies.forEach(enemy => {
            if (enemy.hp <= 0) return;
            enemy.changeTimer--;
            if (enemy.changeTimer <= 0) {
                enemy.dir = Math.random() * Math.PI * 2;
                enemy.changeTimer = 60 + Math.random() * 120;
            }

            // Chase player if close
            const distToPlayer = Math.hypot(enemy.x - p.x, enemy.y - p.y);
            if (distToPlayer < 300) {
                enemy.dir = Math.atan2(p.y - enemy.y, p.x - enemy.x);
                enemy.shootTimer--;
                if (enemy.shootTimer <= 0 && distToPlayer < 250) {
                    const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x) + (Math.random() - 0.5) * 0.3;
                    state.bullets.push({
                        x: enemy.x,
                        y: enemy.y,
                        vx: Math.cos(angle) * 5,
                        vy: Math.sin(angle) * 5,
                        life: 60,
                        friendly: false
                    });
                    enemy.shootTimer = 30 + Math.random() * 40;
                }
            }

            enemy.x += Math.cos(enemy.dir) * enemy.speed;
            enemy.y += Math.sin(enemy.dir) * enemy.speed;
            enemy.x = Math.max(0, Math.min(state.map.width, enemy.x));
            enemy.y = Math.max(0, Math.min(state.map.height, enemy.y));

            // Storm damage
            const eDist = Math.hypot(enemy.x - state.storm.centerX, enemy.y - state.storm.centerY);
            if (eDist > state.storm.radius) {
                enemy.hp -= 0.2;
            }
        });

        // Bullet-enemy collision
        state.bullets.forEach(b => {
            if (!b.friendly) {
                // Hit player
                if (Math.hypot(b.x - p.x, b.y - p.y) < p.size) {
                    if (p.shield > 0) { p.shield -= 15; if (p.shield < 0) p.shield = 0; }
                    else p.hp -= 15;
                    b.life = 0;
                }
            } else {
                // Hit enemy
                state.enemies.forEach(enemy => {
                    if (enemy.hp <= 0) return;
                    if (Math.hypot(b.x - enemy.x, b.y - enemy.y) < enemy.size) {
                        enemy.hp -= 25;
                        b.life = 0;
                        if (enemy.hp <= 0) {
                            p.kills++;
                            state.alive--;
                        }
                    }
                });
            }
        });

        // Bot-on-bot kills (background action)
        if (state.time % 300 === 0 && state.alive > 2) {
            const aliveEnemies = state.enemies.filter(e => e.hp > 0);
            if (aliveEnemies.length > 1) {
                aliveEnemies[0].hp = 0;
                state.alive--;
            }
        }

        // Items
        state.items.forEach(item => {
            if (item.collected) return;
            if (Math.hypot(item.x - p.x, item.y - p.y) < 24) {
                item.collected = true;
                switch (item.type) {
                    case 'ammo': p.ammo += 15; break;
                    case 'health': p.hp = Math.min(p.maxHp, p.hp + 25); break;
                    case 'shield': p.shield = Math.min(100, p.shield + 50); break;
                    case 'weapon':
                        p.weapon = ['Rifle', 'Shotgun', 'SMG'][Math.floor(Math.random() * 3)];
                        break;
                }
            }
        });

        // Check death
        if (p.hp <= 0) {
            state.gameOver = true;
            state.won = false;
        }
        if (state.alive <= 1 && p.hp > 0) {
            state.gameOver = true;
            state.won = true;
        }

        draw();
    }

    function draw() {
        ctx.fillStyle = '#1a2a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(-state.camera.x, -state.camera.y);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        const gridSize = 100;
        const startX = Math.floor(state.camera.x / gridSize) * gridSize;
        const startY = Math.floor(state.camera.y / gridSize) * gridSize;
        for (let x = startX; x < state.camera.x + canvas.width + gridSize; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, state.camera.y); ctx.lineTo(x, state.camera.y + canvas.height); ctx.stroke();
        }
        for (let y = startY; y < state.camera.y + canvas.height + gridSize; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(state.camera.x, y); ctx.lineTo(state.camera.x + canvas.width, y); ctx.stroke();
        }

        // Buildings
        state.buildings.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.strokeRect(b.x, b.y, b.w, b.h);
        });

        // Trees
        state.trees.forEach(t => {
            ctx.fillStyle = '#1a4a1a';
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2a6a2a';
            ctx.beginPath();
            ctx.arc(t.x - 2, t.y - 2, t.size * 0.7, 0, Math.PI * 2);
            ctx.fill();
        });

        // Items
        state.items.forEach(item => {
            if (item.collected) return;
            const colors = { ammo: '#f59e0b', health: '#10b981', shield: '#3b82f6', weapon: '#ec4899' };
            ctx.fillStyle = colors[item.type];
            ctx.globalAlpha = 0.7 + Math.sin(state.time * 0.05) * 0.3;
            ctx.beginPath();
            ctx.arc(item.x, item.y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        // Enemies
        state.enemies.forEach(enemy => {
            if (enemy.hp <= 0) return;
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
            ctx.fill();
            // HP bar
            ctx.fillStyle = '#333';
            ctx.fillRect(enemy.x - 15, enemy.y - 25, 30, 4);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(enemy.x - 15, enemy.y - 25, (enemy.hp / 100) * 30, 4);
        });

        // Player
        const p = state.player;
        // Glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 40);
        gradient.addColorStop(0, 'rgba(124, 58, 237, 0.2)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 40, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Aim line
        const aimAngle = Math.atan2(
            state.mouse.y - canvas.height / 2,
            state.mouse.x - canvas.width / 2
        );
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(aimAngle) * 60, p.y + Math.sin(aimAngle) * 60);
        ctx.stroke();

        // Bullets
        state.bullets.forEach(b => {
            ctx.fillStyle = b.friendly ? '#f59e0b' : '#ef4444';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Storm circle
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.arc(state.storm.centerX, state.storm.centerY, state.storm.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Storm fill outside
        ctx.fillStyle = 'rgba(88, 28, 135, 0.15)';
        ctx.beginPath();
        ctx.rect(state.camera.x, state.camera.y, canvas.width, canvas.height);
        ctx.arc(state.storm.centerX, state.storm.centerY, state.storm.radius, 0, Math.PI * 2, true);
        ctx.fill();

        ctx.restore();

        // HUD
        drawHUD();
    }

    function drawHUD() {
        const p = state.player;

        // HP bar
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(canvas.width / 2 - 150, canvas.height - 60, 300, 20);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(canvas.width / 2 - 150, canvas.height - 60, (p.hp / p.maxHp) * 300, 20);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`HP: ${Math.ceil(p.hp)}`, canvas.width / 2, canvas.height - 46);

        // Shield bar
        if (p.shield > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(canvas.width / 2 - 150, canvas.height - 82, 300, 16);
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(canvas.width / 2 - 150, canvas.height - 82, (p.shield / 100) * 300, 16);
            ctx.fillText(`Shield: ${Math.ceil(p.shield)}`, canvas.width / 2, canvas.height - 70);
        }

        // Ammo & Weapon
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(canvas.width - 180, canvas.height - 80, 160, 60);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(p.weapon, canvas.width - 170, canvas.height - 56);
        ctx.fillStyle = 'white';
        ctx.fillText(`Ammo: ${p.ammo}`, canvas.width - 170, canvas.height - 36);

        // Kills & Alive
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(20, canvas.height - 80, 140, 60);
        ctx.fillStyle = '#ec4899';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`Kills: ${p.kills}`, 32, canvas.height - 56);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Kvar: ${state.alive}`, 32, canvas.height - 36);

        // Minimap
        const mmSize = 140;
        const mmX = canvas.width - mmSize - 16;
        const mmY = 60;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(mmX, mmY, mmSize, mmSize);
        ctx.strokeStyle = 'rgba(124, 58, 237, 0.5)';
        ctx.strokeRect(mmX, mmY, mmSize, mmSize);

        const scale = mmSize / state.map.width;
        // Storm on minimap
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mmX + state.storm.centerX * scale, mmY + state.storm.centerY * scale, state.storm.radius * scale, 0, Math.PI * 2);
        ctx.stroke();

        // Enemies on minimap
        state.enemies.forEach(e => {
            if (e.hp <= 0) return;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(mmX + e.x * scale - 1, mmY + e.y * scale - 1, 2, 2);
        });

        // Player on minimap
        ctx.fillStyle = '#7c3aed';
        ctx.fillRect(mmX + state.player.x * scale - 2, mmY + state.player.y * scale - 2, 4, 4);

        // Controls hint
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('WASD = röra sig | Klicka = skjut', canvas.width / 2, 84);
    }

    function drawGameOver() {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center';

        if (state.won) {
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 48px sans-serif';
            ctx.fillText('VICTORY ROYALE!', canvas.width / 2, canvas.height / 2 - 40);
        } else {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 48px sans-serif';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
        }

        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        ctx.fillText(`Kills: ${state.player.kills} | Placering: #${state.alive}`, canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px sans-serif';
        ctx.fillText('Klicka "Tillbaka till Lobby" för att återgå', canvas.width / 2, canvas.height / 2 + 50);
    }

    update();

    // Cleanup function
    return function cleanup() {
        state.running = false;
        cancelAnimationFrame(animId);
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('mousedown', onMouseDown);
    };
}
