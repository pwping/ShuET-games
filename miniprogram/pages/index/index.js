const appConfig = require('../../config.js');
const app = getApp();

// 激励视频广告
var videoAd = null;

// VIP 数据缓存 key
var VIP_CACHE_KEY = 'shult_vip_access';

Page({
  data: {
    modes: [
      { key: 'classic', name: '经典模式', desc: '从1开始按顺序点击', icon: '1', bg: '#fff', iconBg: 'linear-gradient(135deg,#059669,#6EE7B7)' },
      { key: 'interference', name: '干扰模式', desc: '彩色背景抗干扰', icon: '◇', bg: '#fff', iconBg: 'linear-gradient(135deg,#8B5CF6,#C4B5FD)' },
      { key: 'shuffle', name: '换位模式', desc: '正确后重新排列', icon: '⇄', bg: '#fff', iconBg: 'linear-gradient(135deg,#0D9488,#5EEAD4)' },
      { key: 'reverse', name: '倒序模式', desc: '从大到小倒序点', icon: 'arrow', bg: '#fff', iconBg: 'linear-gradient(135deg,#F43F5E,#FDA4AF)' },
      { key: 'parity', name: '奇偶模式', desc: '点击奇数或偶数', icon: 'cross', bg: '#fff', iconBg: 'linear-gradient(135deg,#D946EF,#F0ABFC)' },
      { key: 'challenge', name: '限时模式', desc: '每步限时2秒', icon: '⚡', bg: '#fff', iconBg: 'linear-gradient(135deg,#D97706,#FDE68A)', locked: true },
      { key: 'alphabet', name: '字母模式', desc: '按顺序点击A-Z', icon: 'A', bg: '#fff', iconBg: 'linear-gradient(135deg,#F97316,#FDBA74)', locked: true },
      { key: 'memory', name: '记忆模式', desc: '先记忆后点击', icon: '✦', bg: '#fff', iconBg: 'linear-gradient(135deg,#0284C7,#7DD3FC)', locked: true }
    ],
    showAgeSelector: false,
    stats: { bestTime: '--' },
    // VIP 弹窗
    showVipModal: false,
    vipModalMode: '',       // 'challenge' or 'memory'
    vipModalModeName: '',   // '限时模式' or '记忆模式'
    // VIP 剩余次数（key: mode key, value: 剩余次数）
    vipRemaining: {}
  },

  // ===== VIP 缓存管理 =====
  _getVipCache() {
    return wx.getStorageSync(VIP_CACHE_KEY) || {};
  },
  _setVipCache(data) {
    wx.setStorageSync(VIP_CACHE_KEY, data);
  },
  _getVipRemaining(modeKey) {
    var cache = this._getVipCache();
    return (cache[modeKey] && cache[modeKey].remaining) || 0;
  },
  _setVipRemaining(modeKey, remaining) {
    var cache = this._getVipCache();
    cache[modeKey] = cache[modeKey] || {};
    cache[modeKey].remaining = remaining;
    this._setVipCache(cache);
  },

  // 加载 VIP 剩余次数到页面
  _loadVipCounts() {
    var remaining = {};
    remaining.challenge = this._getVipRemaining('challenge');
    remaining.memory = this._getVipRemaining('memory');
    remaining.alphabet = this._getVipRemaining('alphabet');
    this.setData({ vipRemaining: remaining });
  },

  // ===== 生命周期 =====
  onLoad() {
    // 创建激励视频广告（onClose 只绑定一次）
    if (wx.createRewardedVideoAd) {
      videoAd = wx.createRewardedVideoAd({
        adUnitId: appConfig.adUnits.reward
      });
      videoAd.onLoad(function () {});
      videoAd.onError(function (err) { console.error('index videoAd error', err); });
      var that = this;
      videoAd.onClose(function (res) {
        if (that._vipAdResolve) {
          that._vipAdResolve(res);
          that._vipAdResolve = null;
        }
      });
    }
    // 首次加载时从云端拉取最佳成绩
    this.loadBestTime();
  },

  onShow() {
    this.checkLogin();
    this.checkAgeGroup();
    this._loadVipCounts();
    // 仅用本地缓存更新最佳成绩（不触发云调用）
    this._loadLocalBestTime();
  },

  // 仅用本地缓存计算最佳成绩（不触发云调用）
  _loadLocalBestTime() {
    const localRecords = wx.getStorageSync('shult_records') || [];
    this.computeBestTime(localRecords);
  },

  loadBestTime() {
    const localRecords = wx.getStorageSync('shult_records') || [];
    let allRecords = [...localRecords];

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

  // ===== 模式点击 =====
  onModeTap(e) {
    const modeKey = e.currentTarget.dataset.mode;
    const mode = this.data.modes.find(function(m) { return m.key === modeKey; });
    if (!mode) return;

    // 非锁定模式直接跳转
    if (!mode.locked) {
      this._goLevel(modeKey);
      return;
    }

    // 锁定模式：检查剩余次数
    var remaining = this._getVipRemaining(modeKey);
    if (remaining > 0) {
      // 有次数，减1后跳转
      this._setVipRemaining(modeKey, remaining - 1);
      this._loadVipCounts();
      this._goLevel(modeKey);
    } else {
      // 无次数，弹出解锁弹窗
      this.setData({
        showVipModal: true,
        vipModalMode: modeKey,
        vipModalModeName: mode.name
      });
    }
  },

  _goLevel(modeKey) {
    wx.navigateTo({
      url: '/pages/level/level?mode=' + modeKey
    });
  },

  // ===== VIP 解锁弹窗 =====
  onVipModalClose() {
    this.setData({ showVipModal: false, vipModalMode: '', vipModalModeName: '' });
  },

  // 看广告解锁
  onVipAdTap() {
    var that = this;
    if (!videoAd) {
      wx.showToast({ title: '广告未就绪', icon: 'none' });
      return;
    }
    that._vipAdResolve = function (res) {
      if (res && res.isEnded) {
        var modeKey = that.data.vipModalMode;
        that._setVipRemaining(modeKey, 5);
        that._loadVipCounts();
        that.onVipModalClose();
        wx.showToast({ title: '解锁成功！获得5次机会', icon: 'success', duration: 2000 });
      } else {
        wx.showToast({ title: '需要看完广告才能解锁', icon: 'none' });
      }
    };
    videoAd.show().catch(function () {
      videoAd.load()
        .then(function () { return videoAd.show(); })
        .catch(function (err) {
          console.error('index videoAd show fail', err);
          wx.showToast({ title: '广告加载失败，请重试', icon: 'none' });
        });
    });
  },

  // ===== 分享处理 =====
  onShareAppMessage() {
    // 如果是从 VIP 弹窗分享
    if (this.data.showVipModal && this.data.vipModalMode) {
      var that = this;
      var modeKey = this.data.vipModalMode;
      // 延迟2秒再解锁，让用户先完成分享操作
      setTimeout(function () {
        that._setVipRemaining(modeKey, 5);
        that._loadVipCounts();
        that.onVipModalClose();
      }, 2000);
    }

    const app2 = getApp();
    if (app2.globalData.globalBestTime === '--') {
      app2.globalData.globalBestTime = this.data.stats.bestTime || '--';
    }
    return {
      title: '我在玩舒尔特方格专注力训练，一起来挑战吧！',
      path: '/pages/game-select/game-select',
      imageUrl: appConfig.shareImageUrl
    };
  },

  onShareTimeline() {
    const app2 = getApp();
    if (app2.globalData.globalBestTime === '--') {
      app2.globalData.globalBestTime = this.data.stats.bestTime || '--';
    }
    return {
      title: '我在玩舒尔特方格专注力训练，一起来挑战吧！',
      query: ''
    };
  },

  // 复制链接
  onCopyLink() {
    wx.setClipboardData({
      data: appConfig.consoleUrl,
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

  // 挑战闯关
  onGoChallenge() {
    wx.navigateTo({ url: '/pages/pass/pass' });
  },

  // 原生模板广告事件
  adLoad() {
    wx.setNavigationBarColor({
      backgroundColor: '#F0FDF4',
      frontColor: '#000000'
    })
  },
  adError(err) {
    console.error('原生模板广告加载失败', err)
  },
  adClose() {
    console.log('原生模板广告关闭')
  },

  preventMove() {}
});
