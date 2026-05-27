const app = getApp();

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
    isLoggedIn: false,
    showAvatarGuide: false,
    showBestDetail: false,
    bestDetailData: [],
    isDragging: false,
    sheetTranslateY: 0,
    defaultNickName: ''
  },

  _winHeight: 0,
  _sheetStartY: 0,

  // 页面初始化时注册一次
  onShareAppMessage() {
    const app = getApp();
    if (app.globalData.globalBestTime === '--') {
      app.globalData.globalBestTime = this.data.stats.bestTime || '--';
    }
    return {
      title: `你能几秒内找完以下数字，我用时${app.globalData.globalBestTime}。`,
      path: '/pages/index/index',
      imageUrl: 'cloud://xcx-prj-d5gzqi12z8482282f.7863-xcx-prj-d5gzqi12z8482282f-1426704286/images/share-card.png'
    };
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    this._winHeight = sys.windowHeight;
    this.setData({ sheetTranslateY: this._winHeight });

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetter = letters[Math.floor(Math.random() * 26)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.setData({ defaultNickName: '微信用户' + randomLetter + randomNum });

    // 隐私授权由 privacy-auth 组件统一处理
    // 不需要在此处监听，组件 attached 时会自动注册
  },

  onShow() {
    this.setData({ isLoggedIn: app.globalData.isLoggedIn });
    this.loadUserInfo();
    this.loadStats();
  },

  doLogin() {
    // 直接执行登录，不再调用 getUserProfile
    // 头像和昵称通过登录后的组件交互获取
    if (wx.requirePrivacyAuthorize) {
      wx.requirePrivacyAuthorize({
        success: () => this.handleLogin(),
        fail: () => {}
      });
    } else {
      this.handleLogin();
    }
  },

  /** 隐私弹窗「同意」后回调 */
  onPrivacyAgreed() {
    this.handleLogin();
    // 登录成功后弹出头像设置引导
    this.setData({ showAvatarGuide: true });
  },

  /** 头像引导完成 */
  onAvatarGuideDone(e) {
    this.setData({ showAvatarGuide: false });
    if (e.detail.avatarUrl) {
      this.saveUserInfo({ avatarUrl: e.detail.avatarUrl });
    }
  },

  /** 点头像——微信原生选择器 */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (avatarUrl) {
      this.saveUserInfo({ avatarUrl });
    }
  },

  /** 昵称变更 */
  onNicknameChange(e) {
    const nickName = e.detail.value;
    if (nickName) {
      this.saveUserInfo({ nickName });
    }
  },

  /** 保存用户信息：本地缓存 + 云端数据库 */
  saveUserInfo(partial) {
    const userInfo = { ...this.data.userInfo, ...partial };
    this.setData({ userInfo });
    app.globalData.userInfo = userInfo;
    wx.setStorageSync('shult_user_info', userInfo);

    // 同步到云端
    if (app.globalData.openid) {
      wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        }
      });
    }
  },

  /** 隐私弹窗「拒绝」后回调 */
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
    wx.showLoading({ title: '登录中...' });

    const ensureOpenid = () => {
      return new Promise((resolve) => {
        if (app.globalData.openid) {
          resolve();
          return;
        }
        wx.cloud.callFunction({
          name: 'login',
          success: res => {
            if (res.result && res.result.code === 200) {
              app.globalData.openid = res.result.data.openid;
            }
          },
          complete: () => resolve()
        });
      });
    };

    ensureOpenid().then(() => {
      app.syncLocalRecordsToCloud(() => {
        app.globalData.isLoggedIn = true;
        wx.setStorageSync('shult_login_state', { loggedIn: true });
        this.setData({ isLoggedIn: true });
        wx.hideLoading();
        wx.showToast({ title: '登录成功', icon: 'success' });
        this.loadUserInfo();
        this.loadStats();
      });
    });
  },

  doLogout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后训练数据将只保存在本地',
      success: res => {
        if (res.confirm) {
          app.globalData.isLoggedIn = false;
          wx.setStorageSync('shult_login_state', { loggedIn: false });
          this.setData({ isLoggedIn: false });
          this.loadStats();
        }
      }
    });
  },

  loadUserInfo() {
    // 1. 先从本地缓存读取
    const cached = wx.getStorageSync('shult_user_info') || {};
    const hasLocal = cached.avatarUrl || cached.nickName;

    if (hasLocal) {
      // 缓存中有数据，直接用
      this.setData({ userInfo: cached });
      app.globalData.userInfo = cached;
      return;
    }

    // 2. 缓存为空，从云端读取
    if (app.globalData.openid) {
      wx.cloud.callFunction({
        name: 'getUserInfo',
        success: res => {
          if (res.result && res.result.code === 200) {
            const cloudData = res.result.data || {};
            this.setData({ userInfo: cloudData });
            app.globalData.userInfo = cloudData;
            // 存入缓存，下次直接用
            wx.setStorageSync('shult_user_info', cloudData);
          }
        }
      });
    }
  },

  computeModeStats(records) {
    const MODE_ORDER = ['classic','interference','shuffle','reverse','parity','challenge','memory'];
    const map = new Map();
    records.forEach(r => {
      if (r.status !== 'success') return;
      const key = `${r.mode}-${r.size}`;
      if (!map.has(key)) {
        map.set(key, { key, mode: r.mode, size: r.size, count: 0, bestTimeMs: Infinity });
      }
      const item = map.get(key);
      item.count++;
      if (r.timeCost < item.bestTimeMs) item.bestTimeMs = r.timeCost;
    });
    return Array.from(map.values()).sort((a, b) => {
      const ai = MODE_ORDER.indexOf(a.mode);
      const bi = MODE_ORDER.indexOf(b.mode);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.size - b.size;
    }).map(item => ({
      modeLabel: `${MODE_NAMES[item.mode] || item.mode}(${item.size}x${item.size})`,
      count: item.count,
      bestTimeLabel: item.bestTimeMs === Infinity ? '--' : this.formatTime(item.bestTimeMs)
    }));
  },

  loadStats() {
    const localRecords = wx.getStorageSync('shult_records') || [];
    let allRecords = [...localRecords];

    // 无论登录状态，都查云端数据
    wx.cloud.callFunction({
      name: 'getUserTrainRecords',
      data: {},
      success: res => {
        if (res.result && res.result.code === 200 && Array.isArray(res.result.data)) {
          allRecords = localRecords.concat(res.result.data);
        }
        this.renderStats(allRecords);
      },
      fail: () => {
        this.renderStats(allRecords);
      }
    });
  },

  renderStats(allRecords) {
    const successRecords = allRecords.filter(r => r.status === 'success');
    const totalCount = allRecords.length;
    let bestTimeMs = Infinity;
    successRecords.forEach(r => { if (r.timeCost < bestTimeMs) bestTimeMs = r.timeCost; });

    const modeStats = this.computeModeStats(allRecords);
    const bestTime = bestTimeMs === Infinity ? '--' : this.formatTime(bestTimeMs);

    // 缓存到 app.globalData 供其他页面分享使用
    getApp().globalData.globalBestTime = bestTime;

    this.setData({
      stats: {
        totalCount,
        bestTime,
        currentLevel: '--'
      },
      bestDetailData: modeStats
    });

    // 计算挑战进度
    this.computeChallengeProgress();
  },

  // 计算挑战进度
  computeChallengeProgress() {
    // 先从本地缓存获取挑战进度
    const progress = wx.getStorageSync('shult_challenge_progress');

    if (progress && progress.passLevel) {
      const passLevel = progress.passLevel;
      const success = progress.success || false;

      let displayLevel;
      if (success) {
        displayLevel = passLevel;
      } else {
        displayLevel = Math.max(1, passLevel - 1);
      }

      this.setData({
        'stats.currentLevel': displayLevel > 0 ? `第${displayLevel}关` : '--'
      });
      return;
    }

    // 本地缓存没有数据，查询云端
    wx.cloud.callFunction({
      name: 'getChallengeRecords',
      data: { page: 1, pageSize: 1 },
      success: res => {
        if (res.result && res.result.code === 200 && Array.isArray(res.result.data) && res.result.data.length > 0) {
          this.updateChallengeDisplay(res.result.data[0]);
        } else {
          this.setData({
            'stats.currentLevel': '--'
          });
        }
      },
      fail: () => {
        this.setData({
          'stats.currentLevel': '--'
        });
      }
    });
  },

  updateChallengeDisplay(cloudRecord) {
    const passLevel = cloudRecord.passLevel || 1;
    const success = cloudRecord.success || false;

    // 保存到本地缓存
    this.saveChallengeProgressToLocal(passLevel, success);

    let displayLevel;
    if (success) {
      displayLevel = passLevel;
    } else {
      displayLevel = Math.max(1, passLevel - 1);
    }

    this.setData({
      'stats.currentLevel': displayLevel > 0 ? `第${displayLevel}关` : '--'
    });
  },

  saveChallengeProgressToLocal(passLevel, success) {
    const progress = {
      passLevel: passLevel,
      success: success,
      updateTime: new Date().toISOString()
    };
    wx.setStorageSync('shult_challenge_progress', progress);
  },

  formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${s}.${cs.toString().padStart(2, '0')}秒`;
  },

  /* ===== 最佳成绩明细弹窗 ===== */
  onShowBestDetail() {
    this.setData({ showBestDetail: true, isDragging: false, sheetTranslateY: 0 });
  },

  onHideBestDetail() {
    this.setData({ isDragging: true, sheetTranslateY: this._winHeight });
    setTimeout(() => this.setData({ showBestDetail: false }), 350);
  },

  onSheetTouchStart(e) {
    this._sheetStartY = e.touches[0].clientY;
    this.setData({ isDragging: true });
  },

  onSheetTouchMove(e) {
    if (!this.data.isDragging && !this.data.showBestDetail) return;
    const delta = e.touches[0].clientY - this._sheetStartY;
    if (delta >= 0) {
      this.setData({ sheetTranslateY: delta });
    }
  },

  onSheetTouchEnd() {
    const currentY = this.data.sheetTranslateY;
    if (currentY > 120) {
      this.setData({ isDragging: false, sheetTranslateY: this._winHeight });
      setTimeout(() => this.setData({ showBestDetail: false }), 350);
    } else {
      this.setData({ isDragging: false, sheetTranslateY: 0 });
    }
  },

  onGoPass() {
    wx.navigateTo({ url: '/pages/pass/pass' });
  },

  goToHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  goToSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  onIntro() {
    wx.navigateTo({ url: '/pages/intro/intro' });
  },

  onContact() {
    const email = 'pwp8899@163.com';
    const doCopy = () => {
      wx.setClipboardData({
        data: email,
        success: () => wx.showToast({ title: '已复制邮箱', icon: 'none', duration: 2000 }),
        fail: () => {
          wx.showModal({
            title: '联系开发者',
            content: email,
            confirmText: '复制邮箱',
            success: res => {
              if (res.confirm) {
                wx.setClipboardData({
                  data: email,
                  success: () => wx.showToast({ title: '已复制邮箱', icon: 'none', duration: 2000 })
                });
              }
            }
          });
        }
      });
    };

    if (wx.getPrivacySetting) {
      wx.getPrivacySetting({
        success: res => {
          if (res.needAuthorization) {
            wx.requirePrivacyAuthorize({
              success: () => doCopy(),
              fail: () => wx.showToast({ title: '需要同意隐私协议', icon: 'none' })
            });
          } else {
            doCopy();
          }
        },
        fail: () => doCopy()
      });
    } else {
      doCopy();
    }
  }
});
