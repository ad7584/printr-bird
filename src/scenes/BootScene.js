// ============================================================
// BootScene — one-shot setup, then jumps to preload
// ============================================================
export default class BootScene extends Phaser.Scene {
  constructor(){
    super('Boot');
  }

  create(){
    // Global registry values (accessible from any scene via this.registry)
    this.registry.set('score', 0);
    this.registry.set('pop', 0);
    this.registry.set('loadout', []);  // pre-game powerups selected

    this.scene.start('Preload');
  }
}
