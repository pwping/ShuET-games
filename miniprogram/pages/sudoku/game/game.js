var settingsSync = require('../../../utils/settings-sync');

// 激励视频广告
var videoAd = null;

// ===== 数独生成器 =====
function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function isValid(board, row, col, num) {
  for (var i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
  }
  var br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
  for (var r = br; r < br + 3; r++) {
    for (var c = bc; c < bc + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

function solve(board) {
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        var nums = shuffle([1,2,3,4,5,6,7,8,9]);
        for (var n = 0; n < nums.length; n++) {
          if (isValid(board, r, c, nums[n])) {
            board[r][c] = nums[n];
            if (solve(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generateBoard(clues) {
  var solution = [];
  for (var r = 0; r < 9; r++) { solution[r] = [0,0,0,0,0,0,0,0,0]; }
  solve(solution);
  var puzzle = [];
  for (var r = 0; r < 9; r++) { puzzle[r] = solution[r].slice(); }
  var toRemove = 81 - clues;
  var positions = [];
  for (var i = 0; i < 81; i++) positions.push(i);
  shuffle(positions);
  for (var i = 0; i < toRemove; i++) {
    var row = Math.floor(positions[i] / 9);
    var col = positions[i] % 9;
    puzzle[row][col] = 0;
  }
  return { solution: solution, puzzle: puzzle };
}

var CLUES_MAP = { beginner: 45, basic: 38, intermediate: 30, advanced: 24, expert: 22 };
var DIFF_LABELS = { beginner: '初级', basic: '中级', intermediate: '进阶', advanced: '高级', expert: '专家' };
var MODULE_COLORS = { beginner: '#3B82F6', basic: '#3B82F6', intermediate: '#D97706', advanced: '#7C3AED', expert: '#DC2626' };
var OLD_KEY_MAP = { easy: 'basic', medium: 'intermediate', hard: 'advanced', expert: 'expert' };

// ===== 预计算辅助函数 =====
function makeFlat(board_9x9) {
  var f = [];
  for (var r = 0; r < 9; r++)
    for (var c = 0; c < 9; c++)
      f.push(board_9x9[r][c]);
  return f;
}
function makeFlatNotes(notes_9x9) {
  var f = [];
  for (var r = 0; r < 9; r++)
    for (var c = 0; c < 9; c++)
      f.push(notes_9x9[r][c]);
  return f;
}

function hasConflict(conflicts, r, c) {
  for (var i = 0; i < conflicts.length; i++) {
    if (conflicts[i].r === r && conflicts[i].c === c) return true;
  }
  return false;
}

// 预计算所有81个格子的边框类名（0个nth-child依赖）
var CELL_BORDER = (function() {
  var arr = [];
  for (var i = 0; i < 81; i++) {
    var r = Math.floor(i / 9), c = i % 9;
    var parts = [];
    if (c < 8 && c !== 2 && c !== 5) parts.push('br1');
    if (c < 8 && (c === 2 || c === 5)) parts.push('br3');
    if (c === 8) parts.push('br0');
    if (r < 8 && r !== 2 && r !== 5) parts.push('bb1');
    if (r < 8 && (r === 2 || r === 5)) parts.push('bb3');
    if (r === 8) parts.push('bb0');
    arr.push(parts.join(' '));
  }
  return arr;
})();

function computeCellClasses(fixed, sr, sc, conflicts, win, hlBoxR, hlBoxC, hlRow, hlCol, board, solution) {
  var cls = [];
  for (var i = 0; i < 81; i++) {
    var r = Math.floor(i / 9), c = i % 9;
    var p = ['cell', CELL_BORDER[i]];
    if (fixed[r][c]) p.push('fixed');
    if (sr === r && sc === c) p.push('selected');
    if (hasConflict(conflicts, r, c)) p.push('conflict');
    if (!fixed[r][c] && board && solution && board[r][c] !== 0 && board[r][c] !== solution[r][c]) p.push('wrong');
    if (win) p.push('win');
    if (hlBoxR >= 0) {
      var boxR = Math.floor(r / 3), boxC = Math.floor(c / 3);
      if (boxR === hlBoxR && boxC === hlBoxC) p.push('hl-box');
    }
    if (hlRow >= 0 && r === hlRow) p.push('hl-row');
    if (hlCol >= 0 && c === hlCol) p.push('hl-col');
    cls.push(p.join(' '));
  }
  return cls;
}

// 找到空格最少的九宫格 (默认高亮提示)
function findMostFilledBox(board) {
  var bestR = 0, bestC = 0, bestCount = -1;
  for (var br = 0; br < 3; br++) {
    for (var bc = 0; bc < 3; bc++) {
      var count = 0;
      for (var r = br * 3; r < br * 3 + 3; r++)
        for (var c = bc * 3; c < bc * 3 + 3; c++)
          if (board[r][c] !== 0) count++;
      if (count > bestCount) { bestCount = count; bestR = br; bestC = bc; }
    }
  }
  return { hlBoxR: bestR, hlBoxC: bestC };
}

// 预计算行列索引 (避免 WXML 中 Math.floor 解析问题)
var ROWS = [], COLS = [];
for (var i = 0; i < 81; i++) { ROWS.push(Math.floor(i / 9)); COLS.push(i % 9); }

// 初始化 81 个空数组用于 flatNotes
function makeEmptyFlatNotes() {
  var a = [];
  for (var i = 0; i < 81; i++) a[i] = [];
  return a;
}

Page({
  data: {
    diff: 'beginner',
    diffLabel: '入门',
    diffColor: '#059669',
    board: [],
    solution: null,
    fixed: [],
    notes: [],
    flatBoard: (function(){var a=[];for(var i=0;i<81;i++)a[i]=0;return a;})(),
    flatNotes: makeEmptyFlatNotes(),
    cellClasses: [],
    rows: ROWS,
    cols: COLS,
    selectedRow: -1,
    selectedCol: -1,
    hlBoxR: -1,
    hlBoxC: -1,
    hlRow: -1,
    hlCol: -1,
    conflicts: [],
    timer: 0,
    timerText: '00:00',
    noteMode: false,
    hintsUsed: 0,
    undoCount: 0,
    correctCount: 0,
    errors: 0,
    isComplete: false,
    gameStarted: false,
    winAnim: false,
    showSettings: false,
    soundEnabled: true,
    vibrateEnabled: true,
      hintRemaining: 2
  },

  _timerId: null,
  _startTime: 0,

  onLoad: function(options) {
    var diff = options.diff || 'beginner';
    if (OLD_KEY_MAP[diff]) diff = OLD_KEY_MAP[diff];
    var sdSettings = wx.getStorageSync('sd_settings') || {};
    this.setData({
      diff: diff,
      diffLabel: DIFF_LABELS[diff],
      diffColor: MODULE_COLORS[diff],
      soundEnabled: sdSettings.sound !== false,
      vibrateEnabled: sdSettings.vibration !== false,
      hintRemaining: 2
    });
    wx.setNavigationBarTitle({ title: '数独 · ' + DIFF_LABELS[diff] });

    // 创建激励视频广告实例
    if (wx.createRewardedVideoAd) {
      videoAd = wx.createRewardedVideoAd({
        adUnitId: 'adunit-c24dfbbb7eeb1518'
      });
      videoAd.onLoad(function () {});
      videoAd.onError(function (err) { console.error('sudoku game videoAd error', err); });
      videoAd.onClose(function (res) {});
    }

    this.initGame(diff);
  },

  onShow: function() {
    if (this.data.isComplete) {
      this.onRestart();
    }
  },

  onUnload: function() { this.stopTimer(); },

  initGame: function(diff) {
    var clues = CLUES_MAP[diff] || 30;
    var result = generateBoard(clues);
    var solution = result.solution;
    var puzzle = result.puzzle;
    var fixed = [];
    for (var r = 0; r < 9; r++) {
      fixed[r] = [];
      for (var c = 0; c < 9; c++) fixed[r][c] = puzzle[r][c] !== 0;
    }
    var board = [];
    for (var r = 0; r < 9; r++) board[r] = puzzle[r].slice();
    var notes = [];
    for (var r = 0; r < 9; r++) { notes[r] = []; for (var c = 0; c < 9; c++) notes[r][c] = []; }
    this._history = [];
    this._cellErrored = [];
    for (var re = 0; re < 9; re++) { this._cellErrored[re] = [false,false,false,false,false,false,false,false,false]; }
    this._completedRows = {};
    this._completedCols = {};
    this._completedBoxes = {};
    var emptyAnim = [];
    var emptyAnimStyle = [];
    for (var a = 0; a < 81; a++) { emptyAnim[a] = ''; emptyAnimStyle[a] = ''; }
    var boxInfo = findMostFilledBox(puzzle);
    var hlBoxR = boxInfo.hlBoxR, hlBoxC = boxInfo.hlBoxC;
    var hlRow = hlBoxR * 3, hlCol = hlBoxC * 3;
    this.setData({
      board: board, solution: solution, fixed: fixed, notes: notes,
      flatBoard: makeFlat(board),
      flatNotes: makeFlatNotes(notes),
      cellClasses: computeCellClasses(fixed, -1, -1, [], false, hlBoxR, hlBoxC, hlRow, hlCol, puzzle, solution),
      selectedRow: -1, selectedCol: -1, conflicts: [],
      hlBoxR: hlBoxR, hlBoxC: hlBoxC, hlRow: hlRow, hlCol: hlCol,
      timer: 0, timerText: '00:00',
      hintsUsed: 0, undoCount: 0, correctCount: 0, errors: 0,
      hintRemaining: 2, isComplete: false, gameStarted: false, winAnim: false,
      noteMode: false,
      cellAnimCls: emptyAnim,
      cellAnimStyle: emptyAnimStyle
    });
    this._startTime = 0;
    this.stopTimer();
  },

  startTimer: function() {
    if (this._timerId) return;
    this._startTime = Date.now();
    var self = this;
    this._timerId = setInterval(function() {
      var elapsed = Math.floor((Date.now() - self._startTime) / 1000);
      var m = Math.floor(elapsed / 60);
      var s = elapsed % 60;
      var str = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      self.setData({ timer: elapsed, timerText: str });
    }, 500);
  },

  stopTimer: function() {
    if (this._timerId) { clearInterval(this._timerId); this._timerId = null; }
  },

  _ensureTimer: function() {
    if (!this.data.gameStarted) {
      this.setData({ gameStarted: true });
      this.startTimer();
    }
  },

  onCellTap: function(e) {
    if (this.data.isComplete) return;
    var row = e.currentTarget.dataset.row;
    var col = e.currentTarget.dataset.col;
    this._ensureTimer();
    var hbR = Math.floor(row / 3), hbC = Math.floor(col / 3);
    this.setData({
      selectedRow: row, selectedCol: col,
      hlBoxR: hbR, hlBoxC: hbC,
      hlRow: row, hlCol: col,
      cellClasses: computeCellClasses(this.data.fixed, row, col, this.data.conflicts, false, hbR, hbC, row, col, this.data.board, this.data.solution)
    });
  },

  onNumberTap: function(e) {
    if (this.data.isComplete) return;
    var row = this.data.selectedRow, col = this.data.selectedCol;
    if (row < 0 || col < 0) return;
    if (this.data.fixed[row][col]) return;
    var num = parseInt(e.currentTarget.dataset.num);
    this._pushHistory(row, col);
    if (this.data.noteMode) {
      this.toggleNote(row, col, num);
    } else {
      this.placeNumber(row, col, num);
    }
  },

  _pushHistory: function(row, col) {
    var board = this.data.board;
    var notes = this.data.notes;
    this._history.push({
      row: row, col: col,
      value: board[row][col],
      notes: notes[row][col].slice()
    });
    if (this._history.length > 50) this._history.shift();
  },

  onUndo: function() {
    if (this.data.isComplete) return;
    if (this._history.length === 0) {
      wx.showToast({ title: '没有可撤销的操作', icon: 'none' });
      return;
    }
    var step = this._history.pop();
    this.setData({ undoCount: this.data.undoCount + 1 });
    var board = [];
    for (var r = 0; r < 9; r++) board[r] = this.data.board[r].slice();
    var notes = [];
    for (var r = 0; r < 9; r++) {
      notes[r] = [];
      for (var c = 0; c < 9; c++) notes[r][c] = this.data.notes[r][c].slice();
    }
    board[step.row][step.col] = step.value;
    notes[step.row][step.col] = step.notes;
    this.setData({ board: board, flatBoard: makeFlat(board), notes: notes, flatNotes: makeFlatNotes(notes) });
    this.checkConflicts();
  },

  placeNumber: function(row, col, num) {
    var board = [];
    for (var r = 0; r < 9; r++) board[r] = this.data.board[r].slice();
    var current = board[row][col];
    if (current === num) {
      board[row][col] = 0;
      this.clearNotes(row, col);
      this.setData({ board: board, flatBoard: makeFlat(board) });
      this.checkConflicts();
      return;
    }
    board[row][col] = num;
    this.clearNotes(row, col);
    if (num !== this.data.solution[row][col]) {
      this.playSound('wrong');
      this.playVibration();
      if (!this._cellErrored[row][col]) {
        this._cellErrored[row][col] = true;
        this.setData({ board: board, flatBoard: makeFlat(board), errors: this.data.errors + 1 });
      } else {
        this.setData({ board: board, flatBoard: makeFlat(board) });
      }
      this.checkConflicts();
      return;
    }
    this.playSound('correct');
    if (!this._cellErrored[row][col]) {
      this.setData({ board: board, flatBoard: makeFlat(board), correctCount: this.data.correctCount + 1 });
    } else {
      this.setData({ board: board, flatBoard: makeFlat(board) });
    }
    this.checkConflicts();
    if (this._isBoardComplete()) {
      this.doFullBoardFlip();
    } else {
      this.checkUnitCompletion();
    }
  },

  toggleNote: function(row, col, num) {
    var notes = [];
    for (var r = 0; r < 9; r++) {
      notes[r] = [];
      for (var c = 0; c < 9; c++) notes[r][c] = this.data.notes[r][c].slice();
    }
    var idx = notes[row][col].indexOf(num);
    if (idx >= 0) { notes[row][col].splice(idx, 1); }
    else if (notes[row][col].length < 6) { notes[row][col].push(num); notes[row][col].sort(function(a,b){return a-b;}); }
    this.setData({ notes: notes, flatNotes: makeFlatNotes(notes) });
  },

  clearNotes: function(row, col) {
    var notes = [];
    for (var r = 0; r < 9; r++) {
      notes[r] = [];
      for (var c = 0; c < 9; c++) notes[r][c] = this.data.notes[r][c].slice();
    }
    notes[row][col] = [];
    this.setData({ notes: notes, flatNotes: makeFlatNotes(notes) });
  },

  onErase: function() {
    if (this.data.isComplete) return;
    var row = this.data.selectedRow, col = this.data.selectedCol;
    if (row < 0 || col < 0) return;
    if (this.data.fixed[row][col]) return;
    this._pushHistory(row, col);
    var board = [];
    for (var r = 0; r < 9; r++) board[r] = this.data.board[r].slice();
    board[row][col] = 0;
    this.clearNotes(row, col);
    this.setData({ board: board, flatBoard: makeFlat(board) });
    this.checkConflicts();
  },

  onHint: function() {
    if (this.data.isComplete) return;
    var that = this;

    // 检查剩余次数
    if (this.data.hintRemaining <= 0) {
      // 次数为0，需要看激励广告
      if (videoAd) {
        videoAd.onClose(function (res) {
          if (res && res.isEnded) {
            // 看完广告恢复5次
            that.setData({ hintRemaining: 2 });
            that._doHint();
          } else {
            wx.showToast({ title: '需要看完广告才能继续使用提示', icon: 'none' });
          }
        });
        videoAd.show().catch(function () {
          videoAd.load()
            .then(function () { return videoAd.show(); })
            .catch(function (err) {
              console.error('sudoku game videoAd show fail', err);
              wx.showToast({ title: '广告加载失败', icon: 'none' });
            });
        });
      }
      return;
    }

    // 有剩余次数，直接提示，减1
    this._doHint();
  },

  _doHint: function() {
    var board = this.data.board, solution = this.data.solution, fixed = this.data.fixed;
    var empty = [];
    for (var r = 0; r < 9; r++)
      for (var c = 0; c < 9; c++)
        if (!fixed[r][c] && board[r][c] !== solution[r][c]) empty.push({ r: r, c: c });
    if (empty.length === 0) {
      wx.showToast({ title: '没有需要提示的格子', icon: 'none' }); return;
    }
    var pick = empty[Math.floor(Math.random() * empty.length)];
    var newBoard = [];
    for (var r = 0; r < 9; r++) newBoard[r] = board[r].slice();
    newBoard[pick.r][pick.c] = solution[pick.r][pick.c];
    this.clearNotes(pick.r, pick.c);
    this.playSound('correct');
    var sd = { board: newBoard, flatBoard: makeFlat(newBoard), hintsUsed: this.data.hintsUsed + 1, hintRemaining: this.data.hintRemaining - 1 };
    if (!this._cellErrored[pick.r][pick.c]) sd.correctCount = this.data.correctCount + 1;
    this.setData(sd);
    this.checkConflicts();
    if (this._isBoardComplete()) {
      this.doFullBoardFlip();
    } else {
      this.checkUnitCompletion();
    }
  },

  checkConflicts: function() {
    var board = this.data.board;
    var conflicts = [];
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        var v = board[r][c];
        if (v === 0) continue;
        for (var c2 = 0; c2 < 9; c2++) {
          if (c2 !== c && board[r][c2] === v) { conflicts.push({ r: r, c: c }); break; }
        }
        for (var r2 = 0; r2 < 9; r2++) {
          if (r2 !== r && board[r2][c] === v) {
            if (!hasConflict(conflicts, r, c)) conflicts.push({ r: r, c: c });
            break;
          }
        }
        var br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
        for (var r2 = br; r2 < br + 3; r2++) {
          for (var c2 = bc; c2 < bc + 3; c2++) {
            if ((r2 !== r || c2 !== c) && board[r2][c2] === v) {
              if (!hasConflict(conflicts, r, c)) conflicts.push({ r: r, c: c });
            }
          }
        }
      }
    }
    this.setData({
      conflicts: conflicts,
      cellClasses: computeCellClasses(this.data.fixed, this.data.selectedRow, this.data.selectedCol, conflicts, false, this.data.hlBoxR, this.data.hlBoxC, this.data.hlRow, this.data.hlCol, this.data.board, this.data.solution)
    });
  },

  checkUnitCompletion: function() {
    var board = this.data.board, solution = this.data.solution;
    var animCls = [], animStyle = [];
    for (var i = 0; i < 81; i++) { animCls[i] = ''; animStyle[i] = ''; }
    var triggered = false;

    function isRowComplete(r) {
      for (var c = 0; c < 9; c++) if (board[r][c] !== solution[r][c]) return false;
      return true;
    }
    function isColComplete(c) {
      for (var r = 0; r < 9; r++) if (board[r][c] !== solution[r][c]) return false;
      return true;
    }
    function isBoxComplete(br, bc) {
      for (var r = br * 3; r < br * 3 + 3; r++)
        for (var c = bc * 3; c < bc * 3 + 3; c++)
          if (board[r][c] !== solution[r][c]) return false;
      return true;
    }

    // 检查行
    for (var r = 0; r < 9; r++) {
      if (this._completedRows[r]) continue;
      if (isRowComplete(r)) {
        this._completedRows[r] = true;
        triggered = true;
        for (var c = 0; c < 9; c++) {
          var idx = r * 9 + c;
          animCls[idx] = 'flip-cell';
          animStyle[idx] = 'animation-delay:' + (c * 80) + 'ms';
        }
      }
    }
    // 检查列
    for (var c = 0; c < 9; c++) {
      if (this._completedCols[c]) continue;
      if (isColComplete(c)) {
        this._completedCols[c] = true;
        triggered = true;
        for (var r = 0; r < 9; r++) {
          var idx = r * 9 + c;
          animCls[idx] = 'flip-cell';
          animStyle[idx] = 'animation-delay:' + (r * 80) + 'ms';
        }
      }
    }
    // 检查九宫格
    for (var br = 0; br < 3; br++) {
      for (var bc = 0; bc < 3; bc++) {
        var bKey = br + '-' + bc;
        if (this._completedBoxes[bKey]) continue;
        if (isBoxComplete(br, bc)) {
          this._completedBoxes[bKey] = true;
          triggered = true;
          for (var r = br * 3; r < br * 3 + 3; r++) {
            for (var c = bc * 3; c < bc * 3 + 3; c++) {
              var idx = r * 9 + c;
              animCls[idx] = 'flip-cell';
              var order = (r - br * 3) * 3 + (c - bc * 3);
              animStyle[idx] = 'animation-delay:' + (order * 80) + 'ms';
            }
          }
        }
      }
    }

    if (triggered) {
      this.setData({ cellAnimCls: animCls, cellAnimStyle: animStyle });
      var self = this;
      setTimeout(function() {
        var clear = [];
        for (var i = 0; i < 81; i++) { clear[i] = ''; }
        self.setData({ cellAnimCls: clear, cellAnimStyle: clear });
      }, 1200);
    }
  },

  _isBoardComplete: function() {
    var board = this.data.board, solution = this.data.solution;
    for (var r = 0; r < 9; r++)
      for (var c = 0; c < 9; c++)
        if (board[r][c] !== solution[r][c]) return false;
    return true;
  },

  doFullBoardFlip: function() {
    this.stopTimer();
    this.playSound('correct');
    this.setData({ isComplete: true });
    var animCls = [], animStyle = [];
    for (var i = 0; i < 81; i++) {
      animCls[i] = 'flip-cell';
      animStyle[i] = 'animation-delay:' + (i * 20) + 'ms';
    }
    this.setData({ cellAnimCls: animCls, cellAnimStyle: animStyle });
    var self = this;
    setTimeout(function() {
      self.saveRecord();
      wx.navigateTo({
        url: '/pages/sudoku/result/result?diff=' + self.data.diff + '&time=' + self.data.timer + '&correct=' + self.data.correctCount + '&errors=' + self.data.errors + '&hints=' + self.data.hintsUsed + '&undo=' + self.data.undoCount
      });
    }, 81 * 20 + 500);
  },

  saveRecord: function() {
    var app = getApp();
    var record = {
      difficulty: this.data.diff,
      time: this.data.timer,
      hints: this.data.hintsUsed,
      errors: this.data.errors,
      correct: this.data.correctCount,
      undo: this.data.undoCount,
      status: 'success',
      createTime: new Date().toISOString()
    };
    if (!app.globalData.isLoggedIn) {
      var records = wx.getStorageSync('sudoku_records') || [];
      records.unshift(record);
      wx.setStorageSync('sudoku_records', records.slice(0, 200));
      return;
    }
    wx.cloud.callFunction({
      name: 'saveSudokuRecord',
      data: record,
      complete: function() { wx.removeStorageSync('sudoku_records'); }
    });
  },

  onToggleNote: function() {
    this._ensureTimer();
    this.setData({ noteMode: !this.data.noteMode });
  },

  onRestart: function() {
    this.stopTimer();
    this.initGame(this.data.diff);
  },

  playSound: function(type) {
    if (!this.data.soundEnabled) return;
    try {
      if (!this._audioCtx) this._audioCtx = wx.createWebAudioContext();
      var ctx = this._audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      if (type === 'correct') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {}
  },

  playVibration: function() {
    if (!this.data.vibrateEnabled) return;
    try { wx.vibrateShort({ type: 'medium' }); } catch (e) {
      try { wx.vibrateShort({ type: 'light' }); } catch (e2) {}
    }
  },

  onShowSettings: function() {
    var s = wx.getStorageSync('sd_settings') || {};
    this.setData({ showSettings: true, soundEnabled: s.sound !== false, vibrateEnabled: s.vibration !== false });
  },

  onCloseSettings: function() { this.setData({ showSettings: false }); },

  onSoundToggle: function(e) {
    var v = e.detail.value;
    this.setData({ soundEnabled: v });
    var s = wx.getStorageSync('sd_settings') || {}; s.sound = v;
    wx.setStorageSync('sd_settings', s);
    settingsSync.syncGlobalAfterToggle('sound', v);
  },

  onVibrateToggle: function(e) {
    var v = e.detail.value;
    this.setData({ vibrateEnabled: v });
    var s = wx.getStorageSync('sd_settings') || {}; s.vibration = v;
    wx.setStorageSync('sd_settings', s);
    settingsSync.syncGlobalAfterToggle('vibration', v);
  },

  preventMove: function() {},

  onShareAppMessage: function() {
    return {
      title: '数独 ' + this.data.diffLabel + ' 用时 ' + this.data.timerText + '，你能更快吗？',
      path: '/pages/game-select/game-select'
    };
  }
});
