/* ============================================================================
   潜意识观察 · 内容模型
   ----------------------------------------------------------------------------
   设计原则（相对旧版的根本改动）：

   1. 不下人格判决，只揭示行为模式
      旧版：「把他看成印钞机」   → 新版：「朋友倾诉时，你平均 0.4 秒移开视线」

   2. 模式 = 行为 + 出现时机 + 变化趋势，三者缺一不可
      没有时间线就不叫模式，只叫标签

   3. 每条模式都标注「可见范围」
      自我观察 = 仅本人可见
      他人观察 = 观察者可见，需被观察者授权后才可共享
      这是产品能存在的伦理前提，不是可选项

   4. 区分「观察」与「被观察」
      系统从不假装自己是中立的。页面必须让人知道：谁在观察，观察者能看到什么
   ========================================================================= */

const SUBJECT = {
  alias: '受试者',
  selfMode: true,          // true = 自我观察；false = 他人观察
  days: 21,
  hours: 186.5,
  samples: 4820,
  consentGiven: true,       // 被观察者是否已授权他人查看
  sharedWith: [],           // 谁获得了查看权
  confidence: 0.87
}

// ---------------------------------------------------------------------------
// 观察关系：谁在观察，观察者能看到什么
// ---------------------------------------------------------------------------
const OBSERVATION_RELATIONS = {
  self: {
    id: 'self',
    label: '自我观察',
    icon: '我',
    who: '你',
    desc: '只有你能看到全部内容。不上传原始数据，随时可删除。',
    canSeeFull: true,
    canExport: false,
    privacyNote: '数据保存在本机，AI 推理在本机完成。'
  },
  watched: {
    id: 'watched',
    label: '被观察',
    icon: 'TA',
    who: '你被观察中',
    desc: '观察者能看到模式描述，但看不到原始画面与声音。',
    canSeeFull: false,
    canExport: false,
    privacyNote: '原始数据不向观察者开放，只输出统计后的行为模式。'
  },
  observer: {
    id: 'observer',
    label: '作为观察者',
    icon: '观察',
    who: '你在观察 TA',
    desc: '你能看到模式与时间线。你看不到 TA 的私密场景，TA 会知道你在看。',
    canSeeFull: false,
    canExport: true,
    privacyNote: 'TA 授权后才可见。撤回授权后历史可见性同时失效。'
  }
}

