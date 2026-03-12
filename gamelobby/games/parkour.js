/* ===== PARKOUR OBBY - Side-scrolling platformer ===== */

function startParkour(container) {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const GRAVITY = 0.5;
    const JUMP_FORCE = -10;
    const MOVE_SPEED = 5;

    const state = {
        running: true,
        player: {
            x: 100,
            y: 300,
            vy: 0,
            vx: 0,
            width: 24,
            height: 32,
            grounded: false,
            jumps: 0,
            maxJumps: 2,
            deaths: 0,
            checkpoint: 0,
            color: '#7c3aed',
            facing: 1,
            squash: 1,
            trail: []
        },
        camera: { x: 0, y: 0 },
        keys: {},
        platforms: [],
        hazards: [],
        checkpoints: [],
        coins: [],
        coinsCollected: 0,
        totalCoins: 0,
        particles: [],
        level: 0,
        time: 0,
        finished: false,
        finishX: 0
    };

    // Generate level
    function generateLevel() {
        const platforms = [];
        const hazards = [];
        const checkpoints = [];
        const coins = [];

        // Ground start
        platforms.push({ x: 0, y: 500, w: 300, h: 40, color: '#1e3a5f' });

        let lastX = 200;
        let lastY = 500;

        // Generate platforming sections
        for (let section = 0; section < 8; section++) {
            const sectionType = section % 4;

            switch (sectionType) {
                case 0: // Simple gaps
                    for (let i = 0; i < 5; i++) {
                        const gapSize = 80 + Math.random() * 60;
                        lastX += gapSize;
                        lastY = 400 + Math.random() * 150;
                        const pw = 60 + Math.random() * 80;
                        platforms.push({ x: lastX, y: lastY, w: pw, h: 20, color: '#1e3a5f' });
                        coins.push({ x: lastX + pw / 2, y: lastY - 40, collected: false });
                        lastX += pw;
                    }
                    break;

                case 1: // Moving platforms (simulated with wider gaps)
                    for (let i = 0; i < 4; i++) {
                        lastX += 100;
                        lastY -= 30 + Math.random() * 30;
                        lastY = Math.max(150, Math.min(500, lastY));
                        const pw = 80;
                        platforms.push({
                            x: lastX, y: lastY, w: pw, h: 20,
                            color: '#2563eb',
                            moving: true,
                            baseY: lastY,
                            amplitude: 40 + Math.random() * 30,
                            speed: 0.02 + Math.random() * 0.01
                        });
                        coins.push({ x: lastX + pw / 2, y: lastY - 50, collected: false });
                        lastX += pw;
                    }
                    // Spikes
                    hazards.push({ x: lastX - 200, y: lastY + 100, w: 200, h: 20 });
                    break;

                case 2: // Vertical climbing
                    for (let i = 0; i < 6; i++) {
                        const side = i % 2 === 0 ? 1 : -1;
                        lastX += side * 60 + 30;
                        lastY -= 60;
                        lastY = Math.max(100, lastY);
                        platforms.push({ x: lastX, y: lastY, w: 70, h: 15, color: '#16a34a' });
                        if (i % 2 === 0) coins.push({ x: lastX + 35, y: lastY - 30, collected: false });
                    }
                    break;

                case 3: // Long run with hazards
                    platforms.push({ x: lastX + 60, y: lastY + 60, w: 600, h: 30, color: '#1e3a5f' });
                    lastY += 60;
                    for (let i = 0; i < 4; i++) {
                        hazards.push({
                            x: lastX + 120 + i * 130,
                            y: lastY - 20,
                            w: 30, h: 20
                        });
                        coins.push({
                            x: lastX + 135 + i * 130,
                            y: lastY - 80,
                            collected: false
                        });
                    }
                    lastX += 600;
                    break;
            }

            // Checkpoint every 2 sections
            if (section % 2 === 1) {
                checkpoints.push({ x: lastX, y: lastY - 60, activated: false });
            }
        }

        // Finish platform
        lastX += 100;
        platforms.push({ x: lastX, y: lastY, w: 200, h: 40, color: '#f59e0b' });
        state.finishX = lastX + 100;

        state.platforms = platforms;
        state.hazards = hazards;
        state.checkpoints = checkpoints;
        state.coins = coins;
        state.totalCoins = coins.length;
    }

    generateLevel();

    // Input
    function onKeyDown(e) {
        state.keys[e.key.toLowerCase()] = true;
        if ((e.key === ' ' || e.key === 'w' || e.key === 'ArrowUp') && !state.finished) {
            jump();
        }
        e.preventDefault();
    }
    function onKeyUp(e) { state.keys[e.key.toLowerCase()] = false; }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    function jump() {
        const p = state.player;
        if (p.jumps < p.maxJumps) {
            p.vy = JUMP_FORCE;
            p.jumps++;
            p.squash = 0.7;
            // Jump particles
            for (let i = 0; i < 6; i++) {
                state.particles.push({
                    x: p.x + p.width / 2,
                    y: p.y + p.height,
                    vx: (Math.random() - 0.5) * 3,
                    vy: Math.random() * 2,
                    life: 20,
                    color: '#a78bfa'
                });
            }
        }
    }

    function respawn() {
        const p = state.player;
        p.deaths++;
        const cp = state.checkpoints.filter(c => c.activated).pop();
        if (cp) {
            p.x = cp.x;
            p.y = cp.y - 40;
        } else {
            p.x = 100;
            p.y = 300;
        }
        p.vy = 0;
        p.vx = 0;
        p.jumps = 0;

        // Death particles
        for (let i = 0; i < 15; i++) {
            state.particles.push({
                x: p.x + p.width / 2,
                y: p.y + p.height / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30,
                color: '#ef4444'
            });
        }
    }

    let animId;
    function update() {
        if (!state.running) return;
        animId = requestAnimationFrame(update);
        state.time++;

        if (state.finished) { draw(); return; }

        const p = state.player;

        // Horizontal movement
        if (state.keys['a'] || state.keys['arrowleft']) {
            p.vx = -MOVE_SPEED;
            p.facing = -1;
        } else if (state.keys['d'] || state.keys['arrowright']) {
            p.vx = MOVE_SPEED;
            p.facing = 1;
        } else {
            p.vx *= 0.8;
        }

        // Gravity
        p.vy += GRAVITY;
        p.x += p.vx;
        p.y += p.vy;

        // Squash recovery
        p.squash += (1 - p.squash) * 0.2;

        // Trail
        if (Math.abs(p.vx) > 1 || Math.abs(p.vy) > 1) {
            p.trail.push({ x: p.x + p.width / 2, y: p.y + p.height / 2, life: 15 });
            if (p.trail.length > 20) p.trail.shift();
        }
        p.trail.forEach(t => t.life--);
        p.trail = p.trail.filter(t => t.life > 0);

        // Update moving platforms
        state.platforms.forEach(plat => {
            if (plat.moving) {
                plat.y = plat.baseY + Math.sin(state.time * plat.speed) * plat.amplitude;
            }
        });

        // Platform collisions
        p.grounded = false;
        state.platforms.forEach(plat => {
            if (p.x + p.width > plat.x && p.x < plat.x + plat.w) {
                // Landing on top
                if (p.vy > 0 && p.y + p.height > plat.y && p.y + p.height < plat.y + plat.h + p.vy + 2) {
                    p.y = plat.y - p.height;
                    p.vy = 0;
                    p.grounded = true;
                    p.jumps = 0;
                    if (plat.moving) {
                        p.y = plat.y - p.height;
                    }
                }
                // Hitting from below
                else if (p.vy < 0 && p.y < plat.y + plat.h && p.y > plat.y) {
                    p.y = plat.y + plat.h;
                    p.vy = 0;
                }
            }
        });

        // Hazard collision
        state.hazards.forEach(h => {
            if (p.x + p.width > h.x && p.x < h.x + h.w &&
                p.y + p.height > h.y && p.y < h.y + h.h) {
                respawn();
            }
        });

        // Fall death
        if (p.y > 800) {
            respawn();
        }

        // Checkpoints
        state.checkpoints.forEach(cp => {
            if (!cp.activated && Math.hypot(p.x - cp.x, p.y - cp.y) < 50) {
                cp.activated = true;
                for (let i = 0; i < 10; i++) {
                    state.particles.push({
                        x: cp.x, y: cp.y,
                        vx: (Math.random() - 0.5) * 4,
                        vy: (Math.random() - 0.5) * 4,
                        life: 30, color: '#10b981'
                    });
                }
            }
        });

        // Coins
        state.coins.forEach(coin => {
            if (!coin.collected && Math.hypot(p.x + p.width / 2 - coin.x, p.y + p.height / 2 - coin.y) < 24) {
                coin.collected = true;
                state.coinsCollected++;
                for (let i = 0; i < 6; i++) {
                    state.particles.push({
                        x: coin.x, y: coin.y,
                        vx: (Math.random() - 0.5) * 3,
                        vy: (Math.random() - 0.5) * 3,
                        life: 20, color: '#f59e0b'
                    });
                }
            }
        });

        // Finish
        if (p.x > state.finishX - 50 && p.x < state.finishX + 50) {
            state.finished = true;
        }

        // Camera
        state.camera.x += (p.x - canvas.width / 3 - state.camera.x) * 0.08;
        state.camera.y += (p.y - canvas.height / 2 - state.camera.y) * 0.08;

        // Particles
        state.particles.forEach(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.1; pt.life--; });
        state.particles = state.particles.filter(pt => pt.life > 0);

        draw();
    }

    function draw() {
        // Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGrad.addColorStop(0, '#0a0a2e');
        skyGrad.addColorStop(1, '#1a1a4e');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Stars
        for (let i = 0; i < 50; i++) {
            const sx = (i * 137.5 + state.time * 0.02) % canvas.width;
            const sy = (i * 97.3) % (canvas.height * 0.6);
            ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(state.time * 0.02 + i) * 0.2})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 1, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.translate(-state.camera.x, -state.camera.y);

        // Platforms
        state.platforms.forEach(plat => {
            ctx.fillStyle = plat.color;
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            // Top highlight
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(plat.x, plat.y, plat.w, 3);
            // Moving indicator
            if (plat.moving) {
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(plat.x - 2, plat.y - 2, plat.w + 4, plat.h + 4);
                ctx.setLineDash([]);
            }
        });

        // Hazards (spikes)
        state.hazards.forEach(h => {
            ctx.fillStyle = '#ef4444';
            const spikes = Math.floor(h.w / 10);
            for (let i = 0; i < spikes; i++) {
                ctx.beginPath();
                ctx.moveTo(h.x + i * 10, h.y + h.h);
                ctx.lineTo(h.x + i * 10 + 5, h.y);
                ctx.lineTo(h.x + i * 10 + 10, h.y + h.h);
                ctx.fill();
            }
        });

        // Checkpoints
        state.checkpoints.forEach(cp => {
            ctx.fillStyle = cp.activated ? '#10b981' : '#4b5563';
            ctx.fillRect(cp.x - 3, cp.y, 6, 50);
            // Flag
            ctx.fillStyle = cp.activated ? '#10b981' : '#ef4444';
            ctx.beginPath();
            ctx.moveTo(cp.x + 3, cp.y);
            ctx.lineTo(cp.x + 25, cp.y + 10);
            ctx.lineTo(cp.x + 3, cp.y + 20);
            ctx.fill();
        });

        // Coins
        state.coins.forEach(coin => {
            if (coin.collected) return;
            const bobY = Math.sin(state.time * 0.05 + coin.x) * 4;
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(coin.x, coin.y + bobY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(coin.x - 1, coin.y + bobY - 1, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Finish flag
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(state.finishX - 3, state.platforms[state.platforms.length - 1].y - 60, 6, 60);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MÅL', state.finishX, state.platforms[state.platforms.length - 1].y - 70);

        // Player trail
        state.player.trail.forEach(t => {
            ctx.globalAlpha = t.life / 15 * 0.3;
            ctx.fillStyle = '#a78bfa';
            ctx.beginPath();
            ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Player
        const p = state.player;
        ctx.save();
        ctx.translate(p.x + p.width / 2, p.y + p.height);
        ctx.scale(p.facing, 1);
        ctx.scale(1 / p.squash, p.squash);

        // Body
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.width / 2, -p.height, p.width, p.height);

        // Eyes
        ctx.fillStyle = 'white';
        ctx.fillRect(2, -p.height + 8, 7, 7);
        ctx.fillRect(-2, -p.height + 8, 7, 7);
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(6, -p.height + 10, 3, 4);
        ctx.fillRect(2, -p.height + 10, 3, 4);

        ctx.restore();

        // Particles
        state.particles.forEach(pt => {
            ctx.globalAlpha = pt.life / 30;
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        ctx.restore();

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, 50);

        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`Mynt: ${state.coinsCollected}/${state.totalCoins}`, 20, 32);
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`Dödsfall: ${state.player.deaths}`, 200, 32);
        ctx.fillStyle = '#a78bfa';
        ctx.fillText(`Tid: ${(state.time / 60).toFixed(1)}s`, 360, 32);

        // Double jump indicator
        const jumpsLeft = state.player.maxJumps - state.player.jumps;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(canvas.width - 130, canvas.height - 50, 110, 35);
        ctx.font = '13px sans-serif';
        ctx.fillStyle = jumpsLeft > 0 ? '#10b981' : '#ef4444';
        ctx.textAlign = 'center';
        ctx.fillText(`Hopp: ${'●'.repeat(jumpsLeft)}${'○'.repeat(state.player.jumps)}`, canvas.width - 75, canvas.height - 28);

        // Controls
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('A/D = röra sig | W/SPACE = hoppa (dubbel-hopp!)', canvas.width / 2, canvas.height - 16);

        // Finished screen
        if (state.finished) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 48px sans-serif';
            ctx.fillText('KLART!', canvas.width / 2, canvas.height / 2 - 50);

            ctx.fillStyle = 'white';
            ctx.font = '20px sans-serif';
            ctx.fillText(`Mynt: ${state.coinsCollected}/${state.totalCoins}`, canvas.width / 2, canvas.height / 2);
            ctx.fillText(`Dödsfall: ${state.player.deaths}`, canvas.width / 2, canvas.height / 2 + 30);
            ctx.fillText(`Tid: ${(state.time / 60).toFixed(1)}s`, canvas.width / 2, canvas.height / 2 + 60);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '16px sans-serif';
            ctx.fillText('Klicka "Tillbaka till Lobby" för att återgå', canvas.width / 2, canvas.height / 2 + 100);
        }
    }

    update();

    return function cleanup() {
        state.running = false;
        cancelAnimationFrame(animId);
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
    };
}
