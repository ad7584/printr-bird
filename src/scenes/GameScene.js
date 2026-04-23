// ============================================================
// GameScene — main gameplay
// ============================================================
import {
  BIRD, PIPES, SPEED, POWERUPS, PICKUPS, RESPAWN, COLORS
} from '../../config.js';
import { GameAPI } from '../net/GameAPI.js';
import Bird from '../objects/Bird.js';
import Pipe from '../objects/Pipe.js';
import Pickup from '../objects/Pickup.js';
import Background from '../objects/Background.js';

export default class GameScene extends Phaser.Scene {
  constructor(){
    super('Game');
  }

  create(){
    const { width: W, height: H } = this.scale;
    this.W = W; this.H = H;

    // -------------- Run state --------------
    this.score = 0;
    this.pop = 0;
    this.distance = 0;
    this.lastPipeDist = -PIPES.INTERVAL_PX * 0.5;
    this.activePowerups = [];
    this.usedInGameRespawn = false;
    this.replay = [];
    this.frame = 0;
    this.alive = true;
    this.running = true;

    this.registry.set('score', 0);
    this.registry.set('pop', 0);

    // -------------- Entities --------------
    this.bg = new Background(this);
    this.pipes = [];
    this.pickups = this.physics.add.group();

    this.bird = new Bird(this, W * BIRD.START_X_RATIO, H / 2);
    this.bird.activePowerups = this.activePowerups;

    // Pre-game loadout
    const loadout = this.registry.get('loadout') || [];
    for (const type of loadout){
      this.applyPowerup(type, POWERUPS.PRE_GAME_DURATION_MS);
    }
    this.registry.set('loadout', []);

    // -------------- Input --------------
    this.input.on('pointerdown', () => this.bird.flap());
    this.input.keyboard.on('keydown-SPACE', () => this.bird.flap());
    this.input.keyboard.on('keydown-UP', () => this.bird.flap());

    // -------------- Physics overlap: bird.sprite ↔ pickups --------------
    this.physics.add.overlap(this.bird.sprite, this.pickups, (birdSprite, pickup) => {
      if (pickup.collected) return;
      this.collectPickup(pickup);
    });

    // -------------- HUD reset --------------
    this.events.emit('ui:score', 0);
    this.events.emit('ui:pop', 0);
    this.events.emit('ui:powerups', this.activePowerups);
  }

  update(time, dt){
    this.frame++;

    // Background always animates
    this.bg.update(this.getSpeed());

    // Bird updates always (so dead bird falls)
    if (this.alive){
      this.bird.update(dt);
    } else {
      this.bird.updateDead(dt);
    }

    if (!this.running) return;

    // Replay sampling
    if (this.frame % 3 === 0){
      this.replay.push([this.frame, this.bird.y | 0, this.bird.body.velocity.y | 0]);
    }

    // Scroll world
    const scrollDx = this.getSpeed() * (dt / 1000);
    this.distance += scrollDx;

    for (const p of this.pipes) p.advance(scrollDx);
    this.pickups.getChildren().forEach(pk => {
      if (!pk.collected) pk.x -= scrollDx;
    });

    // Cull
    for (let i = this.pipes.length - 1; i >= 0; i--){
      if (this.pipes[i].offscreen()){
        this.pipes[i].destroy();
        this.pipes.splice(i, 1);
      }
    }
    this.pickups.getChildren().forEach(pk => {
      if (pk.x < -30) pk.destroy();
    });

    // Spawn
    if (this.distance - this.lastPipeDist > PIPES.INTERVAL_PX){
      this.spawnPipePair();
      this.lastPipeDist = this.distance;
    }

    // Score
    for (const p of this.pipes){
      if (!p.scored && p.x + PIPES.WIDTH < this.bird.x){
        p.scored = true;
        const crown = this.activePowerups.find(a => a.type === 'crown');
        const mult = crown ? PICKUPS.CROWN_MULT : 1;
        this.score += 1 * mult;
        this.registry.set('score', this.score);
        this.events.emit('ui:score', this.score);
        if (mult > 1) this.events.emit('ui:combo', `+${mult}x`, this.bird.x, this.bird.y);
        this.tone(800, 0.1, 'triangle', 0.12);
        this.time.delayedCall(60, () => this.tone(1200, 0.08, 'triangle', 0.1));
      }
    }

    // Collision
    this.checkPipeCollision();

    // Floor / ceiling
    if (this.bird.y + BIRD.HITBOX_R > this.H - 4){
      this.bird.y = this.H - 4 - BIRD.HITBOX_R;
      this.triggerHit();
    }
    if (this.bird.y - BIRD.HITBOX_R < 0){
      this.bird.y = BIRD.HITBOX_R;
      this.bird.body.velocity.y = 0;
    }

    // Expire powerups
    const now = this.time.now;
    let changed = false;
    for (let i = this.activePowerups.length - 1; i >= 0; i--){
      if (this.activePowerups[i].endsAt <= now){
        this.activePowerups.splice(i, 1);
        changed = true;
      }
    }
    if (changed || (this.frame % 10 === 0 && this.activePowerups.length)){
      this.events.emit('ui:powerups', this.activePowerups);
    }
  }

