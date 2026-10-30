/**
 * 项目配置中心
 *
 * ⚠️ 开源使用者：clone 本项目后，把下面 3 处换成你自己的配置即可运行。
 *
 *   1. envId         云开发环境 ID
 *                    微信开发者工具 → 云开发 → 设置 → 环境 ID
 *
 *   2. storageBucket 云存储桶名
 *                    云开发 → 存储 → 打开任意文件 → 详情里的 cloud:// 路径
 *                    形如 cloud://<envId>.<storageBucket>/xxx，取第二段
 *                    如果没上传分享图，这里随便填，分享图功能会静默失败
 *
 *   3. adUnits       广告位 ID
 *                    微信公众平台 → 流量主 → 广告位管理 → 新建广告位
 *                    没有流量主权限就先留空字符串，代码里有空值保护
 *
 * 另外还需要两步（不在本文件内）：
 *   · project.config.json 里的 appid 换成你自己的小程序 AppID
 *   · 云函数全部使用 cloud.DYNAMIC_CURRENT_ENV，无需配置，部署到哪个环境就用哪个
 */

const envId = 'xcx-prj-d5gzqi12z8482282f';
const storageBucket = '7863-xcx-prj-d5gzqi12z8482282f-1426704286';

module.exports = {
  envId: envId,
  storageBucket: storageBucket,

  // 分享卡片图（云存储路径，改图只需替换云存储里的 images/share-card.png）
  shareImageUrl: 'cloud://' + envId + '.' + storageBucket + '/images/share-card.png',

  // 云开发控制台地址（首页「复制链接」用）
  consoleUrl: 'https://tcb.cloud.tencent.com/dev/' + envId,

  adUnits: {
    // 激励视频：看广告解锁 VIP 模式/难度
    reward: 'adunit-c24dfbbb7eeb1518',
    // 自定义广告：贴片
    custom: 'adunit-2bb753c35ab3d982',
    // 插屏广告：页面切换时
    interstitial: 'adunit-ae9ae21b013ddd4b'
  }
};
