/* ============================================================
 * main.js — 主程序 / UI 编排
 * ============================================================ */
import { DataCapture } from "./capture.js";
import { SignalModel, DIMS, ARCHETYPES } from "./signals.js";
import { PalaceEngine } from "./palace/engine.js";
import { buildScene, SCENE_META } from "./palace/archetypes.js";
import { buildVideoPrompt, buildShotList } from "./palacePrompt.js";
import { buildReportData, buildReportHTML } from "./report.js";

const $ = (id) => document.getElementById(id);
const state = {
  step: 1,
  capture: null,
  captureActive: false,
  model: new SignalModel(),
  match: null,
  archetypeId: "atm",
  autoArchetype: true,
  engine: null,
  scene: null,
  videoBlob: null,
  recording: false,
  liveTimer: null,
  capTimer: null,
};

/* ---------- 步骤导航 ---------- */
function goto(n) {
  state.step = n;
  ["consent", "capture", "signals", "palace", "export"].forEach((s, i) => {
    $(`step-${s}`).classList.toggle("hidden", i + 1 !== n);
  });
  document.querySelectorAll(".step").forEach(el => {
    const s = +el.dataset.step;
    el.classList.toggle("active", s === n);
    el.classList.toggle("done", s < n);
  });
  if (n === 4 && !state.engine) initEngine();
  if (n === 4) refreshPalace();
  if (n === 5) refreshExport();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- 1 同意 ---------- */
$("chk-consent").addEventListener("change", e => { $("btn-consent-agree").disabled = !e.target.checked; });
$("btn-consent-agree").addEventListener("click", () => goto(2));

/* ---------- 2 采集 ---------- */
const overlay = $("cam-overlay"), octx = overlay.getContext("2d");

function setStatus(k, v) { $(`st-${k}`).textContent = v; }

$("btn-start-capture").addEventListener("click", async () => {
  $("btn-start-capture").disabled = true;
  try {
    state.capture = new DataCapture({
      onStatus: setStatus,
      onTranscript: (fin, interim) => {
        $("transcript").textContent = (fin + (interim ? " …" + interim : "")) || "（聆听中…）";
        $("transcript").scrollTop = $("transcript").scrollHeight;
      },
      onFace: (lm) => drawFace(lm),
      onFrame: (frame) => updateLiveMetrics(frame),
    });
    await state.capture.start();
    state.captureActive = true;
    $("btn-stop-capture").disabled = false;
    $("cap-status").textContent = "采集中 · 本地处理";
    state.capTimer = setInterval(() => {
      const s = Math.floor((performance.now() - state.capture.t0) / 1000);
      $("cap-timer").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    }, 500);
    // 实时增量推断
    state.liveTimer = setInterval(() => {
      if (!state.captureActive || !state.capture) return;
      const h = state.capture.history.slice(-240);
      state.model.ingest(h, state.capture.finalText + " " + state.capture.interimText);
      if (state.step === 4 && state.engine && state.model.source === "live") {
        state.engine.setSignals(state.model.dims);
      }
    }, 2000);
  } catch (err) {
    setStatus("cam", "失败:" + (err.message || err));
    $("btn-start-capture").disabled = false;
    $("cap-status").textContent = "无法访问摄像头/麦克风，可改用演示模式";
  }
});

$("btn-stop-capture").addEventListener("click", () => {
  if (!state.capture) return;
  const data = state.capture.stop();
  state.captureActive = false;
  clearInterval(state.capTimer); clearInterval(state.liveTimer);
  $("btn-stop-capture").disabled = true;
  $("btn-start-capture").disabled = false;
  $("cap-status").textContent = `已停止 · ${data.duration.toFixed(0)}s`;
  state.model.ingest(data.history, data.finalText);
  analyze();
  goto(3);
});

$("btn-demo-mode").addEventListener("click", () => {
  state.model.reset();
  state.model.source = "manual";
  state.model.transcript = "";
  analyze();
  goto(3);
});

function drawFace(lm) {
  const w = overlay.width, h = overlay.height;
  octx.clearRect(0, 0, w, h);
  octx.save();
  octx.translate(w, 0); octx.scale(-1, 1);
  octx.fillStyle = "rgba(217,35,46,.75)";
  for (let i = 0; i < lm.length; i += 6) {
    octx.beginPath();
    octx.arc(lm[i].x * w, lm[i].y * h, 1.3, 0, Math.PI * 2);
    octx.fill();
  }
  // 虹膜
  octx.fillStyle = "rgba(255,209,102,.95)";
  for (const idx of [468, 473]) {
    octx.beginPath();
    octx.arc(lm[idx].x * w, lm[idx].y * h, 2.6, 0, Math.PI * 2);
    octx.fill();
  }
  octx.restore();
}

const LIVE_BARS = [
  { key: "rms", name: "音量", max: 0.16 },
  { key: "pitch", name: "音高 Hz", max: 320 },
  { key: "blinkRate", name: "眨眼/分", max: 35 },
  { key: "smile", name: "微笑", max: 0.7 },
  { key: "gazeX", name: "视线 X", max: 1 },
  { key: "motion", name: "动作", max: 6 },
];
function buildLiveMetrics() {
  $("live-metrics").innerHTML = LIVE_BARS.map(b =>
    `<div class="lm"><span>${b.name}</span><div class="bar"><i id="lm-${b.key}"></i></div></div>`).join("");
}
buildLiveMetrics();
function updateLiveMetrics(f) {
  for (const b of LIVE_BARS) {
    const v = Math.abs(f[b.key] ?? 0);
    const el = $(`lm-${b.key}`);
    if (el) el.style.width = Math.min(100, (v / b.max) * 100) + "%";
  }
  const meter = $("mic-meter");
  if (meter) meter.style.width = Math.min(100, ((f.rms ?? 0) / 0.2) * 100) + "%";
}

/* ---------- 3 分析 ---------- */
function analyze() {
  state.match = state.model.match();
  renderDims();
  renderAttention();
  renderKeywords();
  renderRanking();
  if (state.autoArchetype) {
    state.archetypeId = state.match.best.id;
  }
}

function renderDims() {
  $("dim-bars").innerHTML = DIMS.map(d => {
    const v = state.model.dims[d.key] ?? 0;
    return `<div class="dim"><div class="top"><span>${d.name} <small style="color:var(--muted)">${d.desc}</small></span><b>${(v * 100).toFixed(0)}</b></div>
    <div class="bar"><i style="width:${(v * 100).toFixed(0)}%"></i></div></div>`;
  }).join("");
}

function renderAttention() {
  const max = Math.max(...state.model.attention, 0.001);
  $("attention-grid").innerHTML = state.model.attention.map(v =>
    `<div class="att-cell" style="background:rgba(217,35,46,${(v / max * 0.9).toFixed(2)})"></div>`).join("");
}

function renderKeywords() {
  const kw = state.model.keywords || {};
  const NAMES = { trans: "交易/资源", human: "人味/情感", power: "权力/等级", suspicion: "动机揣测", greed: "索求/贪婪", manip: "操纵/布局", evalAnx: "评价焦虑", negative: "负性情绪", positive: "正向情感" };
  const hits = Object.entries(kw).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  $("kw-list").innerHTML = hits.length
    ? hits.map(([k, n]) => `<span class="kw ${["human", "positive"].includes(k) ? "n" : ""}">${NAMES[k] || k} ×${n}</span>`).join("")
    : "<span style='color:var(--muted);font-size:12.5px'>（未检测到显著价值关键词）</span>";
}

function renderRanking() {
  const list = state.match.list.slice(0, 5);
  $("arch-rank").innerHTML = list.map((a, i) => `
    <div class="ar ${i === 0 ? "top" : ""}">
      <div class="rk">${i + 1}</div>
      <div>${a.name}<small>${a.tag}</small></div>
      <div class="pct">${(a.score * 100).toFixed(0)}%</div>
    </div>`).join("");
  $("arch-note").textContent = state.match.distorted
    ? `最匹配：「${state.match.best.name}」。阈值 ${(state.match.threshold * 100).toFixed(0)}%，已达显著扭曲。请记住：这是隐喻，不是诊断。`
    : `最高分「${state.match.best.name}」也未达到显著扭曲阈值（${(state.match.threshold * 100).toFixed(0)}%）——信号更接近「现实视野」。仍可选择任意场景做概念演示。`;
}

$("btn-back-capture").addEventListener("click", () => goto(2));
$("btn-to-palace").addEventListener("click", () => goto(4));

/* ---------- 4 宫殿 ---------- */
function initEngine() {
  state.engine = new PalaceEngine($("palace-canvas"), $("palace-overlay"));
  buildArchetypeSelect();
  buildDemoSliders();
  // 跳转导出按钮
  const btn = document.createElement("button");
  btn.className = "btn ghost"; btn.id = "btn-to-export"; btn.textContent = "去导出 →";
  btn.addEventListener("click", () => goto(5));
  document.querySelector("#step-palace .palace-side .card:nth-child(2) .btn-col").appendChild(btn);
}

function buildArchetypeSelect() {
  const sel = $("arch-select");
  sel.innerHTML = `<option value="auto">🎯 自动匹配（${state.match?.best?.name || "分析结果"}）</option>` +
    ARCHETYPES.map(a => `<option value="${a.id}">${a.name} · ${a.tag}</option>`).join("");
  sel.value = "auto";
  sel.addEventListener("change", () => {
    state.autoArchetype = sel.value === "auto";
    if (!state.autoArchetype) state.archetypeId = sel.value;
    refreshPalace();
  });
}

function currentArchetypeId() {
  return state.autoArchetype ? (state.match?.best?.id || "atm") : state.archetypeId;
}

function refreshPalace() {
  const id = currentArchetypeId();
  state.archetypeId = id;
  const scene = buildScene(id);
  if (!scene) return;
  state.scene = scene;
  state.engine.loadScene(scene);
  state.engine.duration = +$("duration-select").value;
  state.engine.distortion = +$("distortion-slider").value / 100;
  if (state.model.source === "live") state.engine.setSignals(state.model.dims);
  const meta = ARCHETYPES.find(a => a.id === id);
  $("palace-title").textContent = `◈ ${scene.title} · 心象宫殿`;
  $("arch-desc").textContent = SCENE_META[id]?.desc || "";
  state.engine.pause();
  state.engine.seek(0);
  $("btn-play").textContent = "▶ 播放";
}

function buildDemoSliders() {
  const box = $("demo-sliders");
  DIMS.forEach(d => {
    const row = document.createElement("div");
    row.className = "slider-row";
    row.innerHTML = `<span>${d.name}</span><input type="range" min="0" max="100" value="${Math.round((state.model.dims[d.key] ?? 0.3) * 100)}" data-dim="${d.key}"><b>${Math.round((state.model.dims[d.key] ?? 0.3) * 100)}</b>`;
    box.appendChild(row);
    row.querySelector("input").addEventListener("input", e => {
      const v = +e.target.value;
      row.querySelector("b").textContent = v;
      state.model.setManual({ [d.key]: v / 100 });
      state.engine?.setSignals(state.model.dims);
    });
  });
}

$("duration-select").addEventListener("change", () => { if (state.engine) state.engine.duration = +$("duration-select").value; });
$("distortion-slider").addEventListener("input", e => {
  $("distortion-val").textContent = e.target.value + "%";
  if (state.engine) state.engine.distortion = +e.target.value / 100;
});
$("btn-play").addEventListener("click", () => {
  if (!state.engine) return;
  if (state.engine.playing) { state.engine.pause(); $("btn-play").textContent = "▶ 播放"; }
  else {
    if (state.engine.time >= state.engine.duration) state.engine.seek(0);
    state.engine.play(); $("btn-play").textContent = "⏸ 暂停";
  }
});

/* ---------- 录制 ---------- */
$("btn-record").addEventListener("click", async () => {
  if (state.recording) { state.engine.stopRecording(); return; }
  state.recording = true;
  $("btn-record").textContent = "● 录制中…（点击停止）";
  $("rec-status").textContent = "正在录制，请保持页面在前台…";
  const dur = +$("duration-select").value;
  try {
    const micStream = $("chk-mic-audio").checked && state.captureActive ? state.capture.stream : null;
    const blob = await state.engine.startRecording({
      duration: dur,
      music: $("chk-music").checked,
      micStream,
    });
    state.videoBlob = blob;
    $("rec-status").textContent = `录制完成 · ${(blob.size / 1048576).toFixed(1)} MB`;
    goto(5);
  } catch (err) {
    $("rec-status").textContent = "录制失败：" + (err.message || err);
  }
  state.recording = false;
  $("btn-record").textContent = "● 录制短片";
});

/* ---------- 5 导出 ---------- */
function refreshExport() {
  const data = buildReportData({
    model: state.model, match: state.match,
    archetypeId: state.archetypeId,
    durationSec: +$("duration-select").value,
    timestamp: Date.now(),
  });
  state.reportData = data;
  $("btn-dl-video").disabled = !state.videoBlob;
  $("report-preview").srcdoc = buildReportHTML(data);
}

function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 8000);
}

