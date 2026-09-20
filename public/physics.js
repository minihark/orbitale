/**
 * Orbitale — Celestial Mechanics & Resonance Physics
 * N-Body gravitational simulator with realistic astrophysical mergers,
 * relativistic tidal disruptions, debris dynamics, and spacetime shockwaves.
 */

class CelestialBody {
  constructor({ x, y, vx = 0, vy = 0, mass = 10, radius = null, color = null, isFixed = false }) {
    this.id = Math.random().toString(36).substring(2, 9);
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ax = 0;
    this.ay = 0;
    this.mass = mass;
    this.isFixed = isFixed;
    this.customColor = color;

    // Thermal energy (molten magma / plasma heat from impacts)
    this.heat = 0.0;
    this.coolingRate = 0.22; // Cools down over ~4.5 seconds

    // Initial classification
    this.reclassify();
    if (radius) this.radius = radius;

    // Star / singularity pulsation and rotation
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 1.2;
    this.flarePhase = Math.random() * Math.PI * 2;

    this.trail = [];
    this.maxTrail = 65;
    this.lastRingCrossed = -1;
    this.proximityCooloff = 0;
    this.flash = 0; // Flash animation on sound/collision trigger
    this.consumedCount = 0;
  }

  reclassify() {
    const mass = this.mass;

    if (mass >= 1100) {
      this.type = 'black_hole'; // Supermassive Singularity
      this.color = '#000000';
      this.secondaryColor = '#00f2fe';
      this.glowColor = 'rgba(170, 70, 255, 0.45)';
      this.radius = Math.max(9, Math.pow(mass, 0.35) * 2.2);
      this.hasRings = false;

      // Initialize relativistic accretion disk if missing
      if (!this.accretionParticles || this.accretionParticles.length < 50) {
        this.diskAngle = 0.26;
        this.diskTilt = 0.32;
        this.accretionParticles = [];
        const pCount = 160;
        for (let i = 0; i < pCount; i++) {
          const rNorm = Math.pow(Math.random(), 0.5);
          this.accretionParticles.push({
            r: this.radius * (1.25 + rNorm * 3.2),
            angle: Math.random() * Math.PI * 2,
            speed: (1.6 + (1.0 - rNorm) * 3.2) * (0.85 + Math.random() * 0.3),
            size: Math.random() * 2.4 + 0.8,
            alpha: Math.random() * 0.5 + 0.5,
            flicker: Math.random() * Math.PI * 2
          });
        }
      }
    } else if (mass >= 450) {
      this.type = 'star'; // Solar Star / Pulsar
      this.color = this.customColor || '#ff4b4b';
      this.secondaryColor = '#ffe066';
      this.glowColor = 'rgba(255, 120, 50, 0.45)';
      this.radius = Math.max(7, Math.pow(mass, 0.38) * 2.8);
      this.hasRings = false;
      this.accretionParticles = null;
    } else if (mass >= 120) {
      this.type = 'gas_giant'; // Gas Giant with rings
      this.color = this.customColor || '#ff9d00';
      this.secondaryColor = '#ffe3a0';
      this.glowColor = 'rgba(255, 170, 50, 0.3)';
      this.radius = Math.max(5.5, Math.pow(mass, 0.38) * 2.8);
      this.hasRings = true;
      this.ringTilt = 0.28;
      this.ringAngle = -0.42;
      this.ringInner = this.radius * 1.35;
      this.ringCassiniIn = this.radius * 1.95;
      this.ringCassiniOut = this.radius * 2.12;
      this.ringOuter = Math.max(this.ringOuter || 0, this.radius * 2.65);
      this.accretionParticles = null;
    } else if (mass >= 35) {
      this.type = 'ice_giant'; // Neptune / Uranus style
      this.color = this.customColor || '#00f2fe';
      this.secondaryColor = '#c2f9ff';
      this.glowColor = 'rgba(0, 242, 254, 0.3)';
      this.radius = Math.max(4.5, Math.pow(mass, 0.38) * 2.8);
      this.hasRings = true;
      this.ringTilt = 0.28;
      this.ringAngle = -0.42;
      this.ringInner = this.radius * 1.35;
      this.ringCassiniIn = this.radius * 1.95;
      this.ringCassiniOut = this.radius * 2.12;
      this.ringOuter = Math.max(this.ringOuter || 0, this.radius * 2.65);
      this.accretionParticles = null;
    } else if (mass >= 12) {
      this.type = 'terrestrial'; // Rocky / Oceanic planet
      this.color = this.customColor || '#4facfe';
      this.secondaryColor = '#00f5a0';
      this.glowColor = 'rgba(79, 172, 254, 0.25)';
      this.radius = Math.max(3.5, Math.pow(mass, 0.38) * 2.8);
      this.accretionParticles = null;
    } else {
      this.type = 'comet'; // Asteroid / Comet
      this.color = this.customColor || '#a8ff78';
      this.secondaryColor = '#ffffff';
      this.glowColor = 'rgba(168, 255, 120, 0.2)';
      this.radius = Math.max(3.0, Math.pow(mass, 0.38) * 2.8);
      this.hasRings = false;
      this.accretionParticles = null;
    }
  }

