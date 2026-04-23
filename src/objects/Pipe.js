// ============================================================
// Pipe — pair of top+bottom pipes with a gap.
//   Pure Graphics, no physics bodies. Collision with bird is
//   done manually in GameScene for shield-interaction control.
// ============================================================
import { PIPES, COLORS } from '../../config.js';

export default class Pipe {
  constructor(scene, x, gapY, gapH, worldH){
    this.scene = scene;
    this.x = x;
    this.gapY = gapY;
    this.gapH = gapH;
    this.worldH = worldH;
    this.scored = false;
    this.dead = false;

    this.gfx = scene.add.graphics();
    this.draw();
  }

  advance(dx){
    this.x -= dx;
    this.draw();
  }

  offscreen(){
    return this.x + PIPES.WIDTH < -10;
  }

  destroy(){
    this.dead = true;
    this.gfx.destroy();
  }

  draw(){
    if (this.dead) return;
    const g = this.gfx;
    const W = PIPES.WIDTH;
    const capH = PIPES.CAP_HEIGHT;
    const H = this.worldH;
    const X = this.x;
    g.clear();

    const body = (x, y, w, h) => {
      // Layered stripes for depth
      g.fillStyle(COLORS.PIPE_PURPLE_DARK, 1);
      g.fillRect(x, y, w, h);
      g.fillStyle(COLORS.PIPE_PURPLE_MID, 1);
      g.fillRect(x + w*0.1, y, w*0.8, h);
      g.fillStyle(COLORS.PIPE_PURPLE_LIGHT, 1);
      g.fillRect(x + w*0.3, y, w*0.4, h);
      // Pink neon edges
      g.fillStyle(COLORS.PINK, 1);
      g.fillRect(x + 1, y, 2, h);
      g.fillRect(x + w - 3, y, 2, h);
      // Cyan tick marks
      g.fillStyle(COLORS.CYAN, 0.4);
      for (let ty = y + 8; ty < y + h - 8; ty += 18){
        g.fillRect(x + 6, ty, w - 12, 2);
      }
    };

    const cap = (x, y, w) => {
      g.fillStyle(COLORS.PIPE_CAP_TOP, 1);
      g.fillRect(x - 4, y, w + 8, capH);
      g.fillStyle(COLORS.PIPE_PURPLE_DARK, 1);
      g.fillRect(x - 4, y + capH * 0.65, w + 8, capH * 0.35);
      g.fillStyle(COLORS.CYAN, 1);
      g.fillRect(x - 4, y + capH - 4, w + 8, 3);
      g.lineStyle(2, COLORS.PINK, 1);
      g.strokeRect(x - 4, y, w + 8, capH);
    };

    // Top pipe
    if (this.gapY - capH > 0){
      body(X, 0, W, this.gapY - capH);
      cap(X, this.gapY - capH, W);
    }
    // Bottom pipe
    const botY = this.gapY + this.gapH;
    const botBodyY = botY + capH;
    const botH = H - botBodyY;
    if (botH > 0){
      cap(X, botY, W);
      body(X, botBodyY, W, botH);
    }
  }
}
