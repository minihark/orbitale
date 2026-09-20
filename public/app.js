/**
 * Orbitale — Application Controller & Canvas Rendering
 * Physically Grounded Astrophysical Canvas Engine.
 * Features: Procedural starfield with gravitational lensing, realistic stellar limb darkening,
 * authentic blackbody accretion disc with Doppler beaming, delicate multi-band planetary rings,
 * solar radiation pressure comet tails, and elegant whisper-thin orbital tracks.
 */

(function () {
  const canvas = document.getElementById('cosmos-canvas');
  const ctx = canvas.getContext('2d');

  const physics = new window.PhysicsEngine();
  const audio = window.CosmicAudio;

  // Viewport State
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);
  let isPaused = false;

  // Selected spawn mass
  let currentSpawnMass = 25; // 5 = Comet, 25 = Terrestrial, 150 = Giant, 600 = Star, 1400 = Black Hole

  // Drag-to-launch interaction state
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let dragCurrent = { x: 0, y: 0 };

  // Generate Procedural Deep-Space Starfield (280 stars)
  const starfield = [];
  function initStarfield() {
    starfield.length = 0;
    const count = 280;
    const starColors = [
      'rgba(215, 230, 255, ', // O/B Blue-white
      'rgba(248, 250, 255, ', // A/F White
      'rgba(255, 244, 214, ', // G Warm Yellow (Sun-like)
      'rgba(255, 222, 175, ', // K Pale Orange
      'rgba(255, 185, 160, '  // M Red Dwarf
    ];

    for (let i = 0; i < count; i++) {
      starfield.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseR: Math.random() < 0.85 ? (Math.random() * 0.7 + 0.35) : (Math.random() * 0.8 + 0.9),
        colorPrefix: starColors[Math.floor(Math.random() * starColors.length)],
        baseAlpha: Math.random() * 0.5 + 0.25,
        twinkleSpeed: Math.random() * 1.5 + 0.5,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    physics.setCenter(width / 2, height / 2);
    initStarfield();
  }
  window.addEventListener('resize', resize);
  initStarfield();

  // Initialize with Kepler preset
  physics.loadPreset('kepler', width, height);

  // AudioContext user gesture unlock
  function ensureAudio() {
    audio.resume();
    const statusEl = document.getElementById('audio-status');
    if (statusEl) statusEl.classList.remove('audio-muted');
  }
  window.addEventListener('click', ensureAudio, { once: true });
  window.addEventListener('touchstart', ensureAudio, { once: true });

  // Mouse & Touch Controls
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
      const flingFactor = 0.82;

      const body = new window.CelestialBody({
        x: dragStart.x,
        y: dragStart.y,
        vx: dx * flingFactor,
        vy: dy * flingFactor,
        mass: currentSpawnMass,
      });
      physics.addBody(body);

      const panX = (dragStart.x / width) * 2 - 1;
      audio.triggerChime(Math.random() * 0.8 + 0.1, 0.5, panX, 'crystal');
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
      const flingFactor = 0.82;

      const body = new window.CelestialBody({
        x: dragStart.x,
        y: dragStart.y,
        vx: dx * flingFactor,
        vy: dy * flingFactor,
        mass: currentSpawnMass,
      });
      physics.addBody(body);
      const panX = (dragStart.x / width) * 2 - 1;
      audio.triggerChime(Math.random() * 0.8 + 0.1, 0.5, panX, 'crystal');
    }
  });

  // Main Render Loop
  let lastTime = performance.now();
  let fpsHistory = [];

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - lastTime) / 1000, 0.08);
    lastTime = now;

    // Calculate FPS
    const currentFps = Math.round(1 / (dt || 0.016));
    fpsHistory.push(currentFps);
    if (fpsHistory.length > 30) fpsHistory.shift();
    const avgFps = Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length);

    if (!isPaused) {
      physics.step(dt, width, height);
    }

    // 1. Deep Space Void Canvas Clear
    ctx.fillStyle = '#030407';
    ctx.fillRect(0, 0, width, height);

    // Find black holes for gravitational lensing of background stars
    const blackHoles = physics.bodies.filter(b => b.type === 'black_hole');

    // 2. Procedural Deep-Space Starfield with Gravitational Lensing
    ctx.save();
    for (let i = 0; i < starfield.length; i++) {
      const star = starfield[i];
      let sx = star.x;
      let sy = star.y;
      let isOccluded = false;

      // Einstein Gravitational Lensing deflection
      for (let j = 0; j < blackHoles.length; j++) {
        const bh = blackHoles[j];
        const dx = sx - bh.x;
        const dy = sy - bh.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist < bh.radius * 0.98) {
          isOccluded = true;
          break;
        }

        // Deflect stars away from horizon: \theta \propto M / r
        const lensRadius = bh.radius * 4.8;
        if (dist < lensRadius && dist > 1) {
          const deflection = (bh.radius * bh.radius * 1.5) / dist;
          sx = bh.x + (dx / dist) * (dist + deflection);
          sy = bh.y + (dy / dist) * (dist + deflection);
        }
      }

      if (isOccluded) continue;

      const twinkle = Math.sin(now * 0.001 * star.twinkleSpeed + star.twinklePhase) * 0.15;
      const alpha = Math.max(0.1, Math.min(1.0, star.baseAlpha + twinkle));

      ctx.fillStyle = star.colorPrefix + alpha + ')';
      ctx.beginPath();
      ctx.arc(sx, sy, star.baseR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Faint Harmonic Resonance Boundary Rings
    if (physics.ringsEnabled) {
      ctx.save();
      physics.resonanceRings.forEach((r, idx) => {
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = `rgba(180, 205, 230, ${0.035 + (idx % 2) * 0.015})`;
        ctx.beginPath();
        ctx.arc(physics.center.x, physics.center.y, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();
    }

    // 4. Clean, Whisper-Thin Orbital Trajectories
    physics.bodies.forEach((b) => {
      if (b.trail.length > 2) {
        ctx.save();
        ctx.lineWidth = 0.85;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw smooth fading trajectory line
        for (let i = 1; i < b.trail.length; i++) {
          const ptPrev = b.trail[i - 1];
          const pt = b.trail[i];
          const progress = i / b.trail.length;
          const alpha = progress * 0.22;

          ctx.strokeStyle = b.color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(ptPrev.x, ptPrev.y);
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
        }
        ctx.restore();
      }
    });

    // 5. Spacetime Gravitational Wave & Blast Wavefronts
    if (physics.shockwaves && physics.shockwaves.length > 0) {
      ctx.save();
      for (let i = 0; i < physics.shockwaves.length; i++) {
        const sw = physics.shockwaves[i];
        const alpha = sw.alpha;
        if (alpha <= 0.001) continue;

        if (sw.type === 'gravitational') {
          // Subtle, elegant optical spacetime refraction ripple
          ctx.lineWidth = Math.max(0.8, sw.width * (1 - sw.progress * 0.7));
          ctx.strokeStyle = `rgba(226, 232, 240, ${alpha * 0.45})`;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
          ctx.stroke();

          // Faint optical dispersion echo
          ctx.lineWidth = 0.6;
          ctx.strokeStyle = `rgba(147, 197, 253, ${alpha * 0.25})`;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, Math.max(1, sw.r - 6), 0, Math.PI * 2);
          ctx.stroke();
        } else if (sw.type === 'supernova') {
          // Blinding optical detonation with inverse-square thermal falloff
          const grad = ctx.createRadialGradient(sw.x, sw.y, Math.max(0, sw.r - 20), sw.x, sw.y, sw.r + 10);
          grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          grad.addColorStop(0.5, `rgba(255, 248, 220, ${alpha * 0.5})`);
          grad.addColorStop(0.85, `rgba(217, 119, 6, ${alpha * 0.3})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.r + 10, 0, Math.PI * 2);
          ctx.fill();

          ctx.lineWidth = 1.2;
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.65})`;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Natural thermal impact ripple
          ctx.lineWidth = Math.max(0.6, sw.width * (1 - sw.progress * 0.6));
          ctx.strokeStyle = sw.color;
          ctx.globalAlpha = alpha * 0.4;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 6. Physical Gravitational Ejecta & Molten Shrapnel
    if (physics.debris && physics.debris.length > 0) {
      ctx.save();
      for (let i = 0; i < physics.debris.length; i++) {
        const d = physics.debris[i];
        const progress = d.life / d.maxLife;
        const alpha = Math.max(0, 1 - progress);

        // Micro motion vector
        const speed = Math.hypot(d.vx, d.vy);
        const streak = Math.min(speed * 0.05, 6);
        const nvx = speed > 0.001 ? (d.vx / speed) : 0;
        const nvy = speed > 0.001 ? (d.vy / speed) : 0;

        ctx.strokeStyle = d.color;
        ctx.globalAlpha = alpha * 0.45;
        ctx.lineWidth = Math.max(0.6, d.size * (1 - progress * 0.5));
        ctx.beginPath();
        ctx.moveTo(d.x - nvx * streak, d.y - nvy * streak);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();

        ctx.fillStyle = d.color;
        ctx.globalAlpha = alpha * 0.85;
        ctx.beginPath();
        ctx.arc(d.x, d.y, Math.max(0.6, d.size * (1 - progress * 0.4)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Find primary illumination source (Sun)
    const primaryStar = physics.bodies.find(b => b.type === 'star') || { x: physics.center.x, y: physics.center.y };

    // 7. Celestial Bodies Rendering Pipeline
    physics.bodies.forEach((b) => {
      const r = b.radius;
      const dxToLight = primaryStar.x - b.x;
      const dyToLight = primaryStar.y - b.y;
      const lightAngle = Math.atan2(dyToLight, dxToLight);
      const isStar = b.type === 'star';
      const isHole = b.type === 'black_hole';
      const isGiant = b.type === 'gas_giant' || b.type === 'ice_giant';
      const isComet = b.type === 'comet';

      ctx.save();

      // =======================================================================
      // A. ASTRONOMICAL BLACK HOLE (Kerr Metric & Relativistic Accretion)
      // =======================================================================
      if (isHole) {
        // Gravitational Einstein Lensing Halo (Back of accretion disk warped around horizon)
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.diskAngle || 0.26);

        // Lensed Photon Ring Halo encircling event horizon
        const haloGrad = ctx.createLinearGradient(0, -r * 1.8, 0, r * 1.8);
        haloGrad.addColorStop(0, 'rgba(255, 235, 175, 0.45)');
        haloGrad.addColorStop(0.5, 'rgba(225, 150, 60, 0.35)');
        haloGrad.addColorStop(1, 'rgba(120, 40, 15, 0.2)');
        ctx.strokeStyle = haloGrad;
        ctx.lineWidth = r * 0.35;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.45, r * 1.45, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Back-Half of Thin Keplerian Accretion Disc (Behind Horizon)
        if (b.accretionParticles) {
          for (let i = 0; i < b.accretionParticles.length; i++) {
            const p = b.accretionParticles[i];
            const sinA = Math.sin(p.angle);
            if (sinA >= 0) continue; // Skip front half

            const cosA = Math.cos(p.angle);
            const px = cosA * p.r;
            const py = sinA * p.r * (b.diskTilt || 0.28);

            // Relativistic Doppler Beaming
            const doppler = Math.max(0.2, 1.0 - cosA * 0.65);
            let col;
            if (doppler > 1.2) col = `rgba(255, 250, 230, ${p.alpha * 0.85})`;
            else if (doppler > 0.8) col = `rgba(240, 185, 95, ${p.alpha * 0.7})`;
            else col = `rgba(180, 80, 30, ${p.alpha * 0.45})`;

            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(px, py, p.size * (0.8 + doppler * 0.4), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // The Razor-Sharp Photon Sphere Boundary
        ctx.save();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = '#fff8e1';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r * 1.05, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // The Pure Black Event Horizon Void
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Front-Half of Thin Keplerian Accretion Disc (Crossing in Front of Horizon)
        if (b.accretionParticles) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.diskAngle || 0.26);

          // Subtle planar disk stream line
          ctx.save();
          ctx.scale(1, b.diskTilt || 0.28);
          ctx.lineWidth = r * 0.55;
          const diskGrad = ctx.createLinearGradient(-r * 3.0, 0, r * 3.0, 0);
          diskGrad.addColorStop(0, 'rgba(255, 245, 210, 0.7)'); // Approaching beam
          diskGrad.addColorStop(0.5, 'rgba(230, 150, 60, 0.45)');
          diskGrad.addColorStop(1, 'rgba(140, 45, 15, 0.2)');  // Receding tail
          ctx.strokeStyle = diskGrad;
          ctx.beginPath();
          ctx.arc(0, 0, r * 2.1, 0, Math.PI); // Front arc only
          ctx.stroke();
          ctx.restore();

          // Front individual swirling plasma particles
          for (let i = 0; i < b.accretionParticles.length; i++) {
            const p = b.accretionParticles[i];
            const sinA = Math.sin(p.angle);
            if (sinA < 0) continue; // Front half only

            const cosA = Math.cos(p.angle);
            const px = cosA * p.r;
            const py = sinA * p.r * (b.diskTilt || 0.28);

            const doppler = Math.max(0.2, 1.0 - cosA * 0.65);
            let col;
            if (doppler > 1.2) col = `rgba(255, 252, 240, ${p.alpha * 0.95})`;
            else if (doppler > 0.8) col = `rgba(245, 195, 105, ${p.alpha * 0.75})`;
            else col = `rgba(185, 85, 35, ${p.alpha * 0.5})`;

            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(px, py, p.size * (0.8 + doppler * 0.4), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

      // =======================================================================
      // B. STARS, GIANTS, PLANETS & COMETS PIPELINE
      // =======================================================================
      } else {
        // Back-Half of Planetary Rings (Occluded behind Planet globe)
        if (b.hasRings) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.ringAngle || -0.38);
          ctx.scale(1, b.ringTilt || 0.25);

          const startA = Math.PI;
          const endA = Math.PI * 2;

          // Inner C-Ring (Crepe)
          ctx.beginPath();
          ctx.arc(0, 0, (b.ringInner + b.ringCassiniIn * 0.78) / 2, startA, endA);
          ctx.lineWidth = (b.ringCassiniIn * 0.78 - b.ringInner);
          ctx.strokeStyle = 'rgba(210, 190, 160, 0.12)';
          ctx.stroke();

          // Main Dense B-Ring
          ctx.beginPath();
          ctx.arc(0, 0, (b.ringCassiniIn * 0.78 + b.ringCassiniIn) / 2, startA, endA);
          ctx.lineWidth = (b.ringCassiniIn - b.ringCassiniIn * 0.78);
          ctx.strokeStyle = 'rgba(235, 215, 185, 0.38)';
          ctx.stroke();

          // Outer A-Ring
          ctx.beginPath();
          ctx.arc(0, 0, (b.ringCassiniOut + b.ringOuter) / 2, startA, endA);
          ctx.lineWidth = (b.ringOuter - b.ringCassiniOut);
          ctx.strokeStyle = 'rgba(205, 195, 175, 0.24)';
          ctx.stroke();

          ctx.restore();
        }

        // Solar Radiation Pressure Comet Tail (points strictly away from star)
        if (isComet && primaryStar) {
          const tailAngle = lightAngle + Math.PI;
          const tailLength = Math.min(110, Math.max(45, (1200 / (Math.hypot(dxToLight, dyToLight) + 50)) * 60));
          const tx = b.x + Math.cos(tailAngle) * tailLength;
          const ty = b.y + Math.sin(tailAngle) * tailLength;

          const tailGrad = ctx.createLinearGradient(b.x, b.y, tx, ty);
          tailGrad.addColorStop(0, 'rgba(215, 230, 245, 0.35)');
          tailGrad.addColorStop(0.3, 'rgba(180, 205, 230, 0.15)');
          tailGrad.addColorStop(1, 'rgba(180, 205, 230, 0)');

          ctx.strokeStyle = tailGrad;
          ctx.lineWidth = r * 1.8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        }

        // Realistic Solar Atmospheric Corona Glow
        if (isStar) {
          ctx.save();
          const coronaR = r * 2.2;
          const coronaGrad = ctx.createRadialGradient(b.x, b.y, r * 0.7, b.x, b.y, coronaR);
          coronaGrad.addColorStop(0, 'rgba(255, 245, 200, 0.35)');
          coronaGrad.addColorStop(0.5, 'rgba(245, 185, 95, 0.12)');
          coronaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = coronaGrad;
          ctx.beginPath();
          ctx.arc(b.x, b.y, coronaR, 0, Math.PI * 2);
          ctx.fill();

          // Subtle 4-Point Photographic Telescope Diffraction Spikes
          ctx.lineWidth = 0.6;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          const spikeLen = r * 2.6;
          ctx.beginPath();
          ctx.moveTo(b.x - spikeLen, b.y);
          ctx.lineTo(b.x + spikeLen, b.y);
          ctx.moveTo(b.x, b.y - spikeLen);
          ctx.lineTo(b.x, b.y + spikeLen);
          ctx.stroke();
          ctx.restore();
        }

        // 3D Spherical Core (Clipped to Globe)
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.clip();

        if (isStar) {
          // Photospheric Solar Core with Authentic Limb Darkening (Cosine Law)
          const starGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
          starGrad.addColorStop(0, '#ffffff');       // Incandescent optical core
          starGrad.addColorStop(0.45, b.secondaryColor || '#fffdf7');
          starGrad.addColorStop(0.82, b.color);      // Solar photosphere
          starGrad.addColorStop(1, '#b85414');       // Darkened limb
          ctx.fillStyle = starGrad;
          ctx.fill();
        } else {
          // Physically Grounded 3D Planetary Lighting (Lambertian Term)
          const lightOffsetDist = r * 0.45;
          const lx = b.x + Math.cos(lightAngle) * lightOffsetDist;
          const ly = b.y + Math.sin(lightAngle) * lightOffsetDist;

          const sphereGrad = ctx.createRadialGradient(lx, ly, r * 0.05, b.x, b.y, r * 1.02);
          sphereGrad.addColorStop(0, '#f8fafc'); // Daylit highlight
          sphereGrad.addColorStop(0.2, b.secondaryColor || b.color);
          sphereGrad.addColorStop(0.65, b.color);
          sphereGrad.addColorStop(0.98, '#06080d'); // Nightside terminator
          ctx.fillStyle = sphereGrad;
          ctx.fill();

          // Subtle Muted Gas Giant Atmospheric Belts
          if (isGiant) {
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.ringAngle || -0.38);

            [-0.5, -0.18, 0.18, 0.5].forEach((pos, idx) => {
              ctx.lineWidth = r * 0.22;
              ctx.strokeStyle = idx % 2 === 0 ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.08)';
              ctx.beginPath();
              ctx.moveTo(-r * 1.1, pos * r);
              ctx.lineTo(r * 1.1, pos * r);
              ctx.stroke();
            });

            // Authentic Great Oval Storm Spot
            const stormX = Math.cos(b.rotation) * r * 0.45;
            const stormY = r * 0.22;
            ctx.fillStyle = 'rgba(165, 65, 45, 0.4)';
            ctx.beginPath();
            ctx.ellipse(stormX, stormY, r * 0.2, r * 0.11, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }

          // Rayleigh Atmospheric Scattering Limb Haze (Lit edge only)
          const rimGrad = ctx.createRadialGradient(b.x, b.y, r * 0.82, b.x, b.y, r);
          rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
          rimGrad.addColorStop(0.88, 'rgba(200, 230, 255, 0.04)');
          rimGrad.addColorStop(1, b.type === 'terrestrial' ? 'rgba(100, 175, 240, 0.25)' : 'rgba(220, 200, 170, 0.18)');
          ctx.fillStyle = rimGrad;
          ctx.beginPath();
          ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
          ctx.fill();

          // Molten Magma Surface Fissures from Collisions
          if (b.heat > 0.02) {
            ctx.save();
            const heatAlpha = b.heat;
            ctx.lineWidth = Math.max(0.8, r * 0.12 * heatAlpha);
            ctx.strokeStyle = `rgba(234, 88, 12, ${heatAlpha * 0.85})`;
            ctx.beginPath();
            ctx.moveTo(b.x - r * 0.6, b.y - r * 0.1);
            ctx.lineTo(b.x - r * 0.1, b.y + r * 0.2);
            ctx.lineTo(b.x + r * 0.5, b.y - r * 0.15);
            ctx.moveTo(b.x - r * 0.1, b.y + r * 0.2);
            ctx.lineTo(b.x + r * 0.2, b.y + r * 0.5);
            ctx.stroke();

            ctx.lineWidth = Math.max(0.5, r * 0.05 * heatAlpha);
            ctx.strokeStyle = `rgba(254, 240, 138, ${heatAlpha * 0.9})`;
            ctx.beginPath();
            ctx.moveTo(b.x - r * 0.6, b.y - r * 0.1);
            ctx.lineTo(b.x - r * 0.1, b.y + r * 0.2);
            ctx.lineTo(b.x + r * 0.5, b.y - r * 0.15);
            ctx.stroke();
            ctx.restore();
          }
        }
        ctx.restore(); // End clipped globe

        // Front-Half of Planetary Rings with Planet Shadow Cutoff
        if (b.hasRings) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.ringAngle || -0.38);
          ctx.scale(1, b.ringTilt || 0.25);

          const startA = 0;
          const endA = Math.PI;

          // Inner C-Ring
          ctx.beginPath();
          ctx.arc(0, 0, (b.ringInner + b.ringCassiniIn * 0.78) / 2, startA, endA);
          ctx.lineWidth = (b.ringCassiniIn * 0.78 - b.ringInner);
          ctx.strokeStyle = 'rgba(210, 190, 160, 0.14)';
          ctx.stroke();

          // Main Dense B-Ring
          ctx.beginPath();
          ctx.arc(0, 0, (b.ringCassiniIn * 0.78 + b.ringCassiniIn) / 2, startA, endA);
          ctx.lineWidth = (b.ringCassiniIn - b.ringCassiniIn * 0.78);
          ctx.strokeStyle = 'rgba(235, 215, 185, 0.45)';
          ctx.stroke();

          // Outer A-Ring
          ctx.beginPath();
          ctx.arc(0, 0, (b.ringCassiniOut + b.ringOuter) / 2, startA, endA);
          ctx.lineWidth = (b.ringOuter - b.ringCassiniOut);
          ctx.strokeStyle = 'rgba(205, 195, 175, 0.28)';
          ctx.stroke();

          // Sharp Cylindrical Planet Shadow Projected across the Ring
          const relLightAngle = lightAngle - (b.ringAngle || -0.38);
          const shadowAngle = relLightAngle + Math.PI;
          const normShadow = ((shadowAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          if (normShadow >= 0 && normShadow <= Math.PI) {
            ctx.save();
            ctx.rotate(normShadow);
            ctx.fillStyle = 'rgba(3, 4, 7, 0.88)';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, b.ringOuter * 1.05, -0.22, 0.22);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          ctx.restore();
        }
      }

      ctx.restore();
    });

    // 8. Launch Velocity Direction Arrow Preview
    if (isDragging) {
      ctx.save();
      const dx = dragStart.x - dragCurrent.x;
      const dy = dragStart.y - dragCurrent.y;

      ctx.strokeStyle = 'rgba(226, 232, 240, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(dragStart.x, dragStart.y);
      ctx.lineTo(dragStart.x + dx, dragStart.y + dy);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(226, 232, 240, 0.2)';
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.7)';
      const previewR = Math.max(3, Math.pow(currentSpawnMass, 0.38) * 2.8);
      ctx.beginPath();
      ctx.arc(dragStart.x, dragStart.y, previewR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // Telemetry HUD Update
    document.getElementById('hud-fps').textContent = avgFps;
    document.getElementById('hud-bodies').textContent = physics.bodies.length;
    document.getElementById('hud-events').textContent = physics.totalEvents;
    const hudMergers = document.getElementById('hud-mergers');
    if (hudMergers) hudMergers.textContent = physics.mergerCount;
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

  const collisionSelect = document.getElementById('collision-select');
  if (collisionSelect) {
    collisionSelect.addEventListener('change', (e) => {
      physics.collisionMode = e.target.value;
    });
  }

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

  // Mass Launch Selector
  const massBtns = document.querySelectorAll('.mass-btn');
  massBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      massBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentSpawnMass = parseFloat(btn.dataset.mass);
    });
  });

  // Master Audio Toggle
  document.getElementById('audio-status').addEventListener('click', function () {
    ensureAudio();
    audio.isMuted = !audio.isMuted;
    audio.setMute(audio.isMuted);
    this.classList.toggle('audio-muted', audio.isMuted);
  });
})();