  update(dt, trailDecay = 65) {
    if (!this.isFixed) {
      this.vx += this.ax * dt;
      this.vy += this.ay * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

    // Update black hole accretion particles
    if (this.type === 'black_hole' && this.accretionParticles) {
      for (let i = 0; i < this.accretionParticles.length; i++) {
        const p = this.accretionParticles[i];
        p.angle += (p.speed * (this.radius / (p.r + 0.1))) * dt * 4.8;
        p.flicker += dt * 6.0;
        p.r -= dt * 1.2; // Infall drift
        if (p.r < this.radius * 1.15) {
          p.r = this.radius * (3.8 + Math.random() * 0.4);
        }
      }
    }

    // Update rotation and flare phase
    this.rotation += this.rotationSpeed * dt;
    this.flarePhase += dt * 3.5;

    // Reset accelerations
    this.ax = 0;
    this.ay = 0;

    // Decay thermal heat
    if (this.heat > 0) {
      this.heat = Math.max(0, this.heat - dt * this.coolingRate);
    }

    // Update trail
    const speed = this.getSpeed();
    this.trail.push({ 
      x: this.x, 
      y: this.y, 
      vx: this.vx, 
      vy: this.vy, 
      speed: speed,
      color: this.color 
    });
    if (this.trail.length > trailDecay) {
      this.trail.shift();
    }

    if (this.proximityCooloff > 0) {
      this.proximityCooloff -= dt;
    }
    if (this.flash > 0) {
      this.flash -= dt * 2.5;
    }
  }

  getSpeed() {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }
}

class PhysicsEngine {
  constructor() {
    this.bodies = [];
    this.debris = []; // Physical ejecta particles influenced by gravity
    this.shockwaves = []; // Expanding spacetime & blast wavefronts
    this.G = 1200; // Gravitational constant
    this.softening = 400; // Prevents infinite forces at r -> 0
    this.collisionMode = 'merge'; // 'merge' (astrophysical), 'bounce'
    this.ringsEnabled = true;
    this.resonanceRings = [120, 240, 360, 480, 600]; // Radii from center
    this.center = { x: 0, y: 0 };
    this.totalEvents = 0;
    this.mergerCount = 0;
  }

  setCenter(x, y) {
    this.center = { x, y };
  }

  addBody(body) {
    this.bodies.push(body);
  }

  clear() {
    this.bodies = [];
    this.debris = [];
    this.shockwaves = [];
    this.totalEvents = 0;
    this.mergerCount = 0;
  }

  spawnShockwave(x, y, opts = {}) {
    this.shockwaves.push({
      x,
      y,
      r: opts.minR || 8,
      maxR: opts.maxR || 200,
      speed: opts.speed || 240,
      color: opts.color || '#00f2fe',
      secondaryColor: opts.secondaryColor || '#ffffff',
      width: opts.width || 3.0,
      type: opts.type || 'blast',
      alpha: 1.0,
      progress: 0
    });
  }

