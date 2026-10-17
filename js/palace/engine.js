/* ============================================================
 * palace/engine.js — 宫殿渲染引擎
 * Three.js 渲染器 / 相机编排 / 灯光氛围 / 粒子 / 文本精灵
 * 复合画布（画面+字幕+标题）与 MediaRecorder 录制 / 合成配乐
 * ============================================================ */
import * as THREE from "three";

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const easeInOut = t => t * t * (3 - 2 * t);

/* ---------- 共享材质 ---------- */
export const MAT = {
  dark:    new THREE.MeshStandardMaterial({ color: 0x0d0e15, roughness: .92 }),
  stone:   new THREE.MeshStandardMaterial({ color: 0x2b2e3b, roughness: .85 }),
  stoneL:  new THREE.MeshStandardMaterial({ color: 0x3d4152, roughness: .8 }),
  red:     new THREE.MeshStandardMaterial({ color: 0xd9232e, roughness: .55, emissive: 0x55060f, emissiveIntensity: .35 }),
  redDeep: new THREE.MeshStandardMaterial({ color: 0x8f1420, roughness: .6 }),
  gold:    new THREE.MeshStandardMaterial({ color: 0xe8b64c, roughness: .35, emissive: 0x6b4d10, emissiveIntensity: .55 }),
  white:   new THREE.MeshStandardMaterial({ color: 0xeceae2, roughness: .7 }),
  black:   new THREE.MeshStandardMaterial({ color: 0x111218, roughness: .6 }),
  glass:   new THREE.MeshStandardMaterial({ color: 0x9fc4d8, transparent: true, opacity: .22, roughness: .05, metalness: .1 }),
  glowRed: new THREE.MeshBasicMaterial({ color: 0xff2a3a }),
  glowGold:new THREE.MeshBasicMaterial({ color: 0xffd166 }),
  screen:  new THREE.MeshBasicMaterial({ color: 0x0a1a0c }),
};

/* ---------- 文本精灵（中文标签） ---------- */
export function makeLabel(text, {
  size = 44, color = "#ffffff", bg = "rgba(10,10,16,.82)", border = "#d9232e",
  worldHeight = 0.5, depthTest = false,
} = {}) {
  const pad = size * 0.5;
  const cv = document.createElement("canvas");
  const cx = cv.getContext("2d");
  cx.font = `600 ${size}px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif`;
  const w = Math.ceil(cx.measureText(text).width) + pad * 2;
  const h = Math.ceil(size * 1.9);
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d");
  c.font = `600 ${size}px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif`;
  c.fillStyle = bg;
  c.beginPath();
  c.roundRect(0, 0, w, h, size * 0.35);
  c.fill();
  if (border) { c.strokeStyle = border; c.lineWidth = size * 0.09; c.stroke(); }
  c.fillStyle = color;
  c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText(text, w / 2, h / 2 + size * 0.04);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(worldHeight * w / h, worldHeight, 1);
  sp.renderOrder = 10;
  return sp;
}

/* ---------- 人形与变体 ---------- */
export function humanFigure({ color = 0x2b2e3b, scale = 1, robe = false } = {}) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: .8 });
  if (robe) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.5, 10), bodyMat);
    cone.position.y = 0.75;
    g.add(cone);
  } else {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.72, 4, 10), bodyMat);
    body.position.y = 0.82;
    g.add(body);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: .9 }));
  head.position.y = 1.52;
  g.add(head);
  g.scale.setScalar(scale);
  return g;
}

export function atmFigure({ scale = 1 } = {}) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x3a3f4d, roughness: .5, metalness: .4 }));
  box.position.y = 0.75;
  g.add(box);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.44), new THREE.MeshBasicMaterial({ color: 0x0a1a0c }));
  screen.position.set(0, 1.02, 0.26);
  g.add(screen);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.07, 0.06), MAT.glowRed);
  slot.position.set(0, 0.62, 0.26);
  g.add(slot);
  g.scale.setScalar(scale);
  g.userData.screen = screen;
  return g;
}

export function maskFigure({ scale = 1 } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.72, 4, 10), new THREE.MeshStandardMaterial({ color: 0x14151d, roughness: .9 }));
  body.position.y = 0.82; g.add(body);
  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: .35 }));
  mask.position.y = 1.52; g.add(mask);
  g.scale.setScalar(scale);
  return g;
}

/* ---------- 相机飞行路径 ---------- */
export function flyPath(keys) {
  const V = (a) => new THREE.Vector3(...a);
  const ks = keys.map(k => ({ t: k.t, pos: V(k.pos), look: V(k.look), fov: k.fov || 55 }));
  return (t) => {
    t = clamp(t, 0, 1);
    let i = 0;
    while (i < ks.length - 2 && t > ks[i + 1].t) i++;
    const a = ks[i], b = ks[Math.min(ks.length - 1, i + 1)];
    const u = easeInOut(clamp((t - a.t) / Math.max(1e-6, b.t - a.t)));
    return { pos: a.pos.clone().lerp(b.pos, u), look: a.look.clone().lerp(b.look, u), fov: lerp(a.fov, b.fov, u) };
  };
}

