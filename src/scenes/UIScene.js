// ============================================================
// UIScene — HUD + modal overlays (respawn prompt, game over)
// $POP removed. HUD shows only score; Game Over shows SCORE / BEST.
// ============================================================
import Phaser from 'phaser';
import { POWERUPS, RESPAWN } from '../../config.js';
import { GameAPI } from '../net/api.js';

export default class UIScene extends Phaser.Scene {
  constructor(){
    super('UI');
  }

  create(){
    const { width: W, height: H } = this.scale;
    this.W = W; this.H = H;

    // -------------- Score display (top-center, huge) --------------
    this.scoreText = this.add.text(W/2, 34, '0', {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '64px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5, 0.5);
    this.scoreText.setShadow(0, 0, '#FF1E8E', 24, true, true);

    // -------------- Powerup bar (below score) --------------
    this.puGroup = this.add.group();

    // -------------- Hook into GameScene events --------------
    const gs = this.scene.get('Game');
    gs.events.on('ui:score', (v) => this.scoreText.setText(String(v)));
    gs.events.on('ui:combo', (txt, x, y) => this.spawnCombo(txt, x, y));
    gs.events.on('ui:powerups', (list) => this.renderPowerups(list));
    gs.events.on('ui:reset', () => {
      this.scoreText.setText('0');
      this.renderPowerups([]);
    });

    // Clean up on scene shutdown
    this.events.once('shutdown', () => {
      gs.events.removeAllListeners('ui:score');
      gs.events.removeAllListeners('ui:combo');
      gs.events.removeAllListeners('ui:powerups');
      gs.events.removeAllListeners('ui:reset');
    });
  }

  // Combo popup
  spawnCombo(txt, x, y){
    const t = this.add.text(x, y - 30, txt, {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '26px', fontStyle: 'bold', color: '#00F0FF',
    }).setOrigin(0.5);
    t.setShadow(0, 0, '#00F0FF', 15, true, true);
    this.tweens.add({
      targets: t,
      y: y - 100,
      alpha: 0,
      scale: 1.4,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  // Powerup badges
  renderPowerups(list){
    this.puGroup.clear(true, true);
    const now = this.time.now;
    const icons = { shield:'🛡', crown:'👑', speed:'⚡' };
    const colors = { shield: 0x00F0FF, crown: 0xFFD700, speed: 0x8B5CF6 };

    let offsetX = 0;
    for (const p of list){
      const rem = Math.max(0, Math.ceil((p.endsAt - now) / 1000));
      const bg = this.add.graphics();
      bg.fillStyle(0x000000, 0.6);
      bg.fillRoundedRect(this.W/2 - 60 + offsetX, 90, 100, 26, 13);
      bg.lineStyle(2, colors[p.type] || 0xFF1E8E, 1);
      bg.strokeRoundedRect(this.W/2 - 60 + offsetX, 90, 100, 26, 13);
      this.puGroup.add(bg);

      const t = this.add.text(this.W/2 - 10 + offsetX, 103,
        `${icons[p.type] || ''} ${p.type.toUpperCase()} ${rem}s`, {
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);
      this.puGroup.add(t);

      offsetX += 108;
    }
  }

  // Respawn overlay
  async showRespawn({ onFreeRespawn, onPaidRespawn, onTimeout, onSkip }){
    const { width: W, height: H } = this.scale;
    this.respawnGroup = this.add.group();
    const overlay = this.add.rectangle(0, 0, W, H, 0x05020a, 0.8).setOrigin(0);
    overlay.setInteractive();
    this.respawnGroup.add(overlay);

    const title = this.add.text(W/2, H * 0.22, 'CRASHED', {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '32px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    this.respawnGroup.add(title);

    const sub = this.add.text(W/2, H * 0.27, 'Continue your run?', {
      fontFamily: '"Inter", sans-serif',
      fontSize: '13px', color: '#aaaaaa',
    }).setOrigin(0.5);
    this.respawnGroup.add(sub);

    this.respawnTimerText = this.add.text(W/2, H * 0.38, '5', {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '80px', fontStyle: 'bold', color: '#FF1E8E',
    }).setOrigin(0.5);
    this.respawnTimerText.setShadow(0, 0, '#FF1E8E', 40, true, true);
    this.respawnGroup.add(this.respawnTimerText);

    const [dailyLeft, quote] = await Promise.all([
      GameAPI.getDailyRespawnsLeft(),
      GameAPI.getReviveQuote(),
    ]);
    let optY = H * 0.52;
    const optSpacing = 58;

    if (quote?.rank && quote.rank > 1){
      const rankLabel = quote.rank === 2 ? '2ND REVIVE' : quote.rank === 3 ? 'FINAL REVIVE' : `REVIVE ${quote.rank}`;
      const rt = this.add.text(W/2, H * 0.46, rankLabel, {
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: '12px', fontStyle: 'bold', color: '#FFD700',
      }).setOrigin(0.5).setLetterSpacing(3);
      this.respawnGroup.add(rt);
    }

    if (dailyLeft > 0){
      this.makeRespawnOption(W/2, optY,
        'FREE RESPAWN',
        `${dailyLeft} left today`,
        0x00F0FF, 0x003344,
        () => { this.hideRespawn(); onFreeRespawn(); }
      );
      optY += optSpacing;
    }

    const birdPrice = quote?.priceBird ?? RESPAWN.COSTS.BIRD_BURN;
    const solPrice = quote?.priceSol ?? RESPAWN.COSTS.SOL;
    const solUsd = quote?.priceSolUsd;

    this.makeRespawnOption(W/2, optY,
      'RESPAWN WITH $BIRD',
      `🔥 burn ${birdPrice.toLocaleString()}`,
      0x8B5CF6, 0x1a0a2e,
      () => { this.hideRespawn(); onPaidRespawn('bird'); }
    );
    optY += optSpacing;

    const solLabel = solUsd ? `${solPrice} SOL  ·  ~$${solUsd}` : `${solPrice} SOL`;
    this.makeRespawnOption(W/2, optY,
      'RESPAWN WITH SOL',
      solLabel,
      0x8B5CF6, 0x1a0a2e,
      () => { this.hideRespawn(); onPaidRespawn('sol'); }
    );
    optY += optSpacing + 10;

    const skip = this.add.text(W/2, optY, 'let me die', {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '12px', color: '#666666',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    skip.on('pointerup', () => { this.hideRespawn(); onSkip(); });
    skip.on('pointerover', () => skip.setColor('#FF1E8E'));
    skip.on('pointerout',  () => skip.setColor('#666666'));
    this.respawnGroup.add(skip);

    this.respawnDeadline = this.time.now + RESPAWN.WINDOW_MS;
    this.respawnTimeout = onTimeout;
    this.respawnTicker = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => this.tickRespawn(),
    });
  }

  makeRespawnOption(x, y, label, costText, borderColor, bgColor, onClick){
    const w = 280, h = 48;
    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 0.8);
    bg.fillRoundedRect(x - w/2, y - h/2, w, h, 14);
    bg.lineStyle(1.5, borderColor, 0.8);
    bg.strokeRoundedRect(x - w/2, y - h/2, w, h, 14);

    const labelText = this.add.text(x - w/2 + 18, y, label, {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0, 0.5);

    const cost = this.add.text(x + w/2 - 18, y, costText, {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '11px', fontStyle: 'bold',
      color: borderColor === 0x00F0FF ? '#00F0FF' : '#aaaaaa',
    }).setOrigin(1, 0.5);

    const hit = this.add.rectangle(x, y, w, h, 0xffffff, 0.001).setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerup', onClick);
    hit.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(bgColor, 1);
      bg.fillRoundedRect(x - w/2, y - h/2, w, h, 14);
      bg.lineStyle(2, 0xFF1E8E, 1);
      bg.strokeRoundedRect(x - w/2, y - h/2, w, h, 14);
    });
    hit.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(bgColor, 0.8);
      bg.fillRoundedRect(x - w/2, y - h/2, w, h, 14);
      bg.lineStyle(1.5, borderColor, 0.8);
      bg.strokeRoundedRect(x - w/2, y - h/2, w, h, 14);
    });

    this.respawnGroup.add(bg);
    this.respawnGroup.add(labelText);
    this.respawnGroup.add(cost);
    this.respawnGroup.add(hit);
  }

  tickRespawn(){
    const remaining = Math.max(0, this.respawnDeadline - this.time.now);
    const sec = Math.ceil(remaining / 1000);
    this.respawnTimerText.setText(String(sec));
    if (remaining <= 0){
      this.hideRespawn();
      if (this.respawnTimeout) this.respawnTimeout();
    }
  }

  hideRespawn(){
    if (this.respawnTicker){
      this.respawnTicker.remove();
      this.respawnTicker = null;
    }
    if (this.respawnGroup){
      this.respawnGroup.clear(true, true);
      this.respawnGroup = null;
    }
  }

  // Game Over overlay — SCORE and BEST only.
  async showGameOver({ score, best }){
    const { width: W, height: H } = this.scale;
    this.goGroup = this.add.group();
    this._prices = await GameAPI.getPrices().catch(() => null);

    const overlay = this.add.rectangle(0, 0, W, H, 0x05020a, 0.85).setOrigin(0);
    overlay.setInteractive();
    this.goGroup.add(overlay);

    const t1 = this.add.text(W/2 - 70, H * 0.15, 'GAME', {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '52px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    const t2 = this.add.text(W/2 + 70, H * 0.15, 'OVER', {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '52px', fontStyle: 'bold', color: '#FF1E8E',
    }).setOrigin(0.5);
    t2.setShadow(0, 0, '#FF1E8E', 30, true, true);
    this.goGroup.add(t1); this.goGroup.add(t2);

    // Stats — SCORE left, BEST right (two only now)
    const statY = H * 0.3;
    this.makeGOStat(W * 0.33, statY, 'SCORE', score, '#FF1E8E');
    this.makeGOStat(W * 0.67, statY, 'BEST',  best,  '#ffffff');

    // Near-miss / leaderboard hook
    GameAPI.getMe().then(me => {
      if (!me?.today) return;
      const t = me.today;
      const rank = me.ranks?.daily;
      const pool = t.firstPlaceSol ?? 0;

      let msg = null;
      if (t.pointsToTop3 > 0 && t.pointsToTop3 <= 5 && pool > 0) {
        msg = `#${rank} today · ${t.pointsToTop3} from TOP 3 (≈ ${pool.toFixed(2)} SOL)`;
      } else if (t.pointsToTop10 > 0 && t.pointsToTop10 <= 5 && t.prizePoolSol > 0) {
        msg = `#${rank} today · ${t.pointsToTop10} from TOP 10`;
      } else if (rank && rank <= 10) {
        msg = `🔥  #${rank} today — in the prize zone`;
      }
      if (!msg) return;

      const color = msg.startsWith('🔥') ? '#FFD700' : '#00F0FF';
      const nm = this.add.text(W/2, H * 0.375, msg, {
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: '12px', fontStyle: 'bold', color,
      }).setOrigin(0.5).setLetterSpacing(1.5);
      nm.setShadow(0, 0, color, 10, true, true);
      this.goGroup.add(nm);
    });

    const div = this.add.graphics();
    div.fillStyle(0xffffff, 0.2);
    div.fillRect(W * 0.2, H * 0.4, W * 0.6, 1);
    this.goGroup.add(div);

    const shopLabel = this.add.text(W/2, H * 0.44, 'PRE-GAME LOADOUT', {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '11px', fontStyle: 'bold', color: '#888888',
    }).setOrigin(0.5).setLetterSpacing(3);
    this.goGroup.add(shopLabel);

    const loadout = this.registry.get('loadout') || [];
    const already = (type) => loadout.some(p => (p.type ?? p) === type);
    const bird = this._prices?.powerup?.bird ?? 800;
    const usd = this._prices?.powerup?.usd;
    POWERUPS.SHOP.forEach((item, i) => {
      const col = i;
      const x = W * (0.22 + col * 0.28);
      const y = H * 0.54;
      const priceLabel = usd ? `${bird} $BIRD  ·  ~$${usd}` : `${bird} $BIRD`;
      this.makeShopItem(x, y, { ...item, price: priceLabel }, already(item.type));
    });

    const pbY = H * 0.77;
    this.makeGOButton(W/2, pbY, 'PLAY AGAIN', 0xFF1E8E, 0x8B5CF6, async () => {
      this.shutdown();
      const loadout = this.registry.get('loadout') || [];
      const paidLoadout = loadout.filter(p => p && typeof p === 'object' && p.txSignature);
      const auth = await GameAPI.authorizePlay(paidLoadout);
      if (!auth.authorized){
        console.warn('[UIScene] play again not authorized', auth);
        return;
      }
      if (typeof auth.seed === 'number') this.registry.set('sessionSeed', auth.seed);
      this.registry.set('loadout', (auth.loadout || paidLoadout.map(p => p.type)));
      this.time.delayedCall(10, () => {
        this.scene.stop('Game');
        this.scene.stop('UI');
        this.scene.start('Game');
        this.scene.launch('UI');
      });
    });

    const mbY = H * 0.85;
    const menu = this.add.text(W/2, mbY, 'main menu', {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '13px', color: '#888888',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menu.on('pointerup', () => {
      this.shutdown();
      this.time.delayedCall(10, () => {
        this.scene.stop('Game');
        this.scene.stop('UI');
        this.scene.start('Menu');
      });
    });
    menu.on('pointerover', () => menu.setColor('#FF1E8E'));
    menu.on('pointerout',  () => menu.setColor('#888888'));
    this.goGroup.add(menu);
  }

  makeGOStat(x, y, label, value, color){
    const l = this.add.text(x, y - 18, label, {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '10px', color: '#777777',
    }).setOrigin(0.5).setLetterSpacing(2);
    const v = this.add.text(x, y + 6, String(value), {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '26px', fontStyle: 'bold', color,
    }).setOrigin(0.5);
    this.goGroup.add(l); this.goGroup.add(v);
  }

  makeShopItem(x, y, item, active){
    const w = 90, h = 90;
    const bg = this.add.graphics();
    const paint = (state) => {
      bg.clear();
      const fill = state === 'bought' ? 0x331a2e : 0x1a0a2e;
      const border = state === 'bought' ? 0xFF1E8E : state === 'pending' ? 0xFFD700 : 0x333333;
      bg.fillStyle(fill, 0.8);
      bg.fillRoundedRect(x - w/2, y - h/2, w, h, 12);
      bg.lineStyle(state === 'bought' ? 2 : 1.5, border, 1);
      bg.strokeRoundedRect(x - w/2, y - h/2, w, h, 12);
    };
    paint(active ? 'bought' : 'idle');

    const icon = this.add.text(x, y - 16, item.icon, { fontSize: '26px' }).setOrigin(0.5);
    const name = this.add.text(x, y + 12, item.name.toUpperCase(), {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '10px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setLetterSpacing(1);
    const price = this.add.text(x, y + 28, item.price, {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '9px', color: '#888888',
    }).setOrigin(0.5);

    const hit = this.add.rectangle(x, y, w, h, 0xffffff, 0.001)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    hit.on('pointerup', async () => {
      const loadout = this.registry.get('loadout') || [];
      if (loadout.some(p => p.type === item.type)){
        return;
      }
      paint('pending');
      price.setText('signing…');
      try {
        const r = await GameAPI.buyPowerup(item.type, 'bird');
        if (r.success && r.txSignature){
          loadout.push({ type: r.type, method: r.method, txSignature: r.txSignature });
          this.registry.set('loadout', loadout);
          paint('bought');
          price.setText('READY');
        } else {
          paint('idle');
          price.setText(item.price);
        }
      } catch (e) {
        paint('idle');
        price.setText(item.price);
      }
    });

    this.goGroup.add(bg);
    this.goGroup.add(icon);
    this.goGroup.add(name);
    this.goGroup.add(price);
    this.goGroup.add(hit);
  }

  makeGOButton(x, y, label, c1, c2, onClick){
    const w = 220, h = 52;
    const bg = this.add.graphics();
    bg.fillGradientStyle(c1, c2, c1, c2, 1);
    bg.fillRoundedRect(x - w/2, y - h/2, w, h, 26);

    const t = this.add.text(x, y, label, {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setLetterSpacing(2);

    const hit = this.add.rectangle(x, y, w, h, 0xffffff, 0.001)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    hit.on('pointerup', onClick);
    hit.on('pointerover', () => t.setScale(1.05));
    hit.on('pointerout',  () => t.setScale(1));

    this.goGroup.add(bg);
    this.goGroup.add(t);
    this.goGroup.add(hit);
  }

  shutdown(){
    if (this.respawnGroup) this.respawnGroup.clear(true, true);
    if (this.goGroup) this.goGroup.clear(true, true);
    if (this.respawnTicker) this.respawnTicker.remove();
  }
}