  spawnDebris(x, y, count, opts = {}) {
    for (let k = 0; k < count; k++) {
      const angle = (k / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = (opts.baseSpeed || 80) * (0.4 + Math.random() * 0.9);
      this.debris.push({
        x: x + Math.cos(angle) * (opts.radiusOffset || 4),
        y: y + Math.sin(angle) * (opts.radiusOffset || 4),
        vx: (opts.vx || 0) + Math.cos(angle) * speed,
        vy: (opts.vy || 0) + Math.sin(angle) * speed,
        size: Math.random() * (opts.maxSize || 2.8) + 0.8,
        color: opts.colors ? opts.colors[Math.floor(Math.random() * opts.colors.length)] : (opts.color || '#ffaa00'),
        life: 0,
        maxLife: opts.maxLife || (1.2 + Math.random() * 1.5),
        type: opts.type || 'magma'
      });
    }
  }

  step(dt, width, height) {
    const n = this.bodies.length;
    const toRemove = new Set();

    // 1. Compute Gravitational Forces & Collision Detection
    for (let i = 0; i < n; i++) {
      const b1 = this.bodies[i];
      if (toRemove.has(b1.id)) continue;

      for (let j = i + 1; j < n; j++) {
        const b2 = this.bodies[j];
        if (toRemove.has(b2.id)) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        // A. Collision Detection
        const collisionThreshold = b1.radius + b2.radius;
        if (dist < collisionThreshold && dist > 0.0001) {
          if (this.collisionMode === 'merge') {
            this.resolveAstrophysicalCollision(b1, b2, dx, dy, dist, width, height, toRemove);
            continue;
          } else {
            this.resolveBounce(b1, b2, dx, dy, dist);
          }
        }

        // B. Proximity Resonance Chime
        const triggerDistance = b1.radius + b2.radius + 35;
        if (dist < triggerDistance) {
          if (b1.proximityCooloff <= 0 && b2.proximityCooloff <= 0) {
            this.handleProximityResonance(b1, b2, width);
            b1.proximityCooloff = 0.35;
            b2.proximityCooloff = 0.35;
          }
        }

        // C. N-Body Gravitational Acceleration: a = G * m / (r^2 + eps)
        const force = this.G / (distSq + this.softening);
        const fx = force * (dx / (dist + 0.001));
        const fy = force * (dy / (dist + 0.001));

        if (!b1.isFixed) {
          b1.ax += fx * b2.mass;
          b1.ay += fy * b2.mass;
        }
        if (!b2.isFixed) {
          b2.ax -= fx * b1.mass;
          b2.ay -= fy * b1.mass;
        }
      }
    }

    // Remove merged/consumed bodies
    if (toRemove.size > 0) {
      this.bodies = this.bodies.filter(b => !toRemove.has(b.id));
    }

    // 2. Step Active Bodies & Ring Crossings
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      const oldDist = Math.hypot(b.x - this.center.x, b.y - this.center.y);

      b.update(dt);

      const newDist = Math.hypot(b.x - this.center.x, b.y - this.center.y);

      if (this.ringsEnabled) {
        this.checkRingCrossings(b, oldDist, newDist, width);
      }
    }

    // 3. Step Physical Debris (Influenced by gravity from remaining bodies)
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life += dt;
      if (d.life >= d.maxLife) {
        this.debris.splice(i, 1);
        continue;
      }

      // Gravitational pull from massive bodies
      for (let j = 0; j < this.bodies.length; j++) {
        const b = this.bodies[j];
        const dx = b.x - d.x;
        const dy = b.y - d.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > 100 && distSq < 160000) {
          const dist = Math.sqrt(distSq);
          const f = (this.G * 0.12 * b.mass) / (distSq + 300);
          d.vx += f * (dx / dist) * dt;
          d.vy += f * (dy / dist) * dt;
        }
      }

      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= 0.997; // Space damping
      d.vy *= 0.997;
    }

