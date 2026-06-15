// 各等级评价语录（随机显示）
const QUOTES = {
  excellent: [
    '天才玩家！这操作如丝般顺滑~',
    '太强了吧！积木看了都想给你鼓掌！',
    '完美通关！你怕不是开了挂？',
    '脑子：我会了。手：我也行了！',
    '这速度，积木都被你玩出花来了！'
  ],
  good: [
    '还不错哦，再练练就是大神了！',
    '稳扎稳打，进步空间大大的！',
    '差一点点就完美了，继续加油！',
    '这波操作很溜，下次争取更溜！',
    '优秀选手，就差临门一脚！'
  ],
  effort: [
    '没关系，通往大神的路总是曲折的~',
    '这次先探探路，下次一把过！',
    '失败是成功的妈，多试几次就对了！',
    '别灰心，积木也会为你加油的！',
    '每一步都算数，继续冲就完了！'
  ]
};

function randomQuote(level) {
  const list = QUOTES[level] || QUOTES.effort;
  return list[Math.floor(Math.random() * list.length)];
}

Page({
  data: {
    levelId: '', moves: 0, steps: 0, time: 0,
    timerText: '00:00', difficulty: '',
    stars: 0, starLevel: '', quote: ''
  },

  onLoad(options) {
    const levelId = options.level || '';
    const moves = parseInt(options.moves) || 0;
    const steps = parseInt(options.steps) || 1;
    const time = parseInt(options.time) || 0;
    const diff = options.diff || 'easy';
    const m = String(Math.floor(time / 60)).padStart(2, '0');
    const s = String(time % 60).padStart(2, '0');

    // 星级: 优秀(5星)≤steps+4, 良好(4星)≤steps+8, 努力(3星)其他
    const diffSteps = moves - steps;
    let stars, starLevel;
    if (diffSteps <= 4) {
      stars = 5; starLevel = 'excellent';
    } else if (diffSteps <= 8) {
      stars = 4; starLevel = 'good';
    } else {
      stars = 3; starLevel = 'effort';
    }

    this.setData({
      levelId, moves, steps, time,
      timerText: `${m}:${s}`, difficulty: diff,
      stars, starLevel, quote: randomQuote(starLevel)
    });

    // 保存记录
    this.saveRecord({ levelId, moves, steps, time, diff });
  },

  saveRecord(record) {
    const app = getApp();
    const createTime = new Date().toISOString();
    const data = { ...record, createTime };

    // 未登录：保存到本地缓存
    if (!app.globalData.isLoggedIn) {
      const records = wx.getStorageSync('mb_records') || [];
      records.unshift(data);
      wx.setStorageSync('mb_records', records.slice(0, 200));
    }

    // 已登录：保存到云端
    if (app.globalData.isLoggedIn) {
      wx.cloud.callFunction({
        name: 'saveMovingBlockRecord',
        data: { levelId: data.levelId, moves: data.moves, steps: data.steps, time: data.time, difficulty: data.diff, createTime },
        complete() {
          // 不管云函数成功还是失败，都删除本地缓存
          wx.removeStorageSync('mb_records');
        }
      });
    }
  },

  onRecordList() {
    wx.navigateTo({ url: '/pages/history/history?tab=movingBlock' });
  },

  onRetry() {
    const pages = getCurrentPages();
    const prev = pages[pages.length - 2];
    if (prev && prev.route && prev.route.includes('movingBlocks/game')) {
      prev.onRestart();
      wx.navigateBack();
    } else {
      wx.navigateBack({ delta: 2 });
    }
  },

  onNext() {
    const pages = getCurrentPages();
    const prev = pages[pages.length - 2];
    if (prev && prev.route && prev.route.includes('movingBlocks/game')) {
      prev.onNextLevel();
      wx.navigateBack();
    } else {
      wx.navigateBack({ delta: 2 });
    }
  },

  onShareAppMessage() {
    return {
      title: `积木迷阵 第${this.data.levelId}关 ${this.data.moves}步通关！`,
      path: '/pages/movingBlocks/level/level'
    };
  }
});
