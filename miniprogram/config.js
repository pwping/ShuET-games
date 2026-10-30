/**
 * 项目配置中心 —— 全项目唯一需要改的文件
 *
 * 换新环境时，只需要动下面 3 处；业务代码一律通过 require('.../config.js') 读取，
 * 不要在页面里硬编码环境 ID、cloud:// 路径或 adunit-xxx。
 *
 * ┌─ 1. envId          【必填】云开发环境 ID
 * │                     微信开发者工具 → 云开发 → 设置 → 环境 ID
 * │
 * ├─ 2. storageBucket  【可选】云存储桶名，只影响分享卡片图
 * │                     云开发 → 存储 → 打开任意文件 → 详情里的 cloud://<envId>.<bucket>/...
 * │                     留空字符串即可：分享卡片会退回微信默认截图，不影响任何功能
 * │
 * └─ 3. adUnits        【可选】广告位 ID
 *                       微信公众平台 → 流量主 → 广告位管理
 *                       没有流量主权限就保持空字符串：广告不展示，游戏正常
 *
 * 另需一处（不在本文件）：
 *   project.config.json 的 appid → 换成自己的小程序 AppID
 *
 * 云函数不需要配置：21 个函数统一用 cloud.DYNAMIC_CURRENT_ENV，部署到哪个环境就用哪个。
 */

// ===== 1. 必填：云开发环境 ID =====
const envId = 'xcx-prj-d5gzqi12z8482282f';

// ===== 2. 可选：云存储桶名（留空 = 分享卡片用微信默认截图）=====
const storageBucket = '7863-xcx-prj-d5gzqi12z8482282f-1426704286';

// ===== 3. 可选：广告位 ID（留空 = 不展示广告）=====
const adUnits = {
  reward: 'adunit-c24dfbbb7eeb1518',      // 激励视频：看广告解锁 VIP 模式/难度
  custom: 'adunit-2bb753c35ab3d982',      // 自定义广告：贴片
  interstitial: 'adunit-ae9ae21b013ddd4b' // 插屏广告：页面切换
};

module.exports = {
  envId: envId,
  storageBucket: storageBucket,

  // 分享卡片图，派生值。storageBucket 为空时给空串，微信会退回默认截图
  shareImageUrl: storageBucket
    ? 'cloud://' + envId + '.' + storageBucket + '/images/share-card.png'
    : '',

  // 云开发控制台地址（首页「复制链接」用）
  consoleUrl: 'https://tcb.cloud.tencent.com/dev/' + envId,

  adUnits: adUnits
};