    // 4. Step Spacetime Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.r += s.speed * dt;
      s.progress = s.r / s.maxR;
      s.alpha = Math.max(0, 1.0 - s.progress);
      if (s.r >= s.maxR) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  /**
   * Astrophysical Collision Engine
   * Evaluates pairwise celestial physics: Black Hole Mergers, Tidal Disruptions,
   * Stellar Supernovae, Planetary Collisions, Ring Accretions, and Comet Vaporization.
   */
  resolveAstrophysicalCollision(b1, b2, dx, dy, dist, width, height, toRemove) {
    this.totalEvents++;
    this.mergerCount++;

    const m1 = b1.mass;
    const m2 = b2.mass;
    const primary = m1 >= m2 ? b1 : b2;
    const secondary = primary === b1 ? b2 : b1;

    // Center of collision
    const cx = (b1.x * m1 + b2.x * m2) / (m1 + m2);
    const cy = (b1.y * m1 + b2.y * m2) / (m1 + m2);
    const panX = (cx / width) * 2 - 1;

    // Relative impact velocity & kinetic energy
    const vrelX = b1.vx - b2.vx;
    const vrelY = b1.vy - b2.vy;
    const vrel = Math.hypot(vrelX, vrelY);
    const impactThermal = Math.min(1.0, 0.4 + (vrel / 160));

    // Conservation of linear momentum
    const newVx = (m1 * b1.vx + m2 * b2.vx) / (m1 + m2);
    const newVy = (m1 * b1.vy + m2 * b2.vy) / (m1 + m2);

    if (!primary.isFixed) {
      primary.x = cx;
      primary.y = cy;
      primary.vx = newVx;
      primary.vy = newVy;
    }

    const t1 = b1.type;
    const t2 = b2.type;
    const isBH1 = t1 === 'black_hole';
    const isBH2 = t2 === 'black_hole';
    const isStar1 = t1 === 'star';
    const isStar2 = t2 === 'star';
    const isGiant1 = t1.includes('giant');
    const isGiant2 = t2.includes('giant');

    // =========================================================================
    // CASE 1: Binary Black Hole Merger (LIGO Gravitational Wave Chirp)
    // =========================================================================
    if (isBH1 && isBH2) {
      // 5% mass converted into gravitational wave radiation: E = \Delta m c^2
      const mergedMass = (m1 + m2) * 0.95;
      primary.mass = mergedMass;
      primary.reclassify();
      primary.flash = 1.0;
      primary.consumedCount += (secondary.consumedCount || 0) + 1;

      // Expand & accelerate relativistic accretion particles
      if (primary.accretionParticles) {
        primary.accretionParticles.forEach(p => {
          p.speed *= 1.4;
          p.r *= 1.25;
        });
      }

      toRemove.add(secondary.id);

      // Violent Spacetime Gravitational Wave Metric Distortion
      this.spawnShockwave(cx, cy, {
        maxR: 420,
        speed: 320,
        color: '#00f2fe',
        secondaryColor: '#a855f7',
        width: 5.0,
        type: 'gravitational'
      });

      // Relativistic high-energy plasma debris
      this.spawnDebris(cx, cy, 40, {
        baseSpeed: 190,
        colors: ['#00f2fe', '#ffffff', '#c084fc', '#38bdf8'],
        maxSize: 3.2,
        type: 'relativistic'
      });

      if (window.CosmicAudio) {
        window.CosmicAudio.triggerGravitationalChirp(panX);
        window.CosmicAudio.triggerChime(0.12, 0.95, panX, 'bass');
      }
      return;
    }

    // =========================================================================
    // CASE 2: Tidal Disruption Event (TDE) - Black Hole consumes star or planet
    // =========================================================================
    if (isBH1 || isBH2) {
      const bh = isBH1 ? b1 : b2;
      const victim = bh === b1 ? b2 : b1;

      // 75% mass accreted into singularity; 25% blown off in relativistic tidal tail
      const accretedMass = victim.mass * 0.75;
      bh.mass += accretedMass;
      bh.reclassify();
      bh.flash = 1.0;
      bh.consumedCount++;

      toRemove.add(victim.id);

      // Tidal Disruption Arc Shockwave
      this.spawnShockwave(cx, cy, {
        maxR: 260,
        speed: 310,
        color: victim.color || '#ffaa00',
        secondaryColor: '#00f2fe',
        width: 4.0,
        type: 'tidal'
      });

      // Eject relativistic spaghettification plume
      this.spawnDebris(cx, cy, 38, {
        baseSpeed: 170,
        vx: bh.vx * 0.3,
        vy: bh.vy * 0.3,
        colors: [victim.color, victim.secondaryColor, '#ffffff', '#00f2fe'],
        maxSize: 2.8,
        type: 'plasma'
      });

      if (window.CosmicAudio) {
        window.CosmicAudio.triggerTidalDisruption(panX);
      }
      return;
    }

    // =========================================================================
    // CASE 3: Stellar Merger (Star + Star -> Supernova or Blue Hypergiant)
    // =========================================================================
    if (isStar1 && isStar2) {
      const totalMass = m1 + m2;

      // Core-Collapse Supernova into newborn Black Hole
      if (totalMass >= 1100) {
        primary.mass = totalMass * 0.85; // 15% blown away in supernova envelope
        primary.reclassify(); // Automatically transforms to black_hole!
        primary.flash = 1.0;
        toRemove.add(secondary.id);

        this.spawnShockwave(cx, cy, {
          maxR: 500,
          speed: 380,
          color: '#ffffff',
          secondaryColor: '#ff0844',
          width: 6.5,
          type: 'supernova'
        });

        this.spawnDebris(cx, cy, 55, {
          baseSpeed: 230,
          colors: ['#ffffff', '#ffea79', '#ff4b4b', '#00f2fe'],
          maxSize: 3.5,
          type: 'plasma'
        });

        if (window.CosmicAudio) {
          window.CosmicAudio.triggerSupernovaExplosion(panX);
        }
      } else {
        // Coalescence into Luminous Pulsating Supergiant
        primary.mass = totalMass * 0.94;
        primary.reclassify();
        primary.heat = 1.0;
        primary.flash = 1.0;
        toRemove.add(secondary.id);

        this.spawnShockwave(cx, cy, {
          maxR: 280,
          speed: 250,
          color: '#ffea79',
          secondaryColor: '#ff4b4b',
          width: 4.2,
          type: 'plasma'
        });

        this.spawnDebris(cx, cy, 32, {
          baseSpeed: 140,
          colors: ['#ffffff', '#ffea79', '#ff9900'],
          maxSize: 3.0,
          type: 'plasma'
        });

        if (window.CosmicAudio) {
          window.CosmicAudio.triggerSupernovaExplosion(panX);
        }
      }
      return;
    }

    // =========================================================================
    // CASE 4: Photospheric Engulfment (Star + Planet/Giant/Comet)
    // =========================================================================
    if (isStar1 || isStar2) {
      const star = isStar1 ? b1 : b2;
      const food = star === b1 ? b2 : b1;

      star.mass += food.mass * 0.88;
      star.reclassify();
      star.flash = 0.95;
      toRemove.add(food.id);

      // Coronal Mass Ejection prominence blast
      this.spawnShockwave(food.x, food.y, {
        maxR: 210,
        speed: 220,
        color: '#ffe066',
        secondaryColor: '#ff4b4b',
        width: 3.5,
        type: 'cme'
      });

      this.spawnDebris(food.x, food.y, 28, {
        baseSpeed: 130,
        colors: ['#ffffff', '#ffe066', '#ff4b4b', food.color],
        maxSize: 2.6,
        type: 'plasma'
      });

      if (window.CosmicAudio) {
        window.CosmicAudio.triggerPlanetaryImpact(0.75, panX);
      }
      return;
    }

    // =========================================================================
    // CASE 5: Gas Giant Coalescence or Thermonuclear Star Ignition
    // =========================================================================
    if (isGiant1 && isGiant2) {
      const totalMass = m1 + m2;

      // Fusion ignition into a newborn Star!
      if (totalMass >= 450) {
        primary.mass = totalMass;
        primary.reclassify(); // Automatically transforms to 'star'
        primary.flash = 1.0;
        toRemove.add(secondary.id);

        this.spawnShockwave(cx, cy, {
          maxR: 320,
          speed: 260,
          color: '#ffffff',
          secondaryColor: '#ffea79',
          width: 5.0,
          type: 'ignition'
        });

        this.spawnDebris(cx, cy, 40, {
          baseSpeed: 160,
          colors: ['#ffffff', '#ffe3a0', '#ff9d00', '#ff4b4b'],
          maxSize: 3.2,
          type: 'plasma'
        });

        if (window.CosmicAudio) {
          window.CosmicAudio.triggerStellarIgnition(panX);
        }
      } else {
        // Coalescence into Super-Giant with massive expanded rings
        primary.mass = totalMass * 0.95;
        primary.reclassify();
        primary.heat = 0.8;
        primary.flash = 0.85;
        primary.hasRings = true;
        primary.ringOuter = Math.max(primary.ringOuter || 0, primary.radius * 3.4);
        toRemove.add(secondary.id);

        this.spawnShockwave(cx, cy, {
          maxR: 200,
          speed: 190,
          color: '#ff9d00',
          secondaryColor: '#ffe3a0',
          width: 3.2,
          type: 'compression'
        });

        this.spawnDebris(cx, cy, 26, {
          baseSpeed: 110,
          colors: ['#ff9d00', '#ffe3a0', '#ffffff'],
          maxSize: 2.5,
          type: 'magma'
        });

        if (window.CosmicAudio) {
          window.CosmicAudio.triggerPlanetaryImpact(0.8, panX);
        }
      }
      return;
    }

    // =========================================================================
    // CASE 6: Gas Giant + Terrestrial/Comet (Atmospheric Accretion & Ring Birth)
    // =========================================================================
    if (isGiant1 || isGiant2) {
      const giant = isGiant1 ? b1 : b2;
      const rock = giant === b1 ? b2 : b1;

      giant.mass += rock.mass * 0.85;
      giant.hasRings = true;
      giant.ringOuter = Math.max(giant.ringOuter || 0, giant.radius * 2.8) + 5;
      giant.flash = 0.75;
      giant.reclassify();
      toRemove.add(rock.id);

      this.spawnShockwave(rock.x, rock.y, {
        maxR: 160,
        speed: 170,
        color: rock.color || '#4facfe',
        secondaryColor: giant.color,
        width: 2.8,
        type: 'ring_enrich'
      });

      this.spawnDebris(rock.x, rock.y, 24, {
        baseSpeed: 95,
        colors: [rock.color, '#ffe3a0', '#ffffff'],
        maxSize: 2.2,
        type: 'magma'
      });

      if (window.CosmicAudio) {
        window.CosmicAudio.triggerChime(0.65, 0.75, panX, 'crystal');
      }
      return;
    }

    // =========================================================================
    // CASE 7: Terrestrial + Terrestrial (Giant Impact & Molten Magma Ocean)
    // =========================================================================
    if (t1 === 'terrestrial' && t2 === 'terrestrial') {
      const totalMass = m1 + m2;
      primary.mass = totalMass * 0.92;
      primary.heat = 1.0; // Extreme molten thermal heat with fiery fissures
      primary.flash = 0.85;

      // Evolve to giant if mass accumulated
      primary.reclassify();

      // Glancing high-velocity impact throws off a newborn debris ring
      if (vrel > 90) {
        primary.hasRings = true;
        primary.ringAngle = Math.atan2(dy, dx);
        primary.ringInner = primary.radius * 1.3;
        primary.ringOuter = primary.radius * 2.3;
      }

      toRemove.add(secondary.id);

      this.spawnShockwave(cx, cy, {
        maxR: 170,
        speed: 180,
        color: '#ff3a00',
        secondaryColor: '#ffe066',
        width: 3.2,
        type: 'impact'
      });

      this.spawnDebris(cx, cy, 32, {
        baseSpeed: 120,
        colors: ['#ff3a00', '#ff8800', '#ffe066', '#4facfe'],
        maxSize: 2.6,
        type: 'magma'
      });

      if (window.CosmicAudio) {
        window.CosmicAudio.triggerPlanetaryImpact(impactThermal, panX);
      }
      return;
    }

    // =========================================================================
    // CASE 8: Comet / Asteroid Impact & Sublimation
    // =========================================================================
    primary.mass += secondary.mass;
    primary.flash = 0.6;
    primary.reclassify();
    toRemove.add(secondary.id);

    this.spawnShockwave(cx, cy, {
      maxR: 110,
      speed: 140,
      color: '#a8ff78',
      secondaryColor: '#ffffff',
      width: 2.0,
      type: 'comet'
    });

    this.spawnDebris(cx, cy, 18, {
      baseSpeed: 85,
      colors: ['#a8ff78', '#c2f9ff', '#ffffff'],
      maxSize: 1.8,
      type: 'cryo'
    });

    if (window.CosmicAudio) {
      window.CosmicAudio.triggerChime(0.88, 0.6, panX, 'sparkle');
    }
  }

