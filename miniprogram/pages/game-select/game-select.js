Page({
  data: {
    games: [
      {
        key: 'shuert',
        name: '舒尔特方格',
        desc: '经典专注力训练，按顺序点击数字',
        bg: '#fff',
        iconBg: 'linear-gradient(135deg,#059669,#6EE7B7)',
        grid: true
      },
      {
        key: 'klotski',
        name: '数字华容道',
        desc: '滑动方块，将数字按顺序排列',
        bg: '#fff',
        iconBg: 'linear-gradient(135deg,#D946EF,#F0ABFC)',
        grid: false
      }
    ],
    showAgeSelector: false
  },

  onLoad() {
    const saved = wx.getStorageSync('shult_age_group');
    if (!saved) {
      setTimeout(() => this.setData({ showAgeSelector: true }), 500);
    }
  },

  onAgeChanged() {
    this.setData({ showAgeSelector: false });
  },

  onGameTap(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'shuert') {
      wx.navigateTo({ url: '/pages/index/index' });
    } else if (key === 'klotski') {
      wx.navigateTo({ url: '/pages/huarongDao/level/level' });
    }
  }
});
