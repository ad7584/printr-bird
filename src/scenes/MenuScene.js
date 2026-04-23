// ============================================================
// MenuScene — main menu
// ============================================================
import { COLORS, BIRD, GAME } from '../../config.js';
import { GameAPI } from '../net/GameAPI.js';
import Bird from '../objects/Bird.js';
import Background from '../objects/Background.js';

export default class MenuScene extends Phaser.Scene {
  constructor(){
    super('Menu');
  }

  create(){
    const { width: W, height: H } = this.scale;
    this.bg = new Background(this);

    // Idle bird bobbing in center — no physics gravity
    this.idleBird = new Bird(this, W * BIRD.START_X_RATIO, H / 2);
    this.idleBird.sprite.body.setAllowGravity(false);
    // Disable velocity updates; we tween the Y manually for bobbing
    this.idleBird.sprite.body.enable = false;

    this.bobBase = H / 2;
    this.bobT = 0;

    // ---- Title ----
    this.add.text(W/2 - 80, H * 0.2, 'PRINTR', {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontSize: '56px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    const accent = this.add.text(W/2 + 80, H * 0.2, 'BIRD', {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontSize: '56px', fontStyle: 'bold', color: '#FF1E8E',
    }).setOrigin(0.5);
    accent.setShadow(0, 0, '#FF1E8E', 30, true, true);

    // ---- Tagline ----
    this.add.text(W/2, H * 0.27, 'FLY . PRINT . REPEAT', {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '13px', fontStyle: 'bold', color: '#aaaaaa',
    }).setOrigin(0.5).setLetterSpacing(3);

    // ---- Stats (placeholders now; async update in a moment) ----
    const statY = H * 0.72;
    this.bestVal  = this.makeStat(W * 0.2, statY, 'BEST',  '0', '#FF1E8E');
    this.popVal   = this.makeStat(W * 0.5, statY, '$POP',  '0', '#00F0FF');
    this.gamesVal = this.makeStat(W * 0.8, statY, 'GAMES', '0', '#ffffff');

    // Async load
    GameAPI.getStats().then(stats => {
      if (!this.scene.isActive()) return;
      this.bestVal.setText(String(stats.score || 0));
      this.popVal.setText(String(stats.pop || 0));
      this.gamesVal.setText(String(stats.games || 0));
    });

    // ---- Play button ----
    const btnY = H * 0.85;
    const btnBg = this.add.graphics();
    btnBg.fillGradientStyle(COLORS.PINK, COLORS.PURPLE, COLORS.PINK, COLORS.PURPLE, 1);
    btnBg.fillRoundedRect(W/2 - 110, btnY - 26, 220, 52, 26);
    const btnText = this.add.text(W/2, btnY, 'TAP TO PLAY', {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setLetterSpacing(2);

    this.tweens.add({
      targets: btnText,
      scale: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Hint
    this.add.text(W/2, H * 0.92, 'tap · space · ↑  to flap', {
      fontFamily: '"Inter", sans-serif',
      fontSize: '11px', color: '#666666',
    }).setOrigin(0.5);

    // Input
    this.input.on('pointerdown', () => this.startGame());
    this.input.keyboard.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard.on('keydown-UP', () => this.startGame());

    // Cleanup on shutdown
    this.events.once('shutdown', () => {
      if (this.idleBird) this.idleBird.destroy();
    });
  }

  makeStat(x, y, label, initialValue, color){
    this.add.text(x, y - 18, label, {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '11px', color: '#777777',
    }).setOrigin(0.5).setLetterSpacing(2);
    return this.add.text(x, y + 6, initialValue, {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '28px', fontStyle: 'bold', color,
    }).setOrigin(0.5);
  }

  async startGame(){
    if (this._starting) return;
    this._starting = true;
    const auth = await GameAPI.authorizePlay();
    if (!auth.authorized){ this._starting = false; return; }
    this.scene.stop('Menu');
    this.scene.start('Game');
    this.scene.launch('UI');
  }

  update(time, dt){
    this.bg.update(40);
    // Idle bob
    this.bobT += dt / 1000;
    if (this.idleBird){
      this.idleBird.y = this.bobBase + Math.sin(this.bobT * 2) * 10;
      this.idleBird.flapT += 0.05;
      this.idleBird.redraw();
    }
  }
}
