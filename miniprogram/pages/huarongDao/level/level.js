const appConfig = require('../../../config.js');
var settingsSync = require('../../../utils/settings-sync');

// 激励视频广告
var videoAd = null;

// VIP 数据缓存 key
var VIP_CACHE_KEY = 'hr_vip_access';

Page({
  data: {
    levelsTop: [
      { key: '3', name: '入门', size: 3, desc: '基础', subDesc: '简单入门', stars: '★', color: 'linear-gradient(145deg,#FFD1DC,#FFB6C1)', txtColor: '#8B4557' },
      { key: '4', name: '初阶', size: 4, desc: '初阶', subDesc: '稍有挑战', stars: '★★', color: 'linear-gradient(145deg,#FFFACD,#F0E68C)', txtColor: '#8B8000' },
      { key: '5', name: '标准', size: 5, desc: '标准', subDesc: '标准难度', stars: '★★★', color: 'linear-gradient(145deg,#C1FFC1,#98FB98)', txtColor: '#2E8B57' },
      { key: '6', name: '中阶', size: 6, desc: '中阶', subDesc: '考验逻辑', stars: '★★★★', color: 'linear-gradient(145deg,#B0E0E6,#ADD8E6)', txtColor: '#4682B4' },
      { key: '7', name: '高阶', size: 7, desc: '高阶', subDesc: '高手进阶', stars: '★★★★★', color: 'linear-gradient(145deg,#E6E6FA,#DDA0DD)', txtColor: '#6A5ACD' },
      { key: '8', name: '极限', size: 8, desc: '极限', subDesc: '极限挑战', stars: '★★★★★★', color: 'linear-gradient(145deg,#FFDAB9,#FFBFA3)', txtColor: '#CD853F' }
    ],
    levelsBottom: [
      { key: '9', name: '疯狂', size: 9, desc: '疯狂', subDesc: '近乎疯狂', stars: '★★★★★★★', color: 'linear-gradient(145deg,#FFD1DC,#E6E6FA)', txtColor: '#8B4557', locked: true },
      { key: '10', name: '宗师', size: 10, desc: '宗师', subDesc: '大师之巅', stars: '★★★★★★★★', color: 'linear-gradient(145deg,#B0E0E6,#FFFACD)', txtColor: '#4682B4', locked: true }
    ],
    // VIP 弹窗
    showVipModal: false,
    vipModalSize: 0,
    // VIP 剩余次数（key: size字符串, value: 剩余次数）
    vipRemaining: {}
  },

  // ===== VIP 缓存管理 =====
  _getVipCache() {
    return wx.getStorageSync(VIP_CACHE_KEY) || {};
  },
  _setVipCache(data) {
    wx.setStorageSync(VIP_CACHE_KEY, data);
  },
  _getVipRemaining(sizeKey) {
    var cache = this._getVipCache();
    return (cache[sizeKey] && cache[sizeKey].remaining) || 0;
  },
  _setVipRemaining(sizeKey, remaining) {
    var cache = this._getVipCache();
    cache[sizeKey] = cache[sizeKey] || {};
    cache[sizeKey].remaining = remaining;
    this._setVipCache(cache);
  },

  _loadVipCounts() {
    var remaining = {};
    remaining['9'] = this._getVipRemaining('9');
    remaining['10'] = this._getVipRemaining('10');
    this.setData({ vipRemaining: remaining });
  },

  onLoad() {
    settingsSync.ensureInit();
    this.initBannerAd();
    this._loadVipCounts();

    // 创建激励视频广告（onClose 只绑定一次）
    if (wx.createRewardedVideoAd) {
      videoAd = wx.createRewardedVideoAd({
        adUnitId: appConfig.adUnits.reward
      });
      videoAd.onLoad(function () {});
      videoAd.onError(function (err) { console.error('hr level videoAd error', err); });
      var that = this;
      videoAd.onClose(function (res) {
        if (that._vipAdResolve) {
          that._vipAdResolve(res);
          that._vipAdResolve = null;
        }
      });
    }
  },

  onShow() {
    this._loadVipCounts();
  },

  initBannerAd() {
    if (typeof wx.createCustomAd !== 'function') return;
    var that = this;
    var ad = wx.createCustomAd({
      adUnitId: appConfig.adUnits.custom,
      style: { left: 0, top: 0 }
    });
    if (!ad) return;
    ad.onLoad(function () {
      wx.setNavigationBarColor({ frontColor: '#000000', backgroundColor: '#FFF9F0' });
      wx.setBackgroundColor({ backgroundColor: '#FFF9F0' });
    });
    ad.onError(function (err) { console.log('huarongDao level ad error', err); });
    ad.show();
    this.bannerAd = ad;
  },

  onUnload() {
    if (this.bannerAd) {
      this.bannerAd.destroy();
    }
  },

  onLevelTap(e) {
    const size = e.currentTarget.dataset.size;
    const sizeKey = String(size);

    // 检查是否是锁定难度（9x9 或 10x10）
    var isLocked = size >= 9;
    if (!isLocked) {
      wx.navigateTo({ url: '/pages/huarongDao/game/game?size=' + size });
      return;
    }

    var remaining = this._getVipRemaining(sizeKey);
    if (remaining > 0) {
      this._setVipRemaining(sizeKey, remaining - 1);
      this._loadVipCounts();
      wx.navigateTo({ url: '/pages/huarongDao/game/game?size=' + size });
    } else {
      this.setData({
        showVipModal: true,
        vipModalSize: size
      });
    }
  },

  // ===== VIP 解锁弹窗 =====
  onVipModalClose() {
    this.setData({ showVipModal: false, vipModalSize: 0 });
  },

  onVipAdTap() {
    var that = this;
    if (!videoAd) {
      wx.showToast({ title: '广告未就绪', icon: 'none' });
      return;
    }
    that._vipAdResolve = function (res) {
      if (res && res.isEnded) {
        var sizeKey = String(that.data.vipModalSize);
        that._setVipRemaining(sizeKey, 5);
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
          console.error('hr level videoAd show fail', err);
          wx.showToast({ title: '广告加载失败，请重试', icon: 'none' });
        });
    });
  },

  onShareAppMessage() {
    if (this.data.showVipModal && this.data.vipModalSize) {
      var that = this;
      var sizeKey = String(this.data.vipModalSize);
      setTimeout(function () {
        that._setVipRemaining(sizeKey, 5);
        that._loadVipCounts();
        that.onVipModalClose();
      }, 2000);
    }
    return {
      title: '我在玩数字华容道，一起来挑战吧！',
      path: '/pages/huarongDao/mode/mode',
      imageUrl: appConfig.shareImageUrl
    };
  },

  preventMove() {}
});
