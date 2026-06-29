const BOARD_SIZE = 6;
const EXIT_COL = 3;
const levelData = require('./levels-data.js');
const settingsSync = require('../../../utils/settings-sync');

// 激励视频广告
let videoAd = null;

function createBoardGrid(blocks) {
  const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  for (const b of blocks) {
    for (let i = 0; i < b.size; i++) {
      const r = b.orient === 'v' ? b.row + i : b.row;
      const c = b.orient === 'h' ? b.col + i : b.col;
      board[r][c] = b.id;
    }
  }
  return board;
}

/** 生成所有可能的一次滑动（只生成最远可达位置，每方向最多1个move） */
function generateAllMoves(blocks) {
  const board = createBoardGrid(blocks);
  const moves = [];
  for (const b of blocks) {
    if (b.orient === 'v') {
      let up = 0; while (b.row - up - 1 >= 0 && board[b.row - up - 1][b.col] === null) up++;
      if (up > 0) moves.push({ blockId: b.id, dir: 'up', steps: up });
      let down = 0; while (b.row + b.size + down < BOARD_SIZE && board[b.row + b.size + down][b.col] === null) down++;
      if (down > 0) moves.push({ blockId: b.id, dir: 'down', steps: down });
    } else {
      let left = 0; while (b.col - left - 1 >= 0 && board[b.row][b.col - left - 1] === null) left++;
      if (left > 0) moves.push({ blockId: b.id, dir: 'left', steps: left });
      let right = 0; while (b.col + b.size + right < BOARD_SIZE && board[b.row][b.col + b.size + right] === null) right++;
      if (right > 0) moves.push({ blockId: b.id, dir: 'right', steps: right });
    }
  }
  return moves;
}

/** 应用一次移动（按steps步直接到目标位置） */
function applyMove(blocks, move) {
  return blocks.map(b => {
    if (b.id !== move.blockId) return { ...b };
    const nb = { ...b };
    const s = move.steps;
    if (b.orient === 'v') nb.row += move.dir === 'up' ? -s : s;
    else nb.col += move.dir === 'left' ? -s : s;
    return nb;
  });
}

function serializeState(blocks) {
  return [...blocks].sort((a, b) => a.id.localeCompare(b.id)).map(b => `${b.id}:${b.row},${b.col}`).join('|');
}

function isWon(blocks) {
  const g = blocks.find(b => b.id === 'G');
  return g && g.row === 4 && g.col === 3;
}

function bfsSolve(blocks) {
  const startKey = serializeState(blocks);
  const visited = new Set([startKey]);
  const queue = [{ blocks: blocks.map(b => ({ ...b })), path: [] }];
  let head = 0;
  while (head < queue.length) {
    const { blocks: cur, path } = queue[head++];
    if (isWon(cur)) return path;
    for (const move of generateAllMoves(cur)) {
      const nb = applyMove(cur, move);
      const key = serializeState(nb);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ blocks: nb, path: [...path, move] });
      }
    }
  }
  return null;
}

