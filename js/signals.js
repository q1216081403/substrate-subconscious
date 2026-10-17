/* ============================================================
 * signals.js — 信号推断层
 * 把原始行为帧聚合成心理学维度，并对 12 个心象世界原型打分。
 *
 * 重要声明：这里的每个维度都是「行为信号 + 语言统计」的粗略估算，
 * 宫殿是对它们的隐喻化渲染，不是心理诊断，也不能读取思想。
 * ============================================================ */

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const norm = (v, full) => clamp(v / full);

/* ---------- 十个可推断维度 ---------- */
export const DIMS = [
  { key: "arousal",       name: "唤醒度",     desc: "声音能量 · 动作 · 音高波动" },
  { key: "valence",       name: "情绪基调",   desc: "微笑 · 语调 · 用词色彩" },
  { key: "dominance",     name: "支配倾向",   desc: "音量 · 语速 · 直视 · 下颌" },
  { key: "stress",        name: "紧张防御",   desc: "眨眼 · 眉压 · 音高抖动 · 口误" },
  { key: "dehumanization",name: "人物化倾向", desc: "交易性语言占比 · 情感平淡" },
  { key: "power",         name: "权力崇拜",   desc: "等级 / 统治类词汇 · 支配" },
  { key: "suspicion",     name: "猜疑多虑",   desc: "动机揣测类词汇 · 视线回避" },
  { key: "greed",         name: "欲壑难填",   desc: "索求类词汇 · 负性情绪" },
  { key: "manipulation",  name: "操纵布局",   desc: "棋局 / 控制类词汇 · 支配" },
  { key: "evaluation",    name: "评价焦虑",   desc: "他人眼光类词汇 · 视线回避" },
];

/* ---------- 价值关键词词典 ---------- */
export const LEXICON = {
  trans: ["钱", "价格", "赚", "成本", "回报", "值", "资源", "利用", "有用", "利益", "绩效", "KPI", "kpi",
    "效率", "产能", "产量", "估值", "资产", "换", "买", "卖", "变现", "投产比", "数据"],
  human: ["感受", "开心", "辛苦", "谢谢", "喜欢", "关心", "心情", "梦想", "希望", "陪", "尊重",
    "温暖", "在乎", "舍不得", "心疼", "不容易"],
  power: ["王", "神", "统治", "臣服", "跪", "权力", "地位", "高贵", "低级", "崇拜", "听话", "我说了算",
    "必须", "老子", "天下", "诏", "册封", "加冕", "管理层", "层级"],
  suspicion: ["其实", "目的", "装", "背后", "监控", "骗", "心虚", "演", "话里有话", "试探", "别有用心",
    "阴", "陷阱", "演我", "演他", "八成", "说不定", "你以为"],
  greed: ["不够", "更多", "还要", "想要", "贪", "全部", "堆", "越来越", "奢侈品", "越多", "统统", "都要"],
  manip: ["布局", "棋", "棋子", "控制", "套路", "拿捏", "诱导", "牵引", "操盘", "落子", "算准", "predict",
    "预判", "利用", "提线", "木偶"],
  evalAnx: ["丢人", "怎么看", "别人怎么", "评分", "评价", "嘲笑", "议论", "眼光", "印象", "出丑", "尴",
    "尴", "会不会觉得", "背后说", "看我"],
  negative: ["烦", "恨", "讨厌", "恶心", "垃圾", "废", "去死", "崩", "烂", "该死", "受够", "绝望"],
  positive: ["好", "棒", "谢谢", "爱", "喜", "安心", "踏实", "温柔", "放心", "幸福", "笑", "感谢", "暖"],
};

