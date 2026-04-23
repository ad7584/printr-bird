// ============================================================
// Background — starfield + grid overlay on a deep gradient
//   Parallax speed scales with current game speed.
// ============================================================
import { COLORS } from '../../config.js';

export default class Background {
  constructor(scene){
    this.scene = scene;
    this.W = scene.scale.width;
    this.H = scene.scale.height;

    // Deep gradient as a rectangle
    this.bgGfx = scene.add.graphics();
    this.drawBgGradient();

    // Stars (Phaser Groups of tiny circles using Graphics)
    this.starsGfx = scene.add.graphics();
    this.stars = [];
    for (let i = 0; i < 60; i++){
      this.stars.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        r: Math.random() * 1.4 + 0.3,
        speed: Math.random() * 0.3 + 0.1,
        tw: Math.random() * Math.PI * 2,
      });
    }

    // Grid overlay
    this.gridGfx = scene.add.graphics();
    this.gridOffset = 0;
  }

  drawBgGradient(){
    const g = this.bgGfx;
    g.clear();
    // Simple layered rects to fake a gradient (Phaser Graphics doesn't do real gradients)
    const steps = 8;
    for (let i = 0; i < steps; i++){
      const t = i / steps;
      // top: 0x0a0318 → bottom: 0x02000a
      const r = Math.round(Phaser.Math.Linear(0x0a, 0x02, t));
      const gch = Math.round(Phaser.Math.Linear(0x03, 0x00, t));
      const b = Math.round(Phaser.Math.Linear(0x18, 0x0a, t));
      const color = (r << 16) | (gch << 8) | b;
      g.fillStyle(color, 1);
      g.fillRect(0, (this.H * i) / steps, this.W, this.H / steps + 1);
    }
    // Radial glow top-right
    g.fillStyle(COLORS.PURPLE, 0.08);
    g.fillCircle(this.W * 0.8, this.H * 0.15, this.W * 0.5);
    g.fillStyle(COLORS.PINK, 0.06);
    g.fillCircle(this.W * 0.15, this.H * 0.85, this.W * 0.5);
  }

  update(scrollSpeed){
    // Stars
    const sg = this.starsGfx;
    sg.clear();
    for (const s of this.stars){
      s.x -= s.speed * scrollSpeed * 0.005;  // dt-normalized feel
      s.tw += 0.05;
      if (s.x < -5){ s.x = this.W + 5; s.y = Math.random() * this.H; }
      const alpha = 0.4 + Math.sin(s.tw) * 0.3;
      sg.fillStyle(0xffffff, alpha);
      sg.fillCircle(s.x, s.y, s.r);
    }

    // Grid
    this.gridOffset -= scrollSpeed * 0.015;
    if (this.gridOffset < -40) this.gridOffset += 40;
    const gg = this.gridGfx;
    gg.clear();
    gg.lineStyle(1, COLORS.PURPLE, 0.08);
    for (let x = this.gridOffset; x < this.W; x += 40){
      gg.beginPath();
      gg.moveTo(x, 0);
      gg.lineTo(x, this.H);
      gg.strokePath();
    }
    for (let y = 0; y < this.H; y += 40){
      gg.beginPath();
      gg.moveTo(0, y);
      gg.lineTo(this.W, y);
      gg.strokePath();
    }
  }
}