  getSpeed(){
    if (!this.running) return SPEED.BASE * 0.6;
    const t = Phaser.Math.Clamp(this.score / SPEED.RAMP_SCORE, 0, 1);
    let s = Phaser.Math.Linear(SPEED.BASE, SPEED.MAX, t);
    if (this.activePowerups.find(p => p.type === 'speed')) s *= SPEED.SPEED_PU_MULT;
    return s;
  }

  getGap(){
    const t = Phaser.Math.Clamp(this.score / SPEED.RAMP_SCORE, 0, 1);
    return Phaser.Math.Linear(PIPES.GAP_MAX, PIPES.GAP_MIN, t);
  }

  spawnPipePair(){
    const gapH = this.getGap();
    const margin = 70;
    const gapY = margin + Math.random() * (this.H - gapH - margin * 2);
    this.pipes.push(new Pipe(this, this.W + 20, gapY, gapH, this.H));

    if (Math.random() < PICKUPS.POP_SPAWN_CHANCE){
      const y = gapY + gapH/2 + (Math.random() - 0.5) * 30;
      const pk = new Pickup(this, this.W + 20 + PIPES.WIDTH/2, y, null);
      this.pickups.add(pk);
    }
    if (Math.random() < POWERUPS.SPAWN_CHANCE){
      const types = ['shield','crown','speed'];
      const type = types[Math.floor(Math.random() * types.length)];
      const pk = new Pickup(this, this.W + 20 + PIPES.WIDTH/2 + 90, gapY + gapH/2, type);
      this.pickups.add(pk);
    }
  }

  collectPickup(pk){
    pk.collect();
    if (pk.isPowerup){
      this.applyPowerup(pk.type, POWERUPS.DURATION_MS);
      this.events.emit('ui:combo', pk.type.toUpperCase(), pk.x, pk.y);
      this.events.emit('ui:powerups', this.activePowerups);
      this.tone(600, 0.08, 'square', 0.12);
      this.time.delayedCall(60, () => this.tone(900, 0.08, 'square', 0.1));
      this.time.delayedCall(120, () => this.tone(1200, 0.12, 'square', 0.1));
      this.emitBurst(pk.x, pk.y, COLORS.GOLD, 18);
    } else {
      const crown = this.activePowerups.find(a => a.type === 'crown');
      const gain = crown ? PICKUPS.CROWN_MULT : 1;
      this.pop += gain;
      this.registry.set('pop', this.pop);
      this.events.emit('ui:pop', this.pop);
      this.tone(1400, 0.06, 'sine', 0.12);
      this.time.delayedCall(40, () => this.tone(1800, 0.08, 'sine', 0.1));
      this.emitBurst(pk.x, pk.y, COLORS.PINK, 8);
    }
  }

