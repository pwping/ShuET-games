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
    stats: { bestTime: '--' }
  },

  onLoad() {
  },

  onShow() {
    this.checkLogin();
    this.checkAgeGroup();
    this.loadBestTime();
  },

  loadBestTime() {
    const localRecords = wx.getStorageSync('shult_records') || [];
    let allRecords = [...localRecords];

    // 同上查询云端数据
    wx.cloud.callFunction({
      name: 'getUserTrainRecords',
      data: {},
      success: res => {
        if (res.result && res.result.code === 200 && Array.isArray(res.result.data)) {
          allRecords = localRecords.concat(res.result.data);
        }
        this.computeBestTime(allRecords);
      },
      fail: () => {
        this.computeBestTime(allRecords);
      }
    });
  },

  computeBestTime(allRecords) {
    let bestTimeMs = Infinity;
    allRecords.forEach(r => {
      if (r.status === 'success' && r.timeCost < bestTimeMs) {
        bestTimeMs = r.timeCost;
      }
    });
    const bestTime = bestTimeMs === Infinity ? '--' : this.formatTime(bestTimeMs);
    app.globalData.globalBestTime = bestTime;
    this.setData({ stats: { bestTime } });
  },

  formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${s}.${cs.toString().padStart(2, '0')}秒`;
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

  // 挑战闯关
  onGoChallenge() {
    wx.navigateTo({ url: '/pages/pass/pass' });
  },

  // 分享给好友
  onShareAppMessage() {
    const app = getApp();
    if (app.globalData.globalBestTime === '--') {
      app.globalData.globalBestTime = this.data.stats.bestTime || '--';
    }
    return {
      title: `你能几秒内找完以下数字，我用时${app.globalData.globalBestTime}。`,
      path: '/pages/game-select/game-select',
      imageUrl: 'cloud://xcx-prj-d5gzqi12z8482282f.7863-xcx-prj-d5gzqi12z8482282f-1426704286/images/share-card.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const app = getApp();
    if (app.globalData.globalBestTime === '--') {
      app.globalData.globalBestTime = this.data.stats.bestTime || '--';
    }
    return {
      title: `你能几秒内找完以下数字，我用时${app.globalData.globalBestTime}。`,
      query: ''
    };
  },

  // 复制链接
  onCopyLink() {
    wx.setClipboardData({
      data: 'https://tcb.cloud.tencent.com/dev/xcx-prj-d5gzqi12z8482282f',
      success: () => {
        wx.showToast({ title: '链接已复制', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '复制失败，请重试', icon: 'none' });
      }
    });
  },

  onIntro() {
    wx.navigateTo({ url: '/pages/intro/intro' });
  },

});
