const app = getApp()

Page({
  data: {
    user: {},
    dimensions: [],
    findings: [],
    expanded: {},
    levelColor: {
      high: '#FF7B6B',
      mid: '#FFC14D',
      low: '#39E7FF'
    }
  },

  onLoad() {
    const p = app.globalData.portrait
    const s = app.globalData.session
    this.setData({
      user: {
        days: p.user.days,
        hours: s.hoursCaptured,
        confidence: p.user.confidence
      },
      dimensions: p.dimensions,
      findings: p.coreFindings,
      // 默认展开第一条
      expanded: { [p.coreFindings[0].id]: true }
    })
  },

  onToggle(e) {
    const id = e.currentTarget.dataset.i
    const key = this.data.findings[id].id
    this.setData({ [`expanded.${key}`]: !this.data.expanded[key] })
  },

  onGoWorld() {
    wx.switchTab({ url: '/pages/world/world' })
  }
})
