# CLAUDE.md - 项目配置

## 语言与输出风格

- **思考语言**: 使用中文进行思考和分析
- **输出语言**: 所有回复使用中文
- **输出风格**: 保持简洁，只说结论和必要信息，不啰嗦

## 项目概览

微信小程序「智趣训练」，基于腾讯云 CloudBase 开发，提供专注力训练相关游戏。

- **AppID**: `wx889bc4ac910849f1`
- **CloudBase 环境**: `xcx-prj-d5gzqi12z8482282f`
- **小程序根目录**: `miniprogram/`
- **云函数根目录**: `cloudfunctions/`
- **开发工具**: 微信开发者工具直接打开项目根目录

## 通义千问视觉模型 (Qwen VL)

当需要分析图片/截图内容时，使用通义千问视觉模型：

- **API Base URL**: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- **API Key**: `sk-afa9d76bce3e4c02b3c77e4519e2e32e`
- **模型**: `qwen-vl-max`（优先）或 `qwen-vl-plus`
- **环境变量**: `QWEN_VL_API_KEY` / `DASHSCOPE_API_KEY`

## 页面 & 路由结构

### 主包页面
| 路径 | 功能 |
|------|------|
| `game-select` | 首页 - 游戏大厅（入口页） |
| `index` | 舒尔特方格 - 8种模式选择 |
| `level` | 难度选择（3×3~10×10） |
| `game` | 游戏核心页 |
| `result` | 结果页 |
| `challenge` | 闯关模式（5×5固定规格，逐关限时递减） |
| `pass` | 闯关进度 |
| `history` | 历史记录 |
| `mine` | 个人中心（统计数据） |
| `settings` | 设置页（音效/震动总开关） |
| `intro` | 介绍页 |

### 分包 - 数字华容道 `pages/huarongDao/`
- `mode` → `level` → `game` → `result`

### 分包 - 积木迷阵 `pages/movingBlocks/`
- `level` → `game` → `result`

分包预加载规则：进 `game-select` 时预加载两个分包。

## 核心架构

### 8种训练模式（game.js）
1. **经典** - 按 1~N 顺序点击
2. **干扰** - 彩色背景
3. **换位** - 正确后数字重排
4. **倒序** - N~1 倒序点击
5. **奇偶** - 点击全部奇数或偶数
6. **限时** - 每步 2 秒超时
7. **字母** - A~Z 字母顺序
8. **记忆** - 先记忆后隐藏再点击

### 8级难度（level.js）
3×3~10×10，对应 key: base/primary/high/super/unique/matchless/sky/crazy

### 云函数（10个）
| 函数 | 功能 |
|------|------|
| `login` | 用户登录/注册，创建 users 文档 |
| `getUserInfo` | 获取用户信息 |
| `updateUserInfo` | 更新昵称/头像 |
| `saveTrainRecord` | 保存训练记录（含 cleanup 模式） |
| `getUserTrainRecords` | 获取训练记录/统计 |
| `getLevelProgress` | 获取难度解锁进度 |
| `unlockNewLevel` | 完成当前难度后解锁下一级 |
| `saveChallengeRecord` | 保存闯关记录 |
| `getChallengeRecords` | 获取闯关记录 |
| `getPassProgress` | 获取闯关模式进度 |
| `getHuarongRecords` | 华容道记录 |
| `getMovingBlockRecords` | 积木迷阵记录 |
| `getOpenId` | 获取用户 openid |
| `getAllModes` / `getAllLevels` | 获取配置数据 |

### 数据库集合（4个）
- `users` - 用户表（索引: openid 唯一）
- `train_records` - 训练记录（索引: openid+createTime）
- `level_progress` - 难度解锁进度（索引: openid 唯一）
- `pass_progress` - 闯关进度（索引: openid 唯一）

### 重要工具模块
- `utils/cache.js` - 内存缓存+wx storage 缓存，减少重复云函数调用
- `utils/settings-sync.js` - 音效/震动总开关与4个游戏独立设置的同步
- `utils/rating-data.js` - 各规格各年龄段的参考标准数据

### 数据同步策略
- 未登录：数据保存在 `wx storage` 本地
- 已登录：云函数写入云端，同时清理本地缓存（无论成功失败）
- 统计数据：本地+云端合并显示

## 组件

- `age-group-selector` - 年龄段选择（首次使用弹出）
- `avatar-guide` - 头像设置引导
- `privacy-auth` - 隐私授权弹窗
- `custom-tabbar` - 自定义 tab 导航
- `reference-sheet` - 参考等级弹窗

## 常用操作

- **调试**: 用微信开发者工具打开项目根目录，选择「云开发」模式
- **云函数部署**: 右键 cloudfunctions 中函数 → 上传并部署（云端安装依赖）
- **数据库**: CloudBase 控制台手动创建集合和索引
- **数据查看**: CloudBase 控制台 → 数据库 → 对应集合
