# AGENTS.md — 智趣训练项目配置

> 面向 AI 编码助手。动手改代码前先读本文件，它记录的是当前真实状态，不是历史状态。

## 语言与输出风格

- **思考语言**：中文
- **输出语言**：中文
- **输出风格**：简洁，只说结论和必要信息，不铺陈

---

## 项目概览

微信小程序「智趣训练」——专注力训练游戏合集，原生小程序框架 + 腾讯云 CloudBase。

| 项 | 值 |
|---|---|
| 主色 | `#22C55E` |
| 前端根目录 | `miniprogram/` |
| 云函数根目录 | `cloudfunctions/` |
| 开发工具 | 微信开发者工具打开项目根目录（不是 `miniprogram/`） |
| 配置中心 | `miniprogram/config.js` |
| 小程序 AppID | `project.config.json` 的 `appid` 字段 |
| 云开发环境 ID | `miniprogram/config.js` 的 `envId` |

### 配置与开源适配（重要）

本项目面向开源，**所有需要使用者替换的 ID 都必须集中在配置中心**，禁止散落在业务代码里。

`miniprogram/config.js` 是唯一配置入口：

| 字段 | 含义 |
|---|---|
| `envId` | 云开发环境 ID，`wx.cloud.init` 用 |
| `storageBucket` | 云存储桶名，拼 `cloud://` 分享图路径用 |
| `shareImageUrl` | 派生值：`cloud://<envId>.<storageBucket>/images/share-card.png` |
| `consoleUrl` | 派生值：云开发控制台地址 |
| `adUnits.reward` / `.custom` / `.interstitial` | 三个广告位 |

使用方式：`const appConfig = require('<相对路径>/config.js');`

规则：

1. **云函数一律用 `cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })`**，22 个函数已全部统一，部署到哪个环境就用哪个，零配置。禁止写死环境 ID。
2. **页面里禁止出现 `adunit-` 字面量和 `cloud://<envId>` 字面量**，全部走 `appConfig`。
3. 新增需要外部配置的项（如订阅消息模板 ID、地图 key），先加进 `config.js` 再用。
4. `project.config.json` 的 `appid` 是唯一保留在配置中心之外的值——微信开发者工具只认这个文件。

> **云开发环境 ID 和 AppID 都不算密钥**，公开无风险（别人没有你环境的权限）。真正的密钥只有 `.env` 里的 `DASHSCOPE_API_KEY` / `QWEN_VL_API_KEY`，那两个不进仓库。

## 目录结构

```
miniprogram/
├── config.js        ★ 配置中心（环境 ID、云存储桶、广告位）
├── pages/           主包页面 + 4 个游戏分包
├── components/      自定义组件
├── utils/           缓存、设置同步、评级数据
├── app.js           全局逻辑（云开发初始化 + 儿童模式计时器）
└── app.json         路由与分包配置
cloudfunctions/      22 个云函数，每个独立部署
scripts/             辅助脚本（图片识别、校验）
design-system/       设计规范
docs/                补充文档
```

## 页面与路由

### 主包（11 页）

| 路径 | 功能 |
|---|---|
| `pages/game-select` | 首页游戏大厅（入口页，同时也是分包预加载触发点） |
| `pages/index` | 舒尔特方格：8 种模式选择 |
| `pages/level` | 舒尔特难度选择 3×3 ~ 10×10 |
| `pages/game` | 舒尔特游戏核心页 |
| `pages/result` | 舒尔特结果页 |
| `pages/challenge` | 闯关模式（5×5 固定规格，逐关限时递减） |
| `pages/pass` | 闯关进度 |
| `pages/history` | 历史记录 |
| `pages/mine` | 个人中心与统计 |
| `pages/settings` | 设置页（音效/震动总开关 + 儿童模式） |
| `pages/intro` | 介绍页 |

### 分包（4 个）

| 分包 root | 页面 | 说明 |
|---|---|---|
| `pages/huarongDao/` | `mode` `level` `game` `result` | 数字华容道，有模式选择 |
| `pages/movingBlocks/` | `level` `game` `records` `result` | 积木迷阵，有独立记录页 |
| `pages/sudoku/` | `level` `game` `result` | 数独 |
| `pages/memoryGame/` | `level` `game` `result` | 数字记忆 |

`preloadRule` 在 `pages/game-select/game-select` 上，进入首页即预加载全部 4 个分包。新增游戏时**必须同步更新 `app.json` 的 `subPackages` 和 `preloadRule` 两处**。

## 核心玩法参数

