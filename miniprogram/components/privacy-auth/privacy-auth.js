Component({
    data: {
    visible: false
  },

  lifetimes: {
    attached() {
      if (wx.onNeedPrivacyAuthorization) {
        wx.onNeedPrivacyAuthorization((resolve) => {
          this._privacyResolve = resolve;
          this.setData({ visible: true });
        });
      }
    }
  },

  methods: {
    /** 用户点击「同意」*/
    onAgree() {
      this.setData({ visible: false });
      if (this._privacyResolve) {
        this._privacyResolve();
        this._privacyResolve = null;
      }
      this.triggerEvent('agree');
    },

    /** 用户点击「拒绝」 */
    onReject() {
      this.setData({ visible: false });
      if (this._privacyResolve) {
        this._privacyResolve({ event: 'disagree' });
        this._privacyResolve = null;
      }
      this.triggerEvent('reject');
    },

    /** 打开隐私指引文档 */
    onOpenPrivacyContract() {
      if (wx.openPrivacyContract) {
        wx.openPrivacyContract();
      }
    }
  }
});
