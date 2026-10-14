App({
  globalData: {
    // 采集会话状态：贯穿四个 tab 的核心数据
    session: {
      startedAt: 0,
      daysTracked: 21,
      hoursCaptured: 186.5,
      samples: 4820,
      audioChunks: 12900,
      frames: 96400
    },
    // 潜意识画像结果
    portrait: null,
    // 世界场景
    scenes: []
  },

  onLaunch() {
    // 载入预置画像（概念 demo 用模拟数据，真实产品由 AI 推理产出）
    this.globalData.portrait = require('./utils/portrait-data.js').PORTRAIT
    this.globalData.scenes = require('./utils/portrait-data.js').SCENES
  }
})
