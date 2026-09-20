/**
 * Orbitale — Celestial Mechanics & Resonance Physics
 * N-Body gravitational simulator with harmonic boundary detection.
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

    // Radius proportional to cube root of mass (approx constant density)
    this.radius = radius || Math.max(3.5, Math.pow(mass, 0.38) * 2.8);

    // Classification & Color palette
    if (mass >= 1100) {
      this.type = 'black_hole'; // Supermassive Singularity
      this.color = '#000000';
      this.secondaryColor = '#00f2fe';
      this.glowColor = 'rgba(170, 70, 255, 0.45)';
      this.radius = Math.max(9, Math.pow(mass, 0.35) * 2.2);
    } else if (mass >= 450) {
      this.type = 'star'; // Solar Star / Pulsar
      this.color = color || '#ff4b4b';
      this.secondaryColor = '#ffe066';
      this.glowColor = 'rgba(255, 120, 50, 0.4)';
    } else if (mass >= 120) {
      this.type = 'gas_giant'; // Gas Giant with rings
      this.color = color || '#ff9d00';
      this.secondaryColor = '#ffe3a0';
      this.glowColor = 'rgba(255, 170, 50, 0.3)';
    } else if (mass >= 35) {
      this.type = 'ice_giant'; // Neptune / Uranus style
      this.color = color || '#00f2fe';
      this.secondaryColor = '#c2f9ff';
      this.glowColor = 'rgba(0, 242, 254, 0.3)';
    } else if (mass >= 12) {
      this.type = 'terrestrial'; // Rocky / Oceanic planet
      this.color = color || '#4facfe';
      this.secondaryColor = '#00f5a0';
      this.glowColor = 'rgba(79, 172, 254, 0.25)';
    } else {
      this.type = 'comet'; // Asteroid / Comet
      this.color = color || '#a8ff78';
      this.secondaryColor = '#ffffff';
      this.glowColor = 'rgba(168, 255, 120, 0.2)';
    }

    // Rings for giants & Black hole accretion disk parameters
    this.hasRings = (this.type === 'gas_giant' || this.type === 'ice_giant' || this.type === 'black_hole');
    this.ringTilt = this.type === 'black_hole' ? 0.38 : (Math.random() * 0.35 + 0.25) * (Math.random() > 0.5 ? 1 : -1);
    this.ringAngle = Math.random() * Math.PI;
    this.ringInner = this.type === 'black_hole' ? this.radius * 1.6 : this.radius * 1.5;
    this.ringOuter = this.type === 'black_hole' ? this.radius * 3.6 : this.radius * 2.6;
    this.consumedCount = 0;

    // Star / singularity pulsation and rotation
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 1.2;
    this.flarePhase = Math.random() * Math.PI * 2;

    this.trail = [];
    this.maxTrail = 65;
    this.lastRingCrossed = -1;
    this.proximityCooloff = 0;
    this.flash = 0; // Flash animation on sound trigger
  }

  update(dt, trailDecay = 65) {
    if (!this.isFixed) {
      this.vx += this.ax * dt;
      this.vy += this.ay * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

    // Update rotation and flare phase
    this.rotation += this.rotationSpeed * dt;
    this.flarePhase += dt * 3.5;

    // Reset accelerations
    this.ax = 0;
    this.ay = 0;

    // Update trail with timestamp & velocity for dynamic taper
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
    this.G = 1200; // Gravitational constant
    this.softening = 400; // Prevents infinite forces at r -> 0
    this.collisionMode = 'bounce'; // 'bounce', 'merge', 'none'
    this.ringsEnabled = true;
    this.resonanceRings = [120, 240, 360, 480, 600]; // Radii from center
    this.center = { x: 0, y: 0 };
    this.totalEvents = 0;
  }

  setCenter(x, y) {
    this.center = { x, y };
  }

  addBody(body) {
    this.bodies.push(body);
  }

  clear() {
    this.bodies = [];
    this.totalEvents = 0;
  }

  step(dt, width, height) {
    const n = this.bodies.length;

    const toRemove = new Set();

    // 1. Compute Gravitational Forces
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

        // Check Black Hole Event Horizon Accretion
        const isB1Hole = b1.type === 'black_hole';
        const isB2Hole = b2.type === 'black_hole';

        if (isB1Hole || isB2Hole) {
          const eater = isB1Hole && (!isB2Hole || b1.mass >= b2.mass) ? b1 : b2;
          const food = eater === b1 ? b2 : b1;
          const horizon = eater.radius * 1.1;

          if (dist < horizon) {
            // Accrete food into eater
            eater.mass += food.mass * 0.45;
            eater.radius = Math.max(9, Math.pow(eater.mass, 0.35) * 2.2);
            eater.ringInner = eater.radius * 1.6;
            eater.ringOuter = eater.radius * 3.6;
            eater.flash = 1.0;
            eater.consumedCount++;
            this.totalEvents++;

            const panX = (eater.x / width) * 2 - 1;
            if (window.CosmicAudio && window.CosmicAudio.triggerGravitationalChirp) {
              window.CosmicAudio.triggerGravitationalChirp(panX);
            }

            toRemove.add(food.id);
            continue;
          }
        }

        // Check Proximity Resonance
        const triggerDistance = b1.radius + b2.radius + 35;
        if (dist < triggerDistance) {
          if (b1.proximityCooloff <= 0 && b2.proximityCooloff <= 0) {
            this.handleProximityResonance(b1, b2, width);
            b1.proximityCooloff = 0.35;
            b2.proximityCooloff = 0.35;
          }
        }

        // Check Collision
        const minDist = b1.radius + b2.radius;
        if (dist < minDist && dist > 0.0001) {
          if (this.collisionMode === 'bounce') {
            this.resolveBounce(b1, b2, dx, dy, dist);
          }
        }

        // Gravitational acceleration: a = G * m / (r^2 + eps)
        const force = (this.G) / (distSq + this.softening);
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

    if (toRemove.size > 0) {
      this.bodies = this.bodies.filter(b => !toRemove.has(b.id));
    }

    // 2. Step bodies & check Resonance Rings
    for (let i = 0; i < n; i++) {
      const b = this.bodies[i];
      const oldDist = Math.hypot(b.x - this.center.x, b.y - this.center.y);

      b.update(dt);

      const newDist = Math.hypot(b.x - this.center.x, b.y - this.center.y);

      if (this.ringsEnabled) {
        this.checkRingCrossings(b, oldDist, newDist, width);
      }
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
  }

  handleProximityResonance(b1, b2, width) {
    this.totalEvents++;
    b1.flash = 1.0;
    b2.flash = 1.0;

    const avgX = (b1.x + b2.x) / 2;
    const panX = (avgX / width) * 2 - 1;

    const relativeSpeed = Math.hypot(b1.vx - b2.vx, b1.vy - b2.vy);
    const intensity = Math.min(Math.max(relativeSpeed / 180, 0.3), 0.95);

    // Tone pitch mapped by mass ratio and proximity
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

    if (name === 'three_body') {
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