/* ---------- 12 + 1 个心象世界原型 ---------- */
export const ARCHETYPES = [
  { id: "atm",       name: "人形提款机",   tag: "交易化认知",   weights: { dehumanization: .75, greed: .35, dominance: .2, valence: -.25 } },
  { id: "buffet",    name: "行走的自助餐", tag: "欲望工具化",   weights: { dehumanization: .55, greed: .55, manipulation: .25, valence: -.2 } },
  { id: "kingdom",   name: "公司王国",     tag: "等级秩序崇拜", weights: { power: .7, dominance: .45, manipulation: .3 } },
  { id: "antcity",   name: "蝼蚁城市",     tag: "个体价值归零", weights: { dehumanization: .7, power: .3, valence: -.3 } },
  { id: "chess",     name: "人形棋子",     tag: "操纵布局",     weights: { manipulation: .8, dominance: .45, power: .3 } },
  { id: "harvester", name: "人力收割机",   tag: "极端功利",     weights: { dehumanization: .65, power: .25, greed: .2 } },
  { id: "tribunal",  name: "全民审判庭",   tag: "评价焦虑",     weights: { evaluation: .8, stress: .45, suspicion: .3 } },
  { id: "deity",     name: "自封神明",     tag: "优越感膨胀",   weights: { power: .8, dominance: .5, valence: -.2 } },
  { id: "auction",   name: "灵魂拍卖场",   tag: "关系交易化",   weights: { dehumanization: .7, greed: .35, dominance: .2 } },
  { id: "glasscage", name: "透明牢笼",     tag: "极端猜疑",     weights: { suspicion: .8, stress: .55, evaluation: .3 } },
  { id: "void",      name: "欲望黑洞",     tag: "永不满足",     weights: { greed: .85, dehumanization: .3, valence: -.2 } },
  { id: "puppet",    name: "提线世界",     tag: "操控幻觉",     weights: { manipulation: .7, power: .35, dominance: .35 } },
];
export const REALITY = { id: "reality", name: "现实视野", tag: "未检出显著扭曲" };

const THRESHOLD = 0.32; // 低于此分数视为「现实视野」

/* ---------- 信号模型 ---------- */
export class SignalModel {
  constructor() {
    this.reset();
  }

  reset() {
    this.dims = {};
    for (const d of DIMS) this.dims[d.key] = 0.25;
    this.dims.valence = 0.5;
    this.attention = new Array(9).fill(0);
    this.keywords = {};
    this.transcript = "";
    this.aggregates = null;
    this.source = "manual"; // manual | live
  }

  /* 由采集历史聚合 → 维度 */
  ingest(history, transcript) {
    if (!history || history.length < 8) return false;
    this.source = "live";
    this.transcript = transcript || "";
    const voiced = history.filter(f => f.voiced);
    const withFace = history.filter(f => f.facePresent);

    const mean = (arr, f) => arr.reduce((s, x) => s + f(x), 0) / Math.max(1, arr.length);
    const p90 = (arr, f) => { const a = arr.map(f).sort((x, y) => x - y); return a[Math.floor(a.length * 0.9)] || 0; };

    const rmsP90 = p90(voiced.length ? voiced : history, f => f.rms);
    const pitchArr = voiced.map(f => f.pitch).filter(p => p > 0);
    const pitchMean = pitchArr.length ? mean(pitchArr, p => p) : 140;
    const pitchStd = pitchArr.length > 4
      ? Math.sqrt(mean(pitchArr, p => (p - pitchMean) ** 2)) : 25;
    const speechRate = mean(history, f => f.speechRate || 0);
    const blinkRate = withFace.length ? mean(withFace, f => f.blinkRate || 0) : 18;
    const motion = withFace.length ? mean(withFace, f => f.motion || 0) : 0;
    const smile = withFace.length ? mean(withFace, f => f.smile ?? 0) : 0;
    const frown = withFace.length ? mean(withFace, f => f.frown ?? 0) : 0;
    const browDown = withFace.length ? mean(withFace, f => f.browDown ?? 0) : 0;
    const mouthPress = withFace.length ? mean(withFace, f => f.mouthPress ?? 0) : 0;
    const smileVar = withFace.length ? Math.sqrt(mean(withFace, f => ((f.smile ?? 0) - smile) ** 2)) : 0;
    const disfluency = this._disfluencyRate(this.transcript);
    const gazeAtCam = withFace.length
      ? withFace.filter(f => Math.abs(f.gazeX ?? 1) < 0.35 && Math.abs(f.gazeY ?? 1) < 0.35).length / withFace.length
      : 0.5;
    const faceScale = withFace.length ? mean(withFace, f => f.faceScale ?? 0.15) : 0.15;

    // 关键词密度
    const kw = this._keywordDensity(this.transcript);
    const chars = Math.max(20, this.transcript.length);

    const senti = (kw.positive - kw.negative) / (kw.positive + kw.negative + 4);

    this.dims.arousal = clamp(0.40 * norm(rmsP90, 0.14) + 0.30 * norm(motion, 6) + 0.30 * norm(pitchStd, 55));
    this.dims.valence = clamp(0.5 + 1.1 * (smile - frown) + 0.35 * ((pitchMean - 140) / 140) + 0.5 * senti, 0, 1);
    this.dims.dominance = clamp(
      0.30 * norm(rmsP90, 0.14) + 0.20 * norm(speechRate, 3.5) + 0.25 * gazeAtCam +
      0.15 * (1 - norm(blinkRate, 35)) + 0.10 * norm(faceScale, 0.22));
    this.dims.stress = clamp(
      0.30 * norm(blinkRate, 32) + 0.25 * browDown + 0.25 * norm(this._jitter(history), 0.06) + 0.20 * norm(disfluency, 0.09));
    this.dims.dehumanization = clamp(0.55 * norm(kw.trans * 100 / chars, 6) + 0.45 * (1 - norm(smileVar, 0.10)));
    this.dims.power = clamp(0.60 * norm(kw.power * 100 / chars, 4) + 0.40 * this.dims.dominance);
    this.dims.suspicion = clamp(0.60 * norm(kw.suspicion * 100 / chars, 4) + 0.20 * (1 - gazeAtCam) + 0.20 * this.dims.stress);
    this.dims.greed = clamp(0.70 * norm(kw.greed * 100 / chars, 4) + 0.30 * (1 - this.dims.valence));
    this.dims.manipulation = clamp(0.75 * norm(kw.manip * 100 / chars, 3) + 0.25 * this.dims.dominance);
    this.dims.evaluation = clamp(0.65 * norm(kw.evalAnx * 100 / chars, 3) + 0.35 * (1 - gazeAtCam));

    this._attention(withFace);
    this.keywords = kw;
    this.aggregates = { rmsP90, pitchMean, pitchStd, speechRate, blinkRate, motion, smile, frown, browDown, gazeAtCam, chars };
    return true;
  }