$("btn-dl-video").addEventListener("click", () => {
  if (state.videoBlob) download(state.videoBlob, `心象宫殿_${state.archetypeId}.webm`);
});
$("btn-dl-json").addEventListener("click", () => {
  download(new Blob([JSON.stringify(state.reportData, null, 2)], { type: "application/json" }), `palace_report_${state.archetypeId}.json`);
});
$("btn-dl-report").addEventListener("click", () => {
  download(new Blob([buildReportHTML(state.reportData)], { type: "text/html" }), `心象宫殿报告_${state.archetypeId}.html`);
});
$("btn-copy-prompt").addEventListener("click", () => copyText(buildVideoPrompt(state.archetypeId, state.model.dims, "zh"), "视频提示词已复制"));
$("btn-copy-shots").addEventListener("click", () => copyText(buildShotList(state.archetypeId, state.model.dims, +$("duration-select").value), "分镜脚本已复制"));

async function copyText(text, msg) {
  try { await navigator.clipboard.writeText(text); }
  catch (_) {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy"); ta.remove();
  }
  toast(msg);
}
function toast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = "position:fixed;top:18px;left:50%;transform:translateX(-50%);background:#191d24;color:#fff;padding:8px 18px;border-radius:99px;font-size:13px;z-index:99;box-shadow:0 4px 16px rgba(0,0,0,.25)";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

/* ---------- 启动 ---------- */
goto(1);
