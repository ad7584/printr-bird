// ============================================================
// PreloadScene
// Phase 1: procedurally generates textures for bird/pipes/pickups
//          so no assets are required to run
// Phase 2: replace the generateTextures() body with this.load.image()
//          calls pointing at /assets/*.png from your sprite pack
// ============================================================
import { COLORS, BIRD, PIPES } from '../../config.js';

export default class PreloadScene extends Phaser.Scene {
  constructor(){
    super('Preload');
  }

  preload(){
    // Loading bar
    const { width, height } = this.scale;
    const barBg = this.add.rectangle(width/2, height/2, 220, 6, 0x1a0a2e);
    const bar = this.add.rectangle(width/2 - 110, height/2, 0, 6, COLORS.PINK)
      .setOrigin(0, 0.5);
    this.add.text(width/2, height/2 - 30, 'PRINTR BIRD', {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '28px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(width/2, height/2 + 24, 'loading…', {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '11px', color: '#888888', letterSpacing: '0.3em'
    }).setOrigin(0.5);

    this.load.on('progress', (v) => { bar.width = 220 * v; });

    // PHASE 2 INTEGRATION POINT
    // -----------------------------------------------------------
    // Replace this block with real asset loads, e.g.:
    //   this.load.image('bird_idle',     'assets/idle.png');
    //   this.load.image('bird_flap_up',  'assets/flap_up.png');
    //   this.load.image('bird_flap_down','assets/flap_down.png');
    //   this.load.image('bird_glide',    'assets/glide.png');
    //   this.load.image('bird_hit',      'assets/hit.png');
    //   this.load.image('bird_dead',     'assets/dead.png');
    //   this.load.image('crown',         'assets/crown.png');
    //   this.load.image('shield',        'assets/shield.png');
    //   this.load.image('speed',         'assets/speed.png');
    //   this.load.image('pipe_body',     'assets/pipe_body.png');
    //   this.load.image('pipe_cap',      'assets/pipe_cap.png');
    //   this.load.image('pop_flame',     'assets/pop.png');
    // -----------------------------------------------------------

    // For Phase 1 we generate textures from the Graphics API inside create()
    // (needs to happen after preload, but we register the fake loader here
    //  so the progress bar looks real)
    this.load.on('complete', () => {
      this.generateProceduralTextures();
    });
  }

  create(){
    // Brief pause on loading screen, then launch menu
    this.time.delayedCall(300, () => this.scene.start('Menu'));
  }

  // ============================================================
  // Generate all game textures procedurally — purely Phase 1.
  // Each block produces a texture you can use with this.add.image(key)
  // ============================================================
  generateProceduralTextures(){
    this.makePopTexture();
    this.makePowerupTexture('pu_shield', COLORS.CYAN);
    this.makePowerupTexture('pu_crown',  COLORS.GOLD);
    this.makePowerupTexture('pu_speed',  COLORS.PURPLE);
    this.makeParticleTexture();
  }

  makeParticleTexture(){
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 3);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }

  // $POP flame pickup — drawn as a polygon teardrop (Phaser Graphics has no bezier)
  makePopTexture(){
    const size = 28;
    const g = this.add.graphics();
    // Glow background
    g.fillStyle(COLORS.PINK, 0.25);
    g.fillCircle(size/2, size/2, size/2);
    // Flame body (polygon teardrop)
    g.fillStyle(COLORS.PINK, 1);
    g.beginPath();
    g.moveTo(size/2, 4);
    g.lineTo(size - 4, 12);
    g.lineTo(size - 2, 18);
    g.lineTo(size/2 + 3, size - 3);
    g.lineTo(size/2, size - 2);
    g.lineTo(size/2 - 3, size - 3);
    g.lineTo(2, 18);
    g.lineTo(4, 12);
    g.closePath();
    g.fillPath();
    // Inner bright core
    g.fillStyle(COLORS.GOLD, 1);
    g.fillCircle(size/2, size/2 + 3, 4);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(size/2, size/2 + 5, 1.5);
    g.generateTexture('pop_flame', size, size);
    g.destroy();
  }

  // Powerup orb
  makePowerupTexture(key, color){
    const size = 28;
    const g = this.add.graphics();
    // Glow ring
    g.fillStyle(color, 0.3);
    g.fillCircle(size/2, size/2, size/2);
    // Solid inner circle
    g.fillStyle(color, 1);
    g.fillCircle(size/2, size/2, 10);
    // White outline
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokeCircle(size/2, size/2, 10);
    g.generateTexture(key, size, size);
    g.destroy();
  }
}

