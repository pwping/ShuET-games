const AGE_GROUPS = ['4-6岁', '7-11岁', '12-17岁', '18岁以上'];

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },
  data: {
    ageGroups: AGE_GROUPS,
    selectedAgeGroup: ''
  },
  observers: {
    visible(val) {
      if (val) {
        const saved = wx.getStorageSync('shult_age_group') || '';
        this.setData({ selectedAgeGroup: saved });
      }
    }
  },
  methods: {
    onOverlayTap() {
      // 点击遮罩 → 默认选18岁以上
      wx.setStorageSync('shult_age_group', '18岁以上');
      this.closeSheet();
    },
    onSelect(e) {
      const age = e.currentTarget.dataset.age;
      wx.setStorageSync('shult_age_group', age);
      this.closeSheet();
    },
    closeSheet() {
      this.setData({ visible: false });
      this.triggerEvent('change');
    }
  }
});
