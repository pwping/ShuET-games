Page({
  data: {
    modes: [
      {
        key: 'number',
        name: '数字华容道',
        desc: '从小到大排列数字方块',
        icon: '🔢',
        bg: '#fff',
        iconBg: 'linear-gradient(135deg,#D946EF,#F0ABFC)'
      }
    ]
  },

  onModeTap(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === 'number') {
      wx.navigateTo({ url: '/pages/huarongDao/level/level' });
    }
  }
});