/* ============================================================
 * PalaceEngine
 * ============================================================ */
export class PalaceEngine {
  constructor(renderCanvas, overlayEl) {
    this.canvas = renderCanvas;
    this.overlayEl = overlayEl;
    this.duration = 30;
    this.playing = false;
    this.time = 0;
    this.lastTs = 0;
    this.distortion = 1;
    this.signals = { arousal: .3, valence: .5, dominance: .4, stress: .3 };
    this.onProgress = () => {};
    this.onEnded = () => {};
    this._recording = false;

    this._initThree();
    this._initComposite();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _initThree() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(1280, 720, false);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080c);
    this.scene.fog = new THREE.FogExp2(0x07080c, 0.02);

    this.camera = new THREE.PerspectiveCamera(55, 1280 / 720, 0.1, 400);

    const hemi = new THREE.HemisphereLight(0x8899bb, 0x1a0d12, 0.5);
    this.scene.add(hemi);
    this.keyLight = new THREE.SpotLight(0xffffff, 60, 0, 0.7, 0.4);
    this.keyLight.position.set(6, 14, 8);
    this.scene.add(this.keyLight);
    this.rimLight = new THREE.PointLight(0xd9232e, 30, 60);
    this.rimLight.position.set(-8, 5, -6);
    this.scene.add(this.rimLight);

