// ============================================================
// Background — sunset sky + sun + parallax silhouettes + sparse stars
// All tuning constants at the top.
// ============================================================
import Phaser from 'phaser';

// --- Sky gradient (top → bottom) ---
// Peach sky → orange → deep coral at horizon
const SKY_STOPS = [
  { t: 0.00, color: [0x2a, 0x12, 0x38] }, // deep dusk purple at very top
  { t: 0.18, color: [0x6b, 0x1f, 0x4a] }, // plum
  { t: 0.42, color: [0xd0, 0x50, 0x4a] }, // warm red
  { t: 0.68, color: [0xff, 0x8a, 0x3c] }, // orange
  { t: 0.90, color: [0xff, 0xc4, 0x6a] }, // golden peach near horizon
  { t: 1.00, color: [0xff, 0xa8, 0x55] }, // slightly warmer at very bottom
];

// --- Sun ---
const SUN = {
  xRatio: 0.72,         // horizontal position (fraction of width)
  yRatio: 0.72,         // vertical position (fraction of height) — above horizon
  radius: 70,
  core: 0xfff5d8,       // warm white center
  rim: 0xffb55e,        // warm orange rim
  bloomRadius: 180,     // outer glow
  bloomColor: 0xffa04a,
  bloomAlpha: 0.18,
};

// --- Horizon haze (fake heat shimmer) ---
const HAZE = {
  y: 0.72,              // fraction of height
  color: 0xffdd80,
  alpha: 0.22,
  height: 90,
};

// --- Stars (only in upper sky where it's dusk) ---
const STAR_COUNT = 20;
const STAR_MAX_Y_RATIO = 0.35;  // don't draw stars below this

// --- Silhouette layers ---
// Pure black against warm sky = maximum readability
const SILHOUETTE_LAYERS = [
  { color: 0x000000, alpha: 0.92, parallax: 0.04, heightRatio: 0.25 }, // far
  { color: 0x000000, alpha: 0.98, parallax: 0.10, heightRatio: 0.18 }, // near (in front)
];

function lerpByte(a, b, t){ return Math.round(a + (b - a) * t); }

function sampleGradient(t){
  // find bracketing stops
  for (let i = 0; i < SKY_STOPS.length - 1; i++){
    const a = SKY_STOPS[i], b = SKY_STOPS[i + 1];
    if (t >= a.t && t <= b.t){
      const localT = (t - a.t) / (b.t - a.t);
      return [
        lerpByte(a.color[0], b.color[0], localT),
        lerpByte(a.color[1], b.color[1], localT),
        lerpByte(a.color[2], b.color[2], localT),
      ];
    }
  }
  const last = SKY_STOPS[SKY_STOPS.length - 1].color;
  return [...last];
}

