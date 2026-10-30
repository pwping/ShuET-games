var settingsSync = require('../../../utils/settings-sync');

var BOARD_SIZE = 6;
var TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;

Page({
  data: {
    cellSize: 0,
    boardWidth: 0,
    cells: [],
    level: 1,
    numCount: 3,
    currentNum: 1,
    timer: 0,
    timerText: '00:00',
    errors: 0,
    showSettings: false,
    soundEnabled: true,
    vibrateEnabled: true,
    levelLabel: '',
    allPassed: false
  },

  _positions: null,
  _timerInterval: null,
  _audioCtx: null,
  _soundEnabled: true,
  _vibrateEnabled: true,

  onLoad: function(options) {
    // options.level = 数字个数(3~36), options.display = 显示关卡号(1~34)
    var numCount = parseInt(options.level) || 3;
    var displayLevel = parseInt(options.display) || 1;
    if (numCount < 3) numCount = 3;
    if (numCount > 36) numCount = 36;
    if (displayLevel < 1) displayLevel = 1;
    if (displayLevel > 34) displayLevel = 34;

    var mgSettings = wx.getStorageSync('mg_settings') || {};
    this.setData({
      soundEnabled: mgSettings.sound !== false,
      vibrateEnabled: mgSettings.vibration !== false,
      level: displayLevel,
      numCount: numCount,
      levelLabel: '第' + displayLevel + '关',
      allPassed: displayLevel >= 34
    });
    this._soundEnabled = mgSettings.sound !== false;
    this._vibrateEnabled = mgSettings.vibration !== false;

    var sysInfo = wx.getSystemInfoSync();
    var screenWidth = sysInfo.screenWidth || sysInfo.windowWidth;
    var wrapPaddingPx = Math.round(16 * screenWidth / 750);
    var maxBoardW = screenWidth - wrapPaddingPx * 2;
    var boardPaddingPx = Math.round(4 * screenWidth / 750);
    var innerW = maxBoardW - boardPaddingPx * 2;
    var cellSize = Math.floor(innerW / BOARD_SIZE);
    var boardW = cellSize * BOARD_SIZE + boardPaddingPx * 2;
    this.setData({
      cellSize: cellSize,
      boardWidth: boardW
    });

    this._initLevel(numCount);
    wx.setNavigationBarTitle({ title: '数字记忆 · 第' + displayLevel + '关' });
  },

  onShow: function() {
    // 从结果页返回时，如果游戏已结束则自动重置
    if (this.data.currentNum > this.data.numCount) {
      this._initLevel(this.data.numCount);
    }
  },

  onUnload: function() {
    if (this._timerInterval) clearInterval(this._timerInterval);
    if (this._audioCtx) {
      try { this._audioCtx.close(); } catch (e) {}
      this._audioCtx = null;
    }
  },

  _initLevel: function(numCount) {
    var positions = this._generatePositions(numCount);
    this._positions = positions;
    this._currentNum = 1;
    this._errorsThisLevel = 0;

    var cells = [];
    for (var i = 0; i < TOTAL_CELLS; i++) {
      cells.push({ num: positions[i], hidden: false, row: Math.floor(i / BOARD_SIZE), col: i % BOARD_SIZE });
    }

    this.setData({
      cells: cells,
      currentNum: 1,
      errors: 0,
      timer: 0,
      timerText: '00:00',
      numCount: numCount
    });

    if (this._timerInterval) clearInterval(this._timerInterval);

    // 从进入游戏就开始计时
    this._startTimer();
  },

  _startTimer: function() {
    var self = this;
    // 继承已有时间或从0开始
    var baseTime = this.data.timer;
    var startTime = Date.now() - baseTime * 1000;
    this._timerInterval = setInterval(function() {
      var elapsed = Math.floor((Date.now() - startTime) / 1000);
      var m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      var s = String(elapsed % 60).padStart(2, '0');
      self.setData({ timer: elapsed, timerText: m + ':' + s });
    }, 200);
  },

  _generatePositions: function(n) {
    var arr = [];
    for (var i = 0; i < TOTAL_CELLS; i++) arr.push(i);
    for (var a = arr.length - 1; a > 0; a--) {
      var b = Math.floor(Math.random() * (a + 1));
      var t = arr[a]; arr[a] = arr[b]; arr[b] = t;
    }
    var result = new Array(TOTAL_CELLS).fill(0);
    for (var i = 0; i < n; i++) {
      result[arr[i]] = i + 1;
    }
    return result;
  },

  onCellTap: function(e) {
    var index = parseInt(e.currentTarget.dataset.index);
    var posNum = this._positions[index];
    var currentNum = this._currentNum;

    if (posNum === currentNum) {
      this._playSound('correct');

      if (currentNum === 1) {
        // 点击数字1 → 除1以外全部隐藏
        var cells = this.data.cells.map(function(c) {
          if (c.num === 1) return { num: c.num, hidden: false, row: c.row, col: c.col };
          return { num: c.num, hidden: true, row: c.row, col: c.col };
        });
        this._currentNum++;
        this.setData({ cells: cells, currentNum: this._currentNum });
      } else {
        // 点击正确数字 → 只揭露该格子
        var cells = this.data.cells.map(function(c, i) {
          if (i === index) return { num: c.num, hidden: false, row: c.row, col: c.col };
          return c;
        });
        this._currentNum++;
        this.setData({ cells: cells, currentNum: this._currentNum });
      }

      if (this._currentNum > this.data.numCount) {
        this._onWin();
      }
    } else {
      this._playSound('wrong');
      this._doVibrate();
      this.setData({ errors: this.data.errors + 1 });
      if (currentNum === 1) {
        wx.showToast({ title: '请从数字1开始', icon: 'none', duration: 1200 });
      }
    }
  },

  _resetLevel: function() {
    var numCount = this.data.numCount;
    if (this._timerInterval) clearInterval(this._timerInterval);

    var positions = this._generatePositions(numCount);
    this._positions = positions;
    this._currentNum = 1;

    var cells = [];
    for (var i = 0; i < TOTAL_CELLS; i++) {
      cells.push({ num: positions[i], hidden: false, row: Math.floor(i / BOARD_SIZE), col: i % BOARD_SIZE });
    }

    this.setData({
      cells: cells,
      currentNum: 1,
      timer: 0,
      timerText: '00:00',
      numCount: numCount
    });

    // 重置后重新开始计时
    this._startTimer();
  },

  _onWin: function() {
    if (this._timerInterval) clearInterval(this._timerInterval);
    this._playSound('win');

    // 本地标记已通关（只存本地，记录由结果页保存）
    var completed = wx.getStorageSync('mg_completed') || {};
    completed[String(this.data.level)] = true;
    wx.setStorageSync('mg_completed', completed);

    var self = this;
    setTimeout(function() {
      wx.navigateTo({
        url: '/pages/memoryGame/result/result?level=' + self.data.level + '&time=' + self.data.timer + '&errors=' + self.data.errors
      });
    }, 600);
  },

  onRestart: function() {
    this._initLevel(this.data.numCount);
  },

  onNextLevel: function() {
    var nextLevel = this.data.level + 1;
    if (nextLevel > 34) nextLevel = 1;
    var nextNumCount = nextLevel + 2;
    this.setData({ level: nextLevel, levelLabel: '第' + nextLevel + '关', numCount: nextNumCount, allPassed: nextLevel >= 34 });
    wx.setNavigationBarTitle({ title: '数字记忆 · 第' + nextLevel + '关' });
    this._initLevel(nextNumCount);
  },

  // ===== 设置弹窗 =====
  onShowSettings: function() {
    var s = wx.getStorageSync('mg_settings') || {};
    this.setData({ showSettings: true, soundEnabled: s.sound !== false, vibrateEnabled: s.vibration !== false });
  },
  onCloseSettings: function() { this.setData({ showSettings: false }); },
  onSoundToggle: function(e) {
    var v = e.detail.value;
    this.setData({ soundEnabled: v });
    this._soundEnabled = v;
    var s = wx.getStorageSync('mg_settings') || {}; s.sound = v;
    wx.setStorageSync('mg_settings', s);
    settingsSync.syncGlobalAfterToggle('sound', v);
  },
  onVibrateToggle: function(e) {
    var v = e.detail.value;
    this.setData({ vibrateEnabled: v });
    this._vibrateEnabled = v;
    var s = wx.getStorageSync('mg_settings') || {}; s.vibration = v;
    wx.setStorageSync('mg_settings', s);
    settingsSync.syncGlobalAfterToggle('vibration', v);
  },

  // ===== 音效 =====
  _playSound: function(type) {
    if (!this._soundEnabled) return;
    try {
      if (!this._audioCtx) this._audioCtx = wx.createWebAudioContext();
      var ctx = this._audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      if (type === 'correct') {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'wrong') {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'win') {
        var notes = [523, 659, 784];
        for (var n = 0; n < notes.length; n++) {
          (function(freq, delay) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
            gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.1);
            osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.1);
          })(notes[n], n * 0.1);
        }
      }
    } catch (e) {}
  },

  _doVibrate: function() {
    if (!this._vibrateEnabled) return;
    try { wx.vibrateShort({ type: 'medium' }); } catch (e) {
      try { wx.vibrateShort({ type: 'light' }); } catch (e2) {}
    }
  },

  preventMove: function() {},

  onShareAppMessage: function() {
    return {
      title: '数字记忆 第' + this.data.level + '关，来挑战你的记忆力！',
      path: '/pages/memoryGame/level/level'
    };
  }
});