### 舒尔特 8 种模式（`pages/index/index.js`）

| key | 名称 | 规则 | 初始解锁 |
|---|---|---|---|
| `classic` | 经典 | 从 1 按顺序点击 | ✅ |
| `interference` | 干扰 | 彩色背景抗干扰 | ✅ |
| `shuffle` | 换位 | 点击正确后数字重排 | ✅ |
| `reverse` | 倒序 | 从大到小倒序点 | ✅ |
| `parity` | 奇偶 | 只点奇数或偶数 | ✅ |
| `challenge` | 限时 | 每步限时 2 秒 | 🔒 |
| `alphabet` | 字母 | 按顺序点 A~Z | 🔒 |
| `memory` | 记忆 | 先记忆后隐藏再点 | 🔒 |

> `challenge` 既是**限时模式**的 key，又是**闯关页**（`pages/challenge`）的名字，两者不是一回事，改代码时注意区分。

### 舒尔特 8 级难度（`pages/level/level.js`）

| key | 名称 | 规格 |
|---|---|---|
| `base` | 基础 | 3×3 | 入门 |
| `primary` | 初阶 | 4×4 | 简单 |
| `high` | 标准 | 5×5 | 标准 |
| `super` | 中阶 | 6×6 | 进阶 |
| `unique` | 高阶 | 7×7 | 高手 |
| `matchless` | 极限 | 8×8 | 极限 |
| `sky` | 疯狂 | 9×9 | 巅峰 |
| `crazy` | 宗师 | 10×10 | 终极 |

完成当前难度后解锁下一级；正确率统计按**不重复的错误数值**计算。`crazy` 另有 VIP 次数限制（`_getVipRemaining`）。

## 云函数（22 个）

命名规则：`save<Game>Record` 写入、`get<Game>Records` 读取。

| 分组 | 函数 | 对应集合 |
|---|---|---|
| 用户 | `login` `getUserInfo` `updateUserInfo` `getOpenId` | `users` |
| 舒尔特 | `saveTrainRecord` `getUserTrainRecords` `getLevelProgress` `unlockNewLevel` `getPassProgress` | `train_records` `level_progress` `pass_progress` |
| 闯关 | `saveChallengeRecord` `getChallengeRecords` | `challenge_records` |
| 华容道 | `saveHuarongRecord` `getHuarongRecords` | `huarong_records` |
| 数独 | `saveSudokuRecord` `getSudokuRecords` | `sudoku_records` |
| 积木迷阵 | `saveMovingBlockRecord` `getMovingBlockRecords` | `movingBlock_records` |
| 数字记忆 | `saveMemoryGameRecord` `getMemoryGameRecords` | `memoryGame_records` |
| 配置/维护 | `getAllModes` `getAllLevels` `cleanupRecords` | 无 |

`get*Records` 系列普遍支持**统计模式**（传参只返回聚合数据，不拉全量记录），前端统计页优先走这个分支。

## 数据库集合（9 个）

`users` `train_records` `level_progress` `pass_progress` `challenge_records` `huarong_records` `sudoku_records` `movingBlock_records` `memoryGame_records`

字段定义见 `DATABASE.md`。所有集合以 `openid` 为索引键；`users` 和 `level_progress`、`pass_progress` 的 `openid` 唯一。

> `DATABASE.md` 目前只覆盖了前 4 个集合，后 5 个游戏记录表尚未补文档。

## 本地存储键约定

| 键 | 用途 |
|---|---|
| `global_settings` | 音效/震动总开关 `{ sound, vibration }` |
| `child_mode_settings` | 儿童模式 `{ enabled, duration, password, usedTime, lastDate }` |
| `shult_settings` / `shult_challenge_settings` | 舒尔特 / 舒尔特闯关 |
| `hr_settings` / `mb_settings` / `sd_settings` / `mg_settings` | 华容道 / 积木迷阵 / 数独 / 数字记忆 |
| `shult_records` `huarong_records` `sudoku_records` `mb_records` `mg_records` `shult_challenge_records` | 未登录时的本地记录 |
| `shult_login_state` `shult_user_info` `shult_openid` | 登录态 |
| `shult_age_group` `shult_max_size` `shult_pass_progress` `shult_challenge_progress` | 进度与画像 |
| `mb_completed` `mg_completed` | 各游戏通关标记 |

### ⚠️ 设置字段名不一致（改设置相关代码务必注意）

`utils/settings-sync.js` 中 6 个游戏的设置键统一放在 `GAME_KEYS`，但**震动字段名分两种**：

