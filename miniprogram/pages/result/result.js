const appConfig = require('../../config.js');
const MODES = {
  classic: '经典模式', interference: '干扰模式', shuffle: '换位模式',
  reverse: '倒序模式', parity: '奇偶模式', challenge: '限时模式', memory: '记忆模式',
  alphabet: '字母模式'
};
const LEVELS = {
  base: '基础', primary: '初阶', high: '标准', super: '中阶',
  unique: '高阶', matchless: '极限', sky: '疯狂', crazy: '宗师'
};

const { RATING_DATA } = require('../../utils/rating-data');

// 插屏广告实例
let interstitialAd = null

/** 评价等级配置 */
const LEVEL_CONFIG = {
  excellent: { title: '顶尖专注力', subtitle: '' },
  good: { title: '中等水平', subtitle: '' },
  poor: { title: '有待提升', subtitle: '' }
};

/**
 * 根据完成时间、规格和年龄段评价等级
 * @returns {{ pass: boolean, level?: string, reason?: string }}
 */
function evaluateRating(timeMs, size, ageGroup) {
  const sizeData = RATING_DATA[size];
  if (!sizeData || sizeData.noData) {
    return { pass: false, reason: 'noData' };
  }
  if (!sizeData.ages) {
    return { pass: false, reason: 'noData' };
  }

  const ageEntry = sizeData.ages.find(a => a.age === ageGroup);
  if (!ageEntry) {
    return { pass: false, reason: 'noAge' };
  }
  if (ageEntry.apply === false) {
    return { pass: false, reason: 'notApply' };
  }

  const timeSec = timeMs / 1000;

  // 解析优秀阈值："5秒以内" → 5
  const excellentMatch = ageEntry.excellent.match(/([\d.]+)/);
  if (!excellentMatch) {
    return { pass: false, reason: 'parseError' };
  }
  const excellentThreshold = parseFloat(excellentMatch[1]);

  // 解析良好上限："5-9秒" → 9
  const goodMatch = ageEntry.good.match(/([\d.]+)\s*-\s*([\d.]+)/);
  const goodUpper = goodMatch ? parseFloat(goodMatch[2]) : null;

  if (timeSec <= excellentThreshold) {
    return { pass: true, level: 'excellent' };
  }
  if (goodUpper && timeSec <= goodUpper) {
    return { pass: true, level: 'good' };
  }
  return { pass: true, level: 'poor' };
}

