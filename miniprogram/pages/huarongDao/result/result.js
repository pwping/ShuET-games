// 华容道等级评定数据（时间上限，秒）
const GRADE_DATA = {
  3:  { master: 6,  pro: 10 },
  4:  { master: 25, pro: 50 },
  5:  { master: 60, pro: 120 },
  6:  { master: 120, pro: 180 },
  7:  { master: 240, pro: 360 },
  8:  { master: 420, pro: 600 },
  9:  { master: 600, pro: 1080 },
  10: { master: 900, pro: 1800 },
};

const QUOTES = {
  beginner: [
    '恭喜你完成了人生第一盘华容道！虽然走得慢，但至少没有迷路～',
    '新手光环护体！下次试试闭着眼睛玩？可能会更快哦～',
    '华容道初体验达成！曹操：你早晚会追上我的！',
  ],
  pro: [
    '可以啊，这速度已经让曹操捏了一把冷汗！',
    '老司机带带我！你这操作已经超过99%的新手了～',
    '熟练得让人心疼，华容道欠你一个段位证书！',
  ],
  master: [
    '震惊！你的手速让曹操怀疑人生："是不是我走太慢了？"',
    '天选华容道人！建议改名为闪电侠·华容道版～',
    '恭喜获得"人形计算机"称号！下一步：挑战盲拧华容道！',
  ],
};

Page({
  data: {
    size: 4,
    time: 0,
    timeStr: '00:00',
    moves: 0,
    grade: 'beginner',
    gradeName: '新手入门',
    starCount: 3,
    quote: '',
  },

  onLoad(options) {
    const size = parseInt(options.size) || 4;
    const time = parseInt(options.time) || 0;
    const moves = parseInt(options.moves) || 0;
    const m = Math.floor(time / 60);
    const s = time % 60;
    const timeStr = m > 0 ? `${m}分${String(s).padStart(2, '0')}秒` : `${s}秒`;

    const grade = this.calcGrade(size, time);
    const { gradeName, starCount, levelQuotes } = {
      beginner: { gradeName: '新手入门', starCount: 3, levelQuotes: QUOTES.beginner },
      pro:      { gradeName: '熟练玩家', starCount: 4, levelQuotes: QUOTES.pro },
      master:   { gradeName: '顶尖高手', starCount: 5, levelQuotes: QUOTES.master },
    }[grade];
    const quote = levelQuotes[Math.floor(Math.random() * levelQuotes.length)];

    // 保存记录
    const app = getApp();
    const createTime = new Date().toISOString();
    const record = { size, time, moves, createTime };

    // 未登录：保存到本地缓存
    if (!app.globalData.isLoggedIn) {
      const records = wx.getStorageSync('huarong_records') || [];
      records.unshift(record);
      wx.setStorageSync('huarong_records', records.slice(0, 200));
    }

    // 已登录：保存到云端
    if (app.globalData.isLoggedIn) {
      wx.cloud.callFunction({
        name: 'saveHuarongRecord',
        data: record,
        complete() {
          // 不管云函数成功还是失败，都删除本地缓存
          wx.removeStorageSync('huarong_records');
        }
      });
    }

    this.setData({
      size, time, moves, timeStr, grade, gradeName, starCount, quote,
    });

    // 插屏广告
    this.showInterstitialAd();
    // 贴片广告
    this.initBannerAd();
  },

  showInterstitialAd() {
    var interstitialAd = wx.createInterstitialAd({
      adUnitId: 'adunit-ae9ae21b013ddd4b'
    });
    if (!interstitialAd) return;
    interstitialAd.onLoad(function () {});
    interstitialAd.onError(function (err) { console.log('huarongDao result interstitial error', err); });
    interstitialAd.onClose(function () {});
    interstitialAd.show().catch(function () {});
    this.interstitialAd = interstitialAd;
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
      wx.setNavigationBarColor({ frontColor: '#000000', backgroundColor: '#FFF0F5' });
      wx.setBackgroundColor({ backgroundColor: '#FFF0F5' });
    });
    ad.onError(function (err) { console.log('huarongDao result ad error', err); });
    ad.show();
    this.bannerAd = ad;
  },

  onUnload() {
    if (this.bannerAd) this.bannerAd.destroy();
    if (this.interstitialAd) this.interstitialAd.destroy();
  },

  calcGrade(size, time) {
    const g = GRADE_DATA[size];
    if (!g) return 'beginner';
    if (time <= g.master) return 'master';
    if (time <= g.pro) return 'pro';
    return 'beginner';
  },

  onRetry() {
    wx.redirectTo({
      url: `/pages/huarongDao/game/game?size=${this.data.size}`,
    });
  },

  onBackMenu() {
    wx.navigateBack({ delta: 2 });
  },

  onChangeLevel() {
    wx.redirectTo({
      url: `/pages/huarongDao/level/level?size=${this.data.size}`,
    });
  },

  onShareAppMessage() {
    return {
      title: `数字华容道 ${this.data.size}×${this.data.size} ${this.data.gradeName}`,
      path: `/pages/huarongDao/level/level`,
    };
  },
});