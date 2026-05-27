Page({
  data: {
    size: 4,
    time: 0,
    timeStr: '00:00',
    moves: 0
  },

  onLoad(options) {
    const size = parseInt(options.size) || 4;
    const time = parseInt(options.time) || 0;
    const moves = parseInt(options.moves) || 0;
    const m = Math.floor(time / 60);
    const s = time % 60;
    this.setData({
      size, time, moves,
      timeStr: `${m}分${String(s).padStart(2, '0')}秒`
    });
  },

  onRetry() {
    wx.redirectTo({
      url: `/pages/huarongDao/game/game?size=${this.data.size}`
    });
  },

  onBackMenu() {
    wx.navigateBack({ delta: 2 });
  }
});
