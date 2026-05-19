Page({
  data: {
    settings: {
      sound: true,
      vibration: true
    },
    showAgeSelector: false,
    ageGroupText: '未设置',
    isLoggedIn: false
  },

  onShow() {
    const app = getApp();
    const settings = wx.getStorageSync('shult_settings') || { sound: true, vibration: true };
    const saved = wx.getStorageSync('shult_age_group') || '';
    const loginState = wx.getStorageSync('shult_login_state') || {};
    this.setData({
      settings,
      ageGroupText: saved || '未设置',
      isLoggedIn: !!(app.globalData.isLoggedIn) && !!(loginState.loggedIn)
    });
  },

  onTapAgeGroup() {
    this.setData({ showAgeSelector: true });
  },

  onAgeChanged() {
    const saved = wx.getStorageSync('shult_age_group') || '未设置';
    this.setData({ showAgeSelector: false, ageGroupText: saved });
  },

  toggleSound(e) {
    const settings = { ...this.data.settings, sound: e.detail.value };
    this.setData({ settings });
    wx.setStorageSync('shult_settings', settings);
  },

  toggleVibration(e) {
    const settings = { ...this.data.settings, vibration: e.detail.value };
    this.setData({ settings });
    wx.setStorageSync('shult_settings', settings);
  },

  clearCache() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有本地数据吗？此操作不可恢复。',
      confirmColor: '#4CAF50',
      success: res => {
        if (res.confirm) {
          wx.removeStorageSync('shult_records');
          wx.removeStorageSync('shult_max_size');
          wx.removeStorageSync('shult_pass_progress');
          wx.removeStorageSync('shult_challenge_records');
          wx.removeStorageSync('shult_challenge_progress');
          wx.removeStorageSync('shult_settings');
          wx.removeStorageSync('shult_user_info');
          wx.removeStorageSync('shult_age_group');

          this.setData({
            settings: { sound: true, vibration: true },
            ageGroupText: '未设置',
            isLoggedIn: false
          });

          wx.showToast({
            title: '已清除',
            icon: 'success'
          });
        }
      }
    });
  },

  doLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmColor: '#EF4444',
      success: res => {
        if (res.confirm) {
          const app = getApp();
          wx.removeStorageSync('shult_user_info');
          wx.removeStorageSync('shult_login_state');
          app.globalData.isLoggedIn = false;
          this.setData({ isLoggedIn: false });
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  }

});
