var CHILD_MODE_KEY = 'child_mode_settings';

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  data: {
    showUnlock: false,
    unlockPwd: ['','','','','',''],
    unlockPwdStr: '',
    pwdInputFocus: false,
    pwdError: false,
    dialogOffset: 0
  },

  lifetimes: {
    attached() {
      var that = this;
      wx.onKeyboardHeightChange(function (res) {
        var h = res.height || 0;
        // 只上移密码框被盖住的部分，不整个弹窗顶上去
        var offset = Math.max(0, h - 220);
        that.setData({ dialogOffset: offset });
      });
    }
  },

  observers: {
    visible: function (val) {
      if (!val) {
        this.setData({
          showUnlock: false,
          unlockPwd: ['','','','','',''],
          unlockPwdStr: '',
          pwdInputFocus: false,
          pwdError: false
        });
      }
    }
  },

  methods: {
    onExit() {
      wx.exitMiniProgram();
    },

    onShowUnlock() {
      this.setData({
        showUnlock: true,
        unlockPwd: ['','','','','',''],
        unlockPwdStr: '',
        pwdError: false,
        pwdInputFocus: false
      });
    },

    onBack() {
      this.setData({ showUnlock: false, pwdInputFocus: false });
    },

    // 点击展示框 → 聚焦隐藏的输入框
    onPwdBoxTap() {
      this.setData({ pwdInputFocus: true });
    },

    // 隐藏输入框接收输入
    onHiddenInput(e) {
      var val = e.detail.value || '';
      // 只取数字，最多6位
      var clean = val.replace(/\D/g, '').slice(0, 6);
      var arr = clean.split('');
      while (arr.length < 6) arr.push('');
      this.setData({
        unlockPwdStr: clean,
        unlockPwd: arr,
        pwdError: false
      });

      // 6位填满自动校验
      if (clean.length === 6) {
        this._checkPwd(clean);
      }
    },

    onVerifyPwd() {
      var pwd = this.data.unlockPwdStr;
      if (pwd.length < 6) {
        wx.showToast({ title: '密码还没输完哦', icon: 'none' });
        return;
      }
      this._checkPwd(pwd);
    },

    _checkPwd(pwd) {
      var settings = wx.getStorageSync(CHILD_MODE_KEY) || {};
      if (!pwd) pwd = this.data.unlockPwdStr;

      if (pwd === settings.password) {
        // 密码正确，关闭儿童模式
        settings.enabled = false;
        settings.startTime = null;
        wx.setStorageSync(CHILD_MODE_KEY, settings);
        var app = getApp();
        if (app && app._stopChildModeTimer) app._stopChildModeTimer();

        // 同步更新当前页面的儿童模式状态
        var pages = getCurrentPages();
        var page = pages[pages.length - 1];
        if (page) {
          page.setData({ _timeUpModalVisible: false });
          if (page.data.childMode !== undefined) {
            page.setData({ childMode: false, childPassword: '' });
          }
        }
        wx.showToast({ title: '解锁成功，注意保护眼睛哦', icon: 'success' });
      } else {
        var that = this;
        this.setData({ pwdError: true, pwdInputFocus: false });
        setTimeout(function () {
          that.setData({
            unlockPwd: ['','','','','',''],
            unlockPwdStr: '',
            pwdError: false,
            pwdInputFocus: true
          });
        }, 600);
      }
    }
  }
});
