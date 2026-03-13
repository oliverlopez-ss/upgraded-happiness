/* ===== TURBO RACING - Top-down racing game ===== */

function startRacing(container) {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Track - oval with curves
    const trackCenter = { x: canvas.width / 2, y: canvas.height / 2 };
    const trackRadiusX = Math.min(canvas.width * 0.38, 500);
    const trackRadiusY = Math.min(canvas.height * 0.35, 300);
    const trackWidth = 80;

    // Checkpoints around the track
    const checkpoints = [];
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        checkpoints.push({
            x: trackCenter.x + Math.cos(angle) * trackRadiusX,
            y: trackCenter.y + Math.sin(angle) * trackRadiusY,
            angle
        });
    }

    const state = {
        running: true,
        player: {
            x: checkpoints[0].x,
            y: checkpoints[0].y + trackWidth / 3,
            angle: 0,
            speed: 0,
            maxSpeed: 6,
            acceleration: 0.12,
            turnSpeed: 0.04,
            lap: 0,
            checkpoint: 0,
            totalCheckpoints: 0,
            boost: 100,
            boosting: false,
            color: '#7c3aed',
            trail: []
        },
        opponents: [],
        keys: {},
        countdown: 180,
        raceStarted: false,
        laps: 3,
        finished: false,
        time: 0,
        raceTime: 0,
        bestLapTime: Infinity,
        lapStartTime: 0,
        particles: []
    };

    // Create opponents
    const opponentColors = ['#ef4444', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
    for (let i = 0; i < 5; i++) {
        state.opponents.push({
            x: checkpoints[0].x,
            y: checkpoints[0].y - trackWidth / 4 + i * 12,
            angle: 0,
            speed: 3.5 + Math.random() * 2,
            targetSpeed: 4 + Math.random() * 1.5,
            checkpoint: 0,
            lap: 0,
            totalCheckpoints: 0,
            color: opponentColors[i],
            name: ['Blixten', 'Turbo', 'Racer', 'Spåret', 'Nitro'][i],
            trail: [],
            finished: false
        });
    }

    // Input
    function onKeyDown(e) { state.keys[e.key.toLowerCase()] = true; e.preventDefault(); }
    function onKeyUp(e) { state.keys[e.key.toLowerCase()] = false; }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    function getTrackAngleAt(x, y) {
        const dx = x - trackCenter.x;
        const dy = y - trackCenter.y;
        return Math.atan2(dy / trackRadiusY, dx / trackRadiusX);
    }

    function isOnTrack(x, y) {
        const normX = (x - trackCenter.x) / trackRadiusX;
        const normY = (y - trackCenter.y) / trackRadiusY;
        const dist = Math.sqrt(normX * normX + normY * normY);
        return Math.abs(dist - 1) < trackWidth / (2 * Math.min(trackRadiusX, trackRadiusY)) * 3;
    }

    function checkCheckpoint(entity) {
        const next = checkpoints[(entity.checkpoint + 1) % checkpoints.length];
        const dist = Math.hypot(entity.x - next.x, entity.y - next.y);
        if (dist < 50) {
            entity.checkpoint = (entity.checkpoint + 1) % checkpoints.length;
            entity.totalCheckpoints++;
            if (entity.checkpoint === 0) {
                entity.lap++;
            }
        }
    }

    let animId;
    function update() {
        if (!state.running) return;
        animId = requestAnimationFrame(update);
        state.time++;

        // Countdown
        if (state.countdown > 0) {
            state.countdown--;
            if (state.countdown <= 0) {
                state.raceStarted = true;
                state.lapStartTime = state.time;
            }
            draw();
            return;
        }

        if (state.finished) { draw(); return; }

        state.raceTime++;
        const p = state.player;

        // Player controls
        if (state.keys['w'] || state.keys['arrowup']) {
            p.speed = Math.min(p.speed + p.acceleration, p.maxSpeed);
        } else if (state.keys['s'] || state.keys['arrowdown']) {
            p.speed = Math.max(p.speed - p.acceleration * 1.5, -2);
        } else {
            p.speed *= 0.98;
        }

        if (state.keys['a'] || state.keys['arrowleft']) p.angle -= p.turnSpeed * (p.speed > 0 ? 1 : -1);
        if (state.keys['d'] || state.keys['arrowright']) p.angle += p.turnSpeed * (p.speed > 0 ? 1 : -1);

        // Boost
        if (state.keys[' '] && p.boost > 0) {
            p.boosting = true;
            p.boost -= 0.5;
            p.speed = Math.min(p.speed + 0.3, p.maxSpeed * 1.5);
        } else {
            p.boosting = false;
            if (p.boost < 100) p.boost += 0.1;
        }

        // Off-track penalty
        if (!isOnTrack(p.x, p.y)) {
            p.speed *= 0.95;
        }

        // Move player
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;

        // Trail
        if (Math.abs(p.speed) > 1) {
            p.trail.push({ x: p.x, y: p.y, life: 30 });
            if (p.trail.length > 50) p.trail.shift();
        }
        p.trail.forEach(t => t.life--);
        p.trail = p.trail.filter(t => t.life > 0);

        // Boost particles
        if (p.boosting) {
            for (let i = 0; i < 2; i++) {
                state.particles.push({
                    x: p.x - Math.cos(p.angle) * 15,
                    y: p.y - Math.sin(p.angle) * 15,
                    vx: -Math.cos(p.angle) * 3 + (Math.random() - 0.5) * 2,
                    vy: -Math.sin(p.angle) * 3 + (Math.random() - 0.5) * 2,
                    life: 15,
                    color: '#f59e0b'
                });
            }
        }

        checkCheckpoint(p);

        // Check lap time
        if (p.lap > 0 && p.checkpoint === 0) {
            const lapTime = state.time - state.lapStartTime;
            if (lapTime < state.bestLapTime) state.bestLapTime = lapTime;
            state.lapStartTime = state.time;
        }

        if (p.lap >= state.laps) {
            state.finished = true;
        }

        // Opponents AI
        state.opponents.forEach(opp => {
            if (opp.finished) return;
            const nextCP = checkpoints[(opp.checkpoint + 1) % checkpoints.length];
            const targetAngle = Math.atan2(nextCP.y - opp.y, nextCP.x - opp.x);

            // Smooth turning
            let angleDiff = targetAngle - opp.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            opp.angle += angleDiff * 0.06;

            // Speed variation
            opp.speed += (opp.targetSpeed - opp.speed) * 0.05;
            opp.speed += (Math.random() - 0.5) * 0.1;

            opp.x += Math.cos(opp.angle) * opp.speed;
            opp.y += Math.sin(opp.angle) * opp.speed;

            opp.trail.push({ x: opp.x, y: opp.y, life: 20 });
            if (opp.trail.length > 30) opp.trail.shift();
            opp.trail.forEach(t => t.life--);
            opp.trail = opp.trail.filter(t => t.life > 0);

            checkCheckpoint(opp);
            if (opp.lap >= state.laps) opp.finished = true;
        });

        // Particles
        state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
        state.particles = state.particles.filter(p => p.life > 0);

        draw();
    }

    function draw() {
        // Background
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Track
        ctx.strokeStyle = '#2a2a4a';
        ctx.lineWidth = trackWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.ellipse(trackCenter.x, trackCenter.y, trackRadiusX, trackRadiusY, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Track border lines
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(trackCenter.x, trackCenter.y, trackRadiusX + trackWidth / 2, trackRadiusY + trackWidth / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(trackCenter.x, trackCenter.y, trackRadiusX - trackWidth / 2, trackRadiusY - trackWidth / 2, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Start/finish line
        const startX = checkpoints[0].x;
        const startY = checkpoints[0].y;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(startX, startY - trackWidth / 2);
        ctx.lineTo(startX, startY + trackWidth / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Checkpoints (subtle)
        checkpoints.forEach((cp, i) => {
            ctx.fillStyle = i <= state.player.checkpoint ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.05)';
            ctx.beginPath();
            ctx.arc(cp.x, cp.y, 8, 0, Math.PI * 2);
            ctx.fill();
        });

        // Trails
        function drawTrail(trail, color) {
            trail.forEach(t => {
                ctx.globalAlpha = t.life / 30 * 0.3;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        }

        state.opponents.forEach(opp => drawTrail(opp.trail, opp.color));
        drawTrail(state.player.trail, state.player.color);

        // Particles
        state.particles.forEach(p => {
            ctx.globalAlpha = p.life / 15;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Draw cars
        function drawCar(entity, label) {
            ctx.save();
            ctx.translate(entity.x, entity.y);
            ctx.rotate(entity.angle);

            // Car body
            ctx.fillStyle = entity.color;
            ctx.fillRect(-12, -7, 24, 14);
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(6, -5, 5, 10);

            // Wheels
            ctx.fillStyle = '#333';
            ctx.fillRect(-10, -9, 6, 3);
            ctx.fillRect(-10, 6, 6, 3);
            ctx.fillRect(4, -9, 6, 3);
            ctx.fillRect(4, 6, 6, 3);

            ctx.restore();

            // Name label
            if (label) {
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(label, entity.x, entity.y - 16);
            }
        }

        state.opponents.forEach(opp => drawCar(opp, opp.name));
        drawCar(state.player, state.player.boosting ? 'BOOST!' : null);

        // Boost glow
        if (state.player.boosting) {
            const gradient = ctx.createRadialGradient(
                state.player.x, state.player.y, 0,
                state.player.x, state.player.y, 30
            );
            gradient.addColorStop(0, 'rgba(245, 158, 11, 0.3)');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(state.player.x, state.player.y, 30, 0, Math.PI * 2);
            ctx.fill();
        }

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, 50);

        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#a78bfa';
        ctx.fillText(`Varv: ${Math.min(state.player.lap + 1, state.laps)}/${state.laps}`, 20, 32);

        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`Tid: ${(state.raceTime / 60).toFixed(1)}s`, 160, 32);

        // Speed gauge
        ctx.fillStyle = '#10b981';
        ctx.fillText(`Fart: ${Math.abs(Math.round(state.player.speed * 30))} km/h`, 320, 32);

        // Boost bar
        const boostX = canvas.width - 220;
        ctx.fillStyle = '#333';
        ctx.fillRect(boostX, 18, 200, 16);
        ctx.fillStyle = state.player.boost > 20 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(boostX, 18, state.player.boost * 2, 16);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BOOST [SPACE]', boostX + 100, 30);

        // Position
        const allRacers = [
            { name: 'Du', total: state.player.totalCheckpoints, lap: state.player.lap },
            ...state.opponents.map(o => ({ name: o.name, total: o.totalCheckpoints, lap: o.lap }))
        ].sort((a, b) => b.total - a.total);

        const position = allRacers.findIndex(r => r.name === 'Du') + 1;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(canvas.width - 60, 56, 50, 40);
        ctx.fillStyle = position <= 3 ? '#f59e0b' : 'white';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`#${position}`, canvas.width - 35, 86);

        // Countdown
        if (state.countdown > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 80px sans-serif';
            ctx.textAlign = 'center';
            const sec = Math.ceil(state.countdown / 60);
            ctx.fillText(sec > 0 ? sec.toString() : 'KÖR!', canvas.width / 2, canvas.height / 2);
        }

        // Finished
        if (state.finished) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 48px sans-serif';
            ctx.fillText(`Mål! Plats #${position}`, canvas.width / 2, canvas.height / 2 - 30);
            ctx.fillStyle = 'white';
            ctx.font = '20px sans-serif';
            ctx.fillText(`Tid: ${(state.raceTime / 60).toFixed(1)}s`, canvas.width / 2, canvas.height / 2 + 20);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '16px sans-serif';
            ctx.fillText('Klicka "Tillbaka till Lobby" för att återgå', canvas.width / 2, canvas.height / 2 + 60);
        }

        // Controls
        if (!state.finished) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('WASD = styra | SPACE = boost', canvas.width / 2, canvas.height - 20);
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
