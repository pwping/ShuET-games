const app = getApp();

Page({
  data: {
    modes: [
      { key: 'classic', name: '经典模式', desc: '从1开始按顺序点击', icon: '1', bg: '#fff', iconBg: 'linear-gradient(135deg,#059669,#6EE7B7)' },
      { key: 'interference', name: '干扰模式', desc: '彩色背景抗干扰', icon: '◇', bg: '#fff', iconBg: 'linear-gradient(135deg,#8B5CF6,#C4B5FD)' },
      { key: 'shuffle', name: '换位模式', desc: '正确后重新排列', icon: '⇄', bg: '#fff', iconBg: 'linear-gradient(135deg,#0D9488,#5EEAD4)' },
      { key: 'reverse', name: '倒序模式', desc: '从大到小倒序点', icon: 'arrow', bg: '#fff', iconBg: 'linear-gradient(135deg,#F43F5E,#FDA4AF)' },
      { key: 'parity', name: '奇偶模式', desc: '点击奇数或偶数', icon: 'cross', bg: '#fff', iconBg: 'linear-gradient(135deg,#D946EF,#F0ABFC)' },
      { key: 'challenge', name: '限时模式', desc: '每步限时2秒', icon: '⚡', bg: '#fff', iconBg: 'linear-gradient(135deg,#D97706,#FDE68A)' },
      { key: 'alphabet', name: '字母模式', desc: '按顺序点击A-Z', icon: 'A', bg: '#fff', iconBg: 'linear-gradient(135deg,#F97316,#FDBA74)' },
      { key: 'memory', name: '记忆模式', desc: '先记忆后点击', icon: '✦', bg: '#fff', iconBg: 'linear-gradient(135deg,#0284C7,#7DD3FC)' }
    ],
    showAgeSelector: false,
  },

  onLoad() {
    this.initCloud();
  },

  onShow() {
    this.checkLogin();
    this.checkAgeGroup();
  },

  checkAgeGroup() {
    const saved = wx.getStorageSync('shult_age_group');
    if (!saved) {
      this.setData({ showAgeSelector: true });
    }
  },

  onHideAgeSelector() {
    this.setData({ showAgeSelector: false });
  },

  onAgeChanged() {
    this.setData({ showAgeSelector: false });
  },

  initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库');
      return;
    }

    wx.cloud.init({
      env: 'xcx-prj-d5gzqi12z8482282f',
      traceUser: true
    });
  },

  checkLogin() {
    const openid = wx.getStorageSync('shult_openid');
    if (openid) {
      app.globalData.openid = openid;
      return;
    }

    // 自动登录
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        if (res.result && res.result.code === 200) {
          app.globalData.openid = res.result.data.openid;
          wx.setStorageSync('shult_openid', res.result.data.openid);
          wx.setStorageSync('shult_user_info', res.result.data);
        }
      },
      fail: console.error
    });
  },

  onModeTap(e) {
    const mode = e.currentTarget.dataset.mode;
    wx.navigateTo({
      url: `/pages/level/level?mode=${mode}`
    });
  },

});
