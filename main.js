// ============================================================
// Phaser.Game bootstrap
// ============================================================
import { GAME } from './config.js';
import BootScene from './src/scenes/BootScene.js';
import PreloadScene from './src/scenes/PreloadScene.js';
import MenuScene from './src/scenes/MenuScene.js';
import GameScene from './src/scenes/GameScene.js';
import UIScene from './src/scenes/UIScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: GAME.BG_COLOR,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME.WIDTH,
    height: GAME.HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },   // we'll apply per-object gravity in Bird
      debug: false,
    },
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
  scene: [BootScene, PreloadScene, MenuScene, GameScene, UIScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);

// ============================================================
// Dev helper — wire holder toggle (HTML overlay)
// Remove this block when real wallet connect is wired in Phase 3
// ============================================================
const toggle = document.getElementById('holder-toggle');
const refreshToggle = () => {
  const on = localStorage.getItem('pb_holder') === '1';
  toggle.classList.toggle('on', on);
  toggle.textContent = on ? 'Holder: ON' : 'Holder: OFF';
};
toggle.addEventListener('click', () => {
  const on = localStorage.getItem('pb_holder') === '1';
  localStorage.setItem('pb_holder', on ? '0' : '1');
  refreshToggle();
});
refreshToggle();
