// ============================================================
// Bird — Arcade Sprite + child Graphics for procedural art
//   Using a plain wrapper class (not extending Container) avoids
//   a whole class of Phaser physics+container edge cases.
//
// Phase 2: replace this whole class with an Arcade Sprite using
//          a real texture atlas + Animations.
// ============================================================
import { BIRD, PHYSICS, COLORS } from '../../config.js';

export default class Bird {
  constructor(scene, x, y){
    this.scene = scene;

    // Invisible 4x4 "physics anchor" sprite
    if (!scene.textures.exists('bird_phys')){
      const tg = scene.add.graphics();
      tg.fillStyle(0xffffff, 0);
      tg.fillRect(0, 0, 4, 4);
      tg.generateTexture('bird_phys', 4, 4);
      tg.destroy();
    }

    this.sprite = scene.physics.add.sprite(x, y, 'bird_phys');
    this.sprite.body.setCircle(BIRD.HITBOX_R, -BIRD.HITBOX_R + 2, -BIRD.HITBOX_R + 2);
    this.sprite.body.setAllowGravity(false);
    this.sprite.setVisible(false);
    this.sprite.birdRef = this;

    this.gfx = scene.add.graphics();

    this.alive = true;
    this.flapT = 0;
    this.rot = 0;
    this.activePowerups = [];
  }

  get x(){ return this.sprite.x; }
  set x(v){ this.sprite.x = v; }
  get y(){ return this.sprite.y; }
  set y(v){ this.sprite.y = v; }
  get body(){ return this.sprite.body; }

  setAlive(a){ this.alive = a; }

  flap(){
    if (!this.alive) return;
    this.sprite.body.setVelocityY(PHYSICS.FLAP_VEL);
    this.flapT = -1.5;
  }

  update(dt){
    const dtSec = dt / 1000;
    this.sprite.body.velocity.y += PHYSICS.GRAVITY * dtSec;
    if (this.sprite.body.velocity.y > PHYSICS.MAX_FALL){
      this.sprite.body.velocity.y = PHYSICS.MAX_FALL;
    }
    const targetRot = Phaser.Math.Clamp(this.sprite.body.velocity.y * 0.004, -0.45, 1.05);
    this.rot = Phaser.Math.Linear(this.rot, targetRot, 0.12);
    this.flapT += 0.01 * dt + Math.abs(this.sprite.body.velocity.y) * 0.00008 * dt;
    this.redraw();
  }

  updateDead(dt){
    const dtSec = dt / 1000;
    this.sprite.body.velocity.y += PHYSICS.GRAVITY * dtSec;
    this.rot = Math.min(this.rot + 0.03, 1.5);
    this.redraw();
  }

  destroy(){
    this.gfx.destroy();
    this.sprite.destroy();
  }

  redraw(){
    const g = this.gfx;
    const R = BIRD.VISUAL_R;
    const active = this.activePowerups;
    g.clear();

    g.save();
    g.translateCanvas(this.sprite.x, this.sprite.y);
    g.rotateCanvas(this.rot);

    // Shield aura
    if (active.find(p => p.type === 'shield')){
      const t = (this.scene.time.now / 200) % (Math.PI * 2);
      g.fillStyle(COLORS.CYAN, 0.15 + Math.sin(t) * 0.08);
      g.fillCircle(0, 0, R + 10);
      g.lineStyle(2, COLORS.CYAN, 0.7);
      g.strokeCircle(0, 0, R + 10);
    }

    // Speed trail
    if (active.find(p => p.type === 'speed')){
      g.fillStyle(COLORS.PINK, 0.45);
      g.fillTriangle(-10, -12, -60, 0, -10, 12);
    }

    // Body
    g.fillStyle(COLORS.BIRD_BODY_DARK, 1);
    g.fillCircle(0, 0, R);
    g.fillStyle(0x2a1a3a, 0.6);
    g.fillCircle(-4, -6, R - 4);

    // Tail
    g.fillStyle(COLORS.PURPLE, 1);
    g.fillTriangle(-R+4, 0, -R-10, -6, -R-8, 6);
    g.fillStyle(COLORS.PINK, 0.7);
    g.fillTriangle(-R+4, 2, -R-6, -3, -R-5, 5);

    // Mohawk crest
    g.fillStyle(COLORS.PINK, 1);
    g.beginPath();
    g.moveTo(-10, -R+4);
    g.lineTo(-6, -R-12);
    g.lineTo(-2, -R+2);
    g.lineTo(2, -R-14);
    g.lineTo(6, -R+2);
    g.lineTo(10, -R-8);
    g.lineTo(12, -R+4);
    g.closePath();
    g.fillPath();

    // Wing (animated)
    const wingAngle = Math.sin(this.flapT) * 0.7;
    g.save();
    g.translateCanvas(-2, 2);
    g.rotateCanvas(wingAngle);
    g.fillStyle(COLORS.PINK, 1);
    g.fillEllipse(0, 0, 16, 22);
    g.fillStyle(COLORS.PURPLE, 0.7);
    g.fillEllipse(0, 4, 12, 16);
    g.restore();

    // Eye
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, -4, 7);
    g.fillStyle(COLORS.PINK, 1);
    g.fillCircle(10, -4, 3.5);
    g.fillStyle(0xffffff, 1);
    g.fillRect(11, -6, 1.5, 4);

    // Beak
    g.fillStyle(COLORS.BLUE, 1);
    g.fillTriangle(R-4, -2, R+10, 0, R-4, 6);
    g.fillStyle(0xffffff, 0.3);
    g.fillRect(R-3, -1, 4, 1.5);

    // P emblem
    g.fillStyle(COLORS.PINK, 1);
    g.fillRect(-3, 6, 8, 8);
    g.fillStyle(0x000000, 1);
    g.fillRect(0, 9, 2, 2);
    g.fillRect(2, 11, 2, 2);

    // Crown
    if (active.find(p => p.type === 'crown')){
      g.fillStyle(COLORS.GOLD, 1);
      g.beginPath();
      g.moveTo(-10, -R-10);
      g.lineTo(-7, -R-22);
      g.lineTo(-3, -R-14);
      g.lineTo(0, -R-24);
      g.lineTo(3, -R-14);
      g.lineTo(7, -R-22);
      g.lineTo(10, -R-10);
      g.closePath();
      g.fillPath();
    }

    g.restore();
  }
}
