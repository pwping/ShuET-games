var settingsSync = require('../../../utils/settings-sync');

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
      { key: '9', name: '疯狂', size: 9, desc: '疯狂', subDesc: '近乎疯狂', stars: '★★★★★★★', color: 'linear-gradient(145deg,#FFD1DC,#E6E6FA)', txtColor: '#8B4557' },
      { key: '10', name: '宗师', size: 10, desc: '宗师', subDesc: '大师之巅', stars: '★★★★★★★★', color: 'linear-gradient(145deg,#B0E0E6,#FFFACD)', txtColor: '#4682B4' }
    ]
  },

  onLoad() {
    settingsSync.ensureInit();
    this.initBannerAd();
  },

  initBannerAd() {
    if (typeof wx.createCustomAd !== 'function') return;
    var that = this;
    var ad = wx.createCustomAd({
      adUnitId: 'adunit-2bb753c35ab3d982',
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
    const { size } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/huarongDao/game/game?size=${size}` });
  }
});
