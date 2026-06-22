var rating = require('../../../utils/sudoku-rating');
var settingsSync = require('../../../utils/settings-sync');

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
    modulesBottom: MODULES.slice(4),
    stats: {}
  },

  onLoad: function() {
    wx.setNavigationBarTitle({ title: '难度选择' });
    settingsSync.ensureInit();
    this.initBannerAd();
  },

  initBannerAd: function() {
    if (typeof wx.createCustomAd !== 'function') return;
    var that = this;
    var ad = wx.createCustomAd({
      adUnitId: 'adunit-2bb753c35ab3d982',
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
    this.loadStats();
  },

  loadStats: function() {
    var self = this;
    var keys = ['beginner','basic','intermediate','advanced','expert'];
    var oldMap = { easy:'basic', medium:'intermediate', hard:'advanced', expert:'expert' };


    // 先展示本地缓存
    var localRecords = wx.getStorageSync('sudoku_records') || [];
    var localStats = self._calcStats(keys, oldMap, localRecords);
    self.setData({ stats: localStats });

    // 查云端（不依赖登录状态，失败就当没记录）
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
                } else {
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
    wx.navigateTo({ url: '/pages/sudoku/game/game?diff=' + key });
  }
});
