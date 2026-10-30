const appConfig = require('../../../config.js');
var rating = require('../../../utils/sudoku-rating');
var settingsSync = require('../../../utils/settings-sync');

// 激励视频广告
var videoAd = null;

// VIP 数据缓存 key
var VIP_CACHE_KEY = 'sd_vip_access';

var EXTRA_MODULE = {
  beginner: { tag: '唯一余数法', badge: '1', color: '#3B82F6', desc: '行、列、宫中只剩一个空位时，剩下的唯一数字就是答案' },
  basic: { tag: '摒除法', badge: '2', color: '#0891B2', desc: '用已知数字排除同行、同列、同宫的其他位置' },
  intermediate: { tag: '区块排除', badge: '3', color: '#D97706', desc: '数字在宫内的可能位置形成区块，用区块排除其他宫' },
  advanced: { tag: '数对删减', badge: '4', color: '#7C3AED', desc: '两格只能填相同两数，占用后排除同单元其他位置' },
  expert: { tag: '高阶技巧', badge: '5', color: '#DC2626', desc: 'X-Wing、剑鱼、XY-Wing 等复杂推理模式' }
};

var MODULES = (function() {
  var arr = [];
  for (var i = 0; i < rating.DIFF_LIST.length; i++) {
    var d = rating.DIFF_LIST[i];
    var ex = EXTRA_MODULE[d.key] || {};
    arr.push({ key: d.key, name: d.name, tag: ex.tag, badge: ex.badge, color: ex.color, desc: ex.desc });
  }
  return arr;
})();

