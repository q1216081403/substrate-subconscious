const app = getApp()

Page({
  data: {
    scenes: [],
    active: 0,
    generating: false,
    genProgress: 0,
    genStep: ''
  },

  onLoad() {
    this.setData({ scenes: app.globalData.scenes })
  },

  onPick(e) {
    this.setData({ active: e.currentTarget.dataset.i })
  },

  onRegenerate() {
    const STEPS = [
      '解析 21 天行为序列…',
      '提取人格维度与隐喻…',
      '构建分镜脚本…',
      '文生视频渲染中…',
      '音画合成…'
    ]
    this.setData({ generating: true, genProgress: 0, genStep: STEPS[0] })

    let p = 0
    let i = 0
    this.genTimer = setInterval(() => {
      p += 4 + Math.random() * 6
      i = Math.min(Math.floor(p / 22), STEPS.length - 1)
      if (p >= 100) {
        p = 100
        clearInterval(this.genTimer)
        setTimeout(() => this.setData({ generating: false, active: 0 }), 500)
      }
      this.setData({ genProgress: Math.floor(p), genStep: STEPS[i] })
    }, 180)
  },

  onUnload() {
    if (this.genTimer) clearInterval(this.genTimer)
  }
})
