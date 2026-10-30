const appConfig = require('../../../config.js');
const settingsSync = require('../../../utils/settings-sync');

// 激励视频广告
var videoAd = null;

// ===== A* 求解器（曼哈顿距离启发式）=====
function aStarSolve(tiles, size, emptyRow, emptyCol) {
  // 状态编码
  function encode(tilesArr, er, ec) {
    var sorted = tilesArr.slice().sort(function(a, b) { return a.num - b.num; });
    var parts = sorted.map(function(t) { return t.row + ',' + t.col; });
    parts.push(er + ',' + ec);
    return parts.join('|');
  }

  // 曼哈顿距离启发式
  function manhattan(tilesArr) {
    var dist = 0;
    for (var i = 0; i < tilesArr.length; i++) {
      var t = tilesArr[i];
      var tr = Math.floor((t.num - 1) / size);
      var tc = (t.num - 1) % size;
      dist += Math.abs(t.row - tr) + Math.abs(t.col - tc);
    }
    return dist;
  }

  var goalTiles = [];
  for (var i = 0; i < size * size - 1; i++) {
    goalTiles.push({ num: i + 1, row: Math.floor(i / size), col: i % size });
  }
  var goalStr = encode(goalTiles, size - 1, size - 1);

  var startStr = encode(tiles, emptyRow, emptyCol);
  if (startStr === goalStr) return null;

  var openSet = [{ tiles: tiles.slice(), er: emptyRow, ec: emptyCol, path: [], g: 0, f: manhattan(tiles) }];
  var visited = {};
  visited[startStr] = true;

  var maxStates = 200000;
  var totalPops = 0;

  while (openSet.length > 0 && totalPops < maxStates) {
    // 找 f 值最小的
    var bestIdx = 0;
    var bestF = openSet[0].f;
    for (var i = 1; i < openSet.length; i++) {
      if (openSet[i].f < bestF) { bestF = openSet[i].f; bestIdx = i; }
    }
    var cur = openSet[bestIdx];
    openSet.splice(bestIdx, 1);
    totalPops++;

    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var d = 0; d < dirs.length; d++) {
      var nr = cur.er + dirs[d][0];
      var nc = cur.ec + dirs[d][1];
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      var idx = -1;
      for (var ti = 0; ti < cur.tiles.length; ti++) {
        if (cur.tiles[ti].row === nr && cur.tiles[ti].col === nc) { idx = ti; break; }
      }
      if (idx < 0) continue;
      var newTiles = cur.tiles.map(function(t) { return { num: t.num, row: t.row, col: t.col }; });
      newTiles[idx].row = cur.er;
      newTiles[idx].col = cur.ec;
      var stateStr = encode(newTiles, nr, nc);
      if (visited[stateStr]) continue;
      visited[stateStr] = true;
      var newPath = cur.path.concat([{ num: cur.tiles[idx].num, fromRow: nr, fromCol: nc, toRow: cur.er, toCol: cur.ec }]);
      if (stateStr === goalStr) return newPath;
      openSet.push({ tiles: newTiles, er: nr, ec: nc, path: newPath, g: cur.g + 1, f: cur.g + 1 + manhattan(newTiles) });
    }
  }
  return null;
}

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
    correctCount: 0,
    totalCount: 0,
    hintRemaining: 2,
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

    // 创建激励视频广告实例
    if (wx.createRewardedVideoAd) {
      videoAd = wx.createRewardedVideoAd({
        adUnitId: appConfig.adUnits.reward
      });
      videoAd.onLoad(function () {});
      videoAd.onError(function (err) { console.error('hr game videoAd error', err); });
      videoAd.onClose(function (res) {});
    }
  },

  onShow() {
    // 从结果页返回时，重置游戏（回到有序状态）
    if (this.data.solved) {
      this.stopTimer();
      this.initOrdered(this.data.size);
    }
  },

  onUnload() {
    this.stopTimer();
  },

  computeBoard(size) {
    const sys = wx.getSystemInfoSync();
    const screenW = sys.windowWidth;
    const screenH = sys.windowHeight;
    // 预留非棋盘空间：统计栏+进度条+边距
    const overhead = Math.round(144 * screenW / 750);
    const maxBoardByH = screenH - overhead;
    // board-frame: width: calc(100% - 24rpx) + 居中 + padding: 12rpx
    // 所以棋盘实际可用宽度 = screenW - 24rpx(两侧留白) - 24rpx(frame padding)
    const frameMargin = Math.round(12 * screenW / 750);
    const framePad = Math.round(12 * screenW / 750);
    const boardByW = screenW - (frameMargin + framePad) * 2;
    const boardW = Math.min(boardByW, maxBoardByH);
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
      gameStarted: false,
      correctCount: 0,
      totalCount: n - 1,
      hintRemaining: 2
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
      solved: false,
      correctCount: 0
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

    if (row !== emptyRow && col !== emptyCol) return;

    const dRow = Math.sign(emptyRow - row);
    const dCol = Math.sign(emptyCol - col);

    const toMove = [];
    let r = row, c = col;
    while (r !== emptyRow || c !== emptyCol) {
      const tile = tiles.find(t => t.row === r && t.col === c);
      if (tile) toMove.push(tile);
      r += dRow;
      c += dCol;
    }

    if (toMove.length === 0) return;

    this.playMoveSound();
    this.playVibration();

    const newTiles = [...tiles];
    toMove.forEach(t => {
      const tile = newTiles.find(nt => nt.num === t.num);
      tile.row += dRow;
      tile.col += dCol;
    });

    const moves = this.data.moves + 1;
    this.setData({
      tiles: newTiles,
      emptyRow: row,
      emptyCol: col,
      moves
    }, () => {
      this.updateProgress();
      this.checkWin();
    });
  },

  updateProgress() {
    var count = 0;
    var tiles = this.data.tiles;
    var size = this.data.size;
    for (var i = 1; i <= tiles.length; i++) {
      var tile = tiles.find(function(t) { return t.num === i; });
      var er = Math.floor((i - 1) / size);
      var ec = (i - 1) % size;
      if (tile && tile.row === er && tile.col === ec) {
        count++;
      } else {
        break;
      }
    }
    this.setData({ correctCount: count });
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

  // ===== 提示按钮：激励广告 + 逐个数字归位 ====
  onHint() {
    if (this.data.solved) return;
    if (!this.data.gameStarted) {
      wx.showToast({ title: '请先开始游戏', icon: 'none' });
      return;
    }
    if (this._isAutoPlaying) return;

    var that = this;

    // 检查剩余次数
    if (this.data.hintRemaining <= 0) {
      // 次数用完，播放激励广告
      if (videoAd) {
        videoAd.onClose(function (res) {
          if (res && res.isEnded) {
            that.setData({ hintRemaining: 2 });
            setTimeout(function () { that._doHint(); }, 1000);
          } else {
            wx.showToast({ title: '需要看完广告才能继续使用提示', icon: 'none' });
          }
        });
        videoAd.show().catch(function () {
          videoAd.load()
            .then(function () { return videoAd.show(); })
            .catch(function (err) {
              console.error('hr game videoAd show fail', err);
              that.setData({ hintRemaining: 2 });
              that._doHint();
            });
        });
      }
      return;
    }

    this._doHint();
  },

  _doHint() {
    var that = this;

    // 计算完整解法
    wx.showLoading({ title: '计算解法中...', mask: true });
    var tiles = this.data.tiles.map(function(t) { return { num: t.num, row: t.row, col: t.col }; });
    var fullSolution = aStarSolve(tiles, this.data.size, this.data.emptyRow, this.data.emptyCol);
    wx.hideLoading();
    if (!fullSolution || fullSolution.length === 0) {
      wx.showToast({ title: '计算超时，请重试', icon: 'none' });
      return;
    }

    // 找到第一个未归位的数字（顺序检查 1,2,3...）
    var missNum = 0;
    var sz = that.data.size;
    for (var i = 1; i <= tiles.length; i++) {
      var tile = tiles.find(function(t) { return t.num === i; });
      var er = Math.floor((i - 1) / sz);
      var ec = (i - 1) % sz;
      if (tile.row !== er || tile.col !== ec) {
        missNum = i;
        break;
      }
    }
    if (missNum === 0) {
      wx.showToast({ title: '所有数字都归位了', icon: 'none' });
      return;
    }

    // 在解法中模拟，提取让 missNum 归位所需的步骤
    var targetSteps = [];
    var simTiles = this.data.tiles.map(function(t) { return { num: t.num, row: t.row, col: t.col }; });
    var simEr = this.data.emptyRow;
    var simEc = this.data.emptyCol;

    for (var si = 0; si < fullSolution.length; si++) {
      var step = fullSolution[si];
      targetSteps.push(step);

      // 模拟执行
      var st = simTiles.find(function(tt) { return tt.num === step.num; });
      st.row = step.toRow;
      st.col = step.toCol;
      simEr = step.fromRow;
      simEc = step.fromCol;

      // 检查目标数字是否已归位
      var mt = simTiles.find(function(tt) { return tt.num === missNum; });
      var mer = Math.floor((missNum - 1) / sz);
      var mec = (missNum - 1) % sz;
      if (mt.row === mer && mt.col === mec) {
        break;
      }
    }

    // 消耗一次机会，播放提示步骤
    that.setData({ hintRemaining: that.data.hintRemaining - 1 });
    that._playHintSteps(targetSteps, missNum);
  },

  _playHintSteps(steps, missNum) {
    this._isAutoPlaying = true;
    this._solutionSteps = steps;
    this._solutionIndex = 0;
    this._hintMissNum = missNum;
    this._autoPlayHintStep();
  },

  _autoPlayHintStep() {
    if (this._solutionIndex >= this._solutionSteps.length) {
      this._isAutoPlaying = false;
      this._solutionSteps = null;
      this._hintMissNum = null;
      this.updateProgress();
      this.checkWin(); // 全部归位则跳转结果页
      return;
    }

    var step = this._solutionSteps[this._solutionIndex];
    var stepNum = this._solutionIndex + 1;
    var total = this._solutionSteps.length;

    // 显示步骤提示
    wx.showToast({
      title: '第' + stepNum + '步：数字' + step.num + ' ' + getDirName(step.fromRow, step.fromCol, step.toRow, step.toCol),
      icon: 'none',
      duration: 900
    });

    // 执行移动
    var tiles = this.data.tiles.map(function(t) { return { num: t.num, row: t.row, col: t.col, colorClass: t.colorClass }; });
    var tile = tiles.find(function(t) { return t.num === step.num; });
    if (!tile) { this._isAutoPlaying = false; return; }

    var oldRow = tile.row, oldCol = tile.col;
    tile.row = step.toRow;
    tile.col = step.toCol;

    this.setData({
      tiles: tiles,
      emptyRow: oldRow,
      emptyCol: oldCol,
      moves: this.data.moves + 1
    });

    this.playMoveSound();

    this._solutionIndex++;

    // 演示结束或继续（每步500ms，不要太快）
    var isLast = this._solutionIndex >= this._solutionSteps.length;
    var delay = isLast ? 600 : 500;
    var that = this;
    setTimeout(function () {
      if (!isLast) {
        that._autoPlayHintStep();
      } else {
        that._isAutoPlaying = false;
        that._solutionSteps = null;
        that._hintMissNum = null;
        that.updateProgress();
        that.checkWin(); // 全部归位则跳转结果页
      }
    }, delay);
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
    settings.vibration = val;
    wx.setStorageSync('hr_settings', settings);
    settingsSync.syncGlobalAfterToggle('vibration', val);
  },
  preventMove() {}
});

function getDirName(fromRow, fromCol, toRow, toCol) {
  var dr = toRow - fromRow;
  var dc = toCol - fromCol;
  if (dr === 1) return '↓';
  if (dr === -1) return '↑';
  if (dc === 1) return '→';
  if (dc === -1) return '←';
  return '';
}
