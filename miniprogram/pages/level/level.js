const app = getApp();

var videoAd = null;
var VIP_CACHE_KEY = 'shult_level_vip_access';

var VIP_LOCKED_MODES = ['classic', 'interference', 'shuffle', 'reverse', 'parity'];

const ALL_LEVELS = [
  { key: 'base', name: '基础', size: 3, tag: '入门',
    color: '#10B981', desc: '基础辨认与追踪' },
  { key: 'primary', name: '初阶', size: 4, tag: '简单',
    color: '#8B5CF6', desc: '初级视觉广度锻炼' },
  { key: 'high', name: '标准', size: 5, tag: '标准',
    color: '#14B8A6', desc: '国际标准方格' },
  { key: 'super', name: '中阶', size: 6, tag: '进阶',
    color: '#0284C7', desc: '中级挑战配合记忆辅助' },
  { key: 'unique', name: '高阶', size: 7, tag: '高手',
    color: '#D97706', desc: '高强度视觉搜索与快速定位协同' },
  { key: 'matchless', name: '极限', size: 8, tag: '极限',
    color: '#E11D48', desc: '极限视觉扫视' },
  { key: 'sky', name: '疯狂', size: 9, tag: '巅峰',
    color: '#BE185D', desc: '疯狂挑战但别在意速度' },
  { key: 'crazy', name: '宗师', size: 10, tag: '终极',
    color: '#EA580C', desc: '能完成就很不错了' }
];

const ALPHABET_LEVELS = [
  { key: 'base', name: '基础', size: 3, tag: '入门',
    color: '#10B981', desc: '基础辨认与追踪' },
  { key: 'primary', name: '初阶', size: 4, tag: '简单',
    color: '#8B5CF6', desc: '初级视觉广度锻炼' },
  { key: 'high', name: '标准', size: 5, tag: '标准',
    color: '#14B8A6', desc: '国际标准方格' }
];

Page({
  data: {
    mode: '',
    modeName: '',
    levels: [],
    animIn: false,
    // VIP
    showVipModal: false,
    vipModalSize: 0,
    vipModalKey: '',
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
    remaining.sky = this._getVipRemaining('sky');
    remaining.crazy = this._getVipRemaining('crazy');
    this.setData({ vipRemaining: remaining });
  },

  onLoad(options) {
    const mode = options.mode || 'classic';
    const modeInfo = app.globalData.MODES
      ? app.globalData.MODES.find(m => m.key === mode)
      : null;
    this.setData({
      mode: mode,
      modeName: modeInfo ? modeInfo.name : '经典模式',
      animIn: true
    });
    setTimeout(() => this.setData({ animIn: false }), 350);
    this.setLevels();
    this._loadVipCounts();
  },

  onShow() {
    this._loadVipCounts();
  },

  setLevels() {
    const mode = this.data.mode;
    var levels = mode === 'alphabet'
      ? ALPHABET_LEVELS.map(function(l) { return { ...l }; })
      : ALL_LEVELS.map(function(l) { return { ...l }; });

    // 特定模式下的 9x9 和 10x10 加锁
    if (VIP_LOCKED_MODES.indexOf(mode) !== -1) {
      for (var i = 0; i < levels.length; i++) {
        if (levels[i].size >= 9) {
          levels[i].locked = true;
        }
      }
    }

    this.setData({ levels: levels });
  },

  onLevelTap(e) {
    const index = e.currentTarget.dataset.index;
    const level = this.data.levels[index];
    const mode = this.data.mode;

    // 锁定难度检查
    if (level.locked) {
      var key = level.key;
      var remaining = this._getVipRemaining(key);
      if (remaining > 0) {
        this._setVipRemaining(key, remaining - 1);
        this._loadVipCounts();
        wx.navigateTo({
          url: '/pages/game/game?mode=' + mode + '&level=' + level.key + '&size=' + level.size
        });
      } else {
        this.setData({
          showVipModal: true,
          vipModalSize: level.size,
          vipModalKey: key
        });
      }
      return;
    }

    wx.navigateTo({
      url: '/pages/game/game?mode=' + mode + '&level=' + level.key + '&size=' + level.size
    });
  },

  // ===== VIP 解锁弹窗 =====
  onVipModalClose() {
    this.setData({ showVipModal: false, vipModalSize: 0, vipModalKey: '' });
  },

  onVipAdTap() {
    var that = this;
    if (!videoAd) {
      // 懒创建激励视频广告
      if (!wx.createRewardedVideoAd) {
        wx.showToast({ title: '当前环境不支持广告', icon: 'none' });
        return;
      }
      videoAd = wx.createRewardedVideoAd({
        adUnitId: 'adunit-c24dfbbb7eeb1518'
      });
      videoAd.onError(function (err) { console.error('shult level videoAd error', err); });
      videoAd.onClose(function (res) {
        if (that._vipAdResolve) {
          that._vipAdResolve(res);
          that._vipAdResolve = null;
        }
      });
    }
    that._vipAdResolve = function (res) {
      if (res && res.isEnded) {
        var key = that.data.vipModalKey;
        that._setVipRemaining(key, 5);
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
          console.error('shult level videoAd show fail', err);
          wx.showToast({ title: '广告加载失败，请重试', icon: 'none' });
        });
    });
  },

  onShareAppMessage() {
    if (this.data.showVipModal && this.data.vipModalKey) {
      var that = this;
      var key = this.data.vipModalKey;
      setTimeout(function () {
        that._setVipRemaining(key, 5);
        that._loadVipCounts();
        that.onVipModalClose();
      }, 2000);
    }
    return {
      title: '我在玩舒尔特方格，来挑战吧！',
      path: '/pages/game-select/game-select',
      imageUrl: 'cloud://xcx-prj-d5gzqi12z8482282f.7863-xcx-prj-d5gzqi12z8482282f-1426704286/images/share-card.png'
    };
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
