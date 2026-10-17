/* ============================================================
 * report.js — 数据报告（JSON / HTML）
 * ============================================================ */
import { DIMS, ARCHETYPES } from "./signals.js";
import { SCENE_META } from "./palace/archetypes.js";

export function buildReportData(state) {
  const { model, match, archetypeId, durationSec, timestamp } = state;
  const arch = ARCHETYPES.find(a => a.id === archetypeId) || ARCHETYPES[0];
  return {
    meta: {
      tool: "心象宫殿 Palace of Mind",
      version: "1.0",
      time: new Date(timestamp || Date.now()).toLocaleString("zh-CN"),
      signalSource: model.source === "live" ? "摄像头+麦克风实时采集" : "演示模式手动参数",
      durationSec,
      disclaimer: "本报告为行为信号的隐喻化可视化，非心理诊断，不能读取思想。",
    },
    dimensions: DIMS.map(d => ({ key: d.key, name: d.name, desc: d.desc, value: +(model.dims[d.key] ?? 0).toFixed(3) })),
    attentionMap: model.attention.map(v => +v.toFixed(3)),
    keywords: model.keywords || {},
    transcript: model.transcript || "",
    aggregates: model.aggregates || null,
    archetype: {
      id: arch.id, name: arch.name, tag: arch.tag,
      desc: SCENE_META[arch.id]?.desc || "",
      score: +(match?.list?.find(a => a.id === arch.id)?.score ?? 0).toFixed(3),
      distorted: !!match?.distorted,
      ranking: (match?.list || []).slice(0, 5).map(a => ({ id: a.id, name: a.name, score: +a.score.toFixed(3) })),
    },
  };
}

export function buildReportHTML(data) {
  const dimRows = data.dimensions.map(d => `
    <tr><td>${d.name}</td><td class="desc">${d.desc}</td>
    <td><div class="bar"><i style="width:${(d.value * 100).toFixed(1)}%"></i></div></td>
    <td class="num">${(d.value * 100).toFixed(0)}</td></tr>`).join("");
  const kw = Object.entries(data.keywords)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `<span class="kw">${k} ×${n}</span>`).join("") || "<span class='muted'>（无）</span>";
  const rank = data.archetype.ranking.map((r, i) =>
    `<tr class="${i === 0 ? "top" : ""}"><td>${i + 1}</td><td>${r.name}</td><td class="num">${(r.score * 100).toFixed(0)}%</td></tr>`).join("");
  const att = data.attentionMap.map(v =>
    `<div class="cell" style="background:rgba(217,35,46,${Math.min(1, v).toFixed(2)})"></div>`).join("");
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<title>心象宫殿报告 · ${data.archetype.name}</title>
<style>
body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;background:#f6f7f9;color:#191d24;max-width:860px;margin:24px auto;padding:0 18px;line-height:1.65}
h1{font-size:20px} h2{font-size:15px;color:#68707d;margin:22px 0 8px}
.card{background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:16px 18px;margin-bottom:14px}
table{width:100%;border-collapse:collapse;font-size:13px}
td{padding:6px 8px;border-bottom:1px solid #eef0f3}.desc{color:#68707d;font-size:12px}.num{text-align:right;font-variant-numeric:tabular-nums}
.bar{height:8px;background:#eceff3;border-radius:99px;overflow:hidden}.bar i{display:block;height:100%;background:#d9232e}
tr.top td{font-weight:700;color:#8f1420}
.kw{display:inline-block;background:#fdeef0;color:#8f1420;border:1px solid #f3c9ce;border-radius:99px;padding:2px 10px;font-size:12px;margin:2px}
.att{display:grid;grid-template-columns:repeat(3,34px);gap:4px}.cell{aspect-ratio:1;border-radius:6px;background:#eef0f3}
.muted{color:#68707d}.warn{background:#fdf6e9;border:1px solid #f3d9a8;color:#92400e;border-radius:10px;padding:10px 14px;font-size:12.5px}
.transcript{background:#fafbfc;border:1px solid #e4e7ec;border-radius:8px;padding:10px;font-size:12.5px;white-space:pre-wrap;max-height:180px;overflow:auto}
.meta{font-size:12px;color:#68707d}
</style></head><body>
<h1>◈ 心象宫殿 · 行为信号报告</h1>
<p class="meta">${data.meta.time} · ${data.meta.signalSource} · 短片 ${data.meta.durationSec}s</p>
<div class="warn">⚠️ ${data.meta.disclaimer}</div>
<h2>匹配心象世界</h2>
<div class="card"><b style="font-size:16px">${data.archetype.name}</b> <span class="muted">· ${data.archetype.tag}</span>
<p style="font-size:13px;margin-top:6px">${data.archetype.desc}</p>
<p class="meta">匹配度 ${(data.archetype.score * 100).toFixed(0)}% · ${data.archetype.distorted ? "达到显著扭曲阈值" : "未达阈值（演示渲染）"}</p>
<table>${rank}</table></div>
<h2>认知维度</h2>
<div class="card"><table>${dimRows}</table></div>
<h2>注意力分布（视线热区）</h2>
<div class="card"><div class="att">${att}</div></div>
<h2>价值关键词</h2>
<div class="card">${kw}</div>
<h2>语音转写</h2>
<div class="card"><div class="transcript">${(data.transcript || "（无）").replace(/</g, "&lt;")}</div></div>
<h2>声学聚合指标</h2>
<div class="card"><table>
${data.aggregates ? `<tr><td>音量 P90</td><td class="num">${data.aggregates.rmsP90.toFixed(3)}</td><td>平均音高</td><td class="num">${data.aggregates.pitchMean.toFixed(0)} Hz</td></tr>
<tr><td>音高波动</td><td class="num">${data.aggregates.pitchStd.toFixed(1)}</td><td>语速(次/10s)</td><td class="num">${data.aggregates.speechRate.toFixed(1)}</td></tr>
<tr><td>眨眼(次/分)</td><td class="num">${data.aggregates.blinkRate.toFixed(0)}</td><td>注视镜头占比</td><td class="num">${(data.aggregates.gazeAtCam * 100).toFixed(0)}%</td></tr>` : "<tr><td colspan='4' class='muted'>（演示模式无原始数据）</td></tr>"}
</table></div>
</body></html>`;
}