  checkPipeCollision(){
    if (!this.alive) return;
    const shield = this.activePowerups.find(p => p.type === 'shield');
    const bx = this.bird.x, by = this.bird.y;
    const hR = BIRD.HITBOX_R;

    for (const p of this.pipes){
      if (p.x + PIPES.WIDTH < bx - hR) continue;
      if (p.x > bx + hR) continue;
      const inGap = by - hR > p.gapY && by + hR < p.gapY + p.gapH;
      if (!inGap){
        if (shield){
          const idx = this.activePowerups.indexOf(shield);
          if (idx >= 0) this.activePowerups.splice(idx, 1);
          this.events.emit('ui:powerups', this.activePowerups);
          p.scored = true;
          p.destroy();
          const pi = this.pipes.indexOf(p);
          if (pi >= 0) this.pipes.splice(pi, 1);
          this.emitBurst(bx, by, COLORS.CYAN, 30);
          this.cameras.main.shake(150, 0.008);
          this.tone(600, 0.15, 'square', 0.12);
          return;
        }
        this.triggerHit();
        return;
      }
    }
  }

  applyPowerup(type, durationMs){
    const existing = this.activePowerups.find(p => p.type === type);
    const endsAt = this.time.now + durationMs;
    if (existing) existing.endsAt = endsAt;
    else this.activePowerups.push({ type, endsAt });
    this.events.emit('ui:powerups', this.activePowerups);
  }

  triggerHit(){
    if (!this.alive) return;
    this.alive = false;
    this.running = false;
    this.bird.setAlive(false);
    this.cameras.main.shake(250, 0.012);
    this.emitBurst(this.bird.x, this.bird.y, COLORS.PINK, 30);
    this.tone(140, 0.25, 'sawtooth', 0.2, -80);
    this.time.delayedCall(400, () => this.showRespawnPrompt());
  }

  async showRespawnPrompt(){
    if (this.usedInGameRespawn){
      this.finalizeDeath();
      return;
    }
    this.scene.get('UI').showRespawn({
      onFreeRespawn: async () => {
        await GameAPI.useDailyRespawn();
        this.doRespawn();
      },
      onPaidRespawn: async (method) => {
        const r = await GameAPI.buyPaidRespawn(method);
        if (r.success) this.doRespawn();
      },
      onTimeout: () => this.finalizeDeath(),
      onSkip: () => this.finalizeDeath(),
    });
  }

  doRespawn(){
    this.usedInGameRespawn = true;
    for (let i = this.pipes.length - 1; i >= 0; i--){
      if (this.pipes[i].x < this.bird.x + 280 && this.pipes[i].x > this.bird.x - 100){
        this.pipes[i].destroy();
        this.pipes.splice(i, 1);
      }
    }
    this.bird.y = this.H / 2;
    this.bird.body.velocity.y = 0;
    this.bird.rot = 0;
    this.bird.setAlive(true);
    this.alive = true;
    this.running = true;
    this.applyPowerup('shield', RESPAWN.GRACE_SHIELD_MS);
  }

  async finalizeDeath(){
    this.tone(200, 0.4, 'sawtooth', 0.18, -150);
    this.time.delayedCall(200, () => this.tone(80, 0.5, 'sawtooth', 0.15, -40));
    await GameAPI.submitScore(this.score, this.pop, this.replay);
    const stats = await GameAPI.getStats();
    this.scene.get('UI').showGameOver({
      score: this.score,
      pop: this.pop,
      best: stats.score || 0,
    });
  }

  emitBurst(x, y, color, count){
    if (!this.textures.exists('particle')) return;
    const parts = this.add.particles(x, y, 'particle', {
      lifespan: 500,
      speed: { min: 60, max: 180 },
      scale: { start: 0.6, end: 0 },
      tint: color,
      quantity: count,
      emitting: false,
    });
    parts.explode(count);
    this.time.delayedCall(600, () => parts.destroy());
  }

  tone(freq, dur = 0.1, type = 'sine', vol = 0.15, slide = 0){
    try {
      const a = this.sound.context;
      if (!a || a.state === 'suspended') return;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type;
      o.frequency.value = freq;
      if (slide) o.frequency.exponentialRampToValueAtTime(
        Math.max(20, freq + slide), a.currentTime + dur
      );
      g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
      o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + dur);
    } catch(e){}
  }
}
