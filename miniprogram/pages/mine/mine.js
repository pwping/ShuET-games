const app = getApp();
var rating = require('../../utils/sudoku-rating');

const MODE_NAMES = {
  classic: '经典模式', interference: '干扰模式', shuffle: '换位模式',
  reverse: '倒序模式', parity: '奇偶模式', challenge: '限时模式', memory: '记忆模式'
};

Page({
  data: {
    activeTab: 'mine',
    userInfo: {},
    stats: {
      totalCount: 0,
      bestTime: '--',
      currentLevel: '--'
    },
    hrStats: {
      totalCount: 0,
      bestTime: '--',
      minMoves: '--'
    },
    mbStats: {
      totalCount: 0,
      challengeLevel: '--'
    },
    sdStats: {
      totalCount: 0,
      bestTime: '--'
    },
    isLoggedIn: false,
    showAvatarGuide: false,
    showBestDetail: false,
    bestDetailData: [],
    isDragging: false,
    sheetTranslateY: 0,
    defaultNickName: '',
    swiperCurrent: 0,
    showSwipeHint: true
  },

  _winHeight: 0,
  _sheetStartY: 0,
  _hasAutoSwiped: false,

  onShareAppMessage() {
    if (app.globalData.globalBestTime === '--') {
      app.globalData.globalBestTime = this.data.stats.bestTime || '--';
    }
    return {
      title: '你能几秒内找完以下数字，我用时' + app.globalData.globalBestTime + '。',
      path: '/pages/game-select/game-select',
      imageUrl: 'cloud://xcx-prj-d5gzqi12z8482282f.7863-xcx-prj-d5gzqi12z8482282f-1426704286/images/share-card.png'
    };
  },

  onLoad() {
    var sys = wx.getSystemInfoSync();
    this._winHeight = sys.windowHeight;
    this.setData({ sheetTranslateY: this._winHeight });

    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var randomLetter = letters[Math.floor(Math.random() * 26)];
    var randomNum = Math.floor(1000 + Math.random() * 9000);
    this.setData({ defaultNickName: '微信用户' + randomLetter + randomNum });

    this.initBannerAd();
  },

  initBannerAd() {
    if (typeof wx.createCustomAd !== 'function') return;
    var ad = wx.createCustomAd({
      adUnitId: 'adunit-2bb753c35ab3d982',
      style: { left: 0, top: 0 }
    });
    if (!ad) return;
    ad.onLoad(function () {
      wx.setNavigationBarColor({ frontColor: '#000000', backgroundColor: '#FFFFFF' });
      wx.setBackgroundColor({ backgroundColor: '#FFFFFF' });
    });
    ad.onError(function (err) { console.log('mine ad error', err); });
    ad.show();
    this.bannerAd = ad;
  },

  onUnload() {
    if (this.bannerAd) this.bannerAd.destroy();
  },

  onShow() {
    this.setData({ isLoggedIn: app.globalData.isLoggedIn });
    this.loadUserInfo();
    this.loadStats();
    this.loadHuarongStats();
    this.loadMovingBlockStats();
    this.loadSudokuStats();
    this.autoSwipeDemo();
  },

  autoSwipeDemo() {
    if (this._hasAutoSwiped) return;
    this._hasAutoSwiped = true;
    var self = this;
    setTimeout(function() {
      self.setData({ swiperCurrent: 1 });
      setTimeout(function() {
        self.setData({ swiperCurrent: 0 });
        self.setData({ showSwipeHint: true });
        setTimeout(function() {
          self.setData({ showSwipeHint: false });
        }, 3000);
      }, 600);
    }, 800);
  },

  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current, showSwipeHint: false });
  },

  doLogin() {
    if (wx.requirePrivacyAuthorize) {
      wx.requirePrivacyAuthorize({
        success: function() { this.handleLogin(); }.bind(this),
        fail: function() {}
      });
    } else {
      this.handleLogin();
    }
  },

  onPrivacyAgreed() {
    this.handleLogin();
    this.setData({ showAvatarGuide: true });
  },

  onAvatarGuideDone(e) {
    this.setData({ showAvatarGuide: false });
    if (e.detail.avatarUrl) {
      this.saveUserInfo({ avatarUrl: e.detail.avatarUrl });
    }
  },

  onChooseAvatar(e) {
    var avatarUrl = e.detail.avatarUrl;
    if (avatarUrl) {
      this.saveUserInfo({ avatarUrl: avatarUrl });
    }
  },

  onNicknameChange(e) {
    var nickName = e.detail.value;
    if (nickName) {
      this.saveUserInfo({ nickName: nickName });
    }
  },

  saveUserInfo(partial) {
    var userInfo = {};
    for (var k in this.data.userInfo) userInfo[k] = this.data.userInfo[k];
    for (var k in partial) userInfo[k] = partial[k];
    this.setData({ userInfo: userInfo });
    app.globalData.userInfo = userInfo;
    wx.setStorageSync('shult_user_info', userInfo);
    if (app.globalData.openid) {
      wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: { nickName: userInfo.nickName, avatarUrl: userInfo.avatarUrl }
      });
    }
  },

  onPrivacyRejected() {
    wx.showToast({ title: '需要同意隐私协议才能登录', icon: 'none' });
  },

  onAgreePrivacy(e) {
    if (e.detail && (e.detail.eventId || e.detail.errMsg === 'agreePrivacyAuthorization:ok')) {
      this.handleLogin();
    } else {
      wx.showToast({ title: '需要同意隐私协议才能使用', icon: 'none' });
    }
  },

  handleLogin() {
    if (this._logining) return;
    this._logining = true;
    wx.showLoading({ title: '登录中...' });
    var self = this;
    var ensureOpenid = function() {
      return new Promise(function(resolve) {
        if (app.globalData.openid) { resolve(); return; }
        wx.cloud.callFunction({
          name: 'login',
          success: function(res) {
            if (res.result && res.result.code === 200) {
              app.globalData.openid = res.result.data.openid;
            }
          },
          complete: function() { resolve(); }
        });
      });
    };
    ensureOpenid().then(function() {
      app.syncLocalRecordsToCloud(function() {
        app.globalData.isLoggedIn = true;
        wx.setStorageSync('shult_login_state', { loggedIn: true });
        self.setData({ isLoggedIn: true });
        wx.hideLoading();
        wx.showToast({ title: '登录成功', icon: 'success' });
        self.loadUserInfo();
        self.loadStats();
        self.loadHuarongStats();
        self.loadMovingBlockStats();
        self.loadSudokuStats();
        self._logining = false;
      });
    }).catch(function() {
      self._logining = false;
    });
  },

  doLogout() {
    var self = this;
    wx.showModal({
      title: '退出登录',
      content: '退出后训练数据将只保存在本地',
      success: function(res) {
        if (res.confirm) {
          app.globalData.isLoggedIn = false;
          wx.setStorageSync('shult_login_state', { loggedIn: false });
          self.setData({ isLoggedIn: false });
          self.loadAllStats();
        }
      }
    });
  },

  loadUserInfo() {
    var cached = wx.getStorageSync('shult_user_info') || {};
    var hasLocal = cached.avatarUrl || cached.nickName;
    if (hasLocal) {
      this.setData({ userInfo: cached });
      app.globalData.userInfo = cached;
      return;
    }
    if (app.globalData.openid) {
      wx.cloud.callFunction({
        name: 'getUserInfo',
        success: function(res) {
          if (res.result && res.result.code === 200) {
            var cloudData = res.result.data || {};
            this.setData({ userInfo: cloudData });
            app.globalData.userInfo = cloudData;
            wx.setStorageSync('shult_user_info', cloudData);
          }
        }.bind(this)
      });
    }
  },

  computeModeStats(records) {
    var MODE_ORDER = ['classic','interference','shuffle','reverse','parity','challenge','memory'];
    var map = {};
    records.forEach(function(r) {
      if (r.status !== 'success') return;
      var key = r.mode + '-' + r.size;
      if (!map[key]) {
        map[key] = { mode: r.mode, size: r.size, count: 0, bestTimeMs: Infinity };
      }
      map[key].count++;
      if (r.timeCost < map[key].bestTimeMs) map[key].bestTimeMs = r.timeCost;
    });
    var arr = [];
    for (var k in map) arr.push(map[k]);
    arr.sort(function(a, b) {
      var ai = MODE_ORDER.indexOf(a.mode);
      var bi = MODE_ORDER.indexOf(b.mode);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.size - b.size;
    });
    return arr.map(function(item) {
      return {
        modeLabel: (MODE_NAMES[item.mode] || item.mode) + '(' + item.size + 'x' + item.size + ')',
        count: item.count,
        bestTimeLabel: item.bestTimeMs === Infinity ? '--' : this.formatTime(item.bestTimeMs)
      };
    }.bind(this));
  },

  loadAllStats() {
    this.loadStats();
    this.loadHuarongStats();
    this.loadMovingBlockStats();
    this.loadSudokuStats();
  },

  // ===== 舒尔特统计 =====
  loadStats() {
    var localRecords = wx.getStorageSync('shult_records') || [];
    wx.cloud.callFunction({
      name: 'getUserTrainRecords',
      data: { stats: true },
      success: function(res) {
        this.renderStats(localRecords, res.result);
      }.bind(this),
      fail: function() {
        this.renderStats(localRecords, null);
      }.bind(this)
    });
  },

  renderStats(localRecords, cloudResult) {
    var MODE_ORDER = ['classic','interference','shuffle','reverse','parity','challenge','memory'];
    var self = this;

    // 本地统计
    var localTotalCount = 0;
    var localBestTimeMs = Infinity;
    var localModeMap = {};

    localRecords.forEach(function(r) {
      localTotalCount++;
      if (r.status !== 'success') return;
      if (r.timeCost > 0 && r.timeCost < localBestTimeMs) localBestTimeMs = r.timeCost;
      if (r.mode && r.size) {
        var key = r.mode + '-' + r.size;
        if (!localModeMap[key]) {
          localModeMap[key] = { mode: r.mode, size: r.size, count: 0, bestTimeMs: Infinity };
        }
        localModeMap[key].count++;
        if (r.timeCost > 0 && r.timeCost < localModeMap[key].bestTimeMs) localModeMap[key].bestTimeMs = r.timeCost;
      }
    });

    // 云端统计
    var cloudTotalCount = 0;
    var cloudBestTimeMs = Infinity;
    var cloudModeMap = {};

    if (cloudResult && cloudResult.code === 200 && cloudResult.stats) {
      var s = cloudResult.stats;
      cloudTotalCount = s.totalCount || 0;
      if (s.bestTimeMs && s.bestTimeMs > 0) cloudBestTimeMs = s.bestTimeMs;
      (s.modeStats || []).forEach(function(m) {
        var key = m.mode + '-' + m.size;
        cloudModeMap[key] = { mode: m.mode, size: m.size, count: m.count || 0, bestTimeMs: m.bestTimeMs || Infinity };
      });
    }

    var totalCount = localTotalCount + cloudTotalCount;
    var bestTimeMs = Math.min(localBestTimeMs, cloudBestTimeMs);

    // 合并模式统计
    var merged = {};
    for (var k in localModeMap) merged[k] = localModeMap[k];
    for (var k in cloudModeMap) {
      if (merged[k]) {
        merged[k].count += cloudModeMap[k].count;
        merged[k].bestTimeMs = Math.min(merged[k].bestTimeMs, cloudModeMap[k].bestTimeMs);
      } else {
        merged[k] = cloudModeMap[k];
      }
    }
    var modeStats = [];
    for (var k in merged) modeStats.push(merged[k]);
    modeStats.sort(function(a, b) {
      var ai = MODE_ORDER.indexOf(a.mode);
      var bi = MODE_ORDER.indexOf(b.mode);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.size - b.size;
    });
    modeStats = modeStats.map(function(item) {
      return {
        modeLabel: (MODE_NAMES[item.mode] || item.mode) + '(' + item.size + 'x' + item.size + ')',
        count: item.count,
        bestTimeLabel: item.bestTimeMs === Infinity ? '--' : this.formatTime(item.bestTimeMs)
      };
    }.bind(this));

    var bestTime = bestTimeMs === Infinity ? '--' : this.formatTime(bestTimeMs);
    getApp().globalData.globalBestTime = bestTime;
    this.setData({
      'stats.totalCount': totalCount,
      'stats.bestTime': bestTime,
      'stats.currentLevel': '--',
      bestDetailData: modeStats
    });
    this.computeChallengeProgress();
  },

  // ===== 华容道统计 =====
  loadHuarongStats() {
    var local = wx.getStorageSync('huarong_records') || [];
    wx.cloud.callFunction({
      name: 'getHuarongRecords',
      data: { stats: true },
      success: function(res) {
        this.renderHuarongStats(local, res.result);
      }.bind(this),
      fail: function() { this.renderHuarongStats(local, null); }.bind(this)
    });
  },

  renderHuarongStats(local, cloudResult) {
    var localBestTime = Infinity, localMinMoves = Infinity;
    local.forEach(function(r) {
      if (r.time > 0 && r.time < localBestTime) localBestTime = r.time;
      if (r.moves > 0 && r.moves < localMinMoves) localMinMoves = r.moves;
    });
    var localCount = local.length;
    var cloudCount = 0, cloudBestTime = Infinity, cloudMinMoves = Infinity;
    if (cloudResult && cloudResult.code === 200 && cloudResult.stats) {
      var s = cloudResult.stats;
      cloudCount = s.totalCount || 0;
      if (s.bestTime && s.bestTime > 0) cloudBestTime = s.bestTime;
      if (s.minMoves && s.minMoves > 0) cloudMinMoves = s.minMoves;
    }
    this.setData({
      'hrStats.totalCount': localCount + cloudCount,
      'hrStats.bestTime': Math.min(localBestTime, cloudBestTime) === Infinity ? '--' : this.formatSeconds(Math.min(localBestTime, cloudBestTime)),
      'hrStats.minMoves': Math.min(localMinMoves, cloudMinMoves) === Infinity ? '--' : Math.min(localMinMoves, cloudMinMoves) + ' 步'
    });
  },

  // ===== 积木迷阵统计 =====
  loadMovingBlockStats() {
    var local = wx.getStorageSync('mb_records') || [];
    var localCount = local.length;
    var maxLevel = 0;
    for (var i = 0; i < local.length; i++) {
      var id = parseInt(local[i].levelId, 10);
      if (!isNaN(id) && id > maxLevel) maxLevel = id;
    }
    var localLevel = maxLevel > 0 ? '第' + maxLevel + '关' : '--';
    var self = this;
    wx.cloud.callFunction({
      name: 'getMovingBlockRecords',
      data: { limit: 200 },
      success: function(res) {
        var cloudCount = 0, cloudMaxLevel = 0;
        if (res.result && res.result.code === 200 && res.result.data) {
          cloudCount = res.result.data.length;
          for (var i = 0; i < res.result.data.length; i++) {
            var id = parseInt(res.result.data[i].levelId, 10);
            if (!isNaN(id) && id > cloudMaxLevel) cloudMaxLevel = id;
          }
        }
        var level = Math.max(maxLevel, cloudMaxLevel) > 0 ? '第' + Math.max(maxLevel, cloudMaxLevel) + '关' : '--';
        self.setData({
          'mbStats.totalCount': localCount + cloudCount,
          'mbStats.challengeLevel': level
        });
      },
      fail: function() {
        self.setData({
          'mbStats.totalCount': localCount,
          'mbStats.challengeLevel': localLevel
        });
      }
    });
  },

  // ===== 数独统计 =====
  loadSudokuStats() {
    var local = wx.getStorageSync('sudoku_records') || [];
    var localCount = 0, localBest = Infinity;
    for (var i = 0; i < local.length; i++) {
      if (local[i].status === 'success') localCount++;
      if (local[i].time > 0 && local[i].time < localBest) localBest = local[i].time;
    }
    var self = this;
    wx.cloud.callFunction({
      name: 'getSudokuRecords',
      data: { stats: true },
      success: function(res) {
        var cloudCount = 0, cloudBest = Infinity;
        if (res.result && res.result.code === 200 && res.result.stats) {
          var s = res.result.stats;
          cloudCount = s.totalCount || 0;
          if (s.bestTime && s.bestTime > 0) cloudBest = s.bestTime;
        }
        var totalCount = localCount + cloudCount;
        var bestTime = localBest < cloudBest ? localBest : cloudBest;
        self.setData({
          'sdStats.totalCount': totalCount,
          'sdStats.bestTime': bestTime === Infinity ? '--' : self.formatSeconds(bestTime)
        });
      },
      fail: function() {
        self.setData({
          'sdStats.totalCount': localCount,
          'sdStats.bestTime': localBest === Infinity ? '--' : self.formatSeconds(localBest)
        });
      }
    });
  },

  formatSeconds(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m > 0 ? m + '分' + (sec < 10 ? '0' : '') + sec + '秒' : sec + '秒';
  },

  // ===== 挑战进度 =====
  computeChallengeProgress() {
    var progress = wx.getStorageSync('shult_challenge_progress');
    if (progress && progress.passLevel) {
      var passLevel = progress.passLevel;
      var success = progress.success || false;
      var displayLevel = success ? passLevel : Math.max(1, passLevel - 1);
      this.setData({ 'stats.currentLevel': displayLevel > 0 ? '第' + displayLevel + '关' : '--' });
      return;
    }
    wx.cloud.callFunction({
      name: 'getChallengeRecords',
      data: { page: 1, pageSize: 1 },
      success: function(res) {
        if (res.result && res.result.code === 200 && Array.isArray(res.result.data) && res.result.data.length > 0) {
          this.updateChallengeDisplay(res.result.data[0]);
        } else {
          this.setData({ 'stats.currentLevel': '--' });
        }
      }.bind(this),
      fail: function() { this.setData({ 'stats.currentLevel': '--' }); }.bind(this)
    });
  },

  updateChallengeDisplay(cloudRecord) {
    var passLevel = cloudRecord.passLevel || 1;
    var success = cloudRecord.success || false;
    this.saveChallengeProgressToLocal(passLevel, success);
    var displayLevel = success ? passLevel : Math.max(1, passLevel - 1);
    this.setData({ 'stats.currentLevel': displayLevel > 0 ? '第' + displayLevel + '关' : '--' });
  },

  saveChallengeProgressToLocal(passLevel, success) {
    wx.setStorageSync('shult_challenge_progress', { passLevel: passLevel, success: success, updateTime: new Date().toISOString() });
  },

  formatTime(ms) {
    var s = Math.floor(ms / 1000);
    var cs = Math.floor((ms % 1000) / 10);
    return s + '.' + (cs < 10 ? '0' : '') + cs + '秒';
  },

  onShowBestDetail() {
    this.setData({ showBestDetail: true, isDragging: false, sheetTranslateY: 0 });
  },

  onHideBestDetail() {
    this.setData({ isDragging: true, sheetTranslateY: this._winHeight });
    setTimeout(function() { this.setData({ showBestDetail: false }); }.bind(this), 350);
  },

  onSheetTouchStart(e) {
    this._sheetStartY = e.touches[0].clientY;
    this.setData({ isDragging: true });
  },

  onSheetTouchMove(e) {
    if (!this.data.isDragging && !this.data.showBestDetail) return;
    var delta = e.touches[0].clientY - this._sheetStartY;
    if (delta >= 0) this.setData({ sheetTranslateY: delta });
  },

  onSheetTouchEnd() {
    var currentY = this.data.sheetTranslateY;
    if (currentY > 120) {
      this.setData({ isDragging: false, sheetTranslateY: this._winHeight });
      setTimeout(function() { this.setData({ showBestDetail: false }); }.bind(this), 350);
    } else {
      this.setData({ isDragging: false, sheetTranslateY: 0 });
    }
  },

  onGoPass() {
    wx.navigateTo({ url: '/pages/pass/pass' });
  },

  onGoMovingBlock() {
    wx.navigateTo({ url: '/pages/movingBlocks/level/level' });
  },

  goToHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  goToSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  onContact() {
    var email = 'pwp8899@163.com';
    var doCopy = function() {
      wx.setClipboardData({
        data: email,
        success: function() { wx.showToast({ title: '已复制邮箱', icon: 'none', duration: 2000 }); }
      });
    };
    if (wx.getPrivacySetting) {
      wx.getPrivacySetting({
        success: function(res) {
          if (res.needAuthorization) {
            wx.requirePrivacyAuthorize({
              success: function() { doCopy(); },
              fail: function() {}
            });
          } else {
            doCopy();
          }
        },
        fail: function() { doCopy(); }
      });
    } else {
      doCopy();
    }
  }
});