export default class Background {
  constructor(scene){
    this.scene = scene;
    this.W = scene.scale.width;
    this.H = scene.scale.height;

    // Layer 1 — sunset gradient
    this.bgGfx = scene.add.graphics();
    this.drawSky();

    // Layer 2 — sun (between sky and silhouettes)
    this.sunGfx = scene.add.graphics();
    this.drawSun();

    // Layer 3 — stars (only in upper sky)
    this.starsGfx = scene.add.graphics();
    this.stars = [];
    for (let i = 0; i < STAR_COUNT; i++){
      this.stars.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H * STAR_MAX_Y_RATIO,
        r: Math.random() * 1.1 + 0.3,
        speed: Math.random() * 0.2 + 0.05,
        tw: Math.random() * Math.PI * 2,
      });
    }

    // Layer 4 — silhouettes (in front of sun and stars)
    this.silhouetteGfx = scene.add.graphics();
    this.silhouettePanels = this.buildSilhouettePanels();
    this.silhouetteOffsets = SILHOUETTE_LAYERS.map(() => 0);
  }

  // -----------------------------------------------------------
  // Sky gradient
  // -----------------------------------------------------------
  drawSky(){
    const g = this.bgGfx;
    g.clear();
    const steps = 32;  // more steps = smoother gradient (important for warm tones)
    for (let i = 0; i < steps; i++){
      const t = i / (steps - 1);
      const [r, gc, b] = sampleGradient(t);
      const color = (r << 16) | (gc << 8) | b;
      g.fillStyle(color, 1);
      g.fillRect(0, (this.H * i) / steps, this.W, this.H / steps + 1);
    }

    // Horizon haze strip
    g.fillStyle(HAZE.color, HAZE.alpha);
    g.fillRect(0, this.H * HAZE.y - HAZE.height / 2, this.W, HAZE.height);
  }

  // -----------------------------------------------------------
  // Sun disc with bloom
  // -----------------------------------------------------------
  drawSun(){
    const g = this.sunGfx;
    g.clear();
    const cx = this.W * SUN.xRatio;
    const cy = this.H * SUN.yRatio;

    // Outer bloom (soft glow layers, decreasing opacity outward)
    for (let i = 5; i >= 1; i--){
      const r = SUN.bloomRadius * (i / 5);
      g.fillStyle(SUN.bloomColor, SUN.bloomAlpha * (1 / i) * 1.2);
      g.fillCircle(cx, cy, r);
    }

    // Sun disc (rim + core)
    g.fillStyle(SUN.rim, 1);
    g.fillCircle(cx, cy, SUN.radius);
    g.fillStyle(SUN.core, 1);
    g.fillCircle(cx, cy, SUN.radius * 0.78);
  }

  // -----------------------------------------------------------
  // Silhouette generation (city / mountains / spires)
  // -----------------------------------------------------------
  buildSilhouettePanels(){
    return SILHOUETTE_LAYERS.map((layer) => [
      this.buildCityPanel(layer.heightRatio),
      this.buildMountainPanel(layer.heightRatio),
      this.buildSpirePanel(layer.heightRatio),
    ]);
  }

  buildCityPanel(heightRatio){
    const shapes = [];
    const panelH = this.H * heightRatio;
    let x = 0;
    while (x < this.W){
      const w = 18 + Math.random() * 34;
      const h = panelH * (0.35 + Math.random() * 0.65);
      shapes.push({ type: 'rect', x, y: this.H - h, w, h });
      if (Math.random() < 0.5){
        shapes.push({ type: 'rect', x: x + w/2 - 2, y: this.H - h - 8, w: 4, h: 8 });
      }
      x += w + (Math.random() * 6 - 2);
    }
    return { shapes };
  }

  buildMountainPanel(heightRatio){
    const shapes = [];
    const panelH = this.H * heightRatio;
    let x = 0;
    while (x < this.W + 20){
      const peakX = x + 40 + Math.random() * 40;
      const peakY = this.H - panelH * (0.55 + Math.random() * 0.45);
      const rightX = peakX + 50 + Math.random() * 40;
      shapes.push({ type: 'tri', p1: {x, y: this.H}, p2: {x: peakX, y: peakY}, p3: {x: rightX, y: this.H} });
      x = rightX - 10;
    }
    return { shapes };
  }

  buildSpirePanel(heightRatio){
    const shapes = [];
    const panelH = this.H * heightRatio;
    let x = 0;
    while (x < this.W){
      const w = 6 + Math.random() * 10;
      const h = panelH * (0.5 + Math.random() * 0.5);
      shapes.push({ type: 'tri',
        p1: { x, y: this.H },
        p2: { x: x + w/2, y: this.H - h },
        p3: { x: x + w, y: this.H },
      });
      shapes.push({ type: 'rect', x: x + w/3, y: this.H - h*0.3, w: w/3, h: h*0.3 });
      x += w + 20 + Math.random() * 30;
    }
    return { shapes };
  }

  drawSilhouettes(){
    const g = this.silhouetteGfx;
    g.clear();

    SILHOUETTE_LAYERS.forEach((layer, layerIdx) => {
      g.fillStyle(layer.color, layer.alpha);
      const panels = this.silhouettePanels[layerIdx];
      const offset = this.silhouetteOffsets[layerIdx];
      const panelCount = panels.length;
      const shift = Math.floor(-offset / this.W);
      for (let i = 0; i < 3; i++){
        const panel = panels[((shift + i) % panelCount + panelCount) % panelCount];
        const dx = (offset % this.W) + i * this.W;
        this.drawPanel(g, panel, dx);
      }
    });
  }

  drawPanel(g, panel, dx){
    for (const s of panel.shapes){
      if (s.type === 'rect'){
        g.fillRect(s.x + dx, s.y, s.w, s.h);
      } else if (s.type === 'tri'){
        g.fillTriangle(
          s.p1.x + dx, s.p1.y,
          s.p2.x + dx, s.p2.y,
          s.p3.x + dx, s.p3.y,
        );
      }
    }
  }

  // -----------------------------------------------------------
  // Per-frame
  // -----------------------------------------------------------
  update(scrollSpeed){
    // Silhouettes
    for (let i = 0; i < SILHOUETTE_LAYERS.length; i++){
      this.silhouetteOffsets[i] -= scrollSpeed * SILHOUETTE_LAYERS[i].parallax;
      if (this.silhouetteOffsets[i] < -this.W * 10000) this.silhouetteOffsets[i] += this.W;
    }
    this.drawSilhouettes();

    // Stars (slow drift, only in upper sky)
    const sg = this.starsGfx;
    sg.clear();
    for (const s of this.stars){
      s.x -= s.speed * scrollSpeed * 0.005;
      s.tw += 0.04;
      if (s.x < -5){
        s.x = this.W + 5;
        s.y = Math.random() * this.H * STAR_MAX_Y_RATIO;
      }
      const alpha = 0.3 + Math.sin(s.tw) * 0.25;
      sg.fillStyle(0xffffff, alpha);
      sg.fillCircle(s.x, s.y, s.r);
    }
  }
}