Page({
  data: {
    modulesTop: MODULES.slice(0, 4),
    modulesBottom: (function() {
      var bottom = MODULES.slice(4);
      // 大师级（expert）加上锁定标记
      for (var i = 0; i < bottom.length; i++) {
        if (bottom[i].key === 'expert') {
          bottom[i].locked = true;
        }
      }
      return bottom;
    })(),
    stats: {},
    // VIP 弹窗
    showVipModal: false,
    // VIP 剩余次数
    vipRemaining: {}
  },

  // ===== VIP 缓存管理 =====
  _getVipCache() {
    return wx.getStorageSync(VIP_CACHE_KEY) || {};
  },
  _setVipCache(data) {
    wx.setStorageSync(VIP_CACHE_KEY, data);
  },
  _getVipRemaining(key) {
    var cache = this._getVipCache();
    return (cache[key] && cache[key].remaining) || 0;
  },
  _setVipRemaining(key, remaining) {
    var cache = this._getVipCache();
    cache[key] = cache[key] || {};
    cache[key].remaining = remaining;
    this._setVipCache(cache);
  },

  _loadVipCounts() {
    var remaining = {};
    remaining.expert = this._getVipRemaining('expert');
    this.setData({ vipRemaining: remaining });
  },

  onLoad: function() {
    wx.setNavigationBarTitle({ title: '难度选择' });
    settingsSync.ensureInit();
    this.initBannerAd();
    this._loadVipCounts();
    // 首次加载从本地缓存和云端加载统计数据
    this.loadStats();

    // 创建激励视频广告（onClose 只绑定一次）
    if (wx.createRewardedVideoAd) {
      videoAd = wx.createRewardedVideoAd({
        adUnitId: appConfig.adUnits.reward
      });
      videoAd.onLoad(function () {});
      videoAd.onError(function (err) { console.error('sd level videoAd error', err); });
      var that = this;
      videoAd.onClose(function (res) {
        if (that._vipAdResolve) {
          that._vipAdResolve(res);
          that._vipAdResolve = null;
        }
      });
    }
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
      wx.setNavigationBarColor({ frontColor: '#000000', backgroundColor: '#EFF6FF' });
      wx.setBackgroundColor({ backgroundColor: '#EFF6FF' });
    });
    ad.onError(function (err) { console.log('sudoku level ad error', err); });
    ad.show();
    this.bannerAd = ad;
  },

  onUnload: function() {
    if (this.bannerAd) {
      this.bannerAd.destroy();
    }
  },

  onShow: function() {
    this._loadVipCounts();
  },

  loadStats: function() {
    var self = this;
    var keys = ['beginner','basic','intermediate','advanced','expert'];
    var oldMap = { easy:'basic', medium:'intermediate', hard:'advanced', expert:'expert' };

    var localRecords = wx.getStorageSync('sudoku_records') || [];
    var localStats = self._calcStats(keys, oldMap, localRecords);
    self.setData({ stats: localStats });

    var queryMap = { beginner:['beginner'], basic:['basic','easy'], intermediate:['intermediate','medium'], advanced:['advanced','hard'], expert:['expert'] };
    var cloudByDiff = {};
    var totalCalls = 0;
    for (var qk in queryMap) totalCalls += queryMap[qk].length;
    var remaining = totalCalls;

    function tryMerge() {
      if (remaining > 0) return;
      var merged = {};
      for (var m = 0; m < keys.length; m++) {
        var key = keys[m];
        var lr = localStats[key];
        var cloudCount = 0;
        var cloudBest = null;
        var diffs = queryMap[key];
        for (var d = 0; d < diffs.length; d++) {
          var s = cloudByDiff[diffs[d]];
          if (s) {
            cloudCount += s.totalCount || 0;
            var bt = s.bestTime;
            if (bt !== null && bt !== undefined && (cloudBest === null || bt < cloudBest)) {
              cloudBest = bt;
            }
          }
        }
        var totalCount = lr.count + cloudCount;
        var bestTime;
        if (cloudBest !== null && lr.bestTime !== null) {
          bestTime = cloudBest < lr.bestTime ? cloudBest : lr.bestTime;
        } else if (cloudBest !== null) {
          bestTime = cloudBest;
        } else {
          bestTime = lr.bestTime;
        }
        merged[key] = {
          count: totalCount,
          bestTime: bestTime,
          bestTimeStr: bestTime !== null ? bestTime + '秒' : '--:--'
        };
      }
      self.setData({ stats: merged });
    }

    for (var qk in queryMap) {
      (function(diffs) {
        for (var d = 0; d < diffs.length; d++) {
          (function(diffKey) {
            wx.cloud.callFunction({
              name: 'getSudokuRecords',
              data: { stats: true, difficulty: diffKey },
              success: function(res) {
                if (res.result && res.result.code === 200 && res.result.stats) {
                  cloudByDiff[diffKey] = res.result.stats;
                }
              },
              fail: function(err) {
              },
              complete: function() {
                remaining--;
                tryMerge();
              }
            });
          })(diffs[d]);
        }
      })(queryMap[qk]);
    }
  },

  _calcStats: function(keys, oldMap, records) {
    var stats = {};
    for (var m = 0; m < keys.length; m++) {
      var key = keys[m];
      var filtered = [];
      for (var r = 0; r < records.length; r++) {
        var rec = records[r];
        if ((rec.difficulty === key || oldMap[rec.difficulty] === key) && rec.status === 'success') {
          filtered.push(rec);
        }
      }
      var best = null;
      if (filtered.length > 0) {
        best = filtered[0].time;
        for (var t = 1; t < filtered.length; t++) {
          if (filtered[t].time < best) best = filtered[t].time;
        }
      }
      stats[key] = {
        count: filtered.length,
        bestTime: best,
        bestTimeStr: best !== null ? best + '秒' : '--:--'
      };
    }
    return stats;
  },

  onModuleTap: function(e) {
    var key = e.currentTarget.dataset.key;

    // 大师级需要检查 VIP
    if (key === 'expert') {
      var remaining = this._getVipRemaining('expert');
      if (remaining > 0) {
        this._setVipRemaining('expert', remaining - 1);
        this._loadVipCounts();
        wx.navigateTo({ url: '/pages/sudoku/game/game?diff=' + key });
      } else {
        this.setData({ showVipModal: true });
      }
      return;
    }

    wx.navigateTo({ url: '/pages/sudoku/game/game?diff=' + key });
  },

  // ===== VIP 解锁弹窗 =====
  onVipModalClose: function() {
    this.setData({ showVipModal: false });
  },

  onVipAdTap: function() {
    var that = this;
    if (!videoAd) {
      wx.showToast({ title: '广告未就绪', icon: 'none' });
      return;
    }
    that._vipAdResolve = function (res) {
      if (res && res.isEnded) {
        that._setVipRemaining('expert', 5);
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
          console.error('sd level videoAd show fail', err);
          wx.showToast({ title: '广告加载失败，请重试', icon: 'none' });
        });
    });
  },

  onShareAppMessage: function() {
    if (this.data.showVipModal) {
      var that = this;
      setTimeout(function () {
        that._setVipRemaining('expert', 5);
        that._loadVipCounts();
        that.onVipModalClose();
      }, 2000);
    }
    return {
      title: '我在玩数独，来挑战大师难度吧！',
      path: '/pages/sudoku/level/level',
      imageUrl: appConfig.shareImageUrl
    };
  },

  preventMove: function() {}
});