Page({
  data: {
    isSuccess: true,
    face: '😊',
    title: '顺利通关',
    subtitle: '',
    encourageText: '',
    showLevel: false,
    rating: 'S',
    modeName: '',
    levelName: '',
    formattedTime: '00:00',
    accuracy: 100,
    mode: 'classic',
    level: 'base',
    size: 3,
    isPassMode: false,
    passLevelNumber: 1,
    animIn: false,
    lastTimeStr: '',
    bestTimeStr: '',
    showHistory: false
  },

  onLoad(options) {
    const isSuccess = options.status === 'success';
    const time = parseInt(options.time) || 0;
    const accuracy = parseInt(options.accuracy) || 0;
    const size = parseInt(options.size) || 3;

    let lastTimeStr = '';
    let bestTimeStr = '';
    let showHistory = false;

    if (time > 0) {
      const mode = options.mode || 'classic';
      const level = options.level || 'base';
      const localRecords = wx.getStorageSync('shult_records') || [];

      // 先用本地记录做初始展示
      const localResult = this.calcHistory(localRecords, mode, level, size, time);
      if (localResult) {
        lastTimeStr = localResult.lastTimeStr;
        bestTimeStr = localResult.bestTimeStr;
        showHistory = true;
      } else {
        showHistory = true;
      }

      // 异步查云端，合并本地+云端记录（不去重），更新更优数据
      wx.cloud.callFunction({
        name: 'getUserTrainRecords',
        data: {},
        success: res => {
          if (res.result && res.result.code === 200 && Array.isArray(res.result.data)) {
            const allRecords = [...localRecords, ...res.result.data];
            const mergedResult = this.calcHistory(allRecords, mode, level, size, time);
            if (mergedResult) {
              this.setData({
                lastTimeStr: mergedResult.lastTimeStr,
                bestTimeStr: mergedResult.bestTimeStr,
                showHistory: true
              });
            }
            // 全局最佳时间
            const app = getApp();
            const allSuccess = allRecords.filter(r => r.status === 'success');
            const globalBestMs = allSuccess.reduce((min, r) => Math.min(min, r.timeCost), Infinity);
            app.globalData.globalBestTime = globalBestMs === Infinity ? '--' : this.formatTime(globalBestMs);
          }
        },
        fail: () => {}
      });
    }

    let title = '顺利通关';
    let subtitle = '';
    let encourageText = '';
    let showLevel = false;

    if (isSuccess) {
      const ageGroup = wx.getStorageSync('shult_age_group') || '18岁以上';
      const result = evaluateRating(time, size, ageGroup);

      if (result.pass && result.level) {
        // 正常评价：优秀/良好/待提升
        const config = LEVEL_CONFIG[result.level];
        title = config.title;
        subtitle = config.subtitle;
        showLevel = true;
        encourageText = this.getEncourageText(result.level);
      } else {
        // 不适用或无数据 → 鼓励文案
        title = '挑战成功';
        subtitle = this.getNotApplyText(ageGroup);
      }
    } else {
      // 失败
      title = '失败';
      subtitle = this.getFailText();
    }

    this.setData({
      isSuccess,
      face: isSuccess ? '😊' : '🥺',
      title,
      subtitle,
      encourageText,
      showLevel,
      rating: this.getRating(accuracy),
      modeName: MODES[options.mode] || '经典模式',
      levelName: `${LEVELS[options.level] || '基础'}(${size}x${size})`,
      formattedTime: this.formatTime(time),
      accuracy,
      mode: options.mode || 'classic',
      level: options.level || 'base',
      size,
      isPassMode: options.pass === '1',
      passLevelNumber: parseInt(options.passLevel) || 1,
      lastTimeStr,
      bestTimeStr,
      showHistory
    });

    // 根据成败设置导航栏颜色
    wx.setNavigationBarColor({
      backgroundColor: isSuccess ? '#F0FDF4' : '#FFF0F0',
      frontColor: '#000000'
    });

    // 入场动画延迟触发
    setTimeout(() => {
      this.setData({ animIn: true });
    }, 50);

    // 创建插屏广告实例（先销毁旧的）
    if (wx.createInterstitialAd) {
      if (interstitialAd) interstitialAd.destroy();
      interstitialAd = wx.createInterstitialAd({
        adUnitId: appConfig.adUnits.interstitial
      })
      interstitialAd.onLoad(() => {})
      interstitialAd.onError((err) => {
        console.error('插屏广告加载失败', err)
      })
      interstitialAd.onClose(() => {})
    }

    // 延迟显示插屏广告
    if (interstitialAd) {
      setTimeout(function() {
        interstitialAd.show().catch(function(err) {
          console.error('插屏广告显示失败', err)
        })
      }, 800)
    }
  },

  formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${s}.${cs.toString().padStart(2, '0')}秒`;
  },

  getRating(accuracy) {
    if (accuracy >= 95) return 'S';
    if (accuracy >= 85) return 'A';
    if (accuracy >= 70) return 'B';
    return 'C';
  },

  getFailText() {
    const texts = [
      '你的注意力刚刚去月球出差了，快把它叫回来 🌙',
      '专注力像猫咪，这会儿跑去追激光笔了 🐱',
      '大脑CPU过热，需要重启一下...再试一次吧 🧠',
      '别急，连神仙也有走神的时候 ✨',
      '走神不是你的错，是这个格子太狡猾了 🦊',
      '注意力：我正在赶来的路上...请稍候 🚗',
      '眼睛盯着格子，心已经去吃饭了？先过关再干饭 🍚',
      '再试一次，你的专注力需要热身运动 🏃',
      '失败？那只是你大脑的闪存满了，清理一下就好 💾'
    ];
    return texts[Math.floor(Math.random() * texts.length)];
  },

  getEncourageText(level) {
    // 根据年龄段评价等级直接匹配对应文案
    const LEVEL_TEXTS = {
      excellent: [
        '你的专注力堪比超跑，一脚油门就通关了 🏎️',
        '这反应速度，闪电侠都得叫你一声大哥 ⚡',
        '注意力锐利如鹰，连蚊子飞过都逃不过你的眼睛 🦅',
        '你大脑的CPU是最新款的吧？快得离谱 🚀',
        '别人还在找1，你已经按完了——这就是专注的力量 💥'
      ],
      good: [
        '专注力在线，信号满格！继续保持 📡',
        '眼睛跟得上，手也跟得上，完美配合 👀✋',
        '你的注意力像狙击手——准、稳、狠 🎯',
        '大脑和手指默契度：98%，就差那2%的完美 💯',
        '这个速度，已经超越了全国80%的用户 📊'
      ],
      poor: [
        '稳扎稳打，专注力持久力满分！🏃',
        '不紧不慢，节奏感不错，像在公园散步 🚶',
        '虽然不快，但每一步都很稳，这就是靠谱 🎯',
        '不急不躁，心态稳如老狗 🐕',
        '虽然有点慢，但你坚持完成了，专注力耐力值拉满 🐢',
        '蜗牛也有到终点的一天，重点是没放弃！🐌',
        '速度不是问题，坚持才是王道——你已经赢了 👑',
        '慢工出细活，你刚刚完成了一场专注力马拉松 🏅'
      ]
    };
    const texts = LEVEL_TEXTS[level] || LEVEL_TEXTS.good;
    return texts[Math.floor(Math.random() * texts.length)];
  },

  getNotApplyText(ageGroup) {
    const texts = [
      `这个尺寸对你来说难度较大，但你能坚持完成，本身就是一种胜利！`,
      `这个规格对${ageGroup}的舒尔特训练来说有些偏大，坚持完成已经很棒了！`,
      `这个难度对${ageGroup}来说不太合适，但你依然完成了挑战，值得表扬！`,
      `虽然这个规格对${ageGroup}来说有些吃力，但你不放弃的精神更值得称赞 👏`,
      `不用气馁，这个尺寸对${ageGroup}的注意力训练来说本身就是进阶挑战！`
    ];
    return texts[Math.floor(Math.random() * texts.length)];
  },

  /** 从记录中查询同模式同难度的上次用时和最短用时 */
  calcHistory(records, mode, level, size, currentTime) {
    const matched = records.filter(r => r.mode === mode && r.level === level && r.size === size);
    if (matched.length <= 0 && !currentTime) return null;

    // "上次" = 已有记录中最新的一条
    let lastRecord = null;
    if (matched.length > 0) {
      matched.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      lastRecord = matched[0];
    }

    // "最短" = 历史成功记录 + 本次成功记录中的最小值
    const historySuccessTimes = matched.filter(r => r.status === 'success').map(r => r.timeCost);
    const allSuccessTimes = currentTime && this.data.isSuccess
      ? [...historySuccessTimes, currentTime]
      : historySuccessTimes;
    const bestTime = allSuccessTimes.length > 0 ? Math.min(...allSuccessTimes) : null;

    return {
      lastTimeStr: lastRecord ? this.formatTime(lastRecord.timeCost) : '',
      bestTimeStr: bestTime !== null ? this.formatTime(bestTime) : ''
    };
  },

  onRetry() {
    const { isPassMode, passLevelNumber, mode, level, size } = this.data;
    const qs = `mode=${mode}&level=${level}&size=${size}&pass=${isPassMode ? '1' : '0'}&passLevel=${passLevelNumber}`;

    wx.redirectTo({
      url: `/pages/game/game?${qs}`
    });
  },

  onChangeLevel() {
    wx.redirectTo({
      url: `/pages/level/level?mode=${this.data.mode}`
    });
  },

  onBackHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  onShowReference() {
    const ref = this.selectComponent('#refSheet');
    if (ref) ref.show();
  },

  /** 右上角转发 / 分享按钮 */
  onShareAppMessage() {
    const app = getApp();
    // 若云端尚未加载完，先fallback到本地
    if (app.globalData.globalBestTime === '--') {
      const records = wx.getStorageSync('shult_records') || [];
      const bestMs = records.filter(r => r.status === 'success')
        .reduce((min, r) => Math.min(min, r.timeCost), Infinity);
      app.globalData.globalBestTime = bestMs === Infinity ? '--' : this.formatTime(bestMs);
    }
    return {
      title: `你能几秒内找完以下数字，我用时${app.globalData.globalBestTime}。`,
      path: '/pages/game-select/game-select',
      imageUrl: appConfig.shareImageUrl
    };
  },

  // 原生模板广告事件
  adLoad() {
    const bg = this.data.isSuccess ? '#F0FDF4' : '#FFF0F0'
    wx.setNavigationBarColor({ backgroundColor: bg, frontColor: '#000000' })
  },
  adError(err) {
    console.error('原生模板广告加载失败', err)
  },
  adClose() {
    console.log('原生模板广告关闭')
  },

  onUnload() {
    if (interstitialAd) interstitialAd.destroy();
  }
});
