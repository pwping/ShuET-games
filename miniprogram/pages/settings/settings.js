const settingsSync = require('../../utils/settings-sync');
const CHILD_MODE_KEY = 'child_mode_settings';

Page({
  data: {
    settings: {
      sound: true,
      vibration: true
    },
    showAgeSelector: false,
    ageGroupText: '未设置',
    isLoggedIn: false,
    // 儿童模式
    childMode: false,
    childDuration: 10,
    childPassword: '',
    saveBtnText: '开启守护',
    isEditMode: false,
    // 设置弹窗 - 6位密码框
    setupPwd: ['','','','','',''],
    setupPwdStr: '',
    setupInputFocus: false,
    pickerInitValue: [9],
    dialogOffset: 0,
    // 弹窗
    showChildSetup: false,
    showChildUnlock: false,
    unlockPwd: ['','','','','',''],
    unlockPwdStr: '',
    unlockInputFocus: false
  },

  durationOptions: [],

  onLoad() {
    // 生成1-30分钟的选项
    var opts = [];
    for (var i = 1; i <= 30; i++) opts.push(i);
    this.durationOptions = opts;
    this.setData({ durationOptions: opts });

    // 监听键盘高度，弹窗自动上移（只移被盖住的部分）
    var that = this;
    wx.onKeyboardHeightChange(function (res) {
      var h = res.height || 0;
      var offset = Math.max(0, h - 220);
      that.setData({ dialogOffset: offset });
    });
  },

  onShow() {
    const app = getApp();
    const soundAllOn = settingsSync.areAllEnabled('sound');
    const vibrateAllOn = settingsSync.areAllEnabled('vibration');
    const settings = { sound: soundAllOn, vibration: vibrateAllOn };
    const globalSettings = settingsSync.getGlobalSettings();
    globalSettings.sound = soundAllOn;
    globalSettings.vibration = vibrateAllOn;
    wx.setStorageSync('global_settings', globalSettings);

    const saved = wx.getStorageSync('shult_age_group') || '';
    const loginState = wx.getStorageSync('shult_login_state') || {};
    
    // 读取儿童模式设置
    const child = wx.getStorageSync(CHILD_MODE_KEY) || {};
    var childMode = child.enabled || false;
    var childDuration = child.duration || 10;
    
    // 如果儿童模式已开启但存了密码，就存到data用于校验
    var childPassword = child.password || '';

    this.setData({
      settings,
      ageGroupText: saved || '未设置',
      isLoggedIn: !!(app.globalData.isLoggedIn) && !!(loginState.loggedIn),
      childMode,
      childDuration,
      childPassword
    });
  },

  onTapAgeGroup() {
    this.setData({ showAgeSelector: true });
  },

  onAgeChanged() {
    const saved = wx.getStorageSync('shult_age_group') || '未设置';
    this.setData({ showAgeSelector: false, ageGroupText: saved });
  },

  toggleSound(e) {
    const val = e.detail.value;
    settingsSync.syncAllGames('sound', val);
    this.setData({ settings: { ...this.data.settings, sound: val } });
  },

  toggleVibration(e) {
    const val = e.detail.value;
    settingsSync.syncAllGames('vibration', val);
    this.setData({ settings: { ...this.data.settings, vibration: val } });
  },

  // ===== 儿童模式 =====
  onChildModeChange(e) {
    var val = e.detail.value;
    if (val) {
      // 开启：弹出设置面板
      var currentDur = this.data.childDuration;
      this.setData({
        showChildSetup: true,
        setupPwd: ['','','','','',''],
        setupPwdStr: '',
        setupInputFocus: false,
        childDuration: currentDur,
        pickerInitValue: [currentDur - 1],
        saveBtnText: '开启守护',
        isEditMode: false
      });
    } else {
      // 关闭：需要验证密码
      if (this.data.childPassword) {
        this.setData({
          showChildUnlock: true,
          unlockPwd: ['','','','','',''],
          unlockPwdStr: '',
          unlockInputFocus: false
        });
      } else {
        this._disableChildMode();
      }
    }
  },

  // 点击"已设置每日限时XX分钟"修改时长
  onEditDuration() {
    var stored = wx.getStorageSync(CHILD_MODE_KEY) || {};
    var storedPwd = stored.password || '';
    var arr = storedPwd.split('');
    while (arr.length < 6) arr.push('');
    this.setData({
      showChildSetup: true,
      setupPwd: arr,
      setupPwdStr: storedPwd,
      setupInputFocus: false,
      childDuration: this.data.childDuration,
      pickerInitValue: [this.data.childDuration - 1],
      saveBtnText: '保存修改',
      isEditMode: true
    });
  },

  // 解锁弹窗 - 点击展示框触发隐藏输入框聚焦
  onUnlockBoxTap() {
    this.setData({ unlockInputFocus: true });
  },

  // 解锁弹窗 - 隐藏输入框接收输入
  onUnlockInput(e) {
    var val = e.detail.value || '';
    var clean = val.replace(/\D/g, '').slice(0, 6);
    var arr = clean.split('');
    while (arr.length < 6) arr.push('');
    this.setData({
      unlockPwdStr: clean,
      unlockPwd: arr
    });

    // 6位填满自动校验
    if (clean.length === 6) {
      if (clean === this.data.childPassword) {
        this._disableChildMode();
        this.setData({ showChildUnlock: false, unlockInputFocus: false });
        wx.showToast({ title: '已关闭儿童模式', icon: 'success' });
      } else {
        wx.showToast({ title: '密码错误', icon: 'none' });
        var that = this;
        setTimeout(function () {
          that.setData({
            unlockPwd: ['','','','','',''],
            unlockPwdStr: '',
            unlockInputFocus: true
          });
        }, 300);
      }
    }
  },

  // 解锁弹窗 - 手动点击确认
  onUnlockVerify() {
    var pwd = this.data.unlockPwdStr;
    if (pwd.length < 6) {
      wx.showToast({ title: '请输入完整密码', icon: 'none' });
      return;
    }
    if (pwd === this.data.childPassword) {
      this._disableChildMode();
      this.setData({ showChildUnlock: false, unlockInputFocus: false });
      wx.showToast({ title: '已关闭儿童模式', icon: 'success' });
    } else {
      wx.showToast({ title: '密码错误', icon: 'none' });
      var that = this;
      setTimeout(function () {
        that.setData({
          unlockPwd: ['','','','','',''],
          unlockPwdStr: '',
          unlockInputFocus: true
        });
      }, 300);
    }
  },

  onUnlockClose() {
    this.setData({
      showChildUnlock: false,
      childMode: true,
      unlockInputFocus: false
    });
  },

  _disableChildMode() {
    var settings = wx.getStorageSync(CHILD_MODE_KEY) || {};
    settings.enabled = false;
    settings.startTime = null;
    wx.setStorageSync(CHILD_MODE_KEY, settings);
    var app = getApp();
    if (app && app._stopChildModeTimer) app._stopChildModeTimer();
    this.setData({ childMode: false, childPassword: '' });
  },

  // 设置面板 - 时间选择
  onDurationChange(e) {
    var idx = parseInt(e.detail.value);
    var opts = this.data.durationOptions || this.durationOptions;
    var val = (opts && opts[idx]) || 10;
    this.setData({ childDuration: val });
  },

  // 设置面板 - 点击展示框聚焦隐藏输入框
  onSetupBoxTap() {
    this.setData({ setupInputFocus: true });
  },

  // 设置面板 - 隐藏输入框接收输入
  onSetupInput(e) {
    var val = e.detail.value || '';
    var clean = val.replace(/\D/g, '').slice(0, 6);
    var arr = clean.split('');
    while (arr.length < 6) arr.push('');
    this.setData({
      setupPwdStr: clean,
      setupPwd: arr
    });
  },

  // 保存儿童模式设置
  onSaveChildSetup() {
    var pwd = this.data.setupPwdStr;
    if (pwd.length < 6) {
      wx.showToast({ title: '请设置6位数字密码', icon: 'none' });
      return;
    }
    var isEdit = this.data.saveBtnText === '保存修改';
    var stored = isEdit ? (wx.getStorageSync(CHILD_MODE_KEY) || {}) : {};
    var settings = {
      enabled: true,
      duration: this.data.childDuration,
      password: pwd,
      startTime: stored.startTime || null,
      usedTime: stored.usedTime || 0,
      lastDate: stored.lastDate || Date.now()
    };
    wx.setStorageSync(CHILD_MODE_KEY, settings);
    this.setData({
      showChildSetup: false,
      childMode: true,
      childPassword: pwd,
      childDuration: this.data.childDuration,
      setupPwdStr: '',
      setupInputFocus: false,
      saveBtnText: '开启守护',
      isEditMode: false
    });
    var app = getApp();
    if (app && app._startChildModeTimer) app._startChildModeTimer();
    wx.showToast({ title: isEdit ? '已保存' : '儿童模式已开启', icon: 'success' });
  },

  onCancelChildSetup() {
    var isEdit = this.data.isEditMode;
    var update = {
      showChildSetup: false,
      setupPwdStr: '',
      setupInputFocus: false,
      saveBtnText: '开启守护',
      isEditMode: false
    };
    // 编辑模式取消时不改变儿童模式状态
    if (!isEdit) {
      update.childMode = false;
    }
    this.setData(update);
  },

  // 清除缓存（排除儿童模式数据）
  clearCache() {
    var that = this;
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有本地数据吗？此操作不可恢复。',
      confirmColor: '#4CAF50',
      success: function (res) {
        if (res.confirm) {
          // 先保留儿童模式设置
          var childData = wx.getStorageSync(CHILD_MODE_KEY);

          wx.removeStorageSync('shult_records');
          wx.removeStorageSync('huarong_records');
          wx.removeStorageSync('mb_records');
          wx.removeStorageSync('mb_completed');
          wx.removeStorageSync('sudoku_records');
          wx.removeStorageSync('shult_max_size');
          wx.removeStorageSync('shult_pass_progress');
          wx.removeStorageSync('shult_challenge_records');
          wx.removeStorageSync('shult_challenge_progress');
          wx.removeStorageSync('shult_settings');
          wx.removeStorageSync('hr_settings');
          wx.removeStorageSync('mb_settings');
          wx.removeStorageSync('mg_records');
          wx.removeStorageSync('mg_completed');
          wx.removeStorageSync('mg_settings');
          wx.removeStorageSync('shult_challenge_settings');
          wx.removeStorageSync('sd_settings');
          wx.removeStorageSync('global_settings');
          wx.removeStorageSync('shult_user_info');
          wx.removeStorageSync('shult_age_group');

          // 恢复儿童模式数据
          if (childData) {
            wx.setStorageSync(CHILD_MODE_KEY, childData);
          }

          that.setData({
            settings: { sound: true, vibration: true },
            ageGroupText: '未设置'
          });

          wx.showToast({ title: '已清除', icon: 'success' });
        }
      }
    });
  },

  doLogout() {
    var that = this;
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmColor: '#EF4444',
      success: function (res) {
        if (res.confirm) {
          const app = getApp();
          wx.removeStorageSync('shult_user_info');
          wx.removeStorageSync('shult_login_state');
          app.globalData.isLoggedIn = false;
          that.setData({ isLoggedIn: false });
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  }

});