Page({
  data: {
    cellSize: 0,
    boardWidth: 0,
    blocks: [],
    moves: 0,
    steps: 0,
    timer: 0,
    selectedId: null,
    won: false,
    difficulty: 'easy',
    difficultyLabel: '简单',
    timerText: '00:00',
    levelId: '',
    levelIndex: 0,
    totalLevels: 0,
    hasPrev: false,
    hasNext: false,
    EXIT_COL: 3,
    showHelp: false,
    showHintModal: false,
    hintSteps: 0,
    showSettings: false,
    soundEnabled: true,
    vibrateEnabled: true
  },

  onShow() {
    if (this.data.levelId) {
      wx.setNavigationBarTitle({ title: `第${this.data.levelId}关` });
    }
    // 从结果页返回时，重置到当前关卡的初始位置
    if (this.hasWon) {
      this.loadLevel(this.currentLevelIndex);
    }
  },

  onUnload() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  },

  onLoad(options) {
    // 读取设置
    const mbSettings = wx.getStorageSync('mb_settings') || {};
    this.setData({
      soundEnabled: mbSettings.sound !== false,
      vibrateEnabled: mbSettings.vibrate !== false
    });

    // 创建激励视频广告实例
    if (wx.createRewardedVideoAd) {
      videoAd = wx.createRewardedVideoAd({
        adUnitId: 'adunit-c24dfbbb7eeb1518'
      });
      videoAd.onLoad(function () {});
      videoAd.onError(function (err) {
        console.error('激励视频广告加载失败', err);
      });
      videoAd.onClose(function (res) {});
    }

    this._initGame(options);
  },

  _initGame(options) {
    const diff = options.diff || 'easy';
    const groups = levelData.LEVEL_GROUPS[diff];
    const sysInfo = wx.getSystemInfoSync();
    // 宽度可用：屏幕宽度减去两侧留白
    const boardByW = sysInfo.windowWidth - 48;
    // 高度可用：屏幕高度减去非棋盘元素（统计栏+操作栏+边距）
    const overhead = Math.round(170 * sysInfo.windowWidth / 750);
    const boardByH = sysInfo.windowHeight - overhead;
    const boardW = Math.min(boardByW, boardByH, 600);
    const cellS = Math.floor(boardW / BOARD_SIZE);
    const completed = wx.getStorageSync('mb_completed') || {};

    this.difficulty = diff;
    this.timerInterval = null;
    this.hasWon = false;
    this.completed = completed;
    this.totalLevels = groups.length;

    // 从参数或缓存恢复关卡索引
    let idx = parseInt(options.level) || 0;
    if (idx >= groups.length) idx = 0;

    this.setData({
      cellSize: cellS, boardWidth: cellS * BOARD_SIZE,
      cellGap: 0,
      difficulty: diff,
      difficultyLabel: levelData.DIFF_MAP[diff].label,
      totalLevels: groups.length
    }, () => this.loadLevel(idx));
  },

  loadLevel(index) {
    const groups = levelData.LEVEL_GROUPS[this.difficulty];
    if (index < 0 || index >= groups.length) return;
    if (this.timerInterval) clearInterval(this.timerInterval);

    const level = groups[index];
    const blocks = levelData.parseLevel(level).map(b => ({
      ...b,
      color: '',
      isTarget: b.id === 'G',
      selected: false
    }));

    this.hasWon = false;
    this.movesCount = 0;
    this.startTime = null; // 第一次移动时才开始计时
    this.elapsedSeconds = 0;
    this.currentLevelIndex = index;
    this.timerStarted = false;

    wx.setNavigationBarTitle({ title: `第${level.id}关` });

    this.setData({
      blocks, moves: 0, steps: level.steps,
      timer: 0, timerText: '00:00',
      selectedId: null, won: false,
      levelId: level.id, levelIndex: index,
      difficulty: this.difficulty,
      difficultyLabel: levelData.DIFF_MAP[this.difficulty].label,
      totalLevels: groups.length,
      hasPrev: index > 0,
      hasNext: index < groups.length - 1
    });
  },

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      const m = String(Math.floor(this.elapsedSeconds / 60)).padStart(2, '0');
      const s = String(this.elapsedSeconds % 60).padStart(2, '0');
      this.setData({ timer: this.elapsedSeconds, timerText: `${m}:${s}` });
    }, 200);
  },

  /** 计算 block 在当前状态下各方向能滑动的最大格数 */
  computeDragRange(block, blocks) {
    const board = createBoardGrid(blocks);
    const isGAtExitCol = block.id === 'G' && block.col === EXIT_COL;
    if (block.orient === 'v') {
      let up = 0; while (block.row - up - 1 >= 0 && board[block.row - up - 1][block.col] === null) up++;
      let down = 0;
      // G在出口列时，允许移动到出口并继续移出棋盘
      const maxDownBound = isGAtExitCol ? BOARD_SIZE : BOARD_SIZE - block.size;
      while (block.row + block.size + down < BOARD_SIZE && board[block.row + block.size + down][block.col] === null) down++;
      // G在出口列时，额外允许再往下移动一格（移出棋盘）
      if (isGAtExitCol && block.row + block.size + down === BOARD_SIZE) down++;
      return { min: block.row - up, max: block.row + down };
    } else {
      let left = 0; while (block.col - left - 1 >= 0 && board[block.row][block.col - left - 1] === null) left++;
      let right = 0; while (block.col + block.size + right < BOARD_SIZE && board[block.row][block.col + block.size + right] === null) right++;
      return { min: block.col - left, max: block.col + right };
    }
  },

  onBoardTouchStart(e) {
    if (this.hasWon) return;
    const id = e.currentTarget.dataset.id;
    if (!id) return;

    const block = this.data.blocks.find(b => b.id === id);
    if (!block) return;

    this._dragId = id;
    this._dragIdx = this.data.blocks.findIndex(b => b.id === id);
    this._dragStartRow = block.row;
    this._dragStartCol = block.col;
    this._dragStartX = e.touches[0].clientX;
    this._dragStartY = e.touches[0].clientY;
    this._dragMoved = false;

    // 预计算该块能滑动的范围
    const plainBlocks = this.data.blocks.map(b => ({ ...b, drag: undefined }));
    this._dragRange = this.computeDragRange(block, plainBlocks);
    this._dragAxis = block.orient;

    // 标记拖动状态，用 pxTop/pxLeft 实现像素级跟手
    const cellSize = this.data.cellSize;
    const idx = this._dragIdx;
    this.setData({
      [`blocks[${idx}]`]: {
        ...block, drag: true, selected: false,
        pxTop: block.row * cellSize,
        pxLeft: block.col * cellSize
      },
      selectedId: null
    });
  },

  onBoardTouchMove(e) {
    if (this.hasWon || !this._dragId) return;
    const cellSize = this.data.cellSize;
    const dx = e.touches[0].clientX - this._dragStartX;
    const dy = e.touches[0].clientY - this._dragStartY;

    this._dragMoved = true;

    const idx = this._dragIdx;

    if (this._dragAxis === 'v') {
      const startPx = this._dragStartRow * cellSize;
      const maxUpPx = (this._dragStartRow - this._dragRange.min) * cellSize;
      const maxDownPx = (this._dragRange.max - this._dragStartRow) * cellSize;
      const newPx = startPx + Math.max(-maxUpPx, Math.min(maxDownPx, dy));
      this.setData({ [`blocks[${idx}].pxTop`]: newPx });
    } else {
      const startPx = this._dragStartCol * cellSize;
      const maxLeftPx = (this._dragStartCol - this._dragRange.min) * cellSize;
      const maxRightPx = (this._dragRange.max - this._dragStartCol) * cellSize;
      const newPx = startPx + Math.max(-maxLeftPx, Math.min(maxRightPx, dx));
      this.setData({ [`blocks[${idx}].pxLeft`]: newPx });
    }
  },

  onBoardTouchEnd() {
    if (this.hasWon || !this._dragId) return;

    const id = this._dragId;
    const idx = this._dragIdx;
    this._dragId = null;

    // 没拖动 = 点击切换选中
    if (!this._dragMoved) {
      this.setData({
        [`blocks[${idx}].selected`]: this.data.blocks[idx].selected !== true,
        [`blocks[${idx}].drag`]: false,
        [`blocks[${idx}].pxTop`]: null,
        [`blocks[${idx}].pxLeft`]: null,
        selectedId: this.data.selectedId === id ? null : id
      });
      return;
    }

    const cellSize = this.data.cellSize;
    const block = this.data.blocks[idx];

    // 从像素位置计算最终网格位置（吸附到最近格子）
    let targetRow = block.row, targetCol = block.col;
    if (this._dragAxis === 'v') {
      const px = block.pxTop != null ? block.pxTop : block.row * cellSize;
      targetRow = Math.round(px / cellSize);
      targetRow = Math.max(this._dragRange.min, Math.min(this._dragRange.max, targetRow));
    } else {
      const px = block.pxLeft != null ? block.pxLeft : block.col * cellSize;
      targetCol = Math.round(px / cellSize);
      targetCol = Math.max(this._dragRange.min, Math.min(this._dragRange.max, targetCol));
    }

    const movedCells = this._dragAxis === 'v'
      ? Math.abs(targetRow - this._dragStartRow)
      : Math.abs(targetCol - this._dragStartCol);

    if (movedCells === 0) {
      this.setData({
        [`blocks[${idx}].drag`]: false,
        [`blocks[${idx}].selected`]: false,
        [`blocks[${idx}].pxTop`]: null,
        [`blocks[${idx}].pxLeft`]: null
      });
      return;
    }

    // 移动成功时音效+震动
    this._playPop();
    this._doVibrate();

    // 更新位置并清除像素偏移
    const updates = {};
    if (this._dragAxis === 'v') updates[`blocks[${idx}].row`] = targetRow;
    else updates[`blocks[${idx}].col`] = targetCol;
    updates[`blocks[${idx}].drag`] = false;
    updates[`blocks[${idx}].selected`] = false;
    updates[`blocks[${idx}].pxTop`] = null;
    updates[`blocks[${idx}].pxLeft`] = null;

    this.movesCount++;
    updates.moves = this.movesCount;
    updates.selectedId = null;

    // 第一次移动时启动计时
    if (!this.timerStarted) {
      this.timerStarted = true;
      this.startTime = Date.now();
      this.startTimer();
    }

    // 检查 G 是否到达出口
    const gIdx = this.data.blocks.findIndex(b => b.id === 'G');
    const gRow = id === 'G' ? targetRow : this.data.blocks[gIdx].row;
    const gCol = id === 'G' ? targetCol : this.data.blocks[gIdx].col;
    const won = gRow >= 4 && gCol === 3;

    if (won) {
      this.hasWon = true;
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.markCompleted();
      // G滑出动画（记录由结果页保存）
      if (id === 'G') {
        updates[`blocks[${gIdx}].row`] = gRow;
        updates[`blocks[${gIdx}].col`] = gCol;
        // 若已拖出棋盘，从当前位置继续滑出；否则从出口位置向下滑
        const currentPxTop = block.pxTop != null ? block.pxTop : targetRow * cellSize;
        updates[`blocks[${gIdx}].pxTop`] = currentPxTop + cellSize * 2;
        updates[`blocks[${gIdx}].pxLeft`] = gCol * cellSize;
        updates[`blocks[${gIdx}].wonExit`] = true;
      } else {
        // 其他块推到出口，保持原退出逻辑
        updates[`blocks[${gIdx}].pxTop`] = gRow * cellSize + cellSize * 2;
        updates[`blocks[${gIdx}].wonExit`] = true;
      }
      this.setData(updates);
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/movingBlocks/result/result?level=${this.data.levelId}&moves=${this.movesCount}&steps=${this.data.steps}&time=${this.elapsedSeconds}&diff=${this.difficulty}`
        });
      }, 250);
      return;
    }

    this.setData(updates);
  },

  markCompleted() {
    const id = this.data.levelId;
    if (!this.completed[id]) {
      this.completed[id] = { moves: this.movesCount, time: this.elapsedSeconds };
      wx.setStorageSync('mb_completed', this.completed);
    }
  },

  onPrevLevel() {
    var prevId = parseInt(this.data.levelId) - 1;
    if (prevId < 1) {
      wx.showToast({ title: '已经是第一关', icon: 'none' });
      return;
    }
    var prevDiff = levelData.getDifficulty(String(prevId));
    this.difficulty = prevDiff;
    var prevGroup = levelData.LEVEL_GROUPS[prevDiff];
    var prevIdx = prevGroup.findIndex(function(l) { return parseInt(l.id) === prevId; });
    if (prevIdx >= 0) {
      this.hasWon = false;
      this.loadLevel(prevIdx);
    }
  },

  onNextLevel() {
    this.hasWon = false;
    // 计算下一关的完整 ID（跨难度切换）
    var nextId = parseInt(this.data.levelId) + 1;
    if (nextId > levelData.ALL_LEVELS.length) {
      wx.showToast({ title: '已经是最后一关', icon: 'none' });
      return;
    }
    var nextDiff = levelData.getDifficulty(String(nextId));
    this.difficulty = nextDiff;
    var nextGroup = levelData.LEVEL_GROUPS[nextDiff];
    var nextIdx = nextGroup.findIndex(function(l) { return parseInt(l.id) === nextId; });
    if (nextIdx >= 0) {
      this.loadLevel(nextIdx);
    }
  },

  onRestart() {
    this.loadLevel(this.currentLevelIndex);
  },

  onHint() {
    if (this.hasWon) return;
    if (this._isAutoPlaying) return;

    var that = this;

    // 先计算解法
    const blocks = that.data.blocks.map(b => ({ id: b.id, orient: b.orient, size: b.size, row: b.row, col: b.col }));
    const solution = bfsSolve(blocks);
    if (!solution || solution.length === 0) {
      wx.showToast({ title: '暂无提示', icon: 'none' });
      return;
    }
    that._pendingSolution = solution;

    var doHint = function () {
      that.setData({ showHintModal: true, hintSteps: solution.length });
    };

    // 有广告时先播放激励视频
    if (videoAd) {
      videoAd.onClose(function (res) {
        if (res && res.isEnded) {
          doHint();
        }
      });
      videoAd.show().catch(function () {
        // 失败重试
        videoAd.load()
          .then(function () { return videoAd.show(); })
          .catch(function (err) {
            console.error('激励视频广告显示失败', err);
            doHint(); // 广告失败直接显示
          });
      });
    } else {
      doHint();
    }
  },

  onCancelHint() {
    this._pendingSolution = null;
    this.setData({ showHintModal: false });
  },

  onConfirmHint() {
    this.setData({ showHintModal: false });
    if (!this._pendingSolution) return;
    const sol = this._pendingSolution;
    this._pendingSolution = null;
    // 先重置到初始状态
    this.loadLevel(this.currentLevelIndex);
    // 等待渲染后播放
    setTimeout(() => {
      const blocks = this.data.blocks.map(b => ({ id: b.id, orient: b.orient, size: b.size, row: b.row, col: b.col }));
      const solvedSol = bfsSolve(blocks);
      if (solvedSol) this._playSolution(solvedSol);
    }, 300);
  },

  _playSolution(solution) {
    this._isAutoPlaying = true;
    this._solutionSteps = solution;
    this._solutionIndex = 0;
    this._autoPlayNext();
  },

  _autoPlayNext() {
    if (this._solutionIndex >= this._solutionSteps.length) {
      this._isAutoPlaying = false;
      this._solutionSteps = null;
      wx.showToast({ title: '演示完毕！', icon: 'success', duration: 1500 });
      setTimeout(() => this.loadLevel(this.currentLevelIndex), 1000);
      return;
    }

    const move = this._solutionSteps[this._solutionIndex];
    const dirMap = { up: '上', down: '下', left: '左', right: '右' };
    const stepNum = this._solutionIndex + 1;
    const total = this._solutionSteps.length;
    const dist = move.steps;

    // 显示步骤提示
    wx.showToast({
      title: `第${stepNum}步：${move.blockId}向${dirMap[move.dir]||move.dir}${dist}格`,
      icon: 'none',
      duration: 700
    });

    // 执行移动（一次滑动 steps 格）
    const blocks = this.data.blocks.map(b => ({ ...b }));
    const block = blocks.find(b => b.id === move.blockId);
    if (!block) { this._isAutoPlaying = false; return; }

    const s = move.steps || 1;
    if (block.orient === 'v') block.row += move.dir === 'up' ? -s : s;
    else block.col += move.dir === 'left' ? -s : s;

    this.movesCount++;
    const gBlock = blocks.find(b => b.id === 'G');
    const won = gBlock && gBlock.row === 4 && gBlock.col === 3;
    if (won) {
      this.hasWon = true;
      if (this.timerInterval) clearInterval(this.timerInterval);
      // 演示模式不保存记录
    }

    this.setData({ blocks, moves: this.movesCount, won });
    this._solutionIndex++;

    // 延迟后执行下一步
    setTimeout(() => {
      if (won) {
        this._isAutoPlaying = false;
        wx.showToast({ title: `演示完成！共${total}步`, icon: 'success', duration: 2000 });
        setTimeout(() => this.loadLevel(this.currentLevelIndex), 1000);
      } else {
        this._autoPlayNext();
      }
    }, 800);
  },

  onShowHelp() {
    this.setData({ showHelp: true });
  },

  onCloseHelp() {
    this.setData({ showHelp: false });
  },

  preventMove() {},

  // 设置弹窗
  onShowSettings() {
    this.setData({ showSettings: true });
  },
  onCloseSettings() {
    this.setData({ showSettings: false });
  },
  onSoundToggle(e) {
    const val = e.detail.value;
    this.setData({ soundEnabled: val });
    const settings = wx.getStorageSync('mb_settings') || {};
    settings.sound = val;
    wx.setStorageSync('mb_settings', settings);
    settingsSync.syncGlobalAfterToggle('sound', val);
  },
  onVibrateToggle(e) {
    const val = e.detail.value;
    this.setData({ vibrateEnabled: val });
    const settings = wx.getStorageSync('mb_settings') || {};
    settings.vibrate = val;
    wx.setStorageSync('mb_settings', settings);
    settingsSync.syncGlobalAfterToggle('vibration', val);
  },

  // 移动音效 — 短促"啵"声（440Hz 正弦波 60ms）
  _playPop() {
    if (!this.data.soundEnabled) return;
    if (this._popPlaying) return;
    if (!this._popCtx) {
      this._popCtx = wx.createInnerAudioContext();
      this._popCtx.volume = 0.25;
      this._genPopAsync();
    }
    if (this._popReady && this._popCtx) {
      this._popPlaying = true;
      this._popCtx.stop();
      this._popCtx.seek(0);
      this._popCtx.play();
      var that = this;
      setTimeout(function () { that._popPlaying = false; }, 80);
    }
  },

  _genPopAsync() {
    const sr = 8000, dur = 0.06, len = Math.floor(sr * dur);
    const buf = new ArrayBuffer(44 + len);
    const v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + len, true); w(8, 'WAVE');
    w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, sr, true);
    v.setUint32(28, sr, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    w(36, 'data'); v.setUint32(40, len, true);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = 1 - (i / len); // 衰减包络
      const sample = Math.sin(2 * Math.PI * 440 * t) * env * 30 + 128;
      v.setUint8(44 + i, Math.max(0, Math.min(255, Math.round(sample))));
    }
    const fs = wx.getFileSystemManager();
    const fp = `${wx.env.USER_DATA_PATH}/mb_pop.wav`;
    fs.writeFile({
      filePath: fp, data: buf,
      success: () => { this._popCtx.src = fp; this._popReady = true; },
      fail: () => { this._popReady = false; }
    });
  },

  _doVibrate() {
    if (!this.data.vibrateEnabled) return;
    wx.vibrateShort({ type: 'medium' }).catch(() => {});
  }
});
