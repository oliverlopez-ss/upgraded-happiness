/* ===== TOWER DEFENSE - Place towers, defeat waves ===== */

function startTowerDefense(container) {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const CELL = 48;
    const COLS = Math.floor(canvas.width / CELL);
    const ROWS = Math.floor(canvas.height / CELL);

    // Path waypoints
    const path = [
        { x: 0, y: Math.floor(ROWS / 2) },
        { x: Math.floor(COLS * 0.2), y: Math.floor(ROWS / 2) },
        { x: Math.floor(COLS * 0.2), y: Math.floor(ROWS * 0.2) },
        { x: Math.floor(COLS * 0.5), y: Math.floor(ROWS * 0.2) },
        { x: Math.floor(COLS * 0.5), y: Math.floor(ROWS * 0.8) },
        { x: Math.floor(COLS * 0.8), y: Math.floor(ROWS * 0.8) },
        { x: Math.floor(COLS * 0.8), y: Math.floor(ROWS / 2) },
        { x: COLS, y: Math.floor(ROWS / 2) }
    ];

    const state = {
        running: true,
        gold: 200,
        lives: 20,
        wave: 0,
        waveTimer: 180,
        spawning: false,
        spawnCount: 0,
        spawnTimer: 0,
        towers: [],
        enemies: [],
        projectiles: [],
        particles: [],
        selectedTower: null,
        hoverCell: null,
        pathCells: new Set(),
        gameOver: false,
        time: 0
    };

    // Build path cells set
    for (let i = 0; i < path.length - 1; i++) {
        const from = path[i], to = path[i + 1];
        const dx = Math.sign(to.x - from.x);
        const dy = Math.sign(to.y - from.y);
        let cx = from.x, cy = from.y;
        while (cx !== to.x || cy !== to.y) {
            state.pathCells.add(`${cx},${cy}`);
            cx += dx; cy += dy;
        }
        state.pathCells.add(`${to.x},${to.y}`);
    }

    const towerTypes = [
        { name: 'Bas', cost: 50, range: 120, damage: 10, cooldown: 30, color: '#3b82f6', key: '1' },
        { name: 'Sniper', cost: 100, range: 250, damage: 40, cooldown: 60, color: '#ef4444', key: '2' },
        { name: 'Frost', cost: 75, range: 100, damage: 5, cooldown: 20, color: '#06b6d4', slow: true, key: '3' },
        { name: 'Bomb', cost: 125, range: 80, damage: 25, cooldown: 50, color: '#f59e0b', splash: true, key: '4' }
    ];

    state.selectedTower = 0;

    // Input
    function onMouseMove(e) {
        const col = Math.floor(e.clientX / CELL);
        const row = Math.floor(e.clientY / CELL);
        state.hoverCell = { col, row };
    }

    function onClick(e) {
        if (state.gameOver) return;
        const col = Math.floor(e.clientX / CELL);
        const row = Math.floor(e.clientY / CELL);

        if (state.selectedTower === null) return;
        const type = towerTypes[state.selectedTower];
        if (state.gold < type.cost) return;
        if (state.pathCells.has(`${col},${row}`)) return;
        if (state.towers.some(t => t.col === col && t.row === row)) return;

        state.gold -= type.cost;
        state.towers.push({
            col, row,
            x: col * CELL + CELL / 2,
            y: row * CELL + CELL / 2,
            type: state.selectedTower,
            cooldownTimer: 0
        });
    }

    function onKeyDown(e) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 4) {
            state.selectedTower = num - 1;
        }
    }

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);

    // Spawn wave
    function startWave() {
        state.wave++;
        state.spawning = true;
        state.spawnCount = 5 + state.wave * 3;
        state.spawnTimer = 0;
    }

    function spawnEnemy() {
        const hp = 30 + state.wave * 15;
        const speed = 1 + Math.min(state.wave * 0.1, 2);
        const isBoss = state.spawnCount === 1 && state.wave % 5 === 0;
        state.enemies.push({
            x: path[0].x * CELL + CELL / 2,
            y: path[0].y * CELL + CELL / 2,
            hp: isBoss ? hp * 4 : hp,
            maxHp: isBoss ? hp * 4 : hp,
            speed: isBoss ? speed * 0.6 : speed,
            pathIndex: 1,
            slowTimer: 0,
            size: isBoss ? 16 : 10,
            reward: isBoss ? 30 : 5 + state.wave,
            isBoss
        });
    }

    // Game loop
    let animId;
    function update() {
        if (!state.running) return;
        animId = requestAnimationFrame(update);
        state.time++;

        if (state.gameOver) {
            draw();
            return;
        }

        // Wave management
        if (!state.spawning) {
            state.waveTimer--;
            if (state.waveTimer <= 0) {
                startWave();
            }
        } else {
            state.spawnTimer--;
            if (state.spawnTimer <= 0 && state.spawnCount > 0) {
                spawnEnemy();
                state.spawnCount--;
                state.spawnTimer = 25;
                if (state.spawnCount <= 0) {
                    state.spawning = false;
                    state.waveTimer = 600;
                }
            }
        }

        // Move enemies
        state.enemies.forEach(enemy => {
            if (enemy.hp <= 0) return;
            const target = path[enemy.pathIndex];
            if (!target) { enemy.hp = 0; state.lives--; return; }

            const tx = target.x * CELL + CELL / 2;
            const ty = target.y * CELL + CELL / 2;
            const dx = tx - enemy.x;
            const dy = ty - enemy.y;
            const dist = Math.hypot(dx, dy);

            let speed = enemy.speed;
            if (enemy.slowTimer > 0) { speed *= 0.4; enemy.slowTimer--; }

            if (dist < speed) {
                enemy.x = tx;
                enemy.y = ty;
                enemy.pathIndex++;
            } else {
                enemy.x += (dx / dist) * speed;
                enemy.y += (dy / dist) * speed;
            }
        });

        // Tower shooting
        state.towers.forEach(tower => {
            tower.cooldownTimer--;
            if (tower.cooldownTimer > 0) return;

            const type = towerTypes[tower.type];
            let target = null;
            let maxProgress = -1;

            state.enemies.forEach(enemy => {
                if (enemy.hp <= 0) return;
                const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
                if (dist <= type.range && enemy.pathIndex > maxProgress) {
                    maxProgress = enemy.pathIndex;
                    target = enemy;
                }
            });

            if (target) {
                tower.cooldownTimer = type.cooldown;
                state.projectiles.push({
                    x: tower.x,
                    y: tower.y,
                    target,
                    speed: 5,
                    damage: type.damage,
                    slow: type.slow || false,
                    splash: type.splash || false,
                    color: type.color
                });
            }
        });

        // Projectiles
        state.projectiles.forEach(proj => {
            if (!proj.target || proj.target.hp <= 0) { proj.done = true; return; }
            const dx = proj.target.x - proj.x;
            const dy = proj.target.y - proj.y;
            const dist = Math.hypot(dx, dy);
            if (dist < proj.speed) {
                // Hit
                proj.target.hp -= proj.damage;
                if (proj.slow) proj.target.slowTimer = 60;
                if (proj.splash) {
                    state.enemies.forEach(e => {
                        if (e.hp <= 0) return;
                        if (Math.hypot(e.x - proj.target.x, e.y - proj.target.y) < 60) {
                            e.hp -= proj.damage * 0.5;
                        }
                    });
                    // Splash particles
                    for (let i = 0; i < 8; i++) {
                        state.particles.push({
                            x: proj.x, y: proj.y,
                            vx: (Math.random() - 0.5) * 4,
                            vy: (Math.random() - 0.5) * 4,
                            life: 20, color: proj.color
                        });
                    }
                }
                if (proj.target.hp <= 0) {
                    state.gold += proj.target.reward;
                }
                proj.done = true;
            } else {
                proj.x += (dx / dist) * proj.speed;
                proj.y += (dy / dist) * proj.speed;
            }
        });
        state.projectiles = state.projectiles.filter(p => !p.done);

        // Particles
        state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
        state.particles = state.particles.filter(p => p.life > 0);

        // Remove dead enemies
        state.enemies = state.enemies.filter(e => e.hp > 0 || e.pathIndex < path.length);

        // Game over
        if (state.lives <= 0) {
            state.gameOver = true;
        }

        draw();
    }

    function draw() {
        // Background
        ctx.fillStyle = '#0d1b2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
            }
        }

        // Path
        ctx.fillStyle = 'rgba(100, 80, 60, 0.3)';
        state.pathCells.forEach(key => {
            const [c, r] = key.split(',').map(Number);
            ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        });

        // Path line
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        path.forEach((p, i) => {
            const x = p.x * CELL + CELL / 2;
            const y = p.y * CELL + CELL / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Hover cell
        if (state.hoverCell && state.selectedTower !== null) {
            const { col, row } = state.hoverCell;
            const isPath = state.pathCells.has(`${col},${row}`);
            const isOccupied = state.towers.some(t => t.col === col && t.row === row);
            const canPlace = !isPath && !isOccupied;

            ctx.fillStyle = canPlace ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
            ctx.fillRect(col * CELL, row * CELL, CELL, CELL);

            // Range preview
            if (canPlace) {
                const type = towerTypes[state.selectedTower];
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(col * CELL + CELL / 2, row * CELL + CELL / 2, type.range, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Towers
        state.towers.forEach(tower => {
            const type = towerTypes[tower.type];
            ctx.fillStyle = type.color;
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Turret
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(tower.x - 3, tower.y - 3, 6, 6);
        });

        // Enemies
        state.enemies.forEach(enemy => {
            if (enemy.hp <= 0) return;
            ctx.fillStyle = enemy.isBoss ? '#f59e0b' : enemy.slowTimer > 0 ? '#06b6d4' : '#ef4444';
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
            ctx.fill();

            // HP bar
            const barW = enemy.size * 2;
            ctx.fillStyle = '#333';
            ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.size - 8, barW, 4);
            ctx.fillStyle = '#10b981';
            ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.size - 8, (enemy.hp / enemy.maxHp) * barW, 4);
        });

        // Projectiles
        state.projectiles.forEach(proj => {
            ctx.fillStyle = proj.color;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        // Particles
        state.particles.forEach(p => {
            ctx.globalAlpha = p.life / 20;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, 50);

        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`Guld: ${state.gold}`, 20, 32);
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`Liv: ${state.lives}`, 160, 32);
        ctx.fillStyle = '#a78bfa';
        ctx.fillText(`Våg: ${state.wave}`, 280, 32);

        if (!state.spawning && !state.gameOver) {
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`Nästa våg: ${Math.ceil(state.waveTimer / 60)}s`, 400, 32);
        }

        // Tower selection
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, canvas.height - 70, canvas.width, 70);

        towerTypes.forEach((type, i) => {
            const x = 20 + i * 160;
            const y = canvas.height - 60;
            const selected = state.selectedTower === i;

            ctx.fillStyle = selected ? 'rgba(124, 58, 237, 0.3)' : 'rgba(255,255,255,0.05)';
            ctx.strokeStyle = selected ? '#7c3aed' : 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x, y, 140, 50, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = type.color;
            ctx.beginPath();
            ctx.arc(x + 20, y + 25, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'white';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`[${type.key}] ${type.name}`, x + 36, y + 22);
            ctx.fillStyle = '#f59e0b';
            ctx.font = '12px sans-serif';
            ctx.fillText(`${type.cost}g`, x + 36, y + 40);
        });

        // Game over
        if (state.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 48px sans-serif';
            ctx.fillText('BASEN FÖLL!', canvas.width / 2, canvas.height / 2 - 30);
            ctx.fillStyle = 'white';
            ctx.font = '20px sans-serif';
            ctx.fillText(`Du klarade ${state.wave} vågor`, canvas.width / 2, canvas.height / 2 + 20);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '16px sans-serif';
            ctx.fillText('Klicka "Tillbaka till Lobby" för att återgå', canvas.width / 2, canvas.height / 2 + 60);
        }
    }

    update();

    return function cleanup() {
        state.running = false;
        cancelAnimationFrame(animId);
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('click', onClick);
        document.removeEventListener('keydown', onKeyDown);
    };
}
