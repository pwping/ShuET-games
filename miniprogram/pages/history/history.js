const app = getApp();
var rating = require('../../utils/sudoku-rating');

const MODE_NAMES = {
  classic: '经典模式',
  interference: '干扰模式',
  shuffle: '换位模式',
  reverse: '倒序模式',
  parity: '奇偶模式',
  challenge: '限时模式',
  memory: '记忆模式',
  alphabet: '字母模式',
  challenge_record: '挑战模式'
};

const LEVEL_NAMES = {
  base: '基础', primary: '初阶', high: '标准', super: '中阶',
  unique: '高阶', matchless: '极限', sky: '疯狂', crazy: '宗师'
};

// 筛选器顺序列表（用于左右滑动切换）
const FILTER_LIST = [
  { key: 'all', name: '全部' },
  { key: 'classic', name: '经典' },
  { key: 'interference', name: '干扰' },
  { key: 'shuffle', name: '换位' },
  { key: 'reverse', name: '倒序' },
  { key: 'parity', name: '奇偶' },
  { key: 'challenge', name: '限时' },
  { key: 'memory', name: '记忆' },
  { key: 'alphabet', name: '字母' },
  { key: 'challenge_record', name: '挑战' }
];

Page({
  data: {
    currentGame: 'shulte',
    currentFilter: 'all',
    _pendingTab: null,
    currentSizeFilter: 0,
    swiperIndex: 0,
    records: [],
    page: 1,
    pageSize: 7,
    hasMore: true,
    showFooter: false,
    showLoading: false,
    FILTER_LIST: FILTER_LIST,
    scrollIntoView: '',
    emptyText: '暂无训练记录',
    emptySubtext: '快去开始训练吧！',
    sizeFilterHidden: false,
    hrSizeFilter: 0,
    hrRecords: [],
    mbRecords: [],
    mbLoading: false,
    sdRecords: [],
    sdLoading: false,
    sdDifficultyFilter: 'all',
    sdDiffList: rating.DIFF_LIST,
    scrollToGame: ''
  },

  _allRecords: [],
  _loadingTimer: null,
  _dataLoading: false,
  _lastScrollTop: 0,

  onGameSwitch(e) {
    const game = e.currentTarget.dataset.game;
    if (game === this.data.currentGame) return;
    this.setData({ scrollToGame: 'tab-' + game });
    if (game === 'huarong') {
      this.setData({
        currentGame: 'huarong',
        records: [],
        hrSizeFilter: 0,
        hrRecords: [],
      }, () => this.loadHuarongRecords());
    } else if (game === 'movingBlock') {
      this.setData({
        currentGame: 'movingBlock',
        records: [],
        mbRecords: [],
      }, () => this.loadMovingBlockRecords());
    } else if (game === 'sudoku') {
      this.setData({
        currentGame: 'sudoku',
        records: [],
        sdRecords: [],
      }, () => this.loadSudokuRecords());
    } else {
      this.setData({
        currentGame: 'shulte',
        currentFilter: 'all',
        currentSizeFilter: 0,
        records: [],
        page: 1,
        hasMore: true,
        showFooter: false,
        showLoading: false,
        sizeFilterHidden: false,
        swiperIndex: 0,
        emptyText: '暂无训练记录',
        emptySubtext: '快去开始训练吧！',
      }, () => this.loadRecords());
      this._allRecords = [];
    }
  },

  getEmptyText(filter) {
    if (filter === 'all') return { text: '暂无训练记录', subtext: '快去开始训练吧！' };
    if (filter === 'challenge_record') return { text: '暂无挑战记录', subtext: '去挑战一下吧！' };
    const modeName = MODE_NAMES[filter] || filter;
    return { text: `暂时没有${modeName}训练记录`, subtext: '去练习一下' };
  },

  updateEmptyText(filter) {
    const { text, subtext } = this.getEmptyText(filter);
    this.setData({ emptyText: text, emptySubtext: subtext });
  },

  onLoad(options) {
    if (options && options.tab) {
      this._pendingTab = options.tab;
    }
  },

  onShow() {
    this._dataLoading = false;
    // 如果有待切换的Tab，优先切换
    if (this._pendingTab) {
      const tab = this._pendingTab;
      this._pendingTab = null;
      this.switchToTab(tab);
      return;
    }
    this.loadRecords();
    if (this.data.currentGame === 'huarong') {
      this.loadHuarongRecords();
    } else if (this.data.currentGame === 'movingBlock') {
      this.loadMovingBlockRecords();
    } else if (this.data.currentGame === 'sudoku') {
      this.loadSudokuRecords();
    }
  },

  switchToTab(tab) {
    if (tab === 'movingBlock') {
      this.setData({
        currentGame: 'movingBlock',
        records: [],
        mbRecords: [],
      }, () => this.loadMovingBlockRecords());
    } else if (tab === 'huarong') {
      this.setData({
        currentGame: 'huarong',
        records: [],
        hrSizeFilter: 0,
        hrRecords: [],
      }, () => this.loadHuarongRecords());
    } else if (tab === 'sudoku') {
      this.setData({
        currentGame: 'sudoku',
        records: [],
        sdRecords: [],
      }, () => this.loadSudokuRecords());
    }
  },

  loadRecords(sizeFilter) {
    this._allRecords = [];
    const filter = this.data.currentFilter;
    const sf = sizeFilter !== undefined ? sizeFilter : this.data.currentSizeFilter;

    if (filter === 'challenge_record') {
      this.setData({ page: 1, hasMore: true, showFooter: false, showLoading: false, sizeFilterHidden: true });
    } else {
      this.setData({ page: 1, hasMore: true, showFooter: false, showLoading: false, sizeFilterHidden: false });
    }

    // 挑战记录
    if (filter === 'challenge_record') {
      const localChallengeRecords = wx.getStorageSync('shult_challenge_records') || [];
      const fmtLocal = localChallengeRecords.map(r => ({
        mode: 'challenge_record', level: 'high', size: 5,
        timeCost: r.timeMs,
        status: r.success ? 'success' : 'fail',
        accuracy: r.accuracy !== undefined ? r.accuracy : (r.success ? 100 : 0),
        createTime: r.dateTime,
        passLevel: r.passLevel
      }));
      wx.cloud.callFunction({
        name: 'getChallengeRecords',
        data: { page: 1, pageSize: 100 },
        success: res => {
          let cloudRecords = [];
          if (res.result && res.result.code === 200 && Array.isArray(res.result.data)) {
            cloudRecords = res.result.data.map(r => ({
              mode: 'challenge_record', level: 'high', size: 5,
              timeCost: r.timeMs, status: r.success ? 'success' : 'fail',
              accuracy: r.accuracy || 0, createTime: r.createTime, passLevel: r.passLevel
            }));
          }
          // 合并本地+云端，不去重，按时间排序
          this.processRecords([...fmtLocal, ...cloudRecords]);
        },
        fail: () => this.processRecords(fmtLocal)
      });
      return;
    }

    // 普通训练记录
    let localRecords = wx.getStorageSync('shult_records') || [];
    localRecords = localRecords.filter(r => {
      const modeMatch = filter === 'all' || r.mode === filter;
      const sizeMatch = sf === 0 || r.size === sf;
      return modeMatch && sizeMatch;
    });

    wx.cloud.callFunction({
      name: 'getUserTrainRecords',
      data: {
        ...(filter !== 'all' ? { mode: filter } : {}),
        ...(sf !== 0 ? { size: sf } : {})
      },
      success: res => {
        let cloudRecords = [];
        if (res.result && res.result.code === 200) {
          cloudRecords = (res.result.data || []).filter(r => r.mode !== 'huarong');
        }
        // 合并本地+云端，不去重，按时间排序
        this.processRecords([...localRecords, ...cloudRecords]);
      },
      fail: () => this.processRecords(localRecords)
    });
  },

  processRecords(records) {
    const validRecords = records.filter(r => r.mode && r.level && r.size);
    // 按 createTime 倒序排列
    validRecords.sort((a, b) => {
      const ta = a.createTime || '';
      const tb = b.createTime || '';
      return tb.localeCompare(ta);
      var filterDiff = this.data.sdDifficultyFilter;
      if (filterDiff !== 'all') {
        allRecords = allRecords.filter(function(r) {
          return r.difficulty === filterDiff;
        });
      }
    });

    this._allRecords = validRecords.map(r => {
      if (r.mode === 'challenge_record') {
        return {
          ...r,
          modeName: MODE_NAMES[r.mode] || '挑战模式',
          levelLabel: r.passLevel ? `第${r.passLevel}关` : '未知关',
          accuracyLabel: `正确率(${r.accuracy || 0}%)`,
          status: r.status === 'success' ? 'success' : 'fail',
          statusLabel: r.status === 'success' ? '成功' : '失败',
          statusText: this.formatSeconds(r.timeCost),
          formattedTime: this.formatTime(r.timeCost),
          createTime: this.formatDate(r.createTime)
        };
      }
      const isSuccess = r.status === 'success';
      return {
        ...r,
        modeName: MODE_NAMES[r.mode] || r.mode || '未知模式',
        levelLabel: (LEVEL_NAMES[r.level] || r.level || '未知') + `(${r.size || '?'}x${r.size || '?'})`,
        accuracyLabel: `正确率(${r.accuracy || 0}%)`,
        status: isSuccess ? 'success' : 'fail',
        statusLabel: isSuccess ? '成功' : '失败',
        statusText: this.formatSeconds(r.timeCost),
        formattedTime: this.formatTime(r.timeCost),
        createTime: this.formatDate(r.createTime)
      };
    });

    this.loadPage();
  },

  loadPage() {
    const { page, pageSize } = this.data;
    const end = page * pageSize;
    const pageData = this._allRecords.slice(0, end);
    const hasMore = end < this._allRecords.length;

    this.setData({
      records: pageData,
      hasMore,
      showFooter: this._allRecords.length > 0 && !hasMore,
      showLoading: false
    });
  },

  onSwiperChange(e) {
    if (this._dataLoading) return;
    this._dataLoading = true;

    const index = e.detail.current;
    const filter = FILTER_LIST[index].key;
    if (filter === this.data.currentFilter) {
      this._dataLoading = false;
      return;
    }

    this.updateEmptyText(filter);

    let scrollTarget = `filter-${filter}`;
    if (filter === 'all') scrollTarget = 'filter-classic';

    this.setData({
      swiperIndex: index,
      currentFilter: filter,
      currentSizeFilter: 0,
      sizeFilterHidden: filter === 'challenge_record',
      records: [],
      page: 1,
      showFooter: false,
      showLoading: false,
      scrollIntoView: scrollTarget
    });

    this.loadRecords(0);
    this._dataLoading = false;
  },

  setSizeFilter(e) {
    const size = parseInt(e.currentTarget.dataset.size);
    if (size === this.data.currentSizeFilter) return;
    this.setData({ currentSizeFilter: size, records: [], page: 1, showFooter: false, showLoading: false });
    this._allRecords = [];
    this._dataLoading = true;
    this.loadRecords(size);
    this._dataLoading = false;
  },

  onRecordScroll(e) {
    if (this.data.currentFilter === 'challenge_record') return;

    const scrollTop = e.detail.scrollTop;
    const THRESHOLD = 30;
    if (scrollTop > THRESHOLD && scrollTop > this._lastScrollTop) {
      // 往下滑 → 隐藏难度选项卡
      this.setData({ sizeFilterHidden: true });
    } else if (scrollTop <= THRESHOLD || scrollTop < this._lastScrollTop) {
      // 往上滑或顶部 → 显示难度选项卡
      this.setData({ sizeFilterHidden: false });
    }
    this._lastScrollTop = scrollTop;
  },

  onScrollToLower() {
    if (this.data.hasMore) {
      this.loadMore();
    } else if (this.data.showFooter) {
      wx.showToast({ title: '没有记录啦！快去练习吧。', icon: 'none' });
    }
  },

  loadMore() {
    if (!this.data.hasMore || this.data.showLoading) return;

    this.setData({ showLoading: true });

    if (this._loadingTimer) clearTimeout(this._loadingTimer);
    this._loadingTimer = setTimeout(() => {
      const page = this.data.page + 1;
      this.setData({ page }, () => this.loadPage());
      this._loadingTimer = null;
    }, 400);
  },

  onUnload() {
    if (this._loadingTimer) {
      clearTimeout(this._loadingTimer);
      this._loadingTimer = null;
    }
  },

  setHrSizeFilter(e) {
    const size = parseInt(e.currentTarget.dataset.size);
    const val = this.data.hrSizeFilter === size ? 0 : size;
    this.setData({ hrSizeFilter: val }, () => this.loadHuarongRecords());
  },

  loadHuarongRecords() {
    const LEVEL_NAMES = { 3:'基础', 4:'初阶', 5:'标准', 6:'中阶', 7:'高阶', 8:'极限', 9:'疯狂', 10:'宗师' };
    const sizeFilter = this.data.hrSizeFilter;
    const local = wx.getStorageSync('huarong_records') || [];

    const render = (allRecords) => {
      const filtered = sizeFilter ? allRecords.filter(r => r.size === sizeFilter) : allRecords;
      // 按 createTime 倒序
      filtered.sort((a, b) => {
        const ta = a.createTime || '';
        const tb = b.createTime || '';
        return tb.localeCompare(ta);
      var filterDiff = this.data.sdDifficultyFilter;
      if (filterDiff !== 'all') {
        allRecords = allRecords.filter(function(r) {
          return r.difficulty === filterDiff;
        });
      }
      });
      const hrRecords = filtered.map(r => {
        const s = r.time || 0;
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return {
          size: r.size, moves: r.moves,
          timeStr: m > 0 ? `${m}分${String(sec).padStart(2,'0')}秒` : `${sec}秒`,
          sizeLabel: `${r.size}×${r.size}`,
          levelName: LEVEL_NAMES[r.size] || `${r.size}×${r.size}`,
          createTime: r.createTime || ''
        };
      });
      this.setData({ hrRecords });
    };

    // 合并本地+云端，不去重
    wx.cloud.callFunction({
      name: 'getHuarongRecords',
      data: { size: sizeFilter || undefined },
      success: res => {
        let cloud = [];
        if (res.result && res.result.code === 200 && Array.isArray(res.result.data)) {
          cloud = res.result.data.map(r => ({
            size: r.size, moves: r.moves, time: r.time,
            createTime: this.formatDate(r.createTime)
          }));
        }
        render([...local, ...cloud]);
      },
      fail: () => render(local)
    });
  },

  loadMovingBlockRecords() {
    this.setData({ mbLoading: true });
    const local = wx.getStorageSync('mb_records') || [];
    let retried = false;

    const render = (allRecords) => {
      allRecords.sort((a, b) => {
        const ta = a.createTime || '';
        const tb = b.createTime || '';
        return tb.localeCompare(ta);
      var filterDiff = this.data.sdDifficultyFilter;
      if (filterDiff !== 'all') {
        allRecords = allRecords.filter(function(r) {
          return r.difficulty === filterDiff;
        });
      }
      });
      const mbRecords = allRecords.map(r => {
        const s = r.time || 0;
        const m = Math.floor(s / 60);
        const sec = s % 60;
        const diffMoves = r.moves - (r.steps || 1);
        const starLevel = diffMoves <= 4 ? 5 : diffMoves <= 8 ? 4 : 3;
        return {
          levelId: r.levelId,
          moves: r.moves,
          timeStr: m > 0 ? `${m}分${String(sec).padStart(2,'0')}秒` : `${sec}秒`,
          starLevel,
          createTime: this.formatDate(r.createTime)
        };
      });
      this.setData({ mbRecords, mbLoading: false });
    };

    // 合并本地+云端
    const doFetch = () => {
      wx.cloud.callFunction({
        name: 'getMovingBlockRecords',
        success: res => {
          let cloud = [];
          if (res.result && res.result.code === 200 && Array.isArray(res.result.data)) {
            cloud = res.result.data.map(r => ({
              levelId: r.levelId, moves: r.moves, steps: r.steps,
              time: r.time, difficulty: r.difficulty,
              createTime: r.createTime
            }));
          }
          render([...local, ...cloud]);
        },
        fail: () => {
          if (!retried) {
            retried = true;
            setTimeout(doFetch, 500);
          } else {
            render(local);
          }
        }
      });
    };
    doFetch();
  },

  loadSudokuRecords() {
    this.setData({ sdLoading: true });
    var local = wx.getStorageSync("sudoku_records") || [];
    var retried = false;
    var self = this;

    function render(allRecords) {
      allRecords.sort(function(a, b) {
        return (b.createTime || "").localeCompare(a.createTime || "");
      });
      var filterDiff = self.data.sdDifficultyFilter;
      if (filterDiff !== "all") {
        var filtered = [];
        for (var i = 0; i < allRecords.length; i++) {
          if (allRecords[i].difficulty === filterDiff) filtered.push(allRecords[i]);
        }
        allRecords = filtered;
      }
      var sdRecords = [];
      for (var i = 0; i < allRecords.length; i++) {
        var r = allRecords[i];
        var s = r.time || 0;
        var m = Math.floor(s / 60);
        var sec = s % 60;
        var errors = r.errors || 0;
        var hintsUsed = r.hints || 0;
        var undoCount = r.undo || 0;
        var result = rating.calcRating(r.difficulty, s, errors, hintsUsed, undoCount);
        var starStr = "";
        for (var k = 0; k < 5; k++) starStr += (k < result.stars ? "★" : "☆");
        sdRecords.push({
          difficulty: r.difficulty,
          diffLabel: rating.DIFF_LABELS[r.difficulty] || r.difficulty,
          timeStr: m > 0 ? m + "分" + (sec < 10 ? "0" : "") + sec + "秒" : sec + "秒",
          stars: result.stars,
          starStr: starStr,
          correct: r.correct || 0,
          errors: errors,
          hints: hintsUsed,
          undo: undoCount,
          createTime: self.formatDate(r.createTime)
        });
      }
      self.setData({ sdRecords: sdRecords, sdLoading: false });
    }

    function doFetch() {
      wx.cloud.callFunction({
        name: "getSudokuRecords",
        success: function(res) {
          var cloud = [];
          if (res.result && res.result.code === 200 && Array.isArray(res.result.data)) {
            for (var i = 0; i < res.result.data.length; i++) {
              var cr = res.result.data[i];
              cloud.push({ difficulty: cr.difficulty, time: cr.time, hints: cr.hints, errors: cr.errors, undo: cr.undo, correct: cr.correct, createTime: cr.createTime });
            }
          }
          var merged = [];
          for (var i = 0; i < local.length; i++) merged.push(local[i]);
          for (var i = 0; i < cloud.length; i++) merged.push(cloud[i]);
          render(merged);
        },
        fail: function() {
          if (!retried) {
            retried = true;
            setTimeout(function() { doFetch(); }, 500);
          } else {
            render(local);
          }
        }
      });
    }
    doFetch();
  },

  setSdDifficulty(e) {
    var diff = e.currentTarget.dataset.diff;
    var self = this; this.setData({ sdDifficultyFilter: diff }, function() { self.loadSudokuRecords(); });
  },

  onGoSudoku() {
    wx.navigateTo({ url: '/pages/sudoku/level/level' });
  },

  onGoMovingBlock() {
    wx.navigateTo({ url: '/pages/movingBlocks/level/level' });
  },

  onGoTrain() {
    const filter = this.data.currentFilter;
    if (filter === 'all') {
      wx.switchTab({ url: '/pages/index/index' });
    } else if (filter === 'challenge_record') {
      wx.navigateTo({ url: '/pages/pass/pass' });
    } else {
      wx.navigateTo({ url: `/pages/level/level?mode=${filter}` });
    }
  },

  formatTime(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  },

  formatSeconds(ms) {
    const s = Math.floor(ms / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${s}.${cs.toString().padStart(2, '0')}秒`;
  },

  formatDate(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  },

  setFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    const index = FILTER_LIST.findIndex(f => f.key === filter);
    if (index === -1 || filter === this.data.currentFilter) return;

    this.updateEmptyText(filter);
    this._dataLoading = true;

    const scrollTarget = filter === 'all' ? 'filter-classic' : `filter-${filter}`;

    this.setData({
      swiperIndex: index,
      currentFilter: filter,
      currentSizeFilter: 0,
      sizeFilterHidden: filter === 'challenge_record',
      records: [],
      page: 1,
      showFooter: false,
      showLoading: false,
      scrollIntoView: scrollTarget
    });

    this.loadRecords(0);
    this._dataLoading = false;
  },
});
