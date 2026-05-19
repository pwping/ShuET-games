const { RATING_DATA, NO_DATA_MESSAGE } = require('../../utils/rating-data');

Component({
  properties: {
    size: {
      type: Number,
      value: 5
    }
  },

  data: {
    showReference: false,
    isDragging: false,
    sheetTranslateY: 0,
    gridSizes: [3, 4, 5, 6, 7, 8, 9, 10],
    currentSize: 5,
    sizeData: RATING_DATA[5],
    columnHeads: [
      { main: '优秀', sub: '（顶尖专注力）' },
      { main: '良好', sub: '（平均水平）' },
      { main: '待提升', sub: '（初期需训练）' },
    ],
    dataSource: '',
  },

  methods: {
    show(optSize) {
      const sys = wx.getSystemInfoSync();
      this._winHeight = sys.windowHeight;
      const size = optSize || this.properties.size || 5;
      const sizeData = RATING_DATA[size];
      const msg = sizeData?.noData ? NO_DATA_MESSAGE(size) : '';
      this.setData({
        showReference: true,
        isDragging: false,
        sheetTranslateY: 0,
        currentSize: size,
        sizeData: sizeData || RATING_DATA[5],
        dataSource: sizeData?.source || '',
        noDataMessage: msg,
      });
    },

    onSwitchSize(e) {
      const size = Number(e.currentTarget.dataset.size);
      const sizeData = RATING_DATA[size];
      if (!sizeData) return;
      const msg = sizeData.noData ? NO_DATA_MESSAGE(size) : '';
      this.setData({ currentSize: size, sizeData, dataSource: sizeData.source || '', noDataMessage: msg });
    },

    onHideReferenceTap() {
      this.setData({ isDragging: false, sheetTranslateY: this._winHeight || 800 });
      setTimeout(() => this.setData({ showReference: false }), 350);
    },

    onDragStart(e) {
      this._sheetStartY = e.touches[0].clientY;
      this.setData({ isDragging: true });
    },

    onDragMove(e) {
      if (!this.data.isDragging) return;
      const delta = e.touches[0].clientY - this._sheetStartY;
      if (delta >= 0) {
        this.setData({ sheetTranslateY: delta });
      }
    },

    onDragEnd() {
      const currentY = this.data.sheetTranslateY;
      this.setData({ isDragging: false });
      if (currentY > 120) {
        this.setData({ sheetTranslateY: this._winHeight || 800 });
        setTimeout(() => this.setData({ showReference: false }), 350);
      } else {
        this.setData({ sheetTranslateY: 0 });
      }
    }
  }
});