    // 地面
    const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 48), new THREE.MeshStandardMaterial({ color: 0x0b0c12, roughness: .95 }));
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    const grid = new THREE.GridHelper(120, 60, 0x4a1620, 0x181a24);
    grid.position.y = 0.02;
    grid.material.transparent = true; grid.material.opacity = .5;
    this.scene.add(grid);

    // 漂浮尘埃
    const N = 500, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - .5) * 60;
      pos[i * 3 + 1] = Math.random() * 18;
      pos[i * 3 + 2] = (Math.random() - .5) * 60;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xc9a24a, size: .06, transparent: true, opacity: .5, depthWrite: false }));
    this.scene.add(this.dust);
  }

  _initComposite() {
    this.compCanvas = document.createElement("canvas");
    this.compCanvas.width = 1280; this.compCanvas.height = 720;
    this.compCtx = this.compCanvas.getContext("2d");
  }

  setSignals(dims) { Object.assign(this.signals, dims); }

  loadScene(sceneObj) {
    if (this.sceneObj?.group) this.scene.remove(this.sceneObj.group);
    this.sceneObj = sceneObj;
    if (sceneObj.group) this.scene.add(sceneObj.group);
    this.currentCaption = "";
    if (this.overlayEl) this.overlayEl.textContent = "";
  }

  play() { if (!this.playing) { this.playing = true; this.lastTs = performance.now(); } }
  pause() { this.playing = false; }
  seek(t) { this.time = t; this._renderFrame(0); }
  get progress() { return clamp(this.time / this.duration); }

  _loop(ts) {
    const dt = this.lastTs ? Math.min(0.1, (ts - this.lastTs) / 1000) : 0;
    this.lastTs = ts;
    if (this.playing) {
      this.time += dt;
      if (this.time >= this.duration) { this.time = this.duration; this.playing = false; this.onEnded(); }
    }
    this._renderFrame(dt);
    requestAnimationFrame(this._loop);
  }

  _renderFrame(dt) {
    const t = clamp(this.time / this.duration);
    const S = this.signals;

    // 氛围随信号变化
    const hot = S.arousal, cold = 1 - S.valence;
    this.keyLight.color.setHSL(lerp(0.58, 0.02, hot), 0.75, 0.55);
    this.keyLight.intensity = 40 + hot * 70 + S.dominance * 30;
    this.rimLight.color.setHSL(lerp(0.09, 0.99, cold), 0.8, 0.5);
    this.rimLight.intensity = 10 + S.stress * 45;
    this.scene.fog.density = 0.012 + S.stress * 0.05 + (1 - S.valence) * 0.02;
    this.dust.material.opacity = 0.25 + S.arousal * 0.4;

    if (this.sceneObj) {
      const env = { d: smoothstep(0.10, 0.55, t) * this.distortion, S, t };
      this.sceneObj.group && (this.sceneObj.group.visible = true);
      this.sceneObj.update?.(t, dt, env);

      // 相机
      const cam = this.sceneObj.camera ? this.sceneObj.camera(t, env) : { pos: new THREE.Vector3(0, 3, 10), look: new THREE.Vector3(0, 1.5, 0), fov: 55 };
      const shake = (0.15 + S.arousal * 0.9) * (this.playing ? 1 : 0.2);
      this.camera.position.set(
        cam.pos.x + (Math.random() - .5) * shake * 0.05,
        cam.pos.y + (Math.random() - .5) * shake * 0.05,
        cam.pos.z + (Math.random() - .5) * shake * 0.05);
      this.camera.lookAt(cam.look);
      this.camera.fov = cam.fov + S.arousal * 4;
      this.camera.updateProjectionMatrix();

      // 字幕
      const script = this.sceneObj.script || [];
      const line = script.find(l => t >= l.t0 && t < l.t1);
      const cap = line ? line.text : "";
      if (cap !== this.currentCaption) {
        this.currentCaption = cap;
        if (this.overlayEl) this.overlayEl.textContent = cap;
      }
    }

    this.dust.rotation.y += dt * 0.02;
    this.renderer.render(this.scene, this.camera);

    // 复合画布（录制用）
    const c = this.compCtx;
    c.drawImage(this.renderer.domElement, 0, 0, 1280, 720);
    c.fillStyle = "rgba(7,8,12,.55)";
    c.fillRect(0, 620, 1280, 100);
    if (this.currentCaption) {
      c.font = '600 27px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
      c.fillStyle = "#fff"; c.textBaseline = "middle";
      const words = this.currentCaption.split("");
      let line = "", y = 662;
      for (const ch of words) {
        if (c.measureText(line + ch).width > 1160) { c.fillText(line, 60, y); y += 38; line = ch; }
        else line += ch;
      }
      c.fillText(line, 60, y);
    }
    // 标题与水印
    c.font = '600 20px "PingFang SC","Microsoft YaHei",sans-serif';
    c.fillStyle = "rgba(255,255,255,.85)";
    c.fillText(`◈ ${this.sceneObj?.title || "心象宫殿"}`, 40, 44);
    c.font = '400 15px "PingFang SC","Microsoft YaHei",sans-serif';
    c.fillStyle = "rgba(255,255,255,.5)";
    c.fillText("隐喻可视化 · 非心理诊断 · 本地生成", 40, 70);
    // 进度条
    c.fillStyle = "rgba(255,255,255,.18)"; c.fillRect(0, 716, 1280, 4);
    c.fillStyle = "#d9232e"; c.fillRect(0, 716, 1280 * this.progress, 4);

    this.onProgress(this.progress, this.currentCaption);
  }

  /* ---------- 录制 ---------- */
  startRecording({ duration = this.duration, music = true, micStream = null } = {}) {
    return new Promise((resolve, reject) => {
      if (this._recording) return reject(new Error("已在录制中"));
      const stream = this.compCanvas.captureStream(30);
      let synthNodes = null;
      if (music || micStream) {
        try {
          if (!this.synthCtx) this.synthCtx = new (window.AudioContext || window.webkitAudioContext)();
          this.synthCtx.resume();
          const dest = this.synthCtx.createMediaStreamDestination();
          const master = this.synthCtx.createGain(); master.gain.value = 0.9;
          master.connect(dest);
          if (music) synthNodes = this._startSynth(master);
          if (micStream) this.synthCtx.createMediaStreamSource(micStream).connect(master);
          dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
        } catch (_) { /* 无音频轨也继续录 */ }
      }
      const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(m => MediaRecorder.isTypeSupported(m)) || "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        synthNodes?.stop?.();
        this._recording = false;
        resolve(new Blob(chunks, { type: "video/webm" }));
      };
      rec.onerror = e => { this._recording = false; reject(e); };
      this._recording = true;
      this.seek(0); this.play();
      rec.start(200);
      this._stopRec = () => { try { rec.stop(); } catch (_) {} };
      this.onEnded = () => { if (this._recording) this._stopRec(); };
    });
  }

  stopRecording() { this._stopRec?.(); }

  /* 简易氛围配乐：低音 drone + 随觉醒度呼吸的脉冲 */
  _startSynth(out) {
    const ctx = this.synthCtx;
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(out);
    const filt = ctx.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 320; filt.Q.value = 2;
    filt.connect(g);
    const o1 = ctx.createOscillator(); o1.type = "sawtooth"; o1.frequency.value = 55;
    const o2 = ctx.createOscillator(); o2.type = "sawtooth"; o2.frequency.value = 55.6;
    const o3 = ctx.createOscillator(); o3.type = "sine"; o3.frequency.value = 27.5;
    [o1, o2, o3].forEach(o => { o.connect(filt); o.start(); });
    g.gain.exponentialRampToValueAtTime(0.10, ctx.currentTime + 3);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13 + this.signals.arousal * 0.5;
    const lg = ctx.createGain(); lg.gain.value = 0.045;
    lfo.connect(lg); lg.connect(g.gain); lfo.start();
    return { stop: () => { try { [o1, o2, o3, lfo].forEach(o => o.stop()); } catch (_) {} } };
  }
}
