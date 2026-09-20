/**
 * Orbitale — Application Controller & Canvas Rendering
 * Real-time relativistic & astrophysical canvas rendering pipeline.
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
  let currentSpawnMass = 25; // 5 = Comet, 25 = Terrestrial, 150 = Giant, 600 = Star, 1400 = Black Hole

  // Drag-to-fling interaction state
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let dragCurrent = { x: 0, y: 0 };

  // Sound ripple & stardust ambient visual effects
  const stardust = [];

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
    const statusEl = document.getElementById('audio-status');
    if (statusEl) statusEl.classList.remove('audio-muted');
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

      // Emit ambient micro-stardust particles from moving bodies
      physics.bodies.forEach(b => {
        if (Math.random() < 0.45 && b.trail.length > 0) {
          stardust.push({
            x: b.x + (Math.random() - 0.5) * b.radius * 0.8,
            y: b.y + (Math.random() - 0.5) * b.radius * 0.8,
            vx: -b.vx * 0.15 + (Math.random() - 0.5) * 12,
            vy: -b.vy * 0.15 + (Math.random() - 0.5) * 12,
            size: Math.random() * 2.2 + 0.8,
            color: b.color,
            alpha: 0.8,
            maxLife: 0.8 + Math.random() * 0.6,
            life: 0
          });
        }
      });
    }

    // Motion blur canvas clearing
    ctx.fillStyle = 'rgba(7, 8, 13, 0.28)';
    ctx.fillRect(0, 0, width, height);

    // Draw Resonance Rings with subtle harmonic pulse
    if (physics.ringsEnabled) {
      ctx.save();
      physics.resonanceRings.forEach((r, idx) => {
        const pulse = Math.sin(now * 0.0018 + idx * 0.7) * 0.025;
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(0, 242, 254, ${0.05 + (idx % 2) * 0.03 + pulse})`;
        ctx.beginPath();
        ctx.arc(physics.center.x, physics.center.y, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();
    }

    // =========================================================================
    // 1. Spacetime & Thermonuclear Blast Shockwaves
    // =========================================================================
    if (physics.shockwaves && physics.shockwaves.length > 0) {
      ctx.save();
      for (let i = 0; i < physics.shockwaves.length; i++) {
        const sw = physics.shockwaves[i];
        const alpha = sw.alpha;
        if (alpha <= 0.001) continue;

        ctx.lineWidth = Math.max(1, sw.width * (1 - sw.progress * 0.5));

        if (sw.type === 'gravitational') {
          // Relativistic Gravitational Wave Interference Pattern
          ctx.globalCompositeOperation = 'lighter';
          // Primary Wavefront
          ctx.strokeStyle = `rgba(0, 242, 254, ${alpha * 0.85})`;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
          ctx.stroke();

          // Chromatic Dispersion Secondary Wavefront (Lensed redshift echo)
          ctx.lineWidth = Math.max(1, sw.width * 0.6);
          ctx.strokeStyle = `rgba(168, 85, 247, ${alpha * 0.65})`;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, Math.max(1, sw.r - 8), 0, Math.PI * 2);
          ctx.stroke();

          // Inner Ripple
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, Math.max(1, sw.r - 18), 0, Math.PI * 2);
          ctx.stroke();
        } else if (sw.type === 'supernova') {
          // Thermonuclear Supernova Blast Shell
          ctx.globalCompositeOperation = 'lighter';
          const grad = ctx.createRadialGradient(sw.x, sw.y, Math.max(0, sw.r - 25), sw.x, sw.y, sw.r + 15);
          grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          grad.addColorStop(0.6, `rgba(255, 240, 200, ${alpha * 0.9})`);
          grad.addColorStop(0.85, `rgba(255, 75, 75, ${alpha * 0.7})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.r + 15, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
          ctx.lineWidth = sw.width;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Standard Impact / CME / Compression Wavefront
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = sw.color;
          ctx.globalAlpha = alpha * 0.75;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
          ctx.stroke();

          if (sw.secondaryColor) {
            ctx.lineWidth = Math.max(0.8, sw.width * 0.5);
            ctx.strokeStyle = sw.secondaryColor;
            ctx.globalAlpha = alpha * 0.45;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, Math.max(1, sw.r - 5), 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // =========================================================================
    // 2. Physical Debris & Ejecta Particles (Gravitationally pulled fragments)
    // =========================================================================
    if (physics.debris && physics.debris.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < physics.debris.length; i++) {
        const d = physics.debris[i];
        const progress = d.life / d.maxLife;
        const curAlpha = Math.max(0, 1 - progress);

        // Motion trail streak for ejecta
        const speed = Math.hypot(d.vx, d.vy);
        const streakLen = Math.min(speed * 0.08, 12);
        const normVx = speed > 0.001 ? (d.vx / speed) : 0;
        const normVy = speed > 0.001 ? (d.vy / speed) : 0;

        ctx.strokeStyle = d.color;
        ctx.globalAlpha = curAlpha * 0.7;
        ctx.lineWidth = d.size * (1 - progress * 0.4);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(d.x - normVx * streakLen, d.y - normVy * streakLen);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();

        // Hot incandescent particle head
        ctx.fillStyle = d.type === 'magma' && progress < 0.4 ? '#ffffff' : d.color;
        ctx.globalAlpha = curAlpha;
        ctx.beginPath();
        ctx.arc(d.x, d.y, Math.max(0.8, d.size * (1 - progress * 0.3)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // =========================================================================
    // 3. Stardust Wake (Ambient Body Particle Wake)
    // =========================================================================
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = stardust.length - 1; i >= 0; i--) {
      const p = stardust[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        stardust.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const progress = p.life / p.maxLife;
      const curAlpha = p.alpha * (1 - progress);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = curAlpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // =========================================================================
    // 4. Luminous Tapered Gravitational Trails
    // =========================================================================
    physics.bodies.forEach((b) => {
      if (b.trail.length > 2) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // Outer soft glow trail
        ctx.beginPath();
        for (let i = 0; i < b.trail.length; i++) {
          const pt = b.trail[i];
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = b.color;
        ctx.lineWidth = Math.max(1.5, b.radius * 0.45);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.22;
        ctx.stroke();

        // Inner bright laser spine
        ctx.beginPath();
        for (let i = Math.floor(b.trail.length * 0.3); i < b.trail.length; i++) {
          const pt = b.trail[i];
          if (i === Math.floor(b.trail.length * 0.3)) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(0.8, b.radius * 0.18);
        ctx.globalAlpha = 0.45;
        ctx.stroke();

        ctx.restore();
      }
    });

    // Find primary light source (e.g. star, or center of mass)
    const primaryStar = physics.bodies.find(b => b.type === 'star') || { x: physics.center.x, y: physics.center.y };

    // =========================================================================
    // 5. Celestial Bodies Rendering Pipeline
    // =========================================================================
    physics.bodies.forEach((b) => {
      const r = b.radius;
      const dxToLight = primaryStar.x - b.x;
      const dyToLight = primaryStar.y - b.y;
      const lightAngle = Math.atan2(dyToLight, dxToLight);
      const isStar = b.type === 'star';
      const isHole = b.type === 'black_hole';
      const isGiant = b.type === 'gas_giant' || b.type === 'ice_giant';

      ctx.save();

      // -----------------------------------------------------------------------
      // A. BLACK HOLE PIPELINE
      // -----------------------------------------------------------------------
      if (isHole) {
        // Spacetime Gravitational Lensing Halo
        const warpR = r * 4.6 * (1 + b.flash * 0.4);
        const lensGrad = ctx.createRadialGradient(b.x, b.y, r * 0.7, b.x, b.y, warpR);
        lensGrad.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
        lensGrad.addColorStop(0.25, 'rgba(80, 20, 220, 0.45)');
        lensGrad.addColorStop(0.55, 'rgba(0, 242, 254, 0.18)');
        lensGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = lensGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, warpR, 0, Math.PI * 2);
        ctx.fill();

        // Relativistic Gravitational Arch (Optically Lensed Back of Accretion Disk)
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.diskAngle || 0.26);
        ctx.globalCompositeOperation = 'lighter';

        // Upper Lensed Arch (bent over top pole)
        ctx.save();
        ctx.scale(1.02, 1.45);
        const archGradTop = ctx.createLinearGradient(0, -r * 2.5, 0, 0);
        archGradTop.addColorStop(0, 'rgba(255, 140, 30, 0.55)');
        archGradTop.addColorStop(0.5, 'rgba(255, 210, 80, 0.85)');
        archGradTop.addColorStop(1, 'rgba(0, 242, 254, 0.15)');
        ctx.strokeStyle = archGradTop;
        ctx.lineWidth = r * 0.55;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.52, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
        ctx.restore();

        // Lower Lensed Arch (bent under bottom pole)
        ctx.save();
        ctx.scale(1.02, 1.35);
        const archGradBottom = ctx.createLinearGradient(0, r * 2.2, 0, 0);
        archGradBottom.addColorStop(0, 'rgba(255, 100, 20, 0.4)');
        archGradBottom.addColorStop(0.5, 'rgba(255, 180, 60, 0.65)');
        archGradBottom.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.strokeStyle = archGradBottom;
        ctx.lineWidth = r * 0.42;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.48, Math.PI * 0.08, Math.PI * 0.92);
        ctx.stroke();
        ctx.restore();

        // Back Half of Accretion Disk Particles
        if (b.accretionParticles) {
          for (let i = 0; i < b.accretionParticles.length; i++) {
            const p = b.accretionParticles[i];
            const sinA = Math.sin(p.angle);
            if (sinA >= 0) continue; // Skip front half

            const cosA = Math.cos(p.angle);
            const px = cosA * p.r;
            const py = sinA * p.r * (b.diskTilt || 0.32);

            // Doppler boosting: Approaching is hotter/bluer
            const doppler = Math.max(0.2, 1.0 - cosA * 0.7);
            const pRad = p.size * (0.8 + doppler * 0.6);

            let col;
            if (doppler > 1.2) col = `rgba(220, 250, 255, ${p.alpha * 0.9})`;
            else if (doppler > 0.8) col = `rgba(255, 195, 60, ${p.alpha * 0.75})`;
            else col = `rgba(255, 65, 25, ${p.alpha * 0.5})`;

            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(px, py, pRad, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // Bipolar Relativistic Plasma Jets
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const jetAngle = (b.diskAngle || 0.26) + Math.PI / 2;
        const jetLength = r * 5.2;
        const jetWidth = r * 0.38;

        [-1, 1].forEach(dir => {
          const jx = b.x + Math.cos(jetAngle) * jetLength * dir;
          const jy = b.y + Math.sin(jetAngle) * jetLength * dir;
          const jetGrad = ctx.createLinearGradient(b.x, b.y, jx, jy);
          jetGrad.addColorStop(0, '#ffffff');
          jetGrad.addColorStop(0.2, '#00f2fe');
          jetGrad.addColorStop(0.7, 'rgba(160, 40, 255, 0.45)');
          jetGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.strokeStyle = jetGrad;
          ctx.lineWidth = jetWidth;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(jx, jy);
          ctx.stroke();
        });
        ctx.restore();

        // Photon Sphere (Razor-Sharp Lensing Boundary)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 2.8;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r * 1.06, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Pure Black Event Horizon Core
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Front Half of Accretion Disk Particles
        if (b.accretionParticles) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.diskAngle || 0.26);
          ctx.globalCompositeOperation = 'lighter';

          // Swirling equatorial plasma stream line
          ctx.save();
          ctx.scale(1, b.diskTilt || 0.32);
          ctx.lineWidth = r * 0.75;
          const diskRingGrad = ctx.createLinearGradient(-r * 3.5, 0, r * 3.5, 0);
          diskRingGrad.addColorStop(0, 'rgba(180, 240, 255, 0.85)');
          diskRingGrad.addColorStop(0.4, 'rgba(255, 200, 60, 0.7)');
          diskRingGrad.addColorStop(1, 'rgba(255, 50, 20, 0.35)');
          ctx.strokeStyle = diskRingGrad;
          ctx.shadowColor = '#ff9900';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.arc(0, 0, r * 2.2, 0, Math.PI);
          ctx.stroke();
          ctx.restore();

          // Front individual swirling plasma particles
          for (let i = 0; i < b.accretionParticles.length; i++) {
            const p = b.accretionParticles[i];
            const sinA = Math.sin(p.angle);
            if (sinA < 0) continue;

            const cosA = Math.cos(p.angle);
            const px = cosA * p.r;
            const py = sinA * p.r * (b.diskTilt || 0.32);

            const doppler = Math.max(0.2, 1.0 - cosA * 0.7);
            const pRad = p.size * (0.9 + doppler * 0.7);

            let col;
            if (doppler > 1.2) col = `rgba(235, 255, 255, ${p.alpha * 0.95})`;
            else if (doppler > 0.8) col = `rgba(255, 210, 70, ${p.alpha * 0.85})`;
            else col = `rgba(255, 80, 30, ${p.alpha * 0.65})`;

            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(px, py, pRad, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

      // -----------------------------------------------------------------------
      // B. STARS, GIANTS & PLANETS PIPELINE
      // -----------------------------------------------------------------------
      } else {
        // Back Half of Planetary Rings (Behind Planet)
        if (b.hasRings) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.ringAngle);
          ctx.scale(1, b.ringTilt);

          const startA = Math.PI;
          const endA = Math.PI * 2;

          // Inner Crepe Ring C
          ctx.beginPath();
          ctx.arc(0, 0, (b.ringInner + b.ringCassiniIn * 0.75) / 2, startA, endA);
          ctx.lineWidth = (b.ringCassiniIn * 0.75 - b.ringInner);
          ctx.strokeStyle = 'rgba(255, 220, 160, 0.18)';
          ctx.stroke();

          // Dense Main B-Ring
          ctx.beginPath();
          ctx.arc(0, 0, (b.ringCassiniIn * 0.75 + b.ringCassiniIn) / 2, startA, endA);
          ctx.lineWidth = (b.ringCassiniIn - b.ringCassiniIn * 0.75);
          ctx.strokeStyle = 'rgba(255, 240, 200, 0.45)';
          ctx.stroke();

          // Outer A-Ring
          ctx.beginPath();
          ctx.arc(0, 0, (b.ringCassiniOut + b.ringOuter) / 2, startA, endA);
          ctx.lineWidth = (b.ringOuter - b.ringCassiniOut);
          ctx.strokeStyle = 'rgba(220, 240, 255, 0.32)';
          ctx.stroke();

          ctx.restore();
        }

        // Outer Radiant Bloom Corona
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const coronaR = r * (isStar ? 3.6 : 2.2) * (1 + b.flash * 0.8);
        const coronaGrad = ctx.createRadialGradient(b.x, b.y, r * 0.5, b.x, b.y, coronaR);
        coronaGrad.addColorStop(0, b.color);
        coronaGrad.addColorStop(0.4, b.glowColor || 'rgba(0,242,254,0.15)');
        coronaGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = coronaGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, coronaR, 0, Math.PI * 2);
        ctx.fill();

        // Dynamic Magnetic Coronal Prominence Arches for Stars
        if (isStar) {
          ctx.lineWidth = 1.8;
          const numProminences = 8;
          for (let k = 0; k < numProminences; k++) {
            const promA = b.flarePhase * 0.8 + (k * Math.PI * 2) / numProminences;
            const loopH = r * (0.4 + Math.sin(b.flarePhase * 2 + k * 1.5) * 0.25);
            const p1x = b.x + Math.cos(promA - 0.15) * r;
            const p1y = b.y + Math.sin(promA - 0.15) * r;
            const p2x = b.x + Math.cos(promA + 0.15) * r;
            const p2y = b.y + Math.sin(promA + 0.15) * r;
            const cpx = b.x + Math.cos(promA) * (r + loopH);
            const cpy = b.y + Math.sin(promA) * (r + loopH);

            ctx.strokeStyle = b.secondaryColor;
            ctx.globalAlpha = 0.45 + Math.sin(b.flarePhase * 3 + k) * 0.25;
            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            ctx.quadraticCurveTo(cpx, cpy, p2x, p2y);
            ctx.stroke();
          }
        }
        ctx.restore();

        // 3D Spherical Core (Clipped)
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.clip();

        if (isStar) {
          // Photospheric Solar Core with Authentic Limb Darkening
          const starGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
          starGrad.addColorStop(0, '#ffffff'); // Blazing white-hot core
          starGrad.addColorStop(0.25, b.secondaryColor);
          starGrad.addColorStop(0.72, b.color);
          starGrad.addColorStop(1, '#660505'); // Solar limb darkening
          ctx.fillStyle = starGrad;
          ctx.fill();

          // Granulation / Convective Cells Shimmer
          ctx.save();
          ctx.globalCompositeOperation = 'overlay';
          ctx.rotate(b.rotation * 0.5);
          for (let g = 0; g < 4; g++) {
            const ga = (g / 4) * Math.PI * 2 + b.rotation;
            const gx = b.x + Math.cos(ga) * (r * 0.45);
            const gy = b.y + Math.sin(ga) * (r * 0.45);
            const gGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 0.4);
            gGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
            gGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gGrad;
            ctx.beginPath();
            ctx.arc(gx, gy, r * 0.4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        } else {
          // 3D Spherical Lighting with Primary Light Direction
          const lightOffsetDist = r * 0.45;
          const lx = b.x + Math.cos(lightAngle) * lightOffsetDist;
          const ly = b.y + Math.sin(lightAngle) * lightOffsetDist;

          const sphereGrad = ctx.createRadialGradient(lx, ly, r * 0.05, b.x, b.y, r * 1.05);
          sphereGrad.addColorStop(0, '#ffffff');
          sphereGrad.addColorStop(0.22, b.secondaryColor || b.color);
          sphereGrad.addColorStop(0.68, b.color);
          sphereGrad.addColorStop(1, '#05070a'); // Deep dark planetary nightside

          ctx.fillStyle = sphereGrad;
          ctx.fill();

          // Gas Giant Atmospheric Belts with Differential Rotation
          if (isGiant) {
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.ringAngle || -0.42);

            const beltColors = [
              'rgba(255, 255, 255, 0.12)',
              'rgba(0, 0, 0, 0.16)',
              'rgba(255, 220, 160, 0.14)',
              'rgba(0, 0, 0, 0.18)'
            ];

            // 4 latitudinal atmospheric zones
            [-0.55, -0.2, 0.2, 0.55].forEach((pos, idx) => {
              ctx.lineWidth = r * 0.24;
              ctx.strokeStyle = beltColors[idx % beltColors.length];
              ctx.beginPath();
              ctx.moveTo(-r * 1.1, pos * r);
              ctx.lineTo(r * 1.1, pos * r);
              ctx.stroke();
            });

            // Great Cyclonic Storm Spot (Jupiter Red Spot / Neptune Dark Spot)
            const stormA = b.rotation * 1.5;
            const stormX = Math.cos(stormA) * r * 0.55;
            const stormY = r * 0.22;
            ctx.fillStyle = 'rgba(210, 40, 20, 0.55)';
            ctx.beginPath();
            ctx.ellipse(stormX, stormY, r * 0.22, r * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }

          // Specular Ocean Glint for Terrestrial Rocky/Ocean Worlds
          if (b.type === 'terrestrial') {
            const specX = (lx + b.x) / 2;
            const specY = (ly + b.y) / 2;
            const specGrad = ctx.createRadialGradient(specX, specY, 0, specX, specY, r * 0.35);
            specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
            specGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
            specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = specGrad;
            ctx.beginPath();
            ctx.arc(specX, specY, r * 0.35, 0, Math.PI * 2);
            ctx.fill();
          }

          // Rayleigh Atmospheric Limb Scattering
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const rimGrad = ctx.createRadialGradient(b.x, b.y, r * 0.8, b.x, b.y, r);
          rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
          rimGrad.addColorStop(0.85, 'rgba(255,255,255,0.08)');
          rimGrad.addColorStop(1, b.color);
          ctx.fillStyle = rimGrad;
          ctx.beginPath();
          ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // ===================================================================
          // Molten Magma Surface Fissures (From Mergers & High-Energy Collisions)
          // ===================================================================
          if (b.heat > 0.02) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const heatAlpha = b.heat;
            ctx.lineWidth = Math.max(1.2, r * 0.16 * heatAlpha);
            ctx.strokeStyle = `rgba(255, 110, 20, ${heatAlpha * 0.9})`;
            ctx.shadowColor = '#ff4500';
            ctx.shadowBlur = 10 * heatAlpha;

            // Branched crack network
            ctx.beginPath();
            ctx.moveTo(b.x - r * 0.7, b.y - r * 0.1);
            ctx.lineTo(b.x - r * 0.1, b.y + r * 0.2);
            ctx.lineTo(b.x + r * 0.6, b.y - r * 0.2);
            ctx.moveTo(b.x - r * 0.1, b.y + r * 0.2);
            ctx.lineTo(b.x + r * 0.2, b.y + r * 0.6);
            ctx.stroke();

            // Incandescent white-hot core of the fissures
            ctx.lineWidth = Math.max(0.6, r * 0.06 * heatAlpha);
            ctx.strokeStyle = `rgba(255, 255, 220, ${heatAlpha * 0.95})`;
            ctx.beginPath();
            ctx.moveTo(b.x - r * 0.7, b.y - r * 0.1);
            ctx.lineTo(b.x - r * 0.1, b.y + r * 0.2);
            ctx.lineTo(b.x + r * 0.6, b.y - r * 0.2);
            ctx.moveTo(b.x - r * 0.1, b.y + r * 0.2);
            ctx.lineTo(b.x + r * 0.2, b.y + r * 0.6);
            ctx.stroke();

            ctx.restore();
          }
        }
        ctx.restore(); // End clipped sphere

        // Front Half of Planetary Rings (In Front of Planet + Planet Shadow Cast)
        if (b.hasRings) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.ringAngle);
          ctx.scale(1, b.ringTilt);

          const startA = 0;
          const endA = Math.PI;

          // Inner Crepe Ring C
          ctx.beginPath();
          ctx.arc(0, 0, (b.ringInner + b.ringCassiniIn * 0.75) / 2, startA, endA);
          ctx.lineWidth = (b.ringCassiniIn * 0.75 - b.ringInner);
          ctx.strokeStyle = 'rgba(255, 220, 160, 0.22)';
          ctx.stroke();

          // Dense Main B-Ring
          ctx.beginPath();
          ctx.arc(0, 0, (b.ringCassiniIn * 0.75 + b.ringCassiniIn) / 2, startA, endA);
          ctx.lineWidth = (b.ringCassiniIn - b.ringCassiniIn * 0.75);
          ctx.strokeStyle = 'rgba(255, 240, 200, 0.55)';
          ctx.stroke();

          // Outer A-Ring
          ctx.beginPath();
          ctx.arc(0, 0, (b.ringCassiniOut + b.ringOuter) / 2, startA, endA);
          ctx.lineWidth = (b.ringOuter - b.ringCassiniOut);
          ctx.strokeStyle = 'rgba(220, 240, 255, 0.38)';
          ctx.stroke();

          // Planet Shadow Cast onto the Ring Plane
          const relLightAngle = lightAngle - b.ringAngle;
          const shadowAngle = relLightAngle + Math.PI;
          const normShadow = ((shadowAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          if (normShadow >= 0 && normShadow <= Math.PI) {
            ctx.save();
            ctx.rotate(normShadow);
            ctx.fillStyle = 'rgba(7, 8, 13, 0.75)';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, b.ringOuter * 1.05, -0.25, 0.25);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          ctx.restore();
        }
      }

      // -----------------------------------------------------------------------
      // C. RESONANCE & GRAVITATIONAL WAVE SHOCKWAVE FLASH
      // -----------------------------------------------------------------------
      if (b.flash > 0.02) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = isHole ? 3.5 : 2.5;
        ctx.strokeStyle = isHole ? '#00f2fe' : b.color;
        ctx.globalAlpha = b.flash * 0.95;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r + (1.0 - b.flash) * (isHole ? 75 : 48), 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isHole ? '#ff0844' : b.secondaryColor;
        ctx.globalAlpha = b.flash * 0.7;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r + (1.0 - b.flash) * (isHole ? 45 : 32), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    });

    // =========================================================================
    // 6. Draw Drag Velocity Trajectory Preview
    // =========================================================================
    if (isDragging) {
      ctx.save();
      const dx = dragStart.x - dragCurrent.x;
      const dy = dragStart.y - dragCurrent.y;

      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(dragStart.x, dragStart.y);
      ctx.lineTo(dragStart.x + dx, dragStart.y + dy);
      ctx.stroke();

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
