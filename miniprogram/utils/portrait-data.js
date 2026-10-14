// 概念 demo 数据层
// PORTRAIT: 潜意识画像结论（真实产品由多模态模型推理产出）
// SCENES:   AI 具象化世界镜头脚本

const PORTRAIT = {
  user: { alias: 'SUBJECT-07', realName: '受试者', days: 21, confidence: 0.87 },
  coreFindings: [
    {
      id: 'utility',
      label: '功利性视角',
      score: 82,
      level: 'high',
      summary: '在 21 天观测中，视线停留与对话起点的触发条件高度集中于「对方能提供什么」，而非「对方是谁」。',
      evidence: [
        { scene: '同事 A 汇报工作', gaze: '1.2s', focus: '对方手中的报表', diverted: true },
        { scene: '朋友 B 倾诉烦恼', gaze: '0.4s', focus: '手机屏幕', diverted: true },
        { scene: '家人谈健康', gaze: '6.8s', focus: '对方面部', diverted: false }
      ],
      metaphor: '印钞机',
      metaphorDesc: '社交场合中，人被无意识抽象为「功能接口」——情绪是噪音，资源是信号。'
    },
    {
      id: 'hierarchy',
      label: '尺度错位',
      score: 68,
      level: 'mid',
      summary: '面对权威时姿态高度收缩，面对更弱者时姿态扩张，两者之间的自我坐标并不稳定。',
      evidence: [
        { scene: '上级指出问题', gaze: '0.2s', focus: '地面', diverted: true },
        { scene: '对晚辈说话', gaze: '4.1s', focus: '对方面部', diverted: false },
        { scene: '独处时', gaze: '—', focus: '自身', diverted: false }
      ],
      metaphor: '蝼蚁',
      metaphorDesc: '世界被感知为一张巨大的电路板，而自己与他人都是板上的微小节点。'
    },
    {
      id: 'consumption',
      label: '消耗式节奏',
      score: 74,
      level: 'high',
      summary: '进食、通勤、等待等场景下存在明显的重复性行为闭环，缺少无目的的停留。',
      evidence: [
        { scene: '工作日午餐', gaze: '12min', focus: '食物/手机', diverted: true },
        { scene: '通勤地铁', gaze: '34min', focus: '手机', diverted: true },
        { scene: '周末', gaze: '—', focus: '任务清单', diverted: true }
      ],
      metaphor: '吃饭机器',
      metaphorDesc: '一天被切成若干「功能格」，每个格子都要被填满，而不是被体验。'
    },
    {
      id: 'warmth',
      label: '低温共情',
      score: 41,
      level: 'low',
      summary: '对情绪的识别准确但响应延迟——情绪被「读懂」之后并未转化为行动。',
      evidence: [
        { scene: '他人情绪峰值', gaze: '识别准确', focus: '—', diverted: false },
        { scene: '可介入窗口', gaze: '0 次', focus: '—', diverted: true }
      ],
      metaphor: '隔着一层玻璃',
      metaphorDesc: '能看见温度，却感受不到温度——感知与反应之间有一段被数据化的距离。'
    }
  ],
  dimensions: [
    { name: '功利性', value: 82 },
    { name: '共情度', value: 41 },
    { name: '控制感', value: 76 },
    { name: '攻击性', value: 58 },
    { name: '好奇心', value: 33 },
    { name: '钝感力', value: 64 }
  ]
}

const SCENES = [
  {
    id: 'atm',
    title: '把他看成印钞机',
    subtitle: 'SCENE 01 · 功能性社交',
    image: '/assets/world_atm.png',
    palette: '#39E7FF',
    target: '核心发现 · 功利性视角 82',
    prompt: 'A person at a desk surrounded by human figures rendered as wireframe machines with coins flowing into them',
    narration: '在这个场景里，其他人不是人，是接口。他们身上唯一被读取的部分，是「能给出什么」。',
    shot: [
      { t: '0.0s', c: '固定广角：主体坐在中央，四周围绕着逐渐成形的线框人形。' },
      { t: '2.1s', c: '推近：最近的人形开始齿轮化，硬币状光点向其汇入。' },
      { t: '4.3s', c: '环绕：所有人形同步机械化，唯主体保持人形且背对镜头。' }
    ]
  },
  {
    id: 'ant',
    title: '把世界看成电路板',
    subtitle: 'SCENE 02 · 尺度错位',
    image: '/assets/world_ant.png',
    palette: '#7B6BFF',
    target: '核心发现 · 尺度错位 68',
    prompt: 'Tiny human silhouettes on a vast glowing circuit board landscape, extreme scale',
    narration: '视点被拉到极高处。所有人都变成板上的微小节点，包括自己。',
    shot: [
      { t: '0.0s', c: '俯拍上升：地面显现为发光电路板纹理。' },
      { t: '2.0s', c: '急速拉远，人形缩至像素级，节点开始闪烁。' },
      { t: '4.2s', c: '定格：从上方看，所有节点亮度一致——包括自己。' }
    ]
  },
  {
    id: 'particle',
    title: '把自己看成消耗单元',
    subtitle: 'SCENE 03 · 消耗式节奏',
    image: '/assets/world_particle.png',
    palette: '#39E7FF',
    target: '核心发现 · 消耗式节奏 74',
    prompt: 'A silhouette made of glowing particles dissolving and streaming upward into machine monolith',
    narration: '身体由数据粒子构成，粒子不断从身上剥离、上升、被系统吞掉，然后回来继续。',
    shot: [
      { t: '0.0s', c: '中景：人形静立，粒子开始从轮廓剥离。' },
      { t: '2.2s', c: '粒子流上升，汇入画面上方的一块巨型方体。' },
      { t: '4.0s', c: '粒子回流补回人形，闭环完成，循环暗示。' }
    ]
  },
  {
    id: 'flow',
    title: '21 天的数据流',
    subtitle: 'SCENE 04 · 数据全景',
    image: '/assets/data_flow.png',
    palette: '#39E7FF',
    target: '原始数据 · 4820 样本',
    prompt: 'Layers of glowing waveform lines, audio spectrogram and face bounding boxes converging into one beam',
    narration: '这是被转化成「你」的原材料：21 天，186 小时，4820 个有效样本。',
    shot: [
      { t: '0.0s', c: '大量波形层叠浮现（音频频谱/人脸框/视线轨迹）。' },
      { t: '2.4s', c: '所有层向中心收束，形成一束垂直光柱。' },
      { t: '4.5s', c: '光柱展开为本 demo 的全部结论。' }
    ]
  }
]

module.exports = { PORTRAIT, SCENES }
