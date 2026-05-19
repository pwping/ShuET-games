const { RATING_DATA } = require('../../utils/rating-data');

Page({
  data: {
    referenceData: [],
    dataSource: ''
  },

  onLoad() {
    const data = RATING_DATA[5];
    this.setData({
      referenceData: data.ages.map(item => ({
        age: item.age,
        excellent: item.excellent,
        normal: item.good,
        poor: item.poor
      })),
      dataSource: data.source
    });
  },

  goBack() {
    wx.navigateBack();
  },

  onContact() {
    const email = 'pwp8899@163.com';
    
    const doCopy = () => {
      wx.setClipboardData({
        data: email,
        success: () => {
          wx.showToast({ title: '已复制邮箱', icon: 'success', duration: 2000 });
        },
        fail: (err) => {
          console.error('复制失败:', err);
          wx.showModal({
            title: '复制邮箱',
            content: email,
            showCancel: false,
            confirmText: '知道了'
          });
        }
      });
    };

    // 直接尝试复制，失败则弹窗显示
    doCopy();
  }
});
