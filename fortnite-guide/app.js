// Fortnite Pro Guide - Game Engine & App Logic
(function() {
  'use strict';

  // ===== STATE =====
  const state = {
    currentTab: 'lobby',
    currentCategory: null,
    currentGuide: null,
    isPremium: false,
    completedGuides: JSON.parse(localStorage.getItem('fn_completed') || '[]'),
    menuOpen: true,
    selectedWeaponSlot: 0,
    health: 100,
    shield: 75,
    materials: { wood: 487, brick: 234, metal: 156 },
    aliveCount: 47,
    killCount: 3,
    history: []
  };

  // DOM shortcuts
  const $ = id => document.getElementById(id);

  // ===== GAME CANVAS - 3D-LIKE LANDSCAPE =====
  function initGameCanvas() {
    const canvas = $('gameCanvas');
    const ctx = canvas.getContext('2d');
    let w, h;
    let time = 0;

    // Terrain points
    const mountains = [];
    const trees = [];
    const buildings = [];
    const stormParticles = [];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      generateTerrain();
    }

    function generateTerrain() {
      mountains.length = 0;
      trees.length = 0;
      buildings.length = 0;

      // Background mountains
      for (let i = 0; i < 12; i++) {
        mountains.push({
          x: (w / 11) * i - 50,
          height: 80 + Math.random() * 120,
          width: 100 + Math.random() * 150,
          layer: Math.floor(Math.random() * 3)
        });
      }

      // Trees
      for (let i = 0; i < 20; i++) {
        trees.push({
          x: Math.random() * w,
          y: h * 0.55 + Math.random() * (h * 0.25),
          size: 8 + Math.random() * 20,
          sway: Math.random() * Math.PI * 2
        });
      }

      // Fortnite-style buildings
      for (let i = 0; i < 6; i++) {
        buildings.push({
          x: 50 + Math.random() * (w - 100),
          y: h * 0.5 + Math.random() * (h * 0.15),
          width: 30 + Math.random() * 50,
          height: 40 + Math.random() * 80,
          floors: 1 + Math.floor(Math.random() * 3),
          edited: Math.random() > 0.5
        });
      }

      // Storm particles
      stormParticles.length = 0;
      for (let i = 0; i < 30; i++) {
        stormParticles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: 1 + Math.random() * 3,
          speed: 0.3 + Math.random() * 0.8,
          angle: Math.random() * Math.PI * 2
        });
      }
    }

    function drawSky(t) {
      // Gradient sky
      const grad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      grad.addColorStop(0, '#0a0e2a');
      grad.addColorStop(0.4, '#151a3a');
      grad.addColorStop(0.7, '#1a2040');
      grad.addColorStop(1, '#1e2850');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 80; i++) {
        const sx = (i * 173.7 + t * 0.01) % w;
        const sy = (i * 89.3) % (h * 0.5);
        const blink = Math.sin(t * 0.02 + i) * 0.3 + 0.5;
        ctx.globalAlpha = blink;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;

      // Moon
      const moonX = w * 0.8;
      const moonY = h * 0.12;
      const moonGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 50);
      moonGrad.addColorStop(0, 'rgba(200,220,255,0.8)');
      moonGrad.addColorStop(0.5, 'rgba(200,220,255,0.2)');
      moonGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = moonGrad;
      ctx.fillRect(moonX - 50, moonY - 50, 100, 100);
      ctx.beginPath();
      ctx.arc(moonX, moonY, 18, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(220,230,255,0.9)';
      ctx.fill();
    }

    function drawMountains(t) {
      const layers = [
        { color: '#0d1225', yBase: h * 0.55, scale: 1.0 },
        { color: '#111830', yBase: h * 0.5, scale: 0.8 },
        { color: '#0a0f1e', yBase: h * 0.58, scale: 1.2 }
      ];

      mountains.forEach(m => {
        const layer = layers[m.layer];
        const sway = Math.sin(t * 0.001 + m.x * 0.01) * 2;
        ctx.fillStyle = layer.color;
        ctx.beginPath();
        ctx.moveTo(m.x - m.width / 2, layer.yBase + sway);
        ctx.lineTo(m.x, layer.yBase - m.height * layer.scale + sway);
        ctx.lineTo(m.x + m.width / 2, layer.yBase + sway);
        ctx.closePath();
        ctx.fill();
      });
    }

    function drawGround(t) {
      // Ground gradient
      const groundY = h * 0.6;
      const gGrad = ctx.createLinearGradient(0, groundY, 0, h);
      gGrad.addColorStop(0, '#162a15');
      gGrad.addColorStop(0.3, '#0f1e0e');
      gGrad.addColorStop(1, '#0a140a');
      ctx.fillStyle = gGrad;
      ctx.fillRect(0, groundY, w, h - groundY);

      // Grid lines (Fortnite build grid feel)
      ctx.strokeStyle = 'rgba(0,212,255,0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      const offset = (t * 0.3) % gridSize;
      for (let x = -gridSize + offset; x < w + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x - 60, h);
        ctx.stroke();
      }
      for (let y = groundY; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    function drawBuildings(t) {
      buildings.forEach(b => {
        // Building body
        ctx.fillStyle = 'rgba(30,40,60,0.9)';
        ctx.fillRect(b.x, b.y - b.height, b.width, b.height);

        // Grid pattern on building (Fortnite edit squares)
        const cellW = b.width / 3;
        const cellH = b.height / (b.floors * 3);
        ctx.strokeStyle = 'rgba(0,212,255,0.08)';
        ctx.lineWidth = 0.5;

        for (let row = 0; row < b.floors * 3; row++) {
          for (let col = 0; col < 3; col++) {
            const cx = b.x + col * cellW;
            const cy = b.y - b.height + row * cellH;
            ctx.strokeRect(cx, cy, cellW, cellH);

            // Some edited (removed) squares
            if (b.edited && row === 1 && col === 1) {
              ctx.fillStyle = 'rgba(0,0,0,0.5)';
              ctx.fillRect(cx + 1, cy + 1, cellW - 2, cellH - 2);
            }
          }
        }

        // Glow from windows
        if (Math.sin(t * 0.003 + b.x) > 0) {
          ctx.fillStyle = 'rgba(255,200,50,0.05)';
          ctx.fillRect(b.x + cellW, b.y - b.height + cellH, cellW, cellH);
        }

        // Blue outline (selected building)
        ctx.strokeStyle = 'rgba(0,212,255,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x, b.y - b.height, b.width, b.height);
      });
    }

    function drawTrees(t) {
      trees.forEach(tree => {
        const sway = Math.sin(t * 0.002 + tree.sway) * 3;

        // Trunk
        ctx.fillStyle = '#2a1f14';
        ctx.fillRect(tree.x - 2, tree.y - tree.size * 1.5, 4, tree.size * 1.5);

        // Foliage
        ctx.fillStyle = '#1a3a1a';
        ctx.beginPath();
        ctx.arc(tree.x + sway, tree.y - tree.size * 2, tree.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1f4520';
        ctx.beginPath();
        ctx.arc(tree.x + sway * 0.8, tree.y - tree.size * 2.3, tree.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawCharacter(t) {
      const cx = w * 0.5;
      const cy = h * 0.55;
      const bob = Math.sin(t * 0.003) * 3;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2, 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      const legSwing = Math.sin(t * 0.005) * 5;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(cx - 10, cy - 30 + bob, 7, 30);
      ctx.fillRect(cx + 3, cy - 30 + bob, 7, 30);

      // Body (armor)
      ctx.fillStyle = '#2a2a4e';
      ctx.fillRect(cx - 14, cy - 60 + bob, 28, 35);

      // Armor detail
      ctx.fillStyle = 'rgba(0,212,255,0.2)';
      ctx.fillRect(cx - 12, cy - 55 + bob, 24, 3);
      ctx.fillRect(cx - 5, cy - 50 + bob, 10, 20);

      // Shield glow
      const shieldPulse = Math.sin(t * 0.004) * 0.1 + 0.2;
      ctx.strokeStyle = `rgba(0,212,255,${shieldPulse})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 16, cy - 62 + bob, 32, 38);

      // Head
      ctx.fillStyle = '#d4a574';
      ctx.beginPath();
      ctx.arc(cx, cy - 68 + bob, 10, 0, Math.PI * 2);
      ctx.fill();

      // Helmet
      ctx.fillStyle = '#333355';
      ctx.beginPath();
      ctx.arc(cx, cy - 72 + bob, 11, Math.PI, 0);
      ctx.fill();

      // Visor
      ctx.fillStyle = 'rgba(0,212,255,0.5)';
      ctx.fillRect(cx - 7, cy - 71 + bob, 14, 4);

      // Arms
      ctx.fillStyle = '#2a2a4e';
      // Left arm
      ctx.save();
      ctx.translate(cx - 14, cy - 55 + bob);
      ctx.rotate(-0.2 + Math.sin(t * 0.004) * 0.1);
      ctx.fillRect(-7, 0, 7, 25);
      ctx.restore();

      // Right arm (holding weapon)
      ctx.save();
      ctx.translate(cx + 14, cy - 55 + bob);
      ctx.rotate(0.3 + Math.sin(t * 0.004) * 0.05);
      ctx.fillRect(0, 0, 7, 25);
      // Weapon (AR)
      ctx.fillStyle = '#444';
      ctx.fillRect(4, 5, 25, 4);
      ctx.fillRect(4, 3, 6, 8);
      ctx.fillStyle = 'rgba(255,200,50,0.3)';
      ctx.fillRect(28, 5, 3, 4);
      ctx.restore();

      // Backbling (shield)
      ctx.fillStyle = '#222244';
      ctx.fillRect(cx + 12, cy - 58 + bob, 8, 20);
      ctx.strokeStyle = 'rgba(177,78,255,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + 12, cy - 58 + bob, 8, 20);
    }

    function drawStormParticles(t) {
      ctx.fillStyle = 'rgba(175,82,222,0.3)';
      stormParticles.forEach(p => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed - 0.2;
        p.angle += 0.01;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.globalAlpha = 0.3 + Math.sin(t * 0.003 + p.x) * 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function drawVignette() {
      const vGrad = ctx.createRadialGradient(w/2, h/2, h*0.3, w/2, h/2, h*0.8);
      vGrad.addColorStop(0, 'transparent');
      vGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, w, h);
    }

    function render() {
      time++;
      ctx.clearRect(0, 0, w, h);
      drawSky(time);
      drawMountains(time);
      drawGround(time);
      drawBuildings(time);
      drawTrees(time);
      drawCharacter(time);
      drawStormParticles(time);
      drawVignette();
      requestAnimationFrame(render);
    }

    window.addEventListener('resize', resize);
    resize();
    render();
  }

  // ===== MINIMAP =====
  function initMinimap() {
    const canvas = $('minimapCanvas');
    const ctx = canvas.getContext('2d');
    let time = 0;

    function draw() {
      time++;
      ctx.clearRect(0, 0, 120, 120);

      // Background
      ctx.fillStyle = '#0a1a0a';
      ctx.fillRect(0, 0, 120, 120);

      // Grid
      ctx.strokeStyle = 'rgba(0,212,255,0.08)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 120; i += 15) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 120); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(120, i); ctx.stroke();
      }

      // POI dots
      const pois = [[30,40],[70,30],[90,80],[20,90],[60,60],[40,20],[100,40]];
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      pois.forEach(([x,y]) => {
        ctx.fillRect(x-2, y-2, 4, 4);
      });

      // Storm zone
      ctx.strokeStyle = `rgba(175,82,222,${0.3 + Math.sin(time * 0.03) * 0.1})`;
      ctx.lineWidth = 1;
      const stormR = 50 + Math.sin(time * 0.01) * 5;
      ctx.beginPath();
      ctx.arc(60, 60, stormR, 0, Math.PI * 2);
      ctx.stroke();

      // Safe zone
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(55, 55, 25, 0, Math.PI * 2);
      ctx.stroke();

      // Player movement
      const px = 60 + Math.sin(time * 0.02) * 3;
      const py = 60 + Math.cos(time * 0.015) * 3;
      ctx.fillStyle = '#00d4ff';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();

      // Other "players" (dots)
      ctx.fillStyle = 'rgba(255,45,85,0.5)';
      for (let i = 0; i < 5; i++) {
        const ex = 30 + Math.sin(time * 0.01 + i * 2) * 40;
        const ey = 30 + Math.cos(time * 0.008 + i * 3) * 40;
        ctx.beginPath();
        ctx.arc(ex, ey, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ===== CHARACTER CANVAS (Lobby) =====
  function initCharacterCanvas() {
    const canvas = $('characterCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let time = 0;

    function draw() {
      time++;
      ctx.clearRect(0, 0, 300, 400);

      const cx = 150;
      const cy = 350;
      const bob = Math.sin(time * 0.03) * 3;

      // Platform glow
      const platGrad = ctx.createRadialGradient(cx, cy + 10, 0, cx, cy + 10, 80);
      platGrad.addColorStop(0, 'rgba(0,212,255,0.15)');
      platGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = platGrad;
      ctx.fillRect(0, cy - 30, 300, 80);

      // Platform ring
      ctx.strokeStyle = 'rgba(0,212,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 10, 60, 15, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 5, 35, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Feet / boots
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(cx - 18, cy - 20 + bob, 12, 22);
      ctx.fillRect(cx + 6, cy - 20 + bob, 12, 22);
      // Boot details
      ctx.fillStyle = '#2a2a4e';
      ctx.fillRect(cx - 18, cy - 5 + bob, 12, 5);
      ctx.fillRect(cx + 6, cy - 5 + bob, 12, 5);

      // Legs
      ctx.fillStyle = '#222244';
      ctx.fillRect(cx - 16, cy - 65 + bob, 12, 50);
      ctx.fillRect(cx + 4, cy - 65 + bob, 12, 50);

      // Knee pads
      ctx.fillStyle = '#333355';
      ctx.fillRect(cx - 17, cy - 45 + bob, 14, 8);
      ctx.fillRect(cx + 3, cy - 45 + bob, 14, 8);

      // Torso
      ctx.fillStyle = '#2a2a4e';
      const torsoW = 44;
      const torsoH = 55;
      ctx.fillRect(cx - torsoW/2, cy - 120 + bob, torsoW, torsoH);

      // Chest plate
      ctx.fillStyle = '#333366';
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy - 115 + bob);
      ctx.lineTo(cx + 18, cy - 115 + bob);
      ctx.lineTo(cx + 14, cy - 85 + bob);
      ctx.lineTo(cx - 14, cy - 85 + bob);
      ctx.closePath();
      ctx.fill();

      // Shield effect
      const shieldAlpha = 0.15 + Math.sin(time * 0.04) * 0.08;
      ctx.strokeStyle = `rgba(0,212,255,${shieldAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 95 + bob, 30, 40, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Chest glow lines
      ctx.strokeStyle = 'rgba(0,212,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 112 + bob);
      ctx.lineTo(cx, cy - 100 + bob);
      ctx.lineTo(cx + 12, cy - 112 + bob);
      ctx.stroke();

      // Belt
      ctx.fillStyle = '#444466';
      ctx.fillRect(cx - 22, cy - 68 + bob, 44, 6);
      // Belt buckle
      ctx.fillStyle = 'rgba(255,214,10,0.5)';
      ctx.fillRect(cx - 4, cy - 69 + bob, 8, 8);

      // Arms
      // Left arm
      ctx.fillStyle = '#2a2a4e';
      ctx.save();
      ctx.translate(cx - 22, cy - 115 + bob);
      ctx.rotate(-0.15 + Math.sin(time * 0.02) * 0.08);
      ctx.fillRect(-12, 0, 12, 45);
      // Glove
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(-11, 40, 10, 12);
      ctx.restore();

      // Right arm (with weapon)
      ctx.fillStyle = '#2a2a4e';
      ctx.save();
      ctx.translate(cx + 22, cy - 115 + bob);
      ctx.rotate(0.25 + Math.sin(time * 0.02) * 0.05);
      ctx.fillRect(0, 0, 12, 45);
      // Glove
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(1, 40, 10, 12);

      // WEAPON - Assault Rifle
      ctx.fillStyle = '#555';
      ctx.fillRect(8, 15, 45, 6);
      ctx.fillRect(8, 12, 10, 12);
      ctx.fillRect(45, 13, 8, 4);
      // Stock
      ctx.fillRect(-5, 16, 15, 5);
      // Scope
      ctx.fillStyle = '#666';
      ctx.fillRect(25, 10, 12, 4);
      // Muzzle flash glow
      const flashAlpha = Math.sin(time * 0.1) > 0.95 ? 0.4 : 0;
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255,200,50,${flashAlpha})`;
        ctx.beginPath();
        ctx.arc(55, 18, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Head
      ctx.fillStyle = '#d4a574';
      ctx.beginPath();
      ctx.arc(cx, cy - 135 + bob, 16, 0, Math.PI * 2);
      ctx.fill();

      // Helmet
      ctx.fillStyle = '#2a2a4e';
      ctx.beginPath();
      ctx.arc(cx, cy - 140 + bob, 18, Math.PI + 0.3, -0.3);
      ctx.fill();

      // Visor
      const visorGrad = ctx.createLinearGradient(cx - 12, 0, cx + 12, 0);
      visorGrad.addColorStop(0, 'rgba(0,150,255,0.6)');
      visorGrad.addColorStop(0.5, 'rgba(0,212,255,0.8)');
      visorGrad.addColorStop(1, 'rgba(0,150,255,0.6)');
      ctx.fillStyle = visorGrad;
      ctx.fillRect(cx - 12, cy - 140 + bob, 24, 7);

      // Visor reflection
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(cx - 8, cy - 139 + bob, 6, 2);

      // Backbling
      ctx.fillStyle = '#222244';
      ctx.fillRect(cx + 20, cy - 115 + bob, 12, 30);
      ctx.strokeStyle = 'rgba(177,78,255,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + 20, cy - 115 + bob, 12, 30);
      // Backbling glow
      ctx.fillStyle = `rgba(177,78,255,${0.1 + Math.sin(time * 0.03) * 0.05})`;
      ctx.fillRect(cx + 22, cy - 110 + bob, 8, 10);

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ===== PARTICLES =====
  function initParticles() {
    const container = $('particles');
    for (let i = 0; i < 25; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 8 + 's';
      p.style.animationDuration = (6 + Math.random() * 6) + 's';
      const colors = ['var(--fn-blue)', 'var(--fn-purple)', 'rgba(255,255,255,0.3)'];
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.width = (2 + Math.random() * 3) + 'px';
      p.style.height = p.style.width;
      container.appendChild(p);
    }
  }

  // ===== HUD ANIMATIONS =====
  function animateHUD() {
    // Periodic random HUD updates for realism
    setInterval(() => {
      // Fluctuate alive count
      if (state.aliveCount > 2) {
        state.aliveCount -= Math.floor(Math.random() * 3);
        $('aliveCount').textContent = state.aliveCount;
      }
    }, 8000);

    // Shield/health pulse
    setInterval(() => {
      const sVar = Math.max(0, state.shield + Math.floor((Math.random() - 0.5) * 5));
      state.shield = Math.min(100, sVar);
      $('shieldBar').style.width = state.shield + '%';
      $('shieldValue').textContent = state.shield;
    }, 5000);
  }

  // ===== WEAPON SLOT SELECTION =====
  function initWeaponSlots() {
    const slots = document.querySelectorAll('.weapon-slot');
    slots.forEach(slot => {
      slot.addEventListener('click', () => {
        slots.forEach(s => s.classList.remove('active'));
        slot.classList.add('active');
        state.selectedWeaponSlot = parseInt(slot.dataset.slot);
        spawnDamageNumber();
      });
    });
  }

  // ===== DAMAGE NUMBERS =====
  function spawnDamageNumber() {
    const container = $('damageNumbers');
    const dmg = document.createElement('div');
    const isCrit = Math.random() > 0.7;
    dmg.className = 'dmg-number' + (isCrit ? ' crit' : '');
    dmg.textContent = isCrit ? (150 + Math.floor(Math.random() * 50)) : (30 + Math.floor(Math.random() * 70));
    dmg.style.left = (40 + Math.random() * 20) + '%';
    dmg.style.top = (30 + Math.random() * 20) + '%';
    container.appendChild(dmg);
    setTimeout(() => dmg.remove(), 1500);
  }

  // ===== MENU / TAB SYSTEM =====
  function initMenu() {
    const menu = $('gameMenu');
    const menuBtn = $('menuBtn');
    const closeBtn = $('closeMenu');
    const tabs = document.querySelectorAll('.menu-tab');

    menuBtn.addEventListener('click', () => {
      menu.classList.remove('hidden');
      state.menuOpen = true;
    });

    closeBtn.addEventListener('click', () => {
      menu.classList.add('hidden');
      state.menuOpen = false;
    });

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        switchTab(tabName);
      });
    });

    // Play button goes to guides
    $('playBtn').addEventListener('click', () => {
      switchTab('guides');
    });
  }

  function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.menu-tab[data-tab="${tabName}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Hide all panels
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));

    // Show selected panel
    const panelMap = {
      lobby: 'lobbyPanel',
      locker: 'lockerPanel',
      guides: 'guidesPanel',
      progress: 'progressPanel'
    };

    const panelId = panelMap[tabName];
    if (panelId) {
      $(panelId).classList.remove('hidden');
    }

    state.currentTab = tabName;

    // Render content
    if (tabName === 'guides') renderCategories();
    if (tabName === 'locker') renderLocker();
    if (tabName === 'progress') renderProgress();
    if (tabName === 'lobby') updateChallenges();
  }

  // ===== RENDER CATEGORIES =====
  function renderCategories() {
    const container = $('guidesContainer');
    container.innerHTML = GUIDE_DATA.categories.map(cat => `
      <div class="guide-category-card" data-cat="${cat.id}" style="--card-accent: ${cat.color}">
        <span class="gc-icon">${cat.icon}</span>
        <div class="gc-title">${cat.title}</div>
        <div class="gc-desc">${cat.description}</div>
        <div class="gc-count">${cat.guides.length} GUIDER</div>
      </div>
    `).join('');

    container.querySelectorAll('.guide-category-card').forEach(card => {
      card.addEventListener('click', () => openCategory(card.dataset.cat));
    });
  }

  // ===== OPEN CATEGORY =====
  function openCategory(catId) {
    const cat = GUIDE_DATA.categories.find(c => c.id === catId);
    if (!cat) return;
    state.currentCategory = cat;

    // Hide guides panel, show category panel
    $('guidesPanel').classList.add('hidden');
    $('categoryPanel').classList.remove('hidden');

    const detail = $('categoryDetail');
    detail.innerHTML = `
      <div class="category-detail-header">
        <span class="cd-icon">${cat.icon}</span>
        <div class="cd-title">${cat.title}</div>
        <div class="cd-desc">${cat.description}</div>
      </div>
      <div class="category-guides-list">
        ${cat.guides.map(guide => {
          const isRead = state.completedGuides.includes(guide.id);
          const diffClass = guide.difficulty === 'Nybörjare' ? 'beginner' :
                            guide.difficulty === 'Medel' ? 'medium' : 'advanced';
          return `
            <div class="guide-list-card" data-guide="${guide.id}">
              <div class="gl-icon">${guide.icon}</div>
              <div class="gl-info">
                <div class="gl-title">${guide.title}</div>
                <div class="gl-meta">
                  <span class="diff-badge ${diffClass}">${guide.difficulty}</span>
                  ${guide.isPremium && !state.isPremium ? '<span class="premium-lock">🔒 PRO</span>' : ''}
                  ${isRead ? '<span class="read-check">✓</span>' : ''}
                </div>
              </div>
              <div class="gl-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    detail.querySelectorAll('.guide-list-card').forEach(card => {
      card.addEventListener('click', () => {
        const guide = cat.guides.find(g => g.id === card.dataset.guide);
        if (guide.isPremium && !state.isPremium) {
          showPremiumModal();
        } else {
          openGuide(card.dataset.guide);
        }
      });
    });

    $('categoryBack').onclick = () => {
      $('categoryPanel').classList.add('hidden');
      $('guidesPanel').classList.remove('hidden');
    };
  }

  // ===== OPEN GUIDE =====
  function openGuide(guideId) {
    let guide = null;
    for (const cat of GUIDE_DATA.categories) {
      const found = cat.guides.find(g => g.id === guideId);
      if (found) { guide = found; break; }
    }
    if (!guide) return;

    if (guide.isPremium && !state.isPremium) {
      showPremiumModal();
      return;
    }

    state.currentGuide = guide;

    $('categoryPanel').classList.add('hidden');
    $('guidePanel').classList.remove('hidden');

    const isCompleted = state.completedGuides.includes(guide.id);
    const diffClass = guide.difficulty === 'Nybörjare' ? 'beginner' :
                      guide.difficulty === 'Medel' ? 'medium' : 'advanced';

    const sectionsHtml = guide.content.map(section => {
      if (section.type === 'intro') {
        return `
          <div class="guide-section intro-section">
            <div class="section-text">${section.text}</div>
          </div>
        `;
      } else if (section.type === 'tip') {
        const keysHtml = section.keys ?
          `<div class="section-keys">${section.keys.split(' → ').map(k =>
            `<span class="key-badge">${k}</span>`).join('<span style="color:var(--text-muted);margin:0 2px">→</span>')
          }</div>` : '';
        return `
          <div class="guide-section tip-section">
            <div class="section-badge tip-badge">💡 TIPS</div>
            <div class="section-title">${section.title}</div>
            <div class="section-text">${section.text}</div>
            ${keysHtml}
          </div>
        `;
      } else if (section.type === 'pro') {
        return `
          <div class="guide-section pro-section">
            <div class="section-badge pro-badge">⚡ PRO</div>
            <div class="section-title">${section.title}</div>
            <div class="section-text">${section.text.replace(/\n/g, '<br>')}</div>
          </div>
        `;
      }
      return '';
    }).join('');

    $('guideDetail').innerHTML = `
      <div class="guide-header">
        <span class="gh-icon">${guide.icon}</span>
        <h2 class="gh-title">${guide.title}</h2>
        <span class="diff-badge ${diffClass}">${guide.difficulty}</span>
      </div>
      <div class="guide-sections">
        ${sectionsHtml}
      </div>
      <button class="guide-complete-btn ${isCompleted ? 'completed' : 'not-completed'}" id="completeBtn" data-guide="${guide.id}">
        ${isCompleted ? '✓ MARKERAD SOM LÄST' : '✓ MARKERA SOM LÄST'}
      </button>
    `;

    $('completeBtn').addEventListener('click', () => toggleComplete(guide.id));

    $('guideBack').onclick = () => {
      $('guidePanel').classList.add('hidden');
      $('categoryPanel').classList.remove('hidden');
    };
  }

  // ===== COMPLETION =====
  function toggleComplete(guideId) {
    const idx = state.completedGuides.indexOf(guideId);
    if (idx > -1) {
      state.completedGuides.splice(idx, 1);
    } else {
      state.completedGuides.push(guideId);
      // Spawn celebration damage numbers
      for (let i = 0; i < 3; i++) {
        setTimeout(() => spawnDamageNumber(), i * 200);
      }
    }
    localStorage.setItem('fn_completed', JSON.stringify(state.completedGuides));
    openGuide(guideId);
    updateChallenges();
  }

  // ===== LOCKER =====
  function renderLocker() {
    const weaponLocker = $('weaponLocker');
    const gearLocker = $('gearLocker');

    weaponLocker.innerHTML = GUIDE_DATA.weapons.map(w => `
      <div class="locker-item ${w.rarity}" data-id="${w.id}">
        <span class="locker-item-icon">${w.icon}</span>
        <span class="locker-item-name">${w.name}</span>
      </div>
    `).join('');

    gearLocker.innerHTML = GUIDE_DATA.gear.map(g => `
      <div class="locker-item ${g.rarity}" data-id="${g.id}">
        <span class="locker-item-icon">${g.icon}</span>
        <span class="locker-item-name">${g.name}</span>
      </div>
    `).join('');

    // Selection
    document.querySelectorAll('.locker-item').forEach(item => {
      item.addEventListener('click', () => {
        item.classList.toggle('selected');
        spawnDamageNumber();
      });
    });
  }

  // ===== PROGRESS =====
  function renderProgress() {
    const content = $('progressContent');
    content.innerHTML = GUIDE_DATA.categories.map(cat => {
      const total = cat.guides.length;
      const done = cat.guides.filter(g => state.completedGuides.includes(g.id)).length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;

      return `
        <div class="progress-category">
          <div class="pc-header">
            <div class="pc-title">
              <span>${cat.icon}</span>
              <span>${cat.title}</span>
            </div>
            <span class="pc-count">${done}/${total}</span>
          </div>
          <div class="pc-bar-wrap">
            <div class="pc-bar-fill" style="width:${pct}%;background:${cat.color}"></div>
          </div>
          <div class="pc-guides">
            ${cat.guides.map(g => {
              const isDone = state.completedGuides.includes(g.id);
              return `
                <div class="pc-guide-item">
                  <div class="pc-check ${isDone ? 'done' : ''}">${isDone ? '✓' : ''}</div>
                  <span class="pc-guide-name ${isDone ? 'done' : ''}">${g.icon} ${g.title}</span>
                  ${g.isPremium && !state.isPremium ? '<span class="premium-lock">🔒</span>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  // ===== CHALLENGES =====
  function updateChallenges() {
    const read = state.completedGuides.length;
    const readPct = Math.min(100, (read / 3) * 100);
    const fill1 = $('challengeFill1');
    const count1 = $('challengeCount1');
    if (fill1) fill1.style.width = readPct + '%';
    if (count1) count1.textContent = Math.min(read, 3) + '/3';

    // Check if any category is complete
    let catComplete = 0;
    GUIDE_DATA.categories.forEach(cat => {
      const allDone = cat.guides.every(g => state.completedGuides.includes(g.id) || (g.isPremium && !state.isPremium));
      if (allDone) catComplete++;
    });
    const catPct = Math.min(100, catComplete * 100);
    const fill2 = $('challengeFill2');
    const count2 = $('challengeCount2');
    if (fill2) fill2.style.width = catPct + '%';
    if (count2) count2.textContent = Math.min(catComplete, 1) + '/1';
  }

  // ===== PREMIUM MODAL =====
  function showPremiumModal() {
    const modal = $('premiumModal');
    $('bpRewards').innerHTML = GUIDE_DATA.premium.features
      .map(f => `<div class="bp-reward-item">${f}</div>`).join('');
    $('ctaPrice').textContent = `KÖP BATTLE PASS - ${GUIDE_DATA.premium.price}`;
    modal.classList.remove('hidden');
  }

  function initPremiumModal() {
    $('modalClose').addEventListener('click', () => $('premiumModal').classList.add('hidden'));
    $('premiumModal').addEventListener('click', (e) => {
      if (e.target === $('premiumModal')) $('premiumModal').classList.add('hidden');
    });

    $('modalCta').addEventListener('click', () => {
      state.isPremium = true;
      localStorage.setItem('fn_premium', 'true');
      $('premiumModal').classList.add('hidden');
      if (state.currentCategory) openCategory(state.currentCategory.id);
    });

    $('modalRestore').addEventListener('click', () => {
      if (localStorage.getItem('fn_premium') === 'true') {
        state.isPremium = true;
        $('premiumModal').classList.add('hidden');
        alert('Ditt köp har återställts!');
      } else {
        alert('Inget tidigare köp hittades.');
      }
    });

    if (localStorage.getItem('fn_premium') === 'true') {
      state.isPremium = true;
    }
  }

  // ===== KEYBOARD SHORTCUTS =====
  function initKeyboard() {
    document.addEventListener('keydown', (e) => {
      const key = e.key;

      // 1-5 weapon slots
      if (key >= '1' && key <= '5') {
        const slot = parseInt(key) - 1;
        const slots = document.querySelectorAll('.weapon-slot');
        slots.forEach(s => s.classList.remove('active'));
        if (slots[slot]) slots[slot].classList.add('active');
        state.selectedWeaponSlot = slot;
        spawnDamageNumber();
      }

      // Escape to toggle menu
      if (key === 'Escape') {
        const menu = $('gameMenu');
        if (menu.classList.contains('hidden')) {
          menu.classList.remove('hidden');
          state.menuOpen = true;
        } else {
          menu.classList.add('hidden');
          state.menuOpen = false;
        }
      }

      // B for build mode
      if (key === 'b' || key === 'B') {
        $('buildMode').classList.toggle('hidden');
      }
    });
  }

  // ===== INIT =====
  function init() {
    initGameCanvas();
    initMinimap();
    initCharacterCanvas();
    initParticles();
    initWeaponSlots();
    initMenu();
    initPremiumModal();
    initKeyboard();
    animateHUD();
    updateChallenges();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  init();
})();
