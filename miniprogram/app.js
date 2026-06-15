App({
  globalData: {
    openid: null,
    userInfo: null,
    isLoggedIn: false,
    globalBestTime: '--',
    _tabSwitchTarget: '',
    MODES: [
      { key: 'classic', name: '经典模式', desc: '从1开始按顺序点击数字' },
      { key: 'interference', name: '干扰模式', desc: '彩色背景下的抗干扰训练' },
      { key: 'shuffle', name: '换位模式', desc: '正确后数字重新排列' },
      { key: 'reverse', name: '倒序模式', desc: '从大到小倒序点击' },
      { key: 'parity', name: '奇偶模式', desc: '从小到大点击奇数或偶数' },
      { key: 'challenge', name: '限时模式', desc: '每步限时2秒' },
      { key: 'alphabet', name: '字母模式', desc: '按顺序点击A-Z字母' },
      { key: 'memory', name: '记忆模式', desc: '先记忆，然后按顺序点击' }
    ],
    LEVELS: [
      { key: 'base', name: '基础', size: 3 },
      { key: 'primary', name: '初阶', size: 4 },
      { key: 'high', name: '标准', size: 5 },
      { key: 'super', name: '中阶', size: 6 },
      { key: 'unique', name: '高阶', size: 7 },
      { key: 'matchless', name: '极限', size: 8 },
      { key: 'sky', name: '疯狂', size: 9 },
      { key: 'crazy', name: '宗师', size: 10 }
    ]
  },

  onLaunch() {
    // 优先读取登录状态（同步，数据极小不阻塞）
    const loginState = wx.getStorageSync('shult_login_state') || {};
    this.globalData.isLoggedIn = loginState.loggedIn || false;

    // 初始化设置总开关，确保所有游戏设置存在
    try {
      const settingsSync = require('utils/settings-sync');
      settingsSync.ensureInit();
    } catch (e) {
      console.warn('settings-sync init failed:', e);
    }

    // 云初始化延迟到首帧渲染后，让页面优先展示
    wx.nextTick(() => {
      wx.cloud.init({
        env: 'xcx-prj-d5gzqi12z8482282f',
        traceUser: true
      });
    });
  },

  // 将本地缓存记录同步到云端，无论同步是否成功，都删除本地缓存数据
  _syncing: false,

  syncLocalRecordsToCloud(callback) {
    if (this._syncing) {
      if (callback) callback();
      return;
    }
    this._syncing = true;

    const shultRecords = wx.getStorageSync('shult_records') || [];
    const challengeRecords = wx.getStorageSync('shult_challenge_records') || [];
    const huarongRecords = wx.getStorageSync('huarong_records') || [];
    const mbRecords = wx.getStorageSync('mb_records') || [];
    const sudokuRecords = wx.getStorageSync('sudoku_records') || [];

    const hasLocal = shultRecords.length > 0 || challengeRecords.length > 0 || huarongRecords.length > 0 || mbRecords.length > 0 || sudokuRecords.length > 0;
    if (!hasLocal) {
      this._syncing = false;
      if (callback) callback();
      return;
    }

    const total = shultRecords.length + challengeRecords.length + huarongRecords.length + mbRecords.length + sudokuRecords.length;
    let completed = 0;

    const checkDone = () => {
      completed++;
      if (completed < total) return;

      // 不管同步成功还是失败，直接删除所有本地缓存记录
      wx.removeStorageSync('shult_records');
      wx.removeStorageSync('huarong_records');
      wx.removeStorageSync('shult_challenge_records');
      wx.removeStorageSync('mb_records');
      wx.removeStorageSync('sudoku_records');

      this._syncing = false;
      if (callback) callback();
    };

    // 同步舒尔特记录
    shultRecords.forEach(record => {
      wx.cloud.callFunction({
        name: 'saveTrainRecord',
        data: {
          mode: record.mode, level: record.level, size: record.size,
          timeCost: record.timeCost, status: record.status, accuracy: record.accuracy,
          ...(record.createTime ? { createTime: record.createTime } : {})
        },
        complete: checkDone
      });
    });

    // 同步华容道记录
    huarongRecords.forEach(record => {
      wx.cloud.callFunction({
        name: 'saveHuarongRecord',
        data: {
          size: record.size, moves: record.moves || 0, time: record.time || 0,
          ...(record.createTime ? { createTime: record.createTime } : {})
        },
        complete: checkDone
      });
    });

    // 同步挑战记录
    challengeRecords.forEach(record => {
      wx.cloud.callFunction({
        name: 'saveChallengeRecord',
        data: {
          passLevel: record.passLevel || 1, timeMs: record.timeMs,
          success: record.success,
          accuracy: record.accuracy !== undefined ? record.accuracy : (record.success ? 100 : Math.round(Math.random() * 80 + 20)),
          createTime: record.dateTime || new Date().toISOString()
        },
        complete: checkDone
      });
    });

    // 同步积木迷阵记录
    mbRecords.forEach(record => {
      wx.cloud.callFunction({
        name: 'saveMovingBlockRecord',
        data: {
          levelId: record.levelId,
          moves: record.moves || 0,
          steps: record.steps || 0,
          time: record.time || 0,
          difficulty: record.diff || record.difficulty || 'easy',
          createTime: record.createTime || new Date().toISOString()
        },
        complete: checkDone
      });
    });

    // 同步数独记录
    sudokuRecords.forEach(record => {
      wx.cloud.callFunction({
        name: 'saveSudokuRecord',
        data: {
          difficulty: record.difficulty,
          time: record.time || 0,
          hints: record.hints || 0,
          errors: record.errors || 0,
          correct: record.correct || 0,
          undo: record.undo || 0,
          createTime: record.createTime || new Date().toISOString()
        },
        complete: checkDone
      });
    });
  }
});
