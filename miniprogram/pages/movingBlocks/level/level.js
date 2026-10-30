const appConfig = require('../../../config.js');
const levelData = require('../game/levels-data.js');

// 自动获取关卡总数
const TOTAL = Math.max(...levelData.ALL_LEVELS.map(l => parseInt(l.id)));

// 激励视频广告
var videoAd = null;

Page({
  data: {
    totalLevels: TOTAL,
    levels: [],
    displayLevels: [],
    completedCount: 0,
    progressPercent: 0,
    showCount: 20,
    canLoadMore: true,
    // 跳关弹窗
    showSkipModal: false,
    skipTargetLevel: null
  },

  onLoad() {
    this.loadLevels();
    this.initBannerAd();

    // 创建激励视频广告（onClose 只绑定一次）
    if (wx.createRewardedVideoAd) {
      videoAd = wx.createRewardedVideoAd({
        adUnitId: appConfig.adUnits.reward
      });
      videoAd.onLoad(function () {});
      videoAd.onError(function (err) { console.error('mb level videoAd error', err); });
      var that = this;
      videoAd.onClose(function (res) {
        if (that._skipAdResolve) {
          that._skipAdResolve(res);
          that._skipAdResolve = null;
        }
      });
    }
  },

  onShow() {
    // 本地缓存刷新（不触发云调用）
    const localCompleted = wx.getStorageSync('mb_completed') || {};
    this.renderLevels(localCompleted);
  },

  initBannerAd() {
    if (this.bannerAd) return;
    if (typeof wx.createCustomAd !== 'function') return;
    var ad = wx.createCustomAd({
      adUnitId: appConfig.adUnits.custom,
      style: { left: 0, top: 0 }
    });
    if (!ad) return;
    ad.onLoad(function () {
      wx.setNavigationBarColor({ frontColor: '#000000', backgroundColor: '#FFFBF0' });
      wx.setBackgroundColor({ backgroundColor: '#FFFBF0' });
    });
    ad.onError(function (err) { console.log('movingBlocks level ad error', err); });
    ad.show();
    this.bannerAd = ad;
  },

  onUnload() {
    if (this.bannerAd) this.bannerAd.destroy();
  },

  loadLevels() {
    const localCompleted = wx.getStorageSync('mb_completed') || {};

    // 先渲染本地数据（立即显示）
    this.renderLevels(localCompleted);

    // 再异步从云端加载合并
    wx.cloud.callFunction({
      name: 'getMovingBlockRecords',
      data: { limit: 200 },
      success: res => {
        let cloudCompleted = {};
        if (res.result && res.result.code === 200 && Array.isArray(res.result.data)) {
          res.result.data.forEach(r => {
            if (r.levelId) cloudCompleted[String(r.levelId)] = true;
          });
        }
        // 合并本地 + 云端
        const merged = { ...localCompleted };
        Object.keys(cloudCompleted).forEach(id => {
          merged[id] = merged[id] || { fromCloud: true };
        });
        // 保存到本地缓存，供下次使用
        wx.setStorageSync('mb_completed', merged);
        // 用合并数据重新渲染
        this.renderLevels(merged);
      },
      fail: () => {}
    });
  },

  renderLevels(completed) {
    let completedCount = 0;
    let hasNext = false;
    const allLevels = [];
    const maxId = Math.max(...levelData.ALL_LEVELS.map(l => parseInt(l.id)));

    for (let i = 0; i < maxId; i++) {
      const id = String(i + 1);
      const lvl = levelData.ALL_LEVELS.find(l => l.id === id);
      const isCompleted = !!completed[id];
      // 第1关可用，后续关需要前一关已通关
      const prevId = String(i);
      const prevCompleted = i === 0 || !!completed[prevId];
      const isAvailable = !!lvl && (prevCompleted || isCompleted);
      const isNext = isAvailable && !isCompleted && !hasNext;
      if (isNext) hasNext = true;
      allLevels.push({
        id, available: isAvailable, completed: isCompleted,
        steps: lvl ? lvl.steps : 0,
        showLock: !isCompleted && !isAvailable,
        isNext: isNext
      });
      if (isCompleted) completedCount++;
    }

    this.setData({
      levels: allLevels,
      displayLevels: allLevels.slice(0, 20),
      completedCount,
      progressPercent: Math.round((completedCount / maxId) * 100),
      showCount: 20,
      canLoadMore: allLevels.length > 20
    });
  },

  onLoadMore() {
    const next = this.data.showCount + 20;
    const items = this.data.levels.slice(0, next).map(d => ({ ...d, isNew: false }));
    this.setData({
      displayLevels: items,
      showCount: next,
      canLoadMore: next < this.data.levels.length
    });
  },

  // 获取下一个可玩的关卡
  _getNextPlayableLevel() {
    var levels = this.data.levels;
    for (var i = 0; i < levels.length; i++) {
      if (levels[i].available && !levels[i].completed) {
        return levels[i];
      }
    }
    return null;
  },

  // 跳转到指定关卡
  _goLevel(level) {
    var lvl = levelData.ALL_LEVELS.find(function(l) { return l.id === level.id; });
    if (!lvl) return;
    var diff = levelData.getDifficulty(lvl.id);
    var groups = levelData.ALL_LEVELS.filter(function(l) { return levelData.getDifficulty(l.id) === diff; });
    var idx = groups.findIndex(function(g) { return g.id === level.id; });
    if (idx === -1) return;
    wx.navigateTo({
      url: '/pages/movingBlocks/game/game?diff=' + diff + '&level=' + idx
    });
  },

  // 卡片点击 — 进入下一关
  onStartTap() {
    var next = this._getNextPlayableLevel();
    if (next) this._goLevel(next);
  },

  onLevelTap(e) {
    const index = e.currentTarget.dataset.index;
    const level = this.data.levels[index];
    if (!level) return;

    // 可用的关卡直接进入
    if (level.available) {
      this._goLevel(level);
      return;
    }

    // 锁定关卡：弹出跳关弹窗
    this.setData({
      showSkipModal: true,
      skipTargetLevel: level
    });
  },

  // ===== 跳关弹窗 =====
  onSkipModalClose() {
    this.setData({ showSkipModal: false, skipTargetLevel: null });
  },

  // 按顺序闯关
  onPlayOrder() {
    var next = this._getNextPlayableLevel();
    this.onSkipModalClose();
    if (next) {
      this._goLevel(next);
    } else {
      wx.showToast({ title: '没有可玩的关卡', icon: 'none' });
    }
  },

  // 看广告跳关
  onSkipAdTap() {
    var that = this;
    if (!videoAd) {
      wx.showToast({ title: '广告未就绪', icon: 'none' });
      return;
    }
    that._skipAdResolve = function (res) {
      if (res && res.isEnded) {
        // 看完广告，直接进入跳关
        var target = that.data.skipTargetLevel;
        that.onSkipModalClose();
        if (target) {
          that._goLevel(target);
        }
      } else {
        wx.showToast({ title: '需要看完广告才能跳关', icon: 'none' });
      }
    };
    videoAd.show().catch(function () {
      videoAd.load()
        .then(function () { return videoAd.show(); })
        .catch(function (err) {
          console.error('mb level videoAd show fail', err);
          wx.showToast({ title: '广告加载失败，请重试', icon: 'none' });
        });
    });
  },

  preventMove() {}
});