- `hr_settings`、`mb_settings` → 用 `vibrate`
- `shult_settings`、`shult_challenge_settings`、`sd_settings`、`mg_settings` → 用 `vibration`

新增游戏要么沿用这套映射，要么先统一字段名再改，别只改一半。

## 关键工具模块

- **`utils/cache.js`** — 内存 + `wx.storage` 两级缓存，减少云函数调用次数
- **`utils/settings-sync.js`** — 音效/震动总开关与 6 个游戏独立设置的双向同步
- **`utils/rating-data.js`** — 各规格、各年龄段的参考标准
- **`utils/sudoku-rating.js`** — 数独难度评级

## 数据同步策略

- **未登录**：数据写 `wx.storage`
- **已登录**：经云函数写云端，同时清理对应本地缓存（成功失败都清）
- **统计展示**：本地数据与云端数据合并后渲染

## 儿童模式

实现分布在 `app.js`（计时）和 `pages/settings/`（配置）。

| 项 | 约定 |
|---|---|
| 存储键 | `child_mode_settings` |
| 时长档位 | 1 ~ 30 分钟，`duration` |
| 密码 | 6 位，单隐藏 `input` 驱动 6 个显示框（避免键盘反复弹出） |
| 计时 | `App.onShow` 启动 5 秒轮询，`onHide` 暂停并累加本次用时 |
| 跨天 | 比对年月日，变化则 `usedTime` 归零 |
| 超时弹窗 | `components/time-up-modal` |

计时是**累计式**：退出不重置，`usedTime` 跨会话累加，只在跨天时清零。

## 广告

| 类型 | 创建方法 | 配置键（`config.js`） | 出现次数 |
|---|---|---|---|
| 激励视频 | `wx.createRewardedVideoAd` | `adUnits.reward` | 9 |
| 自定义 | `wx.createCustomAd` | `adUnits.custom` | 9 |
| 插屏 | `wx.createInterstitialAd` | `adUnits.interstitial` | 6 |

> **必须在 `onLoad` 中创建广告实例**。改成懒加载（首次触发时才 `create*Ad`）会导致实例失效——这是已经踩过的坑，别回退。
>
> ⚠️ **不要在任何页面里直接写 `adunit-xxx` 字符串**，一律走 `appConfig.adUnits.*`。硬编码会让开源使用者拿到你的广告位（用不了且会报错）。

## 组件

| 组件 | 用途 |
|---|---|
| `age-group-selector` | 年龄段选择（首次使用弹出） |
| `avatar-guide` | 头像设置引导 |
| `custom-tabbar` | 自定义 tab 导航 |
| `privacy-auth` | 隐私授权弹窗 |
| `reference-sheet` | 参考等级弹窗 |
| `time-up-modal` | 儿童模式超时弹窗 |

`miniprogram/components/avatar-picker/` 和 `cloudbase-badge/` 是**空目录**，无文件，引用会报错。

## UI 规范

- 主色 `#22C55E`，明亮鲜艳
- **禁用**毛玻璃 / `backdrop-filter` / 模糊效果
- 括号内的提示说明文字默认隐藏，保持极简
- 儿童相关文案用友好语气，可配 👶 等图标

## 开发约定与已知坑

1. **改代码控制影响范围**：修某个游戏的问题不要动其他游戏的正常逻辑，出回归优先回滚或打局部补丁。
2. **iPad 适配**：棋盘需最大化且不出现滚动条。华容道曾因 `computeBoard` 算出的 `boardPx` 比 CSS 可用空间宽 `24rpx` 导致右侧溢出，涉及布局计算时按实际可用宽度留余量。
3. **云函数 `update` 不支持 upsert**：需要写入时用 `add`（见 `saveChallengeRecord` 的查重逻辑）。
4. **不要在仓库里写明文密钥**。`.env` 已加入 `.gitignore`，`DASHSCOPE_API_KEY` / `QWEN_VL_API_KEY` 从环境变量读取，模板见 `.env.example`。
5. **`node_modules` 不提交**，云函数依赖在部署时云端安装。
6. **改配置只改 `miniprogram/config.js`**，不要把 ID 写回业务页面。

## 常用操作

| 操作 | 方式 |
|---|---|
| 调试 | 微信开发者工具打开项目根目录，选「云开发」模式 |
| 部署云函数 | 右键 `cloudfunctions/` 下函数 → 上传并部署（云端安装依赖） |
| 建集合/索引 | CloudBase 控制台手动创建，参照 `DATABASE.md` |
| 看数据 | CloudBase 控制台 → 数据库 → 对应集合 |
