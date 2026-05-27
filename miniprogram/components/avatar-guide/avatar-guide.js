Component({
  properties: {
    visible: { type: Boolean, value: false }
  },
  data: { avatarUrl: '' },
  methods: {
    onChooseAvatar(e) {
      const { avatarUrl } = e.detail;
      if (avatarUrl) this.setData({ avatarUrl });
    },
    onSkip() {
      this.triggerEvent('done', { avatarUrl: '' });
    },
    onOk() {
      this.triggerEvent('done', { avatarUrl: this.data.avatarUrl });
    }
  }
});
