Component({
  properties: {
    active: {
      type: String,
      value: 'index'
    }
  },

  methods: {
    onSwitch(e) {
      const page = e.currentTarget.dataset.page;
      if (page === this.properties.active) return;
      if (page === 'pass') {
        wx.navigateTo({ url: '/pages/pass/pass' });
      } else {
        wx.switchTab({ url: page === 'index' ? '/pages/index/index' : '/pages/mine/mine' });
      }
    }
  }
});
