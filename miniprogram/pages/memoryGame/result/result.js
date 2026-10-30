const appConfig = require('../../../config.js');
var QUOTES = {
  excellent: [
    '天才玩家！记忆力简直逆天~',
    '太强了吧！数字位置记得分毫不差！',
    '完美通关！你这记忆力怕不是开了挂？',
    '脑子：全记住了。手：一个没错！',
    '这记忆力，数字见了你都绕着走！'
  ],
  good: [
    '还不错哦，再练练就是记忆大师了！',
    '稳扎稳打，进步空间大大的！',
    '差一点点就完美了，继续加油！',
    '记忆力正在升级中，保持下去！',
    '优秀选手，就差临门一脚！'
  ],
  effort: [
    '没关系，记忆大师的路总是曲折的~',
    '这次先探探路，下次一把过！',
    '失败是成功的妈，多试几次就对了！',
    '别灰心，大脑在悄悄变强！',
    '每一步都算数，继续冲就完了！'
  ]
};

function randomQuote(level) {
  var list = QUOTES[level] || QUOTES.effort;
  return list[Math.floor(Math.random() * list.length)];
}

Page({
  data: {
    level: 1,
    time: 0,
    errors: 0,
    timerText: '00:00',
    stars: 0,
    starLevel: '',
    quote: '',
    accuracy: 0,
    showNextBtn: true
  },

  onLoad: function(options) {
    // level 是显示关卡号（1~34）
    var level = parseInt(options.level) || 1;
    var time = parseInt(options.time) || 0;
    var errors = parseInt(options.errors) || 0;
    var numCount = level + 2; // 内部数字个数
    var m = String(Math.floor(time / 60)).padStart(2, '0');
    var s = String(time % 60).padStart(2, '0');

    var stars, starLevel;
    if (errors === 0) {
      stars = 5; starLevel = 'excellent';
    } else if (errors === 1) {
      stars = 4; starLevel = 'good';
    } else if (errors <= 3) {
      stars = 3; starLevel = 'good';
    } else {
      stars = 2; starLevel = 'effort';
    }

    var total = numCount + errors;
    var accuracy = total > 0 ? Math.round((numCount / total) * 100) : 0;
    var showNextBtn = level < 34;

    this.setData({
      level: level,
      time: time,
      errors: errors,
      timerText: m + ':' + s,
      stars: stars,
      starLevel: starLevel,
      quote: randomQuote(starLevel),
      accuracy: accuracy,
      showNextBtn: showNextBtn
    });

    // 保存记录（与积木迷阵保持一致逻辑）
    this.saveRecord(level, time, errors);

    this.showInterstitialAd();
    this.initBannerAd();
  },

  saveRecord: function(level, time, errors) {
    var app = getApp();
    var record = {
      level: level,
      time: time,
      errors: errors,
      status: 'success',
      createTime: new Date().toISOString()
    };

    // 未登录：保存到本地缓存
    if (!app.globalData.isLoggedIn) {
      var records = wx.getStorageSync('mg_records') || [];
      records.unshift(record);
      wx.setStorageSync('mg_records', records.slice(0, 200));
    }

    // 已登录：保存到云端
    if (app.globalData.isLoggedIn) {
      wx.cloud.callFunction({
        name: 'saveMemoryGameRecord',
        data: record,
        complete: function() {
          // 不管成功失败，都删除本地缓存
          wx.removeStorageSync('mg_records');
        }
      });
    }
  },

  showInterstitialAd: function() {
    var interstitialAd = wx.createInterstitialAd({
      adUnitId: appConfig.adUnits.interstitial
    });
    if (!interstitialAd) return;
    interstitialAd.onLoad(function () {});
    interstitialAd.onError(function (err) { console.log('mg result interstitial error', err); });
    interstitialAd.onClose(function () {});
    interstitialAd.show().catch(function () {});
    this.interstitialAd = interstitialAd;
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
    ad.onError(function (err) { console.log('mg result ad error', err); });
    ad.show();
    this.bannerAd = ad;
  },

  onUnload: function() {
    if (this.bannerAd) this.bannerAd.destroy();
    if (this.interstitialAd) this.interstitialAd.destroy();
  },

  onRecordList: function() {
    wx.navigateTo({ url: '/pages/history/history?tab=memoryGame' });
  },

  onRetry: function() {
    var displayLv = this.data.level;
    wx.redirectTo({
      url: '/pages/memoryGame/game/game?level=' + (displayLv + 2) + '&display=' + displayLv
    });
  },

  onNext: function() {
    var displayLv = this.data.level + 1;
    if (displayLv > 34) displayLv = 1;
    wx.redirectTo({
      url: '/pages/memoryGame/game/game?level=' + (displayLv + 2) + '&display=' + displayLv
    });
  },

  onShareAppMessage: function() {
    return {
      title: '数字记忆 第' + this.data.level + '关 ' + this.data.stars + '星通关！',
      path: '/pages/game-select/game-select'
    };
  }
});
