Page({
  data: {
    sdIconCells: (function() {
      var cached = wx.getStorageSync('sd_icon_cells');
      if (cached && cached.length === 9) return cached;
      var nums = [1,2,3,4,5,6,7,8,9];
      for (var a = nums.length - 1; a > 0; a--) {
        var b = Math.floor(Math.random() * (a + 1));
        var t = nums[a]; nums[a] = nums[b]; nums[b] = t;
      }
      var emptyCols = [];
      for (var row = 0; row < 3; row++) {
        var avail = [0,1,2];
        var filtered = [];
        for (var c = 0; c < avail.length; c++) {
          if (emptyCols.indexOf(avail[c]) === -1) filtered.push(avail[c]);
        }
        var pick;
        if (filtered.length > 0) {
          pick = filtered[Math.floor(Math.random() * filtered.length)];
        } else {
          pick = Math.floor(Math.random() * 3);
        }
        emptyCols.push(pick);
      }
      var result = ['','','','','','','','',''];
      var idx = 0;
      for (var row = 0; row < 3; row++) {
        for (var col = 0; col < 3; col++) {
          if (col !== emptyCols[row]) {
            result[row * 3 + col] = String(nums[idx]);
            idx++;
          }
        }
      }
      wx.setStorageSync('sd_icon_cells', result);
      return result;
    })(),
    games: [
      {
        key: 'shuert',
        name: '舒尔特方格',
        desc: '专注力训练，按顺序点击数字',
        bg: '#fff',
        iconBg: 'linear-gradient(135deg,#059669,#6EE7B7)',
        grid: true
      },
      {
        key: 'klotski',
        name: '数字华容道',
        desc: '滑动方块，将数字按顺序排列',
        bg: '#fff',
        iconBg: 'linear-gradient(135deg,#E91E63,#FFB6C1)',
        grid: false
      },
      {
        key: 'sudoku',
        name: '数独',
        desc: '推理填数挑战大脑',
        bg: '#fff',
        iconBg: 'linear-gradient(135deg,#3B82F6,#93C5FD)',
        isNew: true
      },
      {
        key: 'moveblock',
        name: '积木迷阵',
        desc: '滑动积木闯出出口',
        bg: '#fff',
        iconBg: 'linear-gradient(135deg,#FACC15,#FDE047)',
        grid: false,
        isNew: true
      },
      // 百数斩暂隐藏
    ],
    showAgeSelector: false
  },

  onLoad() {
    var games = this.data.games;
    for (var i = 0; i < games.length; i++) {
      games[i].showNew = !!games[i].isNew;
    }
    this.setData({ games: games });
  },

  onAgeChanged() {
    this.setData({ showAgeSelector: false });
  },

  onGameTap(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'shuert') {
      wx.navigateTo({ url: '/pages/index/index' });
    } else if (key === 'klotski') {
      wx.navigateTo({ url: '/pages/huarongDao/level/level' });
    } else if (key === 'moveblock') {
      wx.navigateTo({ url: '/pages/movingBlocks/level/level' });
    } else if (key === 'sudoku') {
      wx.navigateTo({ url: '/pages/sudoku/level/level' });
    } else {
      wx.showToast({ title: '开发中，敬请期待', icon: 'none' });
    }
  },

  // 分享给好友
  onShareAppMessage() {
    return {
      title: '脑力训练首选，舒尔特方格 & 数字华容道',
      path: '/pages/game-select/game-select',
      imageUrl: 'cloud://xcx-prj-d5gzqi12z8482282f.7863-xcx-prj-d5gzqi12z8482282f-1426704286/images/share-card.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '脑力训练首选，舒尔特方格 & 数字华容道'
    };
  }
});
