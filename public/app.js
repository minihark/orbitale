/**
 * Orbitale — Application Controller & Canvas Rendering
 */

(function () {
  const canvas = document.getElementById('cosmos-canvas');
  const ctx = canvas.getContext('2d');

  const physics = new window.PhysicsEngine();
  const audio = window.CosmicAudio;

  // State
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);
  let isPaused = false;
  let trailLength = 50;

  // Selected spawn mass
  let currentSpawnMass = 25; // 5 = Comet, 25 = Terrestrial, 150 = Giant, 600 = Star

  // Drag-to-fling interaction state
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let dragCurrent = { x: 0, y: 0 };

  // Sound ripple visual effects
  const ripples = [];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    physics.setCenter(width / 2, height / 2);
  }
  window.addEventListener('resize', resize);

  // Initialize with Kepler preset
  physics.loadPreset('kepler', width, height);

  // User gesture to start AudioContext
  function ensureAudio() {
    audio.resume();
    document.getElementById('audio-status').classList.remove('audio-muted');
  }
  window.addEventListener('click', ensureAudio, { once: true });
  window.addEventListener('touchstart', ensureAudio, { once: true });

  // Mouse & Touch Interaction
  canvas.addEventListener('mousedown', (e) => {
    ensureAudio();
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    dragCurrent = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      dragCurrent = { x: e.clientX, y: e.clientY };
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (isDragging) {
      isDragging = false;
      const dx = dragStart.x - dragCurrent.x;
      const dy = dragStart.y - dragCurrent.y;
      const flingFactor = 0.85;

      const body = new window.CelestialBody({
        x: dragStart.x,
        y: dragStart.y,
        vx: dx * flingFactor,
        vy: dy * flingFactor,
        mass: currentSpawnMass,
      });
      physics.addBody(body);

      // Trigger spawn chime
      const panX = (dragStart.x / width) * 2 - 1;
      audio.triggerChime(Math.random() * 0.8 + 0.1, 0.6, panX, 'crystal');
    }
  });

  // Touch Support
  canvas.addEventListener('touchstart', (e) => {
    ensureAudio();
    if (e.touches.length === 1) {
      isDragging = true;
      const t = e.touches[0];
      dragStart = { x: t.clientX, y: t.clientY };
      dragCurrent = { x: t.clientX, y: t.clientY };
    }
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length > 0) {
      const t = e.touches[0];
      dragCurrent = { x: t.clientX, y: t.clientY };
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    if (isDragging) {
      isDragging = false;
      const dx = dragStart.x - dragCurrent.x;
      const dy = dragStart.y - dragCurrent.y;
      const flingFactor = 0.85;

      const body = new window.CelestialBody({
        x: dragStart.x,
        y: dragStart.y,
        vx: dx * flingFactor,
        vy: dy * flingFactor,
        mass: currentSpawnMass,
      });
      physics.addBody(body);
      const panX = (dragStart.x / width) * 2 - 1;
      audio.triggerChime(Math.random() * 0.8 + 0.1, 0.6, panX, 'crystal');
    }
  });

  // Main Render Loop
  let lastTime = performance.now();
  let fpsHistory = [];

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Calculate FPS
    const currentFps = Math.round(1 / (dt || 0.016));
    fpsHistory.push(currentFps);
    if (fpsHistory.length > 30) fpsHistory.shift();
    const avgFps = Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length);

    if (!isPaused) {
      physics.step(dt, width, height);
    }

    // Motion blur canvas clearing
    ctx.fillStyle = 'rgba(7, 8, 13, 0.22)';
    ctx.fillRect(0, 0, width, height);

    // Draw Resonance Rings
    if (physics.ringsEnabled) {
      ctx.save();
      ctx.lineWidth = 1;
      physics.resonanceRings.forEach((r, idx) => {
        ctx.strokeStyle = `rgba(0, 242, 254, ${0.05 + (idx % 2) * 0.03})`;
        ctx.beginPath();
        ctx.arc(physics.center.x, physics.center.y, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();
    }

    // Draw Celestial Trails
    physics.bodies.forEach((b) => {
      if (b.trail.length > 1) {
        ctx.save();
        ctx.lineWidth = Math.max(1, b.radius * 0.35);
        for (let i = 1; i < b.trail.length; i++) {
          const p1 = b.trail[i - 1];
          const p2 = b.trail[i];
          const alpha = (i / b.trail.length) * 0.55;
          ctx.strokeStyle = b.color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        ctx.restore();
      }
    });

    // Draw Celestial Bodies
    physics.bodies.forEach((b) => {
      ctx.save();
      const r = b.radius;

      // Glow halo
      ctx.shadowColor = b.color;
      ctx.shadowBlur = b.flash > 0 ? 30 * (1 + b.flash) : 15;

      const grad = ctx.createRadialGradient(b.x - r * 0.2, b.y - r * 0.2, r * 0.1, b.x, b.y, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, b.color);
      grad.addColorStop(1, '#07080d');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Flash ripple when sound plays
      if (b.flash > 0.05) {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = b.flash;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r + (1.0 - b.flash) * 35, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    });

    // Draw Drag Velocity Arrow
    if (isDragging) {
      ctx.save();
      const dx = dragStart.x - dragCurrent.x;
      const dy = dragStart.y - dragCurrent.y;
      const dist = Math.hypot(dx, dy);

      // Trajectory line
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(dragStart.x, dragStart.y);
      ctx.lineTo(dragStart.x + dx, dragStart.y + dy);
      ctx.stroke();

      // Preview Spawn Planet
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0, 242, 254, 0.4)';
      ctx.strokeStyle = '#00f2fe';
      const previewR = Math.max(3, Math.pow(currentSpawnMass, 0.38) * 2.8);
      ctx.beginPath();
      ctx.arc(dragStart.x, dragStart.y, previewR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // Update Telemetry UI
    document.getElementById('hud-fps').textContent = avgFps;
    document.getElementById('hud-bodies').textContent = physics.bodies.length;
    document.getElementById('hud-events').textContent = physics.totalEvents;
  }

  requestAnimationFrame(loop);

  // Wire UI Controls
  document.getElementById('btn-pause').addEventListener('click', function () {
    isPaused = !isPaused;
    this.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
    this.classList.toggle('active', isPaused);
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    physics.clear();
  });

  document.getElementById('preset-select').addEventListener('change', (e) => {
    physics.loadPreset(e.target.value, width, height);
  });

  document.getElementById('scale-select').addEventListener('change', (e) => {
    audio.setScale(e.target.value);
  });

  document.getElementById('slider-gravity').addEventListener('input', (e) => {
    physics.G = parseFloat(e.target.value);
  });

  document.getElementById('slider-reverb').addEventListener('input', (e) => {
    audio.setReverbLevel(parseFloat(e.target.value));
  });

  document.getElementById('slider-drone').addEventListener('input', (e) => {
    audio.setDroneVolume(parseFloat(e.target.value));
  });

  // Mass Buttons
  const massBtns = document.querySelectorAll('.mass-btn');
  massBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      massBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentSpawnMass = parseFloat(btn.dataset.mass);
    });
  });

  // Audio Mute Toggle
  document.getElementById('audio-status').addEventListener('click', function () {
    ensureAudio();
    audio.isMuted = !audio.isMuted;
    audio.setMute(audio.isMuted);
    this.classList.toggle('audio-muted', audio.isMuted);
  });
})();
