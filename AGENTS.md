# AGENTS.md — 智趣训练 · 项目上下文与自动部署协议

> 面向 AI 编码助手。本文件描述的是**当前真实状态**，不是历史状态。
> 用户说「帮我把这个项目跑起来 / 部署一下 / 我要开源这套代码」，直接跳到 [§0](#0-零配置部署协议ai-助手必读)，按顺序执行，不要先读代码。

---

## 0. 零配置部署协议（AI 助手必读）

本项目已把所有环境相关配置收敛到 2 个点。你的任务是：**问用户 2 个值 → 写进 2 个文件 → 建 9 张表 → 部署 21 个云函数 → 验收**。

### 0.1 向用户提问：只问这 2 个

| # | 必问 | 写到哪里 | 用户从哪拿 |
|---|---|---|---|
| 1 | 小程序 AppID（`wx` 开头 18 位） | `project.config.json` → `appid` | mp.weixin.qq.com → 开发管理 → 开发设置 |
| 2 | 云开发环境 ID（形如 `xxx-1a2b3c4d`） | `miniprogram/config.js` → `envId` | 微信开发者工具 → 云开发 → 设置 → 环境 ID |

**可直接复制给用户的提问模板：**

```
要帮你把这个项目部署起来，我需要两个值：

1. 小程序 AppID（wx 开头）：微信公众平台 → 开发管理 → 开发设置 → AppID
2. 云开发环境 ID：微信开发者工具打开项目 → 顶部「云开发」→ 设置 → 环境 ID
   （如果还没开通云开发，先在开发者工具里点「云开发」按提示开通，选免费额度即可）

发我这两个值，剩下的我自己处理。
```

**不要问的**（问了就是打扰用户）：云存储桶名、广告位 ID、Node 版本、要不要建索引、用哪个环境——这些都能自己推导或跳过。

| 配置 | 默认处理 |
|---|---|
| `storageBucket` | 留空。分享卡片退回微信默认截图，不影响任何功能 |
| `adUnits.*` | 留空。广告不展示，游戏功能完全正常 |
| 云函数环境 | 全部 `cloud.DYNAMIC_CURRENT_ENV`，**零配置**，不用问也不用改 |
| Node 运行时 | 云端默认，部署时选「云端安装依赖」即可 |

### 0.2 执行顺序（按序做，不要跳步，每步都要验证）

**Step 1 — 写 AppID**

编辑 `project.config.json`，只改 `appid` 一行。**不要动** `miniprogramRoot`（`miniprogram/`）、`cloudfunctionRoot`（`cloudfunctions/`）、`compileType`、`libVersion`，这些是小程序能编译的前提。

验证：文件仍是合法 JSON（`node -e "require('./project.config.json')"` 不报错）。

**Step 2 — 写环境 ID**

编辑 `miniprogram/config.js` 的 `const envId = '...'` 一行。其余字段（`shareImageUrl`、`consoleUrl`）是派生值，会自动跟着变，不要手动改。

验证：`node -e "console.log(require('./miniprogram/config.js').envId)"` 输出用户给的值。

**Step 3 — 建数据库：9 个集合 + 12 条索引**

集合名（一个都不能少）：

```
users  train_records  level_progress  pass_progress  challenge_records
huarong_records  sudoku_records  movingBlock_records  memoryGame_records
```

- 建**空集合**即可，**不要手写字段**，CloudBase 会在代码首次写入时自动生成
- 字段定义、索引字段顺序、权限规则全部在 [DATABASE.md](DATABASE.md)，照抄
- 权限统一设 `{"read": false, "write": false}`（前端不直连数据库，全走云函数）

工具优先级：若当前会话有 CloudBase / 腾讯云开发相关 MCP 或 CLI，直接调用其建集合、建索引能力批量完成；没有就给出控制台点击路径，让用户操作，**不要假装已创建**。

验证：让用户回控制台确认 9 个集合都存在。

**Step 4 — 部署 21 个云函数**

在微信开发者工具中，对 `cloudfunctions/` 下**每个**目录右键 → 「上传并部署：云端安装依赖（不上传 node_modules）」。

21 个：`login` `getUserInfo` `updateUserInfo` `getOpenId` `saveTrainRecord` `getUserTrainRecords` `getLevelProgress` `unlockNewLevel` `getPassProgress` `saveChallengeRecord` `getChallengeRecords` `saveHuarongRecord` `getHuarongRecords` `saveSudokuRecord` `getSudokuRecords` `saveMovingBlockRecord` `getMovingBlockRecords` `saveMemoryGameRecord` `getMemoryGameRecords` `getAllModes` `getAllLevels`

> 这一步只能在微信开发者工具里做（需要登录态），命令行无法代替。**必须明确告诉用户去点，不要含糊说「已部署」。**

**Step 5 — 验收**

| 检查 | 通过标准 |
|---|---|
| 编译 | 首页显示 5 个游戏入口（舒尔特 / 华容道 / 数独 / 积木迷阵 / 数字记忆） |
| 登录 | 「我的」页登录后昵称头像出现 |
| 建表生效 | 控制台 `users` `level_progress` `pass_progress` 各多 1 行，`openid` 有值 |
| 记录链路 | 玩一局舒尔特 → `train_records` 多 1 行；玩一局数独 → `sudoku_records` 多 1 行 |

任一项失败，查 [DEPLOY.md 的常见故障表](DEPLOY.md#常见故障)，按现象定位，改完重跑该步。

### 0.3 硬性禁止

1. **不要修改 `pages/`、`utils/`、`app.js` 里的业务逻辑**来完成部署。部署只需要改 2 个值。
2. **不要发明环境 ID / AppID / 广告位**。拿不到就问用户，或留空。
3. **不要把任何密钥写进仓库**。本项目不需要密钥。
4. **不要删除 `project.config.json` 里的 `miniprogramRoot` / `cloudfunctionRoot`**，删了开发者工具找不到代码。
5. **不要用命令行 `npm install`**。项目零 npm 依赖，云函数依赖由云端安装。
6. 只完成了一部分时，明确说清「哪步做完了、哪步需要你手动点」，不要报告"部署成功"。

---

## 1. 项目概览

微信小程序「智趣训练」——专注力训练游戏合集，原生小程序框架 + 腾讯云 CloudBase，**零 npm 依赖、无构建工具**。

| 项 | 值 |
|---|---|
| 前端根目录 | `miniprogram/` |
| 云函数根目录 | `cloudfunctions/`（21 个） |
| 配置中心 | `miniprogram/config.js`（唯一） |
| AppID | `project.config.json` 的 `appid`（唯一） |
| 基础库 | 3.15.2 |
| 主色 | `#22C55E` |
| 开发工具 | 微信开发者工具打开**项目根目录**（不是 `miniprogram/`） |

### 配置规则

`miniprogram/config.js` 是唯一配置入口，页面里通过 `const appConfig = require('<相对路径>/config.js')` 读取：

| 字段 | 含义 |
|---|---|
| `envId` | 云开发环境 ID，`wx.cloud.init` 用 |
| `storageBucket` | 云存储桶名，拼 `cloud://` 分享图路径；空 → 分享图退默认 |
| `shareImageUrl` | 派生：`cloud://<envId>.<bucket>/images/share-card.png`，bucket 空则空串 |
| `consoleUrl` | 派生：云开发控制台地址 |
| `adUnits.reward` / `.custom` / `.interstitial` | 三个广告位，空 → 不展示广告 |

**必须遵守：**

1. 页面里**禁止**出现 `adunit-` 字面量、`cloud://` 字面量、硬编码环境 ID —— 一律走 `appConfig`
2. 云函数**一律** `cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })`，21 个已统一，禁止写死环境 ID
3. 新增需要外部配置的项（订阅消息模板 ID、地图 key 等），先加进 `config.js` 再用
4. `.env` 不是本项目的配置方式（项目无任何密钥）

> **AppID 和云环境 ID 都不是密钥**，公开无风险 —— 别人没有你环境的权限，也调不到你的云函数。

---

## 2. 文档地图

| 文件 | 给谁看 | 内容 |
|---|---|---|
| `DEPLOY.md` | 人 | 傻瓜式 5 步部署 + 验收清单 + 故障表 |
| `DATABASE.md` | 人 / AI | 9 集合字段、12 条索引、权限规则 |
| `AGENTS.md` | AI | 本文件：部署协议 + 代码结构 + 坑 |
| `README.md` | 人 | 项目介绍与功能列表 |

文档与代码冲突时，**以代码为准**，并顺手把文档改对。

---

## 3. 目录结构

```
miniprogram/
├── config.js        ★ 配置中心（环境 ID、云存储桶、广告位）
├── pages/           主包 11 页 + 4 个游戏分包
├── components/      6 个在用组件（另有 2 个空目录）
├── utils/           缓存、设置同步、评级数据
├── app.js           全局逻辑（云开发初始化 + 儿童模式计时器）
└── app.json         路由与分包配置
cloudfunctions/      21 个云函数，每个独立部署
scripts/             辅助脚本（关卡求解、校验，纯本地算法，不调外部 API）
design-system/       设计规范
docs/                补充文档
md/ yx/              早期原型与素材（不参与编译）
```

---

## 4. 页面与路由

### 主包（11 页）

| 路径 | 功能 |
|---|---|
| `pages/game-select` | 首页游戏大厅（入口页，同时是分包预加载触发点） |
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

`preloadRule` 挂在 `pages/game-select` 上，进首页即预加载全部 4 个分包。新增游戏**必须同步改 `app.json` 的 `subPackages` 和 `preloadRule` 两处**。

---

## 5. 玩法参数

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

> `challenge` 既是**限时模式**的 key，又是**闯关页**（`pages/challenge`）的名字，两者不是一回事。

### 舒尔特 8 级难度（`pages/level/level.js`）

| key | 名称 | 规格 |
|---|---|---|
| `base` | 基础 | 3×3 |
| `primary` | 初阶 | 4×4 |
| `high` | 标准 | 5×5 |
| `super` | 中阶 | 6×6 |
| `unique` | 高阶 | 7×7 |
| `matchless` | 极限 | 8×8 |
| `sky` | 疯狂 | 9×9 |
| `crazy` | 宗师 | 10×10 |

完成当前难度解锁下一级；正确率按**不重复的错误数值**计算。`crazy` 另有 VIP 次数限制（`_getVipRemaining`）。

---

## 6. 云函数（21 个）与集合（9 个）

命名规则：`save<Game>Record` 写、`get<Game>Records` 读。

| 分组 | 函数 | 集合 |
|---|---|---|
| 用户 | `login` `getUserInfo` `updateUserInfo` `getOpenId` | `users` |
| 舒尔特 | `saveTrainRecord` `getUserTrainRecords` `getLevelProgress` `unlockNewLevel` `getPassProgress` | `train_records` `level_progress` `pass_progress` |
| 闯关 | `saveChallengeRecord` `getChallengeRecords` | `challenge_records` |
| 华容道 | `saveHuarongRecord` `getHuarongRecords` | `huarong_records` |
| 数独 | `saveSudokuRecord` `getSudokuRecords` | `sudoku_records` |
| 积木迷阵 | `saveMovingBlockRecord` `getMovingBlockRecords` | `movingBlock_records` |
| 数字记忆 | `saveMemoryGameRecord` `getMemoryGameRecords` | `memoryGame_records` |
| 配置 | `getAllModes` `getAllLevels` | 不读库，返回静态配置 |

`get*Records` 普遍支持**统计模式**（`stats: true` 只返回聚合，不拉全量），前端统计页优先走这个分支。

字段定义、索引、权限见 [DATABASE.md](DATABASE.md)。

---

## 7. 本地存储键

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

### ⚠️ 设置字段名不一致

`utils/settings-sync.js` 的 `GAME_KEYS` 里，**震动字段名分两种**：

- `hr_settings`、`mb_settings` → `vibrate`
- `shult_settings`、`shult_challenge_settings`、`sd_settings`、`mg_settings` → `vibration`

改设置相关代码时别只改一半。

---

## 8. 数据同步策略

- **未登录**：写 `wx.storage`
- **已登录**：经云函数写云端，同时清理对应本地缓存（成功失败都清）
- **统计展示**：本地与云端合并后渲染

前端**不直连数据库**（无任何 `wx.cloud.database()` 调用），全部经云函数 —— 所以集合权限可以设成 `{"read": false, "write": false}`。

---

## 9. 儿童模式

分布在 `app.js`（计时）与 `pages/settings/`（配置）。

| 项 | 约定 |
|---|---|
| 存储键 | `child_mode_settings` |
| 时长档位 | 1 ~ 30 分钟，字段 `duration` |
| 密码 | 6 位，**单个隐藏 `input` 驱动 6 个显示框**（避免键盘反复弹出，别改成 6 个 input） |
| 计时 | `App.onShow` 启动 5 秒轮询；`onHide` 暂停并累加本次用时 |
| 跨天 | 比对年月日，变化则 `usedTime` 归零 |
| 超时弹窗 | `components/time-up-modal` |

计时是**累计式**：退出不重置，`usedTime` 跨会话累加，只在跨天时清零。

---

## 10. 广告

| 类型 | 创建方法 | 配置键 | 出现次数 |
|---|---|---|---|
| 激励视频 | `wx.createRewardedVideoAd` | `adUnits.reward` | 9 |
| 自定义 | `wx.createCustomAd` | `adUnits.custom` | 9 |
| 插屏 | `wx.createInterstitialAd` | `adUnits.interstitial` | 6 |

1. **必须在 `onLoad` 中创建广告实例**。改成懒加载（首次触发才 `create*Ad`）会导致实例失效——已踩过，别回退。
2. **禁止在任何页面写 `adunit-xxx` 字面量**，一律 `appConfig.adUnits.*`。
3. `adUnits` 为空字符串时不展示广告，属预期行为。

---

## 11. 组件

| 组件 | 用途 |
|---|---|
| `age-group-selector` | 年龄段选择（首次使用弹出） |
| `avatar-guide` | 头像设置引导 |
| `custom-tabbar` | 自定义 tab 导航 |
| `privacy-auth` | 隐私授权弹窗 |
| `reference-sheet` | 参考等级弹窗 |
| `time-up-modal` | 儿童模式超时弹窗 |

`components/avatar-picker/`、`components/cloudbase-badge/` 是**空目录**，引用会报错。

---

## 12. UI 规范

- 主色 `#22C55E`，明亮鲜艳
- **禁用**毛玻璃 / `backdrop-filter` / 模糊效果
- 括号内的提示说明文字默认隐藏，保持极简
- 儿童相关文案用友好语气，可配 👶 等图标

---

## 13. 开发约定与已知坑

1. **控制影响范围**：修某个游戏的问题不动其他游戏的正常逻辑，出回归优先回滚或打局部补丁。
2. **iPad 适配**：棋盘要最大化且无滚动条。华容道曾因 `computeBoard` 算的 `boardPx` 比 CSS 可用宽度宽 `24rpx` 导致右侧溢出；涉及布局计算按实际可用宽度留余量。
3. **云函数 `update` 不支持 upsert**：写入用 `add` + 查重（见 `saveChallengeRecord`）。
4. **`createTime` 类型两种**：`users` / `level_progress` / `pass_progress` 用 `db.serverDate()`；所有 `*_records` 用 ISO **字符串**。记录表按 `createTime` 排序，改成 Date 会让排序错乱。
5. **`movingBlock_records.levelId` 存字符串**，查询时也要 `String(levelId)`。
6. **不加 npm 依赖**：小程序端零依赖，云函数依赖由云端安装。
7. **`node_modules` 不提交**（`cloudfunctions/*/node_modules` 已 gitignore）。

---

## 14. 语言与输出风格

- 思考语言：中文；输出语言：中文
- 输出风格：简洁，只说结论和必要信息，不铺陈
- 中文文案与 emoji 可正常使用；代码、命令、路径用 ASCII
