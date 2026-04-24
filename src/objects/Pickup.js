// ============================================================
// Pickup — $POP flame (default) or powerup orb
//   Uses a pre-generated texture (pop_flame, pu_shield, pu_crown, pu_speed)
//   with a simple wobble tween.
// ============================================================
import Phaser from 'phaser';

export default class Pickup extends Phaser.GameObjects.Image {
  constructor(scene, x, y, type = null){
    const key = type ? `pu_${type}` : 'pop_flame';
    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setAllowGravity(false);
    this.body.setCircle(12, 2, 2);

    this.type = type;       // null = $POP
    this.isPowerup = !!type;
    this.collected = false;

    // Floating wobble
    scene.tweens.add({
      targets: this,
      y: y - 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // Slow spin on powerups
    if (this.isPowerup){
      scene.tweens.add({
        targets: this,
        angle: 360,
        duration: 4000,
        repeat: -1,
      });
    }
  }

  collect(){
    if (this.collected) return;
    this.collected = true;
    // poof
    this.scene.tweens.add({
      targets: this,
      scale: 1.6,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    });
  }
}
