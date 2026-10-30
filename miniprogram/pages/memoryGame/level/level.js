const appConfig = require('../../../config.js');
var settingsSync = require('../../../utils/settings-sync');

var MAX_INTERNAL = 36;  // 6×6 棋盘最大数字个数
var MAX_DISPLAY = MAX_INTERNAL - 2; // 显示关卡数：1~34，第N关有 N+2 个数字

var ALL_LEVELS = [];
for (var i = 1; i <= MAX_DISPLAY; i++) ALL_LEVELS.push(i);

// 显示关卡 → 内部数字个数（第1关=3个数，第N关=N+2个数）
function toInternal(lv) { return lv + 2; }

Page({
  data: {
    maxLevel: 0,
    displayMaxLevel: 0,
    completedSet: {},
    stats: {},
    allLevels: ALL_LEVELS,
    displayLevels: [],
    showCount: 20,
    canLoadMore: true
  },

  onLoad: function() {
    wx.setNavigationBarTitle({ title: '数字记忆' });
    settingsSync.ensureInit();
    this.initBannerAd();
    this.loadStats();
  },

  initBannerAd: function() {
    if (typeof wx.createCustomAd !== 'function') return;
    var that = this;
    var ad = wx.createCustomAd({
      adUnitId: appConfig.adUnits.custom,
      style: { left: 0, top: 0 }
    });
    if (!ad) return;
    ad.onLoad(function () {
      wx.setNavigationBarColor({ frontColor: '#000000', backgroundColor: '#F5F3FF' });
      wx.setBackgroundColor({ backgroundColor: '#F5F3FF' });
    });
    ad.onError(function (err) { console.log('memoryGame level ad error', err); });
    ad.show();
    this.bannerAd = ad;
  },

  onUnload: function() {
    if (this.bannerAd) this.bannerAd.destroy();
  },

  onShow: function() {
    this.loadStats();
  },

  loadStats: function() {
    var self = this;
    var localRecords = wx.getStorageSync('mg_records') || [];
    var localCompleted = wx.getStorageSync('mg_completed') || {};
    var localMaxLevel = 0;

    for (var i = 0; i < localRecords.length; i++) {
      var lv = localRecords[i].level;
      if (lv > localMaxLevel) localMaxLevel = lv;
    }

    for (var key in localCompleted) {
      if (localCompleted[key]) {
        var lv = parseInt(key);
        if (lv > localMaxLevel) localMaxLevel = lv;
      }
    }

    var stats = this._calcLocalStats(localRecords);
    var built = this._buildDisplayLevels(localMaxLevel);
    self.setData({ maxLevel: localMaxLevel, displayMaxLevel: localMaxLevel, completedSet: localCompleted, stats: stats, allLevels: built.allLevels, displayLevels: built.displayLevels, canLoadMore: built.canLoadMore });

    wx.cloud.callFunction({
      name: 'getMemoryGameRecords',
      data: { stats: true },
      success: function(res) {
        if (res.result && res.result.code === 200 && res.result.stats) {
          var cloudMax = res.result.stats.maxCompleted || 0;
          var totalCount = res.result.stats.totalCount || 0;
          var maxLevel = Math.max(localMaxLevel, cloudMax);
          var mergedStats = { totalCount: stats.totalCount + totalCount };
          var built = self._buildDisplayLevels(maxLevel);
          self.setData({ maxLevel: maxLevel, displayMaxLevel: maxLevel, stats: mergedStats, allLevels: built.allLevels, displayLevels: built.displayLevels, canLoadMore: built.canLoadMore });
        }
      },
      fail: function() {}
    });
  },

  _calcLocalStats: function(records) {
    var totalCount = 0;
    for (var i = 0; i < records.length; i++) {
      if (records[i].status === 'success') totalCount++;
    }
    return { totalCount: totalCount };
  },

  onStartTap: function() {
    var maxLevel = this.data.maxLevel;
    var startLevel = maxLevel > 0 ? Math.max(maxLevel + 1, 1) : 1;
    if (startLevel > MAX_DISPLAY) startLevel = 1;
    var numCount = startLevel + 2;
    wx.navigateTo({ url: '/pages/memoryGame/game/game?level=' + numCount + '&display=' + startLevel });
  },

  _buildDisplayLevels: function(displayMaxLevel) {
    var levels = [];
    for (var i = 0; i < ALL_LEVELS.length; i++) {
      var lv = ALL_LEVELS[i];
      levels.push({
        id: lv,
        completed: lv <= displayMaxLevel,
        unlocked: lv <= displayMaxLevel + 1,
        isNext: lv === displayMaxLevel + 1 && displayMaxLevel < MAX_DISPLAY
      });
    }
    var showCount = this.data.showCount || 20;
    return {
      allLevels: levels,
      displayLevels: levels.slice(0, showCount),
      canLoadMore: levels.length > showCount
    };
  },

  onLoadMore: function() {
    var next = this.data.showCount + 20;
    var items = this.data.allLevels.slice(0, next);
    this.setData({
      displayLevels: items,
      showCount: next,
      canLoadMore: next < this.data.allLevels.length
    });
  },

  onLevelTap: function(e) {
    var displayLv = parseInt(e.currentTarget.dataset.level);
    var maxLevel = this.data.maxLevel;
    if (displayLv <= maxLevel + 1 && displayLv <= MAX_DISPLAY) {
      var numCount = displayLv + 2;
      wx.navigateTo({ url: '/pages/memoryGame/game/game?level=' + numCount + '&display=' + displayLv });
    }
  },

  onShareAppMessage: function() {
    return {
      title: '数字记忆，挑战你的短时记忆力！',
      path: '/pages/memoryGame/level/level',
      imageUrl: appConfig.shareImageUrl
    };
  },

  preventMove: function() {}
});
