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
      if (page === 'index') {
        wx.reLaunch({ url: '/pages/game-select/game-select' });
      } else {
        wx.navigateTo({ url: '/pages/mine/mine' });
      }
    }
  }
});
