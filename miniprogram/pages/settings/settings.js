const settingsSync = require('../../utils/settings-sync');

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
    // 从所有游戏评估总开关状态
    const soundAllOn = settingsSync.areAllEnabled('sound');
    const vibrateAllOn = settingsSync.areAllEnabled('vibration');
    const settings = { sound: soundAllOn, vibration: vibrateAllOn };
    // 同步写入 global_settings 确保一致
    const globalSettings = settingsSync.getGlobalSettings();
    globalSettings.sound = soundAllOn;
    globalSettings.vibration = vibrateAllOn;
    wx.setStorageSync('global_settings', globalSettings);

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
    const val = e.detail.value;
    // 总开关切换，同步到所有游戏
    settingsSync.syncAllGames('sound', val);
    this.setData({ settings: { ...this.data.settings, sound: val } });
  },

  toggleVibration(e) {
    const val = e.detail.value;
    settingsSync.syncAllGames('vibration', val);
    this.setData({ settings: { ...this.data.settings, vibration: val } });
  },

  clearCache() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有本地数据吗？此操作不可恢复。',
      confirmColor: '#4CAF50',
      success: res => {
        if (res.confirm) {
          wx.removeStorageSync('shult_records');
          wx.removeStorageSync('huarong_records');
          wx.removeStorageSync('mb_records');
          wx.removeStorageSync('mb_completed');
          wx.removeStorageSync('sudoku_records');
          wx.removeStorageSync('shult_max_size');
          wx.removeStorageSync('shult_pass_progress');
          wx.removeStorageSync('shult_challenge_records');
          wx.removeStorageSync('shult_challenge_progress');
          wx.removeStorageSync('shult_settings');
          wx.removeStorageSync('hr_settings');
          wx.removeStorageSync('mb_settings');
          wx.removeStorageSync('shult_challenge_settings');
          wx.removeStorageSync('sd_settings');
          wx.removeStorageSync('global_settings');
          wx.removeStorageSync('shult_user_info');
          wx.removeStorageSync('shult_age_group');

          this.setData({
            settings: { sound: true, vibration: true },
            ageGroupText: '未设置'
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