// ---------------------------------------------------------------------------
// 核心：行为模式
// 措辞准则 —— 描述「什么时候做了什么」，不给「你是什么人」
// ---------------------------------------------------------------------------
const PATTERNS = [
  {
    id: 'interrupt-latency',
    title: '倾诉时移开视线',
    // 一句话行为描述，替代旧版的隐喻标签
    behavior: '对方开始讲困扰时，你的视线平均在 0.4 秒后移开',
    // 出现时机 —— 模式的第一要素
    trigger: '触发条件：对方在表达负面情绪',
    scene: '朋友 B 倾诉烦恼 → 视线移向手机屏幕（0.4s）',
    // 变化趋势 —— 模式的第二要素，让它不像判决
    trend: { dir: 'stable', label: '21 天内稳定出现 14 次', pct: 67 },
    since: '第 8 天开始出现，此后未消失',
    exceptions: [
      { scene: '家人谈健康', detail: '视线停留 6.8 秒，是所有场景中最长的一次', turned: '不同' }
    ],
    // 可见范围 —— 伦理设计的落点
    visibility: { self: 'full', observer: 'summary' },
    // 替代旧版「印钞机」的东西：一个待验证的问题，不是结论
    question: '你会在什么时候，愿意一直看着一个人？'
  },
  {
    id: 'resource-gaze',
    title: '注意力落在对方携带物上',
    behavior: '对话开始时，你的视线平均先落在对方的手或桌面物品上，而非面部',
    trigger: '触发条件：对话刚开始的前 2 秒',
    scene: '同事 A 汇报工作 → 视线先落于报表（1.2s）后转开',
    trend: { dir: 'rising', label: '近 7 天出现频率上升 40%', pct: 40 },
    since: '第 3 天开始出现',
    exceptions: [
      { scene: '主动向对方提问时', detail: '视线直接对焦面部，无偏移', turned: '不同' }
    ],
    visibility: { self: 'full', observer: 'summary' },
    question: '你在看的是他，还是他带来的东西？'
  },
  {
    id: 'structured-leisure',
    title: '休息时段仍在执行清单',
    behavior: '本应无安排的时段，你的行为序列仍呈现任务化的节奏（列表→逐项→核对）',
    trigger: '触发条件：进入原本的休息时段',
    scene: '周末上午 → 视线在任务清单与实际进度间反复切换（4 小时）',
    trend: { dir: 'stable', label: '每周出现 3 次，未随时间减弱', pct: 75 },
    since: '第 1 天即存在',
    exceptions: [
      { scene: '与他人同行时', detail: '清单行为消失，转为对话', turned: '不同' }
    ],
    visibility: { self: 'full', observer: 'none' },
    question: '完全由你定义的时间，会是什么样？'
  },
  {
    id: 'emotion-latency',
    title: '识别情绪后延迟回应',
    behavior: '系统检测到你对他人的情绪波动有反应，但反应通常延迟 3 秒以上，或未转化为行动',
    trigger: '触发条件：对方情绪强度升高',
    scene: '他人情绪峰值 → 识别准确 → 介入 0 次',
    trend: { dir: 'improving', label: '近 5 天介入次数上升至 2 次', pct: 40 },
    since: '第 1 天存在，近 5 天出现变化',
    exceptions: [
      { scene: '关系亲近者', detail: '介入率显著更高', turned: '不同' }
    ],
    visibility: { self: 'full', observer: 'summary' },
    question: '「读懂」和「回应」，之间隔着什么？'
  }
]

// ---------------------------------------------------------------------------
// 维度图谱：措辞改为「倾向」而非「人格」
// ---------------------------------------------------------------------------
const DIMENSIONS = [
  { name: '功利倾向', value: 82, note: '注意力优先分配给可获得信息的对象' },
  { name: '共情表达', value: 41, note: '识别准确，但转化为行动的频率偏低' },
  { name: '掌控需求', value: 76, note: '倾向把不确定转为可规划事项' },
  { name: '直接表达', value: 58, note: '冲突场景下表达意愿中等' },
  { name: '开放程度', value: 33, note: '对未确定的开放话题较少自发探索' },
  { name: '节律稳定', value: 64, note: '日常行为节奏的一致性较高' }
]