  resolveBounce(b1, b2, dx, dy, dist) {
    const nx = dx / dist;
    const ny = dy / dist;

    const kx = b1.vx - b2.vx;
    const ky = b1.vy - b2.vy;
    const p = 2 * (nx * kx + ny * ky) / (b1.mass + b2.mass);

    if (!b1.isFixed) {
      b1.vx -= p * b2.mass * nx;
      b1.vy -= p * b2.mass * ny;
    }
    if (!b2.isFixed) {
      b2.vx += p * b1.mass * nx;
      b2.vy += p * b1.mass * ny;
    }

    // Push apart slightly to prevent sticking
    const overlap = 0.5 * (b1.radius + b2.radius - dist);
    if (!b1.isFixed) {
      b1.x -= overlap * nx;
      b1.y -= overlap * ny;
    }
    if (!b2.isFixed) {
      b2.x += overlap * nx;
      b2.y += overlap * ny;
    }

    b1.flash = 0.5;
    b2.flash = 0.5;
  }

  handleProximityResonance(b1, b2, width) {
    this.totalEvents++;
    b1.flash = 0.8;
    b2.flash = 0.8;

    const avgX = (b1.x + b2.x) / 2;
    const panX = (avgX / width) * 2 - 1;

    const relativeSpeed = Math.hypot(b1.vx - b2.vx, b1.vy - b2.vy);
    const intensity = Math.min(Math.max(relativeSpeed / 180, 0.3), 0.95);

    const pitchVal = (Math.log10(b1.mass + b2.mass) / 3.2) % 1.0;
    const timbre = (b1.mass > 100 || b2.mass > 100) ? 'bass' : 'crystal';

    if (window.CosmicAudio) {
      window.CosmicAudio.triggerChime(pitchVal, intensity, panX, timbre);
    }
  }

