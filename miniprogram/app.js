const CHILD_MODE_KEY = 'child_mode_settings';
const appConfig = require('./config.js');

App({
  globalData: {
    openid: null,
    userInfo: null,
    isLoggedIn: false,
    globalBestTime: '--',
    _tabSwitchTarget: ''
  },

  onLaunch() {
    // 延迟非关键初始化，让首屏优先渲染
    var that = this;
    setTimeout(function () {
      // 按需加载配置
      try {
        var config = require('data/game-config');
        that.globalData.MODES = config.MODES;
        that.globalData.LEVELS = config.LEVELS;
      } catch (e) {
        console.warn('game-config load failed:', e);
      }

      // 延迟 storage 读取
      var loginState = wx.getStorageSync('shult_login_state') || {};
      that.globalData.isLoggedIn = loginState.loggedIn || false;

      try {
        var settingsSync = require('utils/settings-sync');
        settingsSync.ensureInit();
      } catch (e) {
        console.warn('settings-sync init failed:', e);
      }
    }, 100);

    // 云开发初始化延迟到页面空闲时
    wx.nextTick(function () {
      setTimeout(function () {
        wx.cloud.init({
          env: appConfig.envId,
          traceUser: true
        });
      }, 500);
    });
  },

  onShow() {
    this._startChildModeTimer();
  },

  onHide() {
    this._stopChildModeTimer();
  },

  // ===== 儿童模式（累计计时，退出暂停，下次续加） =====
  _childTimerId: null,
  _sessionStart: null,

  _startChildModeTimer() {
    this._stopChildModeTimer();

    var settings = wx.getStorageSync(CHILD_MODE_KEY);
    if (!settings || !settings.enabled) return;

    // 记录本次进入时间
    this._sessionStart = Date.now();

    // 跨天重置累计时间
    if (settings.usedTime || settings.startTime) {
      var lastDate = settings.lastDate || settings.startTime || Date.now();
      var lastDay = new Date(lastDate);
      var today = new Date();
      if (lastDay.getDate() !== today.getDate() ||
          lastDay.getMonth() !== today.getMonth() ||
          lastDay.getFullYear() !== today.getFullYear()) {
        settings.usedTime = 0;
        settings.lastDate = Date.now();
        wx.setStorageSync(CHILD_MODE_KEY, settings);
      }
    } else {
      settings.usedTime = 0;
      settings.lastDate = Date.now();
      wx.setStorageSync(CHILD_MODE_KEY, settings);
    }

    // 立即检查一次
    this._checkChildModeTime(settings);

    // 每5秒检查一次
    var that = this;
    this._childTimerId = setInterval(function () {
      var s = wx.getStorageSync(CHILD_MODE_KEY);
      if (s && s.enabled) {
        that._checkChildModeTime(s);
      } else {
        that._stopChildModeTimer();
      }
    }, 5000);
  },

  _stopChildModeTimer() {
    // 退出时保存本次已用时间
    this._saveSessionTime();
    if (this._childTimerId) {
      clearInterval(this._childTimerId);
      this._childTimerId = null;
    }
  },

  _saveSessionTime() {
    if (this._sessionStart) {
      var elapsed = Date.now() - this._sessionStart;
      if (elapsed > 1000) { // 超过1秒才算
        var settings = wx.getStorageSync(CHILD_MODE_KEY) || {};
        settings.usedTime = (settings.usedTime || 0) + elapsed;
        wx.setStorageSync(CHILD_MODE_KEY, settings);
      }
      this._sessionStart = null;
    }
  },

  _checkChildModeTime(settings) {
    if (!settings || !settings.enabled) return;

    var used = settings.usedTime || 0;
    if (this._sessionStart) {
      used += Date.now() - this._sessionStart;
    }
    var elapsed = Math.floor(used / 60000);
    if (elapsed >= settings.duration) {
      this._stopChildModeTimer();
      this._showTimeUpModal();
    }
  },

  _showTimeUpModal() {
    var pages = getCurrentPages();
    var page = pages[pages.length - 1];
    if (page) {
      page.setData({ _timeUpModalVisible: true });
    } else {
      // 页面还没就绪，稍后重试
      var that = this;
      var retry = setInterval(function () {
        var p = getCurrentPages();
        if (p.length > 0) {
          clearInterval(retry);
          p[p.length - 1].setData({ _timeUpModalVisible: true });
        }
      }, 200);
    }
  },

  // ===== 原有代码 =====
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
    const mgRecords = wx.getStorageSync('mg_records') || [];

    const hasLocal = shultRecords.length > 0 || challengeRecords.length > 0 || huarongRecords.length > 0 || mbRecords.length > 0 || sudokuRecords.length > 0 || mgRecords.length > 0;
    if (!hasLocal) {
      this._syncing = false;
      if (callback) callback();
      return;
    }

    const total = shultRecords.length + challengeRecords.length + huarongRecords.length + mbRecords.length + sudokuRecords.length + mgRecords.length;
    let completed = 0;

    const checkDone = () => {
      completed++;
      if (completed < total) return;

      wx.removeStorageSync('shult_records');
      wx.removeStorageSync('huarong_records');
      wx.removeStorageSync('shult_challenge_records');
      wx.removeStorageSync('mb_records');
      wx.removeStorageSync('sudoku_records');
      wx.removeStorageSync('mg_records');

      this._syncing = false;
      if (callback) callback();
    };

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

    mgRecords.forEach(record => {
      wx.cloud.callFunction({
        name: 'saveMemoryGameRecord',
        data: {
          level: record.level,
          time: record.time || 0,
          errors: record.errors || 0,
          createTime: record.createTime || new Date().toISOString()
        },
        complete: checkDone
      });
    });
  }
});
