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

      // Emit stardust particles from moving bodies
      physics.bodies.forEach(b => {
        if (Math.random() < 0.45 && b.trail.length > 0) {
          const speed = b.getSpeed();
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
    ctx.fillStyle = 'rgba(7, 8, 13, 0.25)';
    ctx.fillRect(0, 0, width, height);

    // Draw Resonance Rings with subtle pulse
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

    // 1. Update and Render Stardust Wake (Additive Blending)
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

    // 2. Draw Tapered Luminous Trails
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

    // 3. Draw Celestial Bodies with Dynamic Relativistic Accretion & Multi-Band Planetary Rings
    physics.bodies.forEach((b) => {
      const r = b.radius;
      const dxToLight = primaryStar.x - b.x;
      const dyToLight = primaryStar.y - b.y;
      const lightAngle = Math.atan2(dyToLight, dxToLight);
      const isStar = b.type === 'star';
      const isHole = b.type === 'black_hole';

      ctx.save();

      // ==========================================
      // BLACK HOLE RENDERING PIPELINE
      // ==========================================
      if (isHole) {
        // A. Spacetime Curvature & Gravitational Lensing Distortion Halo
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

        // B. Relativistic Gravitational Arch (Optically Lensed Back of Accretion Disk)
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.diskAngle || 0.26);
        ctx.globalCompositeOperation = 'lighter';

        // Upper Lensed Arch (bent over the top pole)
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

        // Lower Lensed Arch (bent under the bottom pole)
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

        // C. Back Half of Accretion Disk Particles (behind the event horizon)
        if (b.accretionParticles) {
          for (let i = 0; i < b.accretionParticles.length; i++) {
            const p = b.accretionParticles[i];
            const sinA = Math.sin(p.angle);
            if (sinA >= 0) continue; // Skip front half

            const cosA = Math.cos(p.angle);
            const px = cosA * p.r;
            const py = sinA * p.r * (b.diskTilt || 0.32);

            // Relativistic Doppler boosting: Approaching (left) is hotter/bluer
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

        // D. Bipolar Relativistic Plasma Jets
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

        // E. The Event Horizon Void & Razor-Sharp Photon Sphere
        // 1. Brilliant Photon Sphere (Relativistic light boundary)
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

        // 2. Pure Black Event Horizon Core
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();

        // F. Front Half of Accretion Disk Particles (In front of horizon with Doppler glare)
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
          diskRingGrad.addColorStop(0, 'rgba(180, 240, 255, 0.85)'); // Approaching beam
          diskRingGrad.addColorStop(0.4, 'rgba(255, 200, 60, 0.7)');
          diskRingGrad.addColorStop(1, 'rgba(255, 50, 20, 0.35)');  // Receding tail
          ctx.strokeStyle = diskRingGrad;
          ctx.shadowColor = '#ff9900';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.arc(0, 0, r * 2.2, 0, Math.PI); // Front half
          ctx.stroke();
          ctx.restore();

          // Front individual swirling plasma particles
          for (let i = 0; i < b.accretionParticles.length; i++) {
            const p = b.accretionParticles[i];
            const sinA = Math.sin(p.angle);
            if (sinA < 0) continue; // Front half only

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

      // ==========================================
      // PLANET & STAR RENDERING PIPELINE
      // ==========================================
      } else {
        // A. Back Half of Planetary Rings (Behind Planet)
        if (b.hasRings) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.ringAngle);
          ctx.scale(1, b.ringTilt);

          // Upper half is behind [Math.PI to 2*Math.PI]
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

          // Outer A-Ring (after Cassini gap)
          ctx.beginPath();
          ctx.arc(0, 0, (b.ringCassiniOut + b.ringOuter) / 2, startA, endA);
          ctx.lineWidth = (b.ringOuter - b.ringCassiniOut);
          ctx.strokeStyle = 'rgba(220, 240, 255, 0.32)';
          ctx.stroke();

          ctx.restore();
        }

        // B. Outer Radiant Bloom Corona (Stars & Planets)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const coronaR = r * (isStar ? 3.4 : 2.2) * (1 + b.flash * 0.8);
        const coronaGrad = ctx.createRadialGradient(b.x, b.y, r * 0.5, b.x, b.y, coronaR);
        coronaGrad.addColorStop(0, b.color);
        coronaGrad.addColorStop(0.4, b.glowColor || 'rgba(0,242,254,0.15)');
        coronaGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = coronaGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, coronaR, 0, Math.PI * 2);
        ctx.fill();

        // Coronal Solar Flares for Stars
        if (isStar) {
          ctx.lineWidth = 1.5;
          const numRays = 12;
          for (let k = 0; k < numRays; k++) {
            const rayAngle = b.flarePhase + (k * Math.PI * 2) / numRays;
            const rayLen = r * (1.6 + Math.sin(b.flarePhase * 2 + k) * 0.45);
            ctx.strokeStyle = b.secondaryColor;
            ctx.globalAlpha = 0.35 + Math.sin(b.flarePhase * 3 + k) * 0.2;
            ctx.beginPath();
            ctx.moveTo(b.x + Math.cos(rayAngle) * r * 0.8, b.y + Math.sin(rayAngle) * r * 0.8);
            ctx.lineTo(b.x + Math.cos(rayAngle) * rayLen, b.y + Math.sin(rayAngle) * rayLen);
            ctx.stroke();
          }
        }
        ctx.restore();

        // C. 3D Spherical Core Rendering
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.clip();

        if (isStar) {
          // Star Plasma Core
          const starGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
          starGrad.addColorStop(0, '#ffffff');
          starGrad.addColorStop(0.2, b.secondaryColor);
          starGrad.addColorStop(0.7, b.color);
          starGrad.addColorStop(1, '#ff1a1a');
          ctx.fillStyle = starGrad;
          ctx.fill();
        } else {
          // 3D Sphere Shading with Light Vector
          const lightOffsetDist = r * 0.45;
          const lx = b.x + Math.cos(lightAngle) * lightOffsetDist;
          const ly = b.y + Math.sin(lightAngle) * lightOffsetDist;

          const sphereGrad = ctx.createRadialGradient(lx, ly, r * 0.05, b.x, b.y, r * 1.05);
          sphereGrad.addColorStop(0, '#ffffff');
          sphereGrad.addColorStop(0.2, b.secondaryColor || b.color);
          sphereGrad.addColorStop(0.65, b.color);
          sphereGrad.addColorStop(1, '#05070a');

          ctx.fillStyle = sphereGrad;
          ctx.fill();

          // Atmospheric Banding / Texture
          ctx.save();
          ctx.rotate(b.rotation);
          ctx.lineWidth = r * 0.14;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.beginPath();
          ctx.moveTo(b.x - r, b.y - r * 0.2);
          ctx.lineTo(b.x + r, b.y - r * 0.2);
          ctx.moveTo(b.x - r, b.y + r * 0.25);
          ctx.lineTo(b.x + r, b.y + r * 0.25);
          ctx.stroke();
          ctx.restore();

          // Atmospheric Rim Glow / Fresnel Scattering
          ctx.globalCompositeOperation = 'screen';
          const rimGrad = ctx.createRadialGradient(b.x, b.y, r * 0.8, b.x, b.y, r);
          rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
          rimGrad.addColorStop(0.85, 'rgba(255,255,255,0.05)');
          rimGrad.addColorStop(1, b.color);
          ctx.fillStyle = rimGrad;
          ctx.beginPath();
          ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // D. Front Half of Planetary Rings (In Front of Planet + Planet Shadow Cast)
        if (b.hasRings) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.ringAngle);
          ctx.scale(1, b.ringTilt);

          // Lower half is in front [0 to Math.PI]
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

          // Realistic Planet Shadow Cast onto the Ring
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

      // E. Resonance & Gravitational Wave Shockwave
      if (b.flash > 0.02) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = isHole ? 3.5 : 2.5;
        ctx.strokeStyle = isHole ? '#00f2fe' : b.color;
        ctx.globalAlpha = b.flash * 0.95;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r + (1.0 - b.flash) * (isHole ? 75 : 48), 0, Math.PI * 2);
        ctx.stroke();

        // Secondary chromatic ring
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