// ---------------------------------------------------------------------------
// AI 场景：视频旁白也从「判决」改为「揭示」
// ---------------------------------------------------------------------------
const SCENES = [
  {
    id: 'gaze-away',
    no: '01',
    title: '倾诉发生的那 0.4 秒',
    subtitle: 'PATTERN 01 · 倾诉时移开视线',
    image: 'assets/world_atm.png',
    color: '#39E7FF',
    source: '来源 · 模式「倾诉时移开视线」· 14/21 天',
    // 旁白讲的是"发生了什么"，不是"你是什么人"
    narration:
      '这是你第 8 天到第 21 天反复出现的一个动作。' +
      '画面中的人正在讲一件困扰她的事。' +
      '对方的视线停留了 0.4 秒，然后移开。' +
      '这个动作在这 14 天里没有变化。',
    // 镜头脚本也改为纯记录式
    shots: [
      { t: '0.0s', c: '固定中景：一侧为正在倾诉的人，另一侧为注视方向。' },
      { t: '2.0s', c: '时间码浮现：00:00.4 —— 视线偏移发生。' },
      { t: '4.3s', c: '同一机位再次播放该片段，可见动作重复。' }
    ],
    prompt:
      'A quiet side view of one person speaking while another person listening, ' +
      'rendered as cyan wireframe, gaze direction shown as a thin light line that ' +
      'drifts away after a fraction of a second. Cold navy background, documentary framing.'
  },
  {
    id: 'circuit-board',
    no: '02',
    title: '你所处环境的尺度',
    subtitle: 'PATTERN 03 · 休息时段的执行清单',
    image: 'assets/world_ant.png',
    color: '#7B6BFF',
    source: '来源 · 模式「休息时段仍在执行清单」· 每周 3 次',
    narration:
      '这里没有出现任何一个人。' +
      '你把一段本该没有安排的时间，切成了可以逐项核对的格子。' +
      '放大后可以看到，每个格子里都有一个等待被完成的动作。',
    shots: [
      { t: '0.0s', c: '高空俯拍：网格状的地面，格子里有微弱光点。' },
      { t: '2.2s', c: '下降：光点是排队的动作，而非任意游走的人。' },
      { t: '4.5s', c: '定格：格子边界清晰，没有一处留白。' }
    ],
    prompt:
      'Abstract aerial view of a glowing circuit-like grid landscape, ' +
      'tiny orderly light points moving strictly along grid paths, ' +
      'no empty cells. Extreme scale contrast, cold indigo lighting.'
  },
  {
    id: 'consumption',
    no: '03',
    title: '一天被切分的方式',
    subtitle: 'PATTERN 02 · 注意力落在携带物上',
    image: 'assets/world_particle.png',
    color: '#FFC14D',
    source: '来源 · 模式「注意力落在对方携带物上」· 近 7 天上升 40%',
    narration:
      '这些是同一段时间里，你视线的落点。' +
      '大多数落点不在人脸上，而在人携带的物品上。' +
      '过去一周，这个比例上升了四成。',
    shots: [
      { t: '0.0s', c: '俯视：数个光点聚集在桌面前端而非面部区域。' },
      { t: '2.4s', c: '标注连线：光点与物品之间出现指向线。' },
      { t: '4.2s', c: '曲线叠加：右侧为最近 7 天的上升趋势。' }
    ],
    prompt:
      'Abstract data visualization of scattered light points clustering near ' +
      'inanimate objects rather than human figures, ' +
      'with thin annotation lines and a rising trend curve. Dark navy, cyan and amber.'
  },
  {
    id: 'field',
    no: '04',
    title: '21 天的原始数据',
    subtitle: 'RAW DATA · 21 天 / 186 小时 / 4820 样本',
    image: 'assets/data_flow.png',
    color: '#39E7FF',
    source: '来源 · 全部原始观测',
    narration:
      '这是上面那些结论的原材料。' +
      '21 天，186 小时，4820 个有效样本。' +
      '它不包含任何解释，只包含发生过的事。',
    shots: [
      { t: '0.0s', c: '多层波形与检测框逐层浮现。' },
      { t: '2.6s', c: '所有层向中心收束，压缩为一个点。' },
      { t: '4.5s', c: '该点展开，成为此前展示的四个场景。' }
    ],
    prompt:
      'Layers of glowing cyan waveform lines and face detection boxes converging ' +
      'into a single bright point in deep navy void. Data, not interpretation.'
  }
]

// ---------------------------------------------------------------------------
// 结束语：不是诊断结论，而是把问题交还给本人
// ---------------------------------------------------------------------------
const CLOSING = {
  summary:
    '这 21 天里，你的注意力在特定时刻有规律地偏移。' +
    '规律本身就是信息——它说明在这些时刻，你有一套稳定的处理方式。',
  // 关键：不下结论，把解释权交还
  handover: '这些模式本身不说明你好或不好。它们只是你每天都在用、却很少察觉的方式。',
  prompt: '如果你想继续观察，可以随时开始；也可以随时删除全部记录。'
}

module.exports = {
  SUBJECT,
  OBSERVATION_RELATIONS,
  PATTERNS,
  DIMENSIONS,
  SCENES,
  CLOSING
}
