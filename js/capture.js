/* ============================================================
 * capture.js — 采集层
 * 摄像头（人脸关键点 / blendshapes / 视线 / 头部姿态）
 * 麦克风（音量 / 音高 / 抖动 / 语速 / 频谱质心）
 * 语音识别（Web Speech API，中文）
 * 全部本地处理，不上传任何数据。
 * ============================================================ */
/* MediaPipe 资源解析：优先本地 vendor/（离线可用）；
 * 本地不存在时（如 GitHub Pages 部署，仓库不含 18MB 二进制）自动回退 CDN */
const CDN_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const CDN_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const CDN_BUNDLE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

let _vision = null;
async function loadVision() {
  if (_vision) return _vision;
  const local = await fetch("vendor/face_landmarker.task", { method: "HEAD" })
    .then(r => r.ok).catch(() => false);
  _vision = {
    local,
    mod: local
      ? await import("../vendor/vision_bundle.mjs")
      : await import(/* @vite-ignore */ CDN_BUNDLE),
  };
  return _vision;
}

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export class DataCapture {
  constructor(opts = {}) {
    this.onFrame = opts.onFrame || (() => {});
    this.onFace = opts.onFace || (() => {});
    this.onStatus = opts.onStatus || (() => {});
    this.onTranscript = opts.onTranscript || (() => {});
    this.running = false;
    this.history = [];        // 10Hz 采样帧
    this.finalText = "";      // 识别出的完整文本
    this.interimText = "";
    this.t0 = 0;
    this._prevLandmarks = null;
    this._blinkState = false;
    this._blinkCount = 0;
    this._lastSample = 0;
    this._pitches = [];
    this._voicedPrev = false;
    this._onsets = [];        // 语音起始时间戳(ms)
    this._facePresent = false;
    this.stream = null;
    this.faceLandmarker = null;
    this.faceOk = false;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: "user" },
      audio: { echoCancellation: true, noiseSuppression: false },
    });
    this.onStatus("cam", "已开启");

    this.video = document.createElement("video");
    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.playsInline = true;
    await this.video.play();
    this.onStatus("cam", "已开启 · 播放中");

    await this._initAudio();
    this._initASR();
    this._initFace(); // 不阻塞：失败也可用纯语音模式

    this.running = true;
    this.t0 = performance.now();
    this._loop();
  }

  /* ---------- 音频 ---------- */
  async _initAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AC();
    await this.audioCtx.resume();
    const src = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0;
    src.connect(this.analyser);
    this.timeBuf = new Float32Array(this.analyser.fftSize);
    this.freqBuf = new Uint8Array(this.analyser.frequencyBinCount);
    this.onStatus("mic", "已开启");
  }

  /* ---------- 语音识别 ---------- */
  _initASR() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { this.onStatus("asr", "不支持（关键词分析将受限）"); return; }
    this.asr = new SR();
    this.asr.lang = "zh-CN";
    this.asr.continuous = true;
    this.asr.interimResults = true;
    this.asr.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this.finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      this.interimText = interim;
      this.onTranscript(this.finalText, interim);
    };
    this.asr.onerror = (e) => this.onStatus("asr", "错误:" + e.error);
    this.asr.onend = () => { if (this.running) { try { this.asr.start(); } catch (_) {} } };
    try { this.asr.start(); this.onStatus("asr", "聆听中"); }
    catch (_) { this.onStatus("asr", "启动失败"); }
  }

  /* ---------- 人脸模型 ---------- */
  async _initFace() {
    try {
      const { local, mod } = await loadVision();
      const { FaceLandmarker, FilesetResolver } = mod;
      const fileset = await FilesetResolver.forVisionTasks(local ? "vendor/wasm" : CDN_WASM);
      const opts = {
        baseOptions: { modelAssetPath: local ? "vendor/face_landmarker.task" : CDN_MODEL, delegate: "GPU" },
        runningMode: "VIDEO", numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false,
      };
      try { this.faceLandmarker = await FaceLandmarker.createFromOptions(fileset, opts); }
      catch (_) {
        opts.baseOptions.delegate = "CPU";
        this.faceLandmarker = await FaceLandmarker.createFromOptions(fileset, opts);
      }
      this.faceOk = true;
      this.onStatus("face", local ? "已加载 · 本地模型" : "已加载 · CDN 模型");
    } catch (err) {
      this.onStatus("face", "加载失败（纯语音模式）");
    }
  }

  /* ---------- 主循环 ---------- */
  _loop() {
    if (!this.running) return;
    const now = performance.now();

    // --- 音频特征 ---
    let rms = 0, pitch = 0, clarity = 0, centroid = 0;
    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(this.timeBuf);
      const buf = this.timeBuf;
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      rms = Math.sqrt(s / buf.length);
      const pr = this._detectPitch(buf, this.audioCtx.sampleRate);
      pitch = pr.pitch; clarity = pr.clarity;
      this.analyser.getByteFrequencyData(this.freqBuf);
      let num = 0, den = 0;
      for (let i = 0; i < this.freqBuf.length; i++) { num += i * this.freqBuf[i]; den += this.freqBuf[i]; }
      centroid = den > 0 ? (num / den) / this.freqBuf.length : 0;
    }
    const voiced = clarity > 0.45 && rms > 0.012;
    if (voiced && !this._voicedPrev) this._onsets.push(now);
    this._voicedPrev = voiced;
    if (voiced && pitch > 0) { this._pitches.push(pitch); if (this._pitches.length > 200) this._pitches.shift(); }
    this._onsets = this._onsets.filter(t => now - t < 10000);

    // --- 人脸特征 ---
    let face = null;
    if (this.faceLandmarker && this.video.readyState >= 2) {
      try {
        const res = this.faceLandmarker.detectForVideo(this.video, now);
        if (res.faceLandmarks && res.faceLandmarks.length) {
          face = this._faceFeatures(res.faceLandmarks[0], res.faceBlendshapes?.[0]?.categories || []);
          this._facePresent = true;
          this.onFace(res.faceLandmarks[0]);
        } else { this._facePresent = false; this._prevLandmarks = null; }
      } catch (_) { /* 忽略单帧错误 */ }
    }

    // --- 10Hz 采样 ---
    if (now - this._lastSample >= 100) {
      this._lastSample = now;
      const frame = {
        t: (now - this.t0) / 1000,
        rms, pitch, clarity, centroid, voiced,
        blinkRate: this._blinkRate(),
        speechRate: this._onsets.length / 10,
        smile: face?.smile ?? null, frown: face?.frown ?? null,
        browDown: face?.browDown ?? null, jawOpen: face?.jawOpen ?? null,
        mouthPress: face?.mouthPress ?? null,
        gazeX: face?.gazeX ?? null, gazeY: face?.gazeY ?? null,
        yaw: face?.yaw ?? null, pitchH: face?.pitchH ?? null,
        faceScale: face?.faceScale ?? null,
        motion: face?.motion ?? 0,
        facePresent: this._facePresent && !!face,
        asrLen: this.finalText.length + this.interimText.length,
      };
      this.history.push(frame);
      if (this.history.length > 4000) this.history.shift();
      this.onFrame(frame, this);
    }
    requestAnimationFrame(() => this._loop());
  }

  _faceFeatures(lm, cats) {
    const bs = {};
    for (const c of cats) bs[c.categoryName] = c.score;
    const g = (n) => bs[n] || 0;
    const avg = (a, b) => (g(a) + g(b)) / 2;

    // 虹膜视线（478 点模型：468-472 左眼，473-477 右眼）
    const irisAvg = (idx) => {
      let x = 0, y = 0;
      for (const i of idx) { x += lm[i].x; y += lm[i].y; }
      return { x: x / idx.length, y: y / idx.length };
    };
    const lIris = irisAvg([468, 469, 470, 471, 472]);
    const rIris = irisAvg([473, 474, 475, 476, 477]);
    const gazeX = clamp(
      ((lIris.x - lm[33].x) / Math.max(1e-4, lm[133].x - lm[33].x) - 0.5 +
       (rIris.x - lm[362].x) / Math.max(1e-4, lm[263].x - lm[362].x) - 0.5) / 2 * 2.2
    , -1, 1);
    const gazeY = clamp(
      ((lIris.y - lm[159].y) / Math.max(1e-4, lm[145].y - lm[159].y) - 0.5 +
       (rIris.y - lm[386].y) / Math.max(1e-4, lm[374].y - lm[386].y) - 0.5) / 2 * 2.2
    , -1, 1);

    // 头部姿态（粗略但稳定）
    const midEyeX = (lm[33].x + lm[263].x) / 2;
    const midEyeY = (lm[159].y + lm[386].y) / 2;
    const faceW = Math.max(1e-4, lm[263].x - lm[33].x);
    const faceH = Math.max(1e-4, lm[152].y - lm[10].y);
    const yaw = clamp((lm[1].x - midEyeX) / (faceW * 0.5) * 0.9, -1, 1);
    const pitchH = clamp((lm[1].y - midEyeY) / (faceH * 0.5) * 0.9, -1, 1);

    // 运动能量
    let motion = 0;
    if (this._prevLandmarks) {
      const step = 8;
      let acc = 0, n = 0;
      for (let i = 0; i < lm.length; i += step) {
        acc += Math.abs(lm[i].x - this._prevLandmarks[i].x) + Math.abs(lm[i].y - this._prevLandmarks[i].y);
        n++;
      }
      motion = n ? (acc / n) * 1000 : 0;
    }
    this._prevLandmarks = lm;

    // 眨眼计数（带滞回）
    const blink = avg("eyeBlinkLeft", "eyeBlinkRight");
    if (blink > 0.62 && !this._blinkState) { this._blinkState = true; this._blinkCount++; }
    else if (blink < 0.32) this._blinkState = false;

    return {
      smile: avg("mouthSmileLeft", "mouthSmileRight"),
      frown: avg("mouthFrownLeft", "mouthFrownRight"),
      browDown: avg("browDownLeft", "browDownRight"),
      browInnerUp: g("browInnerUp"),
      eyeWide: avg("eyeWideLeft", "eyeWideRight"),
      jawOpen: g("jawOpen"),
      mouthPress: avg("mouthPressLeft", "mouthPressRight"),
      gazeX, gazeY, yaw, pitchH,
      faceScale: faceW,
      motion,
    };
  }

  _blinkRate() {
    const minutes = (performance.now() - this.t0) / 60000;
    return minutes > 0.02 ? this._blinkCount / minutes : 0;
  }

  /* 自相关基频检测（60–600Hz） */
  _detectPitch(buf, sr) {
    const n = buf.length;
    let rms = 0;
    for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / n);
    if (rms < 0.008) return { pitch: 0, clarity: 0 };
    const W = 1024;
    const minLag = Math.max(2, Math.floor(sr / 600));
    const maxLag = Math.min(W - 1, Math.floor(sr / 60));
    let bestLag = -1, bestCorr = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let c = 0;
      for (let i = 0; i < W; i++) c += buf[i] * buf[i + lag];
      c /= W * rms * rms;
      if (c > bestCorr) { bestCorr = c; bestLag = lag; }
    }
    if (bestLag < 0 || bestCorr < 0.35) return { pitch: 0, clarity: bestCorr };
    return { pitch: sr / bestLag, clarity: bestCorr };
  }

  stop() {
    this.running = false;
    try { this.asr && this.asr.stop(); } catch (_) {}
    this.stream?.getTracks().forEach(t => t.stop());
    this.audioCtx?.close?.();
    return {
      history: this.history,
      finalText: this.finalText.trim(),
      duration: (performance.now() - this.t0) / 1000,
    };
  }
}
