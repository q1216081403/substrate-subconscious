const app = getApp()

Page({
  data: {
    authorized: false,
    recording: false,
    elapsed: '00:00',
    fps: 0,
    faceCount: 0,
    voice: 0,
    bars: [],
    liveTags: [],
    daysTracked: 0,
    hoursCaptured: 0,
    samples: 0,
    channels: [
      { k: 'gaze', n: '视线轨迹', d: '记录你看向哪里、看多久、在什么时刻移开', c: '#39E7FF' },
      { k: 'face', n: '面部微表情', d: '捕捉你在被观察时的细微反应，不识别身份', c: '#7B6BFF' },
      { k: 'voice', n: '语气与停顿', d: '语速、音高、沉默长度——情绪的声学特征', c: '#FFC14D' },
      { k: 'scene', n: '交互节奏', d: '谁先开口、谁在主导、对话的收束方式', c: '#FF7B6B' }
    ]
  },

  onLoad() {
    // 初始化波形条
    const bars = []
    for (let i = 0; i < 28; i++) bars.push(20)
    this.setData({ bars })
    this.syncSession()
  },

  onShow() {
    this.syncSession()
  },

  syncSession() {
    const s = app.globalData.session
    this.setData({
      daysTracked: s.daysTracked,
      hoursCaptured: s.hoursCaptured,
      samples: s.samples
    })
  },

  // ---- 权限 ----
  onAuthorize() {
    wx.authorize({
      scope: 'scope.camera',
      success: () => {
        wx.authorize({
          scope: 'scope.record',
          success: () => this.startAll(),
          fail: () => this.startAll() // 麦克风可选降级
        })
      },
      fail: () => {
        // 用户拒绝 → 演示模式，仍然展示完整链路
        wx.showModal({
          title: '演示模式',
          content: '未获得摄像头权限，将以模拟数据展示完整链路。',
          showCancel: false,
          success: () => this.startAll()
        })
      }
    })
  },

  startAll() {
    this.setData({ authorized: true, recording: true })
    this.syncSession()
    this.startTimer()
    this.startRealtime()
  },

  onCamError(e) {
    console.warn('camera error', e)
  },

  onToggle() {
    const rec = !this.data.recording
    this.setData({ recording: rec })
    if (rec) {
      this.startTimer()
      this.startRealtime()
    } else {
      // 冻结已累计时长
      this.baseElapsed = (this.baseElapsed || 0) + (Date.now() - this.tickBase)
      this.clearTimers()
    }
  },

  // ---- 计时 ----
  startTimer() {
    this.tickBase = this.tickBase || Date.now()
    this.baseElapsed = this.baseElapsed || 0
    this.timer = setInterval(() => {
      const sec = Math.floor((this.baseElapsed + (Date.now() - this.tickBase)) / 1000)
      this.setData({
        elapsed: `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
      })
      // 累计会话数据
      const s = app.globalData.session
      s.hoursCaptured = +(s.hoursCaptured + 1 / 3600).toFixed(2)
      s.samples += 1
      this.syncSession()
    }, 1000)
  },

  clearTimers() {
    if (this.timer) clearInterval(this.timer)
    if (this.realtime) clearInterval(this.realtime)
  },

  // ---- 实时分析模拟（真实产品由端侧模型推理）----
  startRealtime() {
    const TAG_POOL = [
      '视线停留 · 3.2s',
      '语气上升',
      '微表情 · 抑制',
      '停顿 · 1.8s',
      '主导权转移',
      '回避接触',
      '语速加快',
      '情绪峰值'
    ]

    this.realtime = setInterval(() => {
      const fps = 28 + Math.floor(Math.random() * 5)
      const faces = Math.random() > 0.35 ? 1 : (Math.random() > 0.6 ? 2 : 0)
      const voice = 110 + Math.floor(Math.random() * 90)

      // 波形
      const bars = this.data.bars.map(() => 15 + Math.floor(Math.random() * 85))
      if (!this.data.recording) return this.setData({ bars: bars.map(() => 10) })

      // 标签
      const tags = []
      const n = 1 + Math.floor(Math.random() * 3)
      for (let i = 0; i < n; i++) {
        const t = TAG_POOL[Math.floor(Math.random() * TAG_POOL.length)]
        if (tags.indexOf(t) === -1) tags.push(t)
      }

      this.setData({ fps, faceCount: faces, voice, bars, liveTags: tags })
    }, 180)
  },

  onUnload() { this.clearTimers() },
  onHide() { this.clearTimers() },

  onGoPortrait() {
    wx.switchTab({ url: '/pages/portrait/portrait' })
  }
})
