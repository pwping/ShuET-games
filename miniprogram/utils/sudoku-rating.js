/**
 * 数独评分规则
 *
 * 总分 = 100 × 基础分
 * 基础分 = 完成? (0 或 1)
 *
 * 扣除项 = 耗时分 + 错误分 + 提示分
 *   耗时分 = min(30, (实际耗时 / 目标耗时) × 30)
 *   错误分 = min(20, 错误次数 × 3)
 *   提示分 = min(20, (提示次数 + 撤销次数) × 4)
 *
 * 星级：
 *   5星：总分 ≥ 85
 *   4星：70 ~ 84
 *   3星：50 ~ 69
 *   2星：30 ~ 49
 *   1星：< 30
 *
 * 错误次数超过 8 次直接判定 ≤ 2 星
 */

var TARGET_TIMES = {
  beginner: 300,       // 初级 5分钟
  basic: 600,          // 中级 10分钟
  intermediate: 900,   // 进阶 15分钟
  advanced: 1200,      // 高阶 20分钟
  expert: 1800         // 专家 30分钟
};

var DIFF_LABELS = {
  beginner: '初级', basic: '中级', intermediate: '进阶',
  advanced: '高级', expert: '大师'
};

var DIFF_LIST = [
  { key: 'beginner', name: '初级' },
  { key: 'basic', name: '中级' },
  { key: 'intermediate', name: '进阶' },
  { key: 'advanced', name: '高级' },
  { key: 'expert', name: '大师' }
];

function calcRating(diff, time, errors, hintsUsed, undoCount) {
  var target = TARGET_TIMES[diff] || 600;
  var baseScore = 100;

  // 扣除项
  var timePenalty = Math.min(30, (time / target) * 30);
  var errorPenalty = Math.min(20, errors * 3);
  var hintPenalty = Math.min(20, (hintsUsed + undoCount) * 4);

  var deduct = timePenalty + errorPenalty + hintPenalty;
  var total = baseScore - deduct;

  // 星级
  var stars;
  if (errors > 8) {
    stars = total >= 30 ? 2 : 1;
  } else if (total >= 85) {
    stars = 5;
  } else if (total >= 70) {
    stars = 4;
  } else if (total >= 50) {
    stars = 3;
  } else if (total >= 30) {
    stars = 2;
  } else {
    stars = 1;
  }

  var starLevel = stars >= 5 ? 'excellent' : stars >= 3 ? 'good' : 'effort';

  return {
    stars: stars,
    starLevel: starLevel,
    total: Math.round(total),
    deduct: Math.round(deduct),
    timePenalty: Math.round(timePenalty),
    errorPenalty: Math.round(errorPenalty),
    hintPenalty: Math.round(hintPenalty)
  };
}

var QUOTES = {
  excellent: [
    '完美推理！逻辑满分！',
    '数独大师就是你！',
    '这推理能力，侦探级别！',
    '脑细胞全部在线！',
    '完美通关！逻辑推理满分！'
  ],
  good: [
    '还不错，再练练就是大神！',
    '稳扎稳打，进步空间大大的！',
    '差一点点就完美了，继续加油！',
    '这波操作很溜，下次争取更溜！'
  ],
  effort: [
    '没关系，通往大神的路总是曲折的~',
    '多练几次，数独其实很有趣！',
    '失败是成功的妈，多试几次就对了！',
    '每一步都算数，继续冲就完了！'
  ]
};

function randomQuote(level) {
  var list = QUOTES[level] || QUOTES.effort;
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = {
  calcRating: calcRating,
  randomQuote: randomQuote,
  DIFF_LABELS: DIFF_LABELS,
  DIFF_LIST: DIFF_LIST
};
