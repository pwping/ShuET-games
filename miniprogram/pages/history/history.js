const app = getApp();

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
    currentFilter: 'all',
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
    sizeFilterHidden: false
  },

  _allRecords: [],
  _loadingTimer: null,
  _filterCache: {},
  _dataLoading: false,
  _lastScrollTop: 0,

  getCacheKey() {
    return `${this.data.currentFilter}_${this.data.currentSizeFilter}`;
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

  onShow() {
    this._dataLoading = false;
    // 清除缓存强制重新加载，确保新记录能显示
    this._filterCache = {};
    this.loadRecords();
  },

  loadRecords(sizeFilter) {
    this._allRecords = [];
    const filter = this.data.currentFilter;
    const sf = sizeFilter !== undefined ? sizeFilter : this.data.currentSizeFilter;
    const cacheKey = `${filter}_${sf}`;
    
    console.log('loadRecords - entering:', 'filter:', filter, 'size:', sf, 'cacheKey:', cacheKey);

    // 挑战模式隐藏难度筛选
    if (filter === 'challenge_record') {
      this.setData({ page: 1, hasMore: true, showFooter: false, showLoading: false, sizeFilterHidden: true });
    } else {
      this.setData({ page: 1, hasMore: true, showFooter: false, showLoading: false, sizeFilterHidden: false });
    }

    // 检查缓存
    if (this._filterCache[cacheKey]) {
      console.log('loadRecords - using cache:', cacheKey, 'record count:', this._filterCache[cacheKey].length);
      this._allRecords = this._filterCache[cacheKey];
      this.loadPage();
      return;
    }

    // 挑战记录特殊处理
    if (filter === 'challenge_record') {
      // 获取本地挑战记录
      let localChallengeRecords = wx.getStorageSync('shult_challenge_records') || [];
      console.log('loadRecords - challenge local records:', localChallengeRecords.length);
      // 转换为统一格式
      localChallengeRecords = localChallengeRecords.map(r => ({
        mode: 'challenge_record',
        level: 'high',
        size: 5,
        timeCost: r.timeMs,
        status: r.success ? 'success' : 'fail',
        accuracy: r.accuracy !== undefined ? r.accuracy : (r.success ? 100 : Math.round(Math.random() * 80 + 20)),
        createTime: r.dateTime,
        passLevel: r.passLevel
      }));
      // 查询云端挑战记录（从专用的 challenge_records 表查询）
      wx.cloud.callFunction({
        name: 'getChallengeRecords',
        data: { page: 1, pageSize: 100 },
        success: res => {
          console.log('loadRecords - challenge cloud response:', res);
          let cloudRecords = [];
          if (res.result && res.result.code === 200 && Array.isArray(res.result.data)) {
            console.log('loadRecords - challenge cloud records:', res.result.data.length);
            // 转换为统一格式
            cloudRecords = res.result.data.map(r => ({
              mode: 'challenge_record',
              level: 'high',
              size: 5,
              timeCost: r.timeMs,
              status: r.success ? 'success' : 'fail',
              accuracy: r.accuracy || 0,
              createTime: r.createTime,
              passLevel: r.passLevel
            }));
          } else {
            console.log('loadRecords - challenge cloud invalid response:', res.result);
          }
          const merged = [...localChallengeRecords, ...cloudRecords];
          console.log('loadRecords - challenge merged records:', merged.length);
          this.processRecords(merged);
        },
        fail: (err) => {
          console.error('loadRecords - challenge cloud fail:', err);
          this.processRecords(localChallengeRecords);
        }
      });
      return;
    }

    // 普通训练记录处理
    let localRecords = wx.getStorageSync('shult_records') || [];
    
    console.log('loadRecords - before filter:', filter, 'size:', sf, 'localRecords count:', localRecords.length);
    
    localRecords = localRecords.filter(r => {
      const modeMatch = filter === 'all' || r.mode === filter;
      const sizeMatch = sf === 0 || r.size === sf;
      const keep = modeMatch && sizeMatch;
      if (!keep && modeMatch) {
        console.log('loadRecords - filter out (size mismatch):', r.mode, r.size, 'expected size:', sf);
      }
      if (!keep && sizeMatch) {
        console.log('loadRecords - filter out (mode mismatch):', r.mode, 'expected mode:', filter);
      }
      return keep;
    });
    
    console.log('loadRecords - after filter:', 'localRecords count:', localRecords.length);
    
    const cloudData = {};
    if (filter !== 'all') cloudData.mode = filter;
    if (sf !== 0) cloudData.size = sf;
    
    console.log('loadRecords - cloudData:', cloudData);
    
    wx.cloud.callFunction({
      name: 'getUserTrainRecords',
      data: cloudData,
      success: res => {
        let cloudRecords = [];
        if (res.result && res.result.code === 200) {
          cloudRecords = res.result.data || [];
        }
        console.log('loadRecords - cloud response:', res.result);
        console.log('loadRecords - cloudRecords count:', cloudRecords.length);
        if (cloudRecords.length > 0) {
          console.log('loadRecords - first cloud record:', cloudRecords[0]);
        }
        const merged = [...localRecords, ...cloudRecords];
        this.processRecords(merged);
      },
      fail: () => {
        this.processRecords(localRecords);
      }
    });
  },

  processRecords(records) {
    // 过滤掉数据损坏的记录（缺失关键字段）
    const validRecords = records.filter(r => r.mode && r.level && r.size);

    this._allRecords = validRecords.map(r => {
      // 挑战记录特殊处理
      if (r.mode === 'challenge_record') {
        return {
          ...r,
          modeName: MODE_NAMES[r.mode] || '挑战模式',
          levelLabel: r.passLevel ? `第${r.passLevel}关` : '未知关',
          accuracyLabel: `正确率(${r.accuracy || 0}%)`,
          status: r.status === 'success' ? 'success' : 'fail',
          statusLabel: r.status === 'success' ? '成功' : '失败',
          statusText: this.formatSeconds(r.timeCost),  // 失败也显示用时
          formattedTime: this.formatTime(r.timeCost),
          createTime: this.formatDate(r.createTime)
        };
      }
      // 普通记录处理
      const isSuccess = r.status === 'success';
      return {
        ...r,
        modeName: MODE_NAMES[r.mode] || r.mode || '未知模式',
        levelLabel: (LEVEL_NAMES[r.level] || r.level || '未知') + `(${r.size || '?'}x${r.size || '?'})`,
        accuracyLabel: `正确率(${r.accuracy || 0}%)`,
        status: isSuccess ? 'success' : 'fail',
        statusLabel: isSuccess ? '成功' : '失败',
        statusText: isSuccess ? this.formatSeconds(r.timeCost) : this.formatSeconds(r.timeCost),
        formattedTime: this.formatTime(r.timeCost),
        createTime: this.formatDate(r.createTime)
      };
    });

    // 缓存当前筛选器的数据
    const cacheKey = `${this.data.currentFilter}_${this.data.currentSizeFilter}`;
    this._filterCache[cacheKey] = this._allRecords;

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

    // 自动滚动筛选器到对应按钮
    let scrollTarget = `filter-${filter}`;
    if (filter === 'all') scrollTarget = 'filter-classic';

    // 立即清空记录，避免显示旧数据
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

    // 从缓存取，或重新加载
    const cacheKey2 = `${filter}_0`;
    if (this._filterCache[cacheKey2]) {
      this._allRecords = this._filterCache[cacheKey2];
      this.loadPage();
      this._dataLoading = false;
    } else {
      this.loadRecords(0);
      this._dataLoading = false;
    }
  },

  setSizeFilter(e) {
    const size = parseInt(e.currentTarget.dataset.size);
    if (size === this.data.currentSizeFilter) return;
    this._filterCache = {};
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

    const cacheKey3 = `${filter}_0`;
    if (this._filterCache[cacheKey3]) {
      this._allRecords = this._filterCache[cacheKey3];
      this.loadPage();
      this._dataLoading = false;
    } else {
      this.loadRecords(0);
      this._dataLoading = false;
    }
  },
});
