const app = getApp()

Page({
  data: {},

  onLoad() {},

  onStart() {
    app.globalData.session.startedAt = Date.now()
    wx.switchTab({ url: '/pages/capture/capture' })
  }
})
