Page({
  data: {
    size: 4,
    tiles: [],       // [{num, row, col, english, colorClass}]
    emptyRow: -1,
    emptyCol: -1,
    moves: 0,
    timer: 0,
    timerStr: '00:00',
    solved: false,
    canMove: true
  },

  _timerId: null,
  _startTime: 0,

  // 英文数字映射
  _englishMap: [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
    'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
    'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five',
    'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine', 'thirty',
    'thirty-one', 'thirty-two', 'thirty-three', 'thirty-four', 'thirty-five',
    'thirty-six'
  ],

  // 马卡龙色系（6色循环）
  _colorClasses: ['pink', 'yellow', 'green', 'blue', 'purple', 'peach'],

  onLoad(options) {
    const size = parseInt(options.size) || 4;
    this.computeBoard(size);
    this.initGame(size);
  },

  computeBoard(size) {
    const sys = wx.getSystemInfoSync();
    const screenW = sys.windowWidth;
    const padding = 16; // px on each side
    const gap = 8; // px between tiles
    const boardW = screenW - 64; // 32rpx padding each side (~16px)
    const tilePx = (boardW - gap * (size + 1)) / size;
    const tileInner = tilePx - 2;
    const boardPx = tilePx * size + gap * (size + 1);
    // font: 3x3=36, 4x4=32, 5x5=28, 6+=24
    const tileFont = size <= 3 ? 36 : size <= 4 ? 32 : size <= 5 ? 28 : size <= 6 ? 24 : 22;
    this.setData({
      size,
      boardPx,
      tilePx,
      tileInner,
      tileFont,
      padding: gap
    });
  },

  onUnload() {
    this.stopTimer();
  },

  initGame(size) {
    // 生成初始有序排列
    const n = size * size;
    const tiles = [];
    for (let i = 0; i < n - 1; i++) {
      const num = i + 1;
      tiles.push({
        num,
        row: Math.floor(i / size),
        col: i % size,
        english: this._englishMap[num] || num,
        colorClass: this._colorClasses[(num - 1) % 6]
      });
    }
    const emptyRow = size - 1;
    const emptyCol = size - 1;

    // 通过随机滑动来打乱（保证可解性）
    let er = emptyRow, ec = emptyCol;
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
      solved: false,
      canMove: true
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

  onTileTap(e) {
    if (!this.data.canMove || this.data.solved) return;
    const { row, col } = e.currentTarget.dataset;
    const { emptyRow, emptyCol, size } = this.data;

    // 检查是否与空格相邻
    const dr = Math.abs(row - emptyRow);
    const dc = Math.abs(col - emptyCol);
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      // 移动
      const tiles = [...this.data.tiles];
      const tile = tiles.find(t => t.row === row && t.col === col);
      tile.row = emptyRow;
      tile.col = emptyCol;
      const moves = this.data.moves + 1;
      this.setData({ tiles, emptyRow: row, emptyCol: col, moves });
      this.checkWin();
    }
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
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/huarongDao/result/result?size=${this.data.size}&time=${this.data.timer}&moves=${this.data.moves}`
        });
      }, 600);
    }
  },

  onReset() {
    this.stopTimer();
    this.initGame(this.data.size);
  },

  onBack() {
    wx.navigateBack();
  }
});