  /* 演示模式：手动设定维度 */
  setManual(partial) {
    this.source = "manual";
    Object.assign(this.dims, partial);
  }

  _jitter(history) {
    const v = history.filter(f => f.voiced && f.pitch > 0);
    if (v.length < 5) return 0.02;
    let acc = 0;
    for (let i = 1; i < v.length; i++) acc += Math.abs(v[i].pitch - v[i - 1].pitch) / v[i - 1].pitch;
    return acc / (v.length - 1);
  }

  _disfluencyRate(text) {
    const m = text.match(/(呃|嗯|那个那个|就是就是|然后然后|啊这)/g);
    return m ? m.length / Math.max(20, text.length) : 0;
  }

  _keywordDensity(text) {
    const out = {};
    for (const [k, words] of Object.entries(LEXICON)) {
      out[k] = words.reduce((n, w) => n + (text.split(w).length - 1), 0);
    }
    return out;
  }

  _attention(frames) {
    const grid = new Array(9).fill(0);
    for (const f of frames) {
      const gx = f.gazeX ?? 0, gy = f.gazeY ?? 0;
      const cx = gx < -0.3 ? 0 : gx > 0.3 ? 2 : 1;
      const cy = gy < -0.3 ? 0 : gy > 0.3 ? 2 : 1;
      grid[cy * 3 + cx] += 1;
    }
    const max = Math.max(1e-6, ...grid);
    // 指数衰减平滑，让热点随时间缓慢消退
    this.attention = this.attention.map((v, i) => clamp(v * 0.85 + (grid[i] / max) * 0.15 * 3));
  }

  /* 原型匹配：返回带分数的排序列表 */
  match() {
    const scored = ARCHETYPES.map(a => {
      let s = 0, wsum = 0;
      for (const [k, w] of Object.entries(a.weights)) {
        s += (w < 0 ? (1 - this.dims[k]) : this.dims[k]) * Math.abs(w);
        wsum += Math.abs(w);
      }
      const score = clamp(s / wsum);
      return { ...a, score };
    }).sort((x, y) => y.score - x.score);
    const best = scored[0];
    return { list: scored, best, distorted: best.score >= THRESHOLD, threshold: THRESHOLD };
  }
}
