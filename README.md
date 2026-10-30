# 智趣训练

一套专注力训练游戏合集，微信小程序原生开发 + 腾讯云 CloudBase 后端。

包含 5 款游戏：**舒尔特方格**、**数字华容道**、**数独**、**积木迷阵**、**数字记忆**。

## 功能特性

### 舒尔特方格（主游戏）
- **8 种训练模式**：经典、干扰、换位、倒序、奇偶、限时、字母、记忆
- **8 级难度**：3×3 基础 → 10×10 宗师，完成后逐级解锁
- **闯关模式**：5×5 起步，每关限时递减
- 正确率统计按**不重复的错误数值**计算

### 其他游戏
| 游戏 | 玩法 |
|---|---|
| 数字华容道 | 滑块拼图，多模式 + 分级难度 |
| 数独 | 分级题库，含难度评级 |
| 积木迷阵 | 6×6 棋盘，最少步数与最短用时记录 |
| 数字记忆 | 数字闪现记忆 |

### 通用能力
- 训练记录：本地存储 + 云端同步
- 儿童模式：1-30 分钟时长限制、6 位密码保护、累计计时、跨天重置
- 年龄段参考标准对比
- 音效/震动总开关 + 分游戏独立设置
- 激励视频、自定义、插屏三类广告位

---

## 快速开始

### 1. 拿到代码

```bash
git clone <你的仓库地址>
cd ShuET-games
```

### 2. 换成你自己的配置

项目里所有需要替换的 ID 都集中在 **`miniprogram/config.js`** 一个文件里，打开它改成你自己的：

| 配置项 | 填什么 | 从哪拿 |
|---|---|---|
| `envId` | 云开发环境 ID | 微信开发者工具 → 云开发 → 设置 → 环境 ID |
| `storageBucket` | 云存储桶名 | 云开发 → 存储 → 打开任意文件 → 详情里的 `cloud://<envId>.<bucket>/...` 取第二段 |
| `adUnits.reward` | 激励视频广告位 | 微信公众平台 → 流量主 → 广告位管理 |
| `adUnits.custom` | 自定义广告位 | 同上 |
| `adUnits.interstitial` | 插屏广告位 | 同上 |

> 没有流量主权限？广告位留空字符串即可，代码里有空值保护，不会报错。

### 3. 换 AppID

打开 `project.config.json`，把最后一行的 `appid` 改成你自己的小程序 AppID：

```json
"appid": "wx你的AppID"
```

或者用微信开发者工具导入项目后，在「详情 → 基本信息 → AppID」里修改。

### 4. 建数据库集合

在 CloudBase 控制台创建以下 **9 个集合**（字段定义见 [DATABASE.md](DATABASE.md)）：

```
users                  train_records          level_progress
pass_progress          challenge_records      huarong_records
sudoku_records         movingBlock_records    memoryGame_records
```

索引约定：所有集合以 `openid` 为查询键；`users`、`level_progress`、`pass_progress` 的 `openid` 建唯一索引。

### 5. 部署云函数

在微信开发者工具里右键 `cloudfunctions/` 下的每个函数 → **上传并部署（云端安装依赖）**，共 22 个。

云函数统一使用 `cloud.DYNAMIC_CURRENT_ENV`，**部署到哪个环境就用哪个环境，不需要改代码**。

### 6. 编译运行

微信开发者工具打开**项目根目录**（不是 `miniprogram/`），点击编译。

---

## 目录结构

```
ShuET-games/
├── miniprogram/              小程序前端
│   ├── config.js             ★ 配置中心（环境 ID、广告位）
│   ├── app.js                入口 + 儿童模式计时器
│   ├── app.json              路由与分包配置
│   ├── pages/                主包 11 页 + 4 个游戏分包
│   ├── components/           自定义组件
│   └── utils/                缓存、设置同步、评级数据
├── cloudfunctions/           22 个云函数（每个独立部署）
├── docs/                     补充文档
├── design-system/            设计规范
├── scripts/                  辅助脚本
├── project.config.json       ★ 项目配置（AppID）
├── AGENTS.md                 给 AI 编码助手的项目上下文
├── DATABASE.md               数据库字段定义
└── DEPLOY.md                 部署说明
```

### 页面结构

- **主包**：`game-select`（首页）→ `index`（模式）→ `level`（难度）→ `game` → `result`
- **4 个分包**：`huarongDao`、`movingBlocks`、`sudoku`、`memoryGame`，进入首页时全部预加载

---

## 技术栈

- 微信小程序原生框架（基础库 3.15.2）
- 腾讯云 CloudBase（云函数 + 云数据库 + 云存储）
- 无构建工具，无 npm 依赖

## 配置项清单

假设你要二次开发或部署自己的版本，需要替换的东西一共就这些：

| 类型 | 位置 | 数量 |
|---|---|---|
| 小程序 AppID | `project.config.json` | 1 处 |
| 云开发环境 ID | `miniprogram/config.js` | 1 处 |
| 云存储桶名 | `miniprogram/config.js` | 1 处 |
| 广告位 ID | `miniprogram/config.js` | 3 个 |

云函数侧**零配置**，全部走 `DYNAMIC_CURRENT_ENV`。项目不含任何第三方 API Key。

## 说明

- `project.private.config.json`、`node_modules`、`.env` 已在 `.gitignore` 中，不会被提交
- `cloudfunctions/*/node_modules` 由云端安装，本地不需要提交
