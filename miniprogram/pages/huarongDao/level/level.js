Page({
  data: {
    levels: [
      { key: '3', name: '入门', size: 3, icon: '✦', iconBg: 'linear-gradient(135deg,#A855F7,#C4B5FD)' },
      { key: '4', name: '初阶', size: 4, icon: '◇', iconBg: 'linear-gradient(135deg,#8B5CF6,#C4B5FD)' },
      { key: '5', name: '标准', size: 5, icon: '△', iconBg: 'linear-gradient(135deg,#7C3AED,#C4B5FD)' },
      { key: '6', name: '中阶', size: 6, icon: '⬡', iconBg: 'linear-gradient(135deg,#6366F1,#C4B5FD)' },
      { key: '7', name: '高阶', size: 7, icon: '✦', iconBg: 'linear-gradient(135deg,#4F46E5,#A5B4FC)' },
      { key: '8', name: '极限', size: 8, icon: '◆', iconBg: 'linear-gradient(135deg,#4338CA,#A5B4FC)' },
      { key: '9', name: '疯狂', size: 9, icon: '⬢', iconBg: 'linear-gradient(135deg,#3730A3,#A5B4FC)' },
      { key: '10', name: '宗师', size: 10, icon: '⬡', iconBg: 'linear-gradient(135deg,#312E81,#A5B4FC)' }
    ]
  },

  onLevelTap(e) {
    const { size } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/huarongDao/game/game?size=${size}` });
  }
});
