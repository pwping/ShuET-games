const settingsSync = require('../../../utils/settings-sync');

Page({
  data: {
    size: 4,
    tiles: [],
    emptyRow: -1,
    emptyCol: -1,
    moves: 0,
    timer: 0,
    timerStr: '00:00',
    solved: false,
    canMove: false,
    gameStarted: false,
    showSettings: false,
    soundEnabled: true,
    vibrateEnabled: true
  },

  _timerId: null,
  _startTime: 0,
  _colorClasses: ['pink', 'yellow', 'green', 'blue', 'purple', 'peach'],

  onLoad(options) {
    const size = parseInt(options.size) || 4;
    const hrSettings = wx.getStorageSync('hr_settings') || {};
    this.setData({
      soundEnabled: hrSettings.sound !== false,
      vibrateEnabled: hrSettings.vibrate !== false
    });
    this.computeBoard(size);
    this.initOrdered(size);
    wx.setNavigationBarTitle({
      title: `华容道(${size}x${size})`
    });
  },

  computeBoard(size) {
    const sys = wx.getSystemInfoSync();
    const screenW = sys.windowWidth;
    // 每侧占位：frame padding(12rpx) + frame border(3rpx) = 15rpx
    const sidePad = Math.round(15 * screenW / 750);
    const boardW = screenW - sidePad * 2;
    const gap = 2;
    const tileSize = Math.floor((boardW - gap * (size + 1)) / size);
    const tileFont = size <= 3 ? 64 : size <= 4 ? 56 : size <= 5 ? 50 : size <= 7 ? 40 : size <= 8 ? 34 : size <= 9 ? 30 : 26;
    this.setData({
      size,
      boardPx: boardW,
      tilePx: tileSize,
      tileFont,
      gap
    });
  },

  onUnload() {
    this.stopTimer();
  },

  initOrdered(size) {
    const n = size * size;
    const tiles = [];
    for (let i = 0; i < n - 1; i++) {
      const num = i + 1;
      tiles.push({
        num,
        row: Math.floor(i / size),
        col: i % size,
        colorClass: this._colorClasses[(num - 1) % 6]
      });
    }
    this.setData({
      tiles,
      emptyRow: size - 1,
      emptyCol: size - 1,
      moves: 0,
      timer: 0,
      timerStr: '00:00',
      solved: false,
      canMove: false,
      gameStarted: false
    });
  },

  // 开始游戏：打乱棋子
  onStart() {
    const size = this.data.size;
    const tiles = [...this.data.tiles];
    let er = size - 1, ec = size - 1;

    for (let i = 0; i < size * size * 20; i++) {
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      const valid = dirs.filter(([dr, dc]) => {
        const nr = er + dr, nc = ec + dc;
        return nr >= 0 && nr < size && nc >= 0 && nc < size;
      });
      const [dr, dc] = valid[Math.floor(Math.random() * valid.length)];
      const nr = er + dr, nc = ec + dc;
      const tile = tiles.find(t => t.row === nr && t.col === nc);
      tile.row = er; tile.col = ec;
      er = nr; ec = nc;
    }

    this.setData({
      tiles,
      emptyRow: er,
      emptyCol: ec,
      moves: 0,
      timer: 0,
      timerStr: '00:00',
      gameStarted: true,
      canMove: true,
      solved: false
    });
    this.startTimer();
  },

  startTimer() {
    this._startTime = Date.now();
    this._timerId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this._startTime) / 1000);
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      this.setData({
        timer: elapsed,
        timerStr: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      });
    }, 200);
  },

  stopTimer() {
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  },

  playMoveSound() {
    if (!this.data.soundEnabled) return;
    try {
      if (!this._audioCtx) {
        this._audioCtx = wx.createWebAudioContext();
      }
      const ctx = this._audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  },

  playVibration() {
    if (!this.data.vibrateEnabled) return;
    try {
      wx.vibrateShort({ type: 'medium' });
    } catch (e) {
      try { wx.vibrateShort({ type: 'light' }); } catch (e2) {}
    }
  },

  playErrorSound() {
    const settings = wx.getStorageSync('shult_settings') || {};
    if (settings.sound === false) return;
    try {
      if (!this._audioCtx) {
        this._audioCtx = wx.createWebAudioContext();
      }
      const ctx = this._audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  },

  onTileTap(e) {
    if (!this.data.canMove || this.data.solved) {
      if (!this.data.gameStarted) this.playErrorSound();
      return;
    }
    const { row, col } = e.currentTarget.dataset;
    const { emptyRow, emptyCol, tiles } = this.data;

    // 检查是否与空格在同一行或同一列
    if (row !== emptyRow && col !== emptyCol) return;

    // 计算滑动方向
    const dRow = Math.sign(emptyRow - row);
    const dCol = Math.sign(emptyCol - col);

    // 获取从点击位置到空格之间的所有棋子（不含空格）
    const toMove = [];
    let r = row, c = col;
    while (r !== emptyRow || c !== emptyCol) {
      const tile = tiles.find(t => t.row === r && t.col === c);
      if (tile) toMove.push(tile);
      r += dRow;
      c += dCol;
    }

    if (toMove.length === 0) return;

    // 播放音效和震动
    this.playMoveSound();
    this.playVibration();

    // 移动这些棋子（向空格方向滑动一格）
    const newTiles = [...tiles];
    toMove.forEach(t => {
      const tile = newTiles.find(nt => nt.num === t.num);
      tile.row += dRow;
      tile.col += dCol;
    });

    // 空格移动到点击位置
    const moves = this.data.moves + 1;
    this.setData({
      tiles: newTiles,
      emptyRow: row,
      emptyCol: col,
      moves
    }, () => {
      // setData 完成后再检查胜利，确保棋子已滑动到正确位置
      this.checkWin();
    });
  },

  checkWin() {
    const tiles = this.data.tiles;
    let allCorrect = true;
    for (const t of tiles) {
      const expectedRow = Math.floor((t.num - 1) / this.data.size);
      const expectedCol = (t.num - 1) % this.data.size;
      if (t.row !== expectedRow || t.col !== expectedCol) {
        allCorrect = false;
        break;
      }
    }
    if (allCorrect) {
      this.stopTimer();
      this.setData({ solved: true, canMove: false });
      wx.navigateTo({
        url: `/pages/huarongDao/result/result?size=${this.data.size}&time=${this.data.timer}&moves=${this.data.moves}`
      });
    }
  },

  // 重来：回到初始有序状态
  onReset() {
    if (!this.data.gameStarted) return;
    this.stopTimer();
    this.initOrdered(this.data.size);
  },

  onBack() {
    wx.navigateBack();
  },

  // 设置弹窗
  onShowSettings() {
    const hrSettings = wx.getStorageSync('hr_settings') || {};
    this.setData({
      showSettings: true,
      soundEnabled: hrSettings.sound !== false,
      vibrateEnabled: hrSettings.vibrate !== false
    });
  },
  onCloseSettings() {
    this.setData({ showSettings: false });
  },
  onSoundToggle(e) {
    const val = e.detail.value;
    this.setData({ soundEnabled: val });
    const settings = wx.getStorageSync('hr_settings') || {};
    settings.sound = val;
    wx.setStorageSync('hr_settings', settings);
    settingsSync.syncGlobalAfterToggle('sound', val);
  },
  onVibrateToggle(e) {
    const val = e.detail.value;
    this.setData({ vibrateEnabled: val });
    const settings = wx.getStorageSync('hr_settings') || {};
    settings.vibrate = val;
    wx.setStorageSync('hr_settings', settings);
    settingsSync.syncGlobalAfterToggle('vibration', val);
  },
  preventMove() {}
});