  checkRingCrossings(b, oldDist, newDist, width) {
    for (let i = 0; i < this.resonanceRings.length; i++) {
      const ringR = this.resonanceRings[i];
      if ((oldDist < ringR && newDist >= ringR) || (oldDist > ringR && newDist <= ringR)) {
        if (b.lastRingCrossed !== i) {
          b.lastRingCrossed = i;
          b.flash = 0.8;
          this.totalEvents++;

          const panX = (b.x / width) * 2 - 1;
          const speed = b.getSpeed();
          const intensity = Math.min(Math.max(speed / 150, 0.25), 0.85);
          const pitchVal = (i / this.resonanceRings.length);

          if (window.CosmicAudio) {
            window.CosmicAudio.triggerChime(pitchVal, intensity, panX, 'sparkle');
          }
        }
        return;
      }
    }
    b.lastRingCrossed = -1;
  }

  // Preset Configurations
  loadPreset(name, width, height) {
    this.clear();
    const cx = width / 2;
    const cy = height / 2;
    this.setCenter(cx, cy);

    if (name === 'bh_merger') {
      // Binary Black Hole Merger (LIGO Gravitational Wave Decay)
      const d = 105;
      const v = 82;
      this.addBody(new CelestialBody({ x: cx - d, y: cy, vx: 0, vy: -v, mass: 1400 }));
      this.addBody(new CelestialBody({ x: cx + d, y: cy, vx: 0, vy: v, mass: 1200 }));

      // Surrounding accretion plasma tracers
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        this.addBody(new CelestialBody({
          x: cx + Math.cos(a) * 280,
          y: cy + Math.sin(a) * 280,
          vx: -Math.sin(a) * 75,
          vy: Math.cos(a) * 75,
          mass: 8,
          color: '#00f2fe'
        }));
      }
    } else if (name === 'collision_lab') {
      // Planetary Collision Lab: Two massive proto-planets on inbound collision trajectory
      this.addBody(new CelestialBody({
        x: cx - 220,
        y: cy - 20,
        vx: 85,
        vy: 12,
        mass: 90,
        color: '#4facfe'
      }));
      this.addBody(new CelestialBody({
        x: cx + 220,
        y: cy + 20,
        vx: -85,
        vy: -12,
        mass: 95,
        color: '#ff9d00'
      }));

      // Distant spectator moon
      this.addBody(new CelestialBody({
        x: cx,
        y: cy - 250,
        vx: 55,
        vy: 0,
        mass: 14,
        color: '#00f5a0'
      }));
    } else if (name === 'tde') {
      // Tidal Disruption Event: Star plunging into Supermassive Black Hole
      this.addBody(new CelestialBody({ x: cx, y: cy, vx: 0, vy: 0, mass: 2200, isFixed: true }));
      this.addBody(new CelestialBody({
        x: cx - 340,
        y: cy - 160,
        vx: 92,
        vy: -18,
        mass: 500,
        color: '#ffea79'
      }));
    } else if (name === 'three_body') {
      // Chaotic Three-Body System with equal masses in tight formation
      const m = 180;
      const d = 160;
      const v = 65;
      this.addBody(new CelestialBody({ x: cx, y: cy - d, vx: v, vy: 0, mass: m, color: '#00f2fe' }));
      this.addBody(new CelestialBody({ x: cx - d * 0.866, y: cy + d * 0.5, vx: -v * 0.5, vy: -v * 0.866, mass: m, color: '#ff0844' }));
      this.addBody(new CelestialBody({ x: cx + d * 0.866, y: cy + d * 0.5, vx: -v * 0.5, vy: v * 0.866, mass: m, color: '#ffb199' }));
    } else if (name === 'kepler') {
      // Massive Central Star with 4 Concentric Resonating Planets
      this.addBody(new CelestialBody({ x: cx, y: cy, vx: 0, vy: 0, mass: 900, color: '#ffea79', isFixed: true }));

      const orbits = [
        { r: 120, v: 95, m: 10, c: '#00f5a0' },
        { r: 200, v: 74, m: 20, c: '#00f2fe' },
        { r: 300, v: 60, m: 25, c: '#4facfe' },
        { r: 420, v: 51, m: 35, c: '#f093fb' },
      ];
      orbits.forEach(orb => {
        this.addBody(new CelestialBody({
          x: cx,
          y: cy - orb.r,
          vx: orb.v,
          vy: 0,
          mass: orb.m,
          color: orb.c
        }));
      });
    } else if (name === 'binary') {
      // Binary Star System with Orbiting Moons
      const d = 110;
      const v = 72;
      this.addBody(new CelestialBody({ x: cx - d, y: cy, vx: 0, vy: -v, mass: 450, color: '#ff0844' }));
      this.addBody(new CelestialBody({ x: cx + d, y: cy, vx: 0, vy: v, mass: 450, color: '#4facfe' }));

      // Distant explorer moon
      this.addBody(new CelestialBody({ x: cx, y: cy - 280, vx: 62, vy: 0, mass: 12, color: '#00f5a0' }));
      this.addBody(new CelestialBody({ x: cx, y: cy + 340, vx: -56, vy: 0, mass: 16, color: '#ffea79' }));
    } else if (name === 'swarm') {
      // Central Sun with 12 Small Asteroid Belts
      this.addBody(new CelestialBody({ x: cx, y: cy, vx: 0, vy: 0, mass: 750, color: '#ff9900', isFixed: true }));

      const count = 12;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const dist = 140 + (i % 4) * 70 + (Math.random() * 20);
        const speed = Math.sqrt((this.G * 750) / dist) * 0.95;
        this.addBody(new CelestialBody({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: -Math.sin(angle) * speed,
          vy: Math.cos(angle) * speed,
          mass: 5 + Math.random() * 15,
          color: ['#00f2fe', '#f093fb', '#00f5a0', '#ffea79'][i % 4]
        }));
      }
    } else if (name === 'gargantua') {
      // Supermassive Black Hole & Accretion Infall
      this.addBody(new CelestialBody({ x: cx, y: cy, vx: 0, vy: 0, mass: 1800, isFixed: true }));

      const count = 10;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const dist = 120 + i * 34;
        const speed = Math.sqrt((this.G * 1800) / dist) * (0.94 + Math.random() * 0.08);
        this.addBody(new CelestialBody({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: -Math.sin(angle) * speed,
          vy: Math.cos(angle) * speed,
          mass: 8 + Math.random() * 25,
          color: ['#00f2fe', '#ffe3a0', '#ff4b4b', '#a8ff78', '#f093fb'][i % 5]
        }));
      }
    }
  }
}

window.PhysicsEngine = PhysicsEngine;
window.CelestialBody = CelestialBody;
