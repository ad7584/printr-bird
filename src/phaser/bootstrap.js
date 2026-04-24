// ============================================================
// Phaser bootstrap — exposed as bootPhaser(container), called once
// by GameShell.jsx after the user signs in.
// ============================================================
import Phaser from 'phaser';
import { GAME } from '../../config.js';
import BootScene from '../scenes/BootScene.js';
import PreloadScene from '../scenes/PreloadScene.js';
import MenuScene from '../scenes/MenuScene.js';
import GameScene from '../scenes/GameScene.js';
import UIScene from '../scenes/UIScene.js';

let _gameInstance = null;

export function bootPhaser(parent) {
  if (_gameInstance) return _gameInstance;

  const config = {
    type: Phaser.AUTO,
    parent,
    backgroundColor: GAME.BG_COLOR,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME.WIDTH,
      height: GAME.HEIGHT,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false },
    },
    // Fixed-step so frame count matches the server replay simulator.
    fps: { target: 60, forceSetTimeOut: true, smoothStep: false },
    render: { pixelArt: false, antialias: true },
    scene: [BootScene, PreloadScene, MenuScene, GameScene, UIScene],
  };

  _gameInstance = new Phaser.Game(config);
  return _gameInstance;
}

export function getPhaser() { return _gameInstance; }
