# 智趣训练

一套专注力训练游戏合集，微信小程序原生开发 + 腾讯云 CloudBase 后端。零 npm 依赖、无构建工具。

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
- 训练记录：本地存储 + 云端同步（未登录也能玩）
- 儿童模式：1-30 分钟时长限制、6 位密码保护、累计计时、跨天重置
- 年龄段参考标准对比
- 音效/震动总开关 + 分游戏独立设置
- 激励视频、自定义、插屏三类广告位（可留空关闭）
- iPad 横屏适配

---

## 部署

**只需要填 2 个值**：小程序 AppID、云开发环境 ID。

- 人工部署：看 [DEPLOY.md](DEPLOY.md)（5 步 + 验收清单 + 故障排查表）
- **让 AI 助手部署**：把代码交给任意 AI 编码工具（WorkBuddy / Claude Code / Cursor / Codex 等），说一句

  > 按 AGENTS.md 的部署协议把这个项目跑起来

  它会读 `AGENTS.md` §0，主动问你要 AppID 和环境 ID，然后自己建表、指路部署云函数、验收。你只需要提供这 2 个值，以及在开发者工具里点「上传并部署」。

| 文档 | 内容 |
|---|---|
| [DEPLOY.md](DEPLOY.md) | 部署步骤、验收清单、常见故障 |
| [DATABASE.md](DATABASE.md) | 9 个集合的字段、12 条索引、权限规则 |
| [AGENTS.md](AGENTS.md) | 给 AI 助手的部署协议与代码约定 |

### 需要替换的配置（全项目仅 2 个文件）

| 配置 | 位置 | 是否必填 |
|---|---|---|
| 小程序 AppID | `project.config.json` → `appid` | ✅ 必填 |
| 云开发环境 ID | `miniprogram/config.js` → `envId` | ✅ 必填 |
| 云存储桶名 | `miniprogram/config.js` → `storageBucket` | 可选，留空则分享卡片用默认截图 |
| 3 个广告位 ID | `miniprogram/config.js` → `adUnits` | 可选，留空则不展示广告 |

云函数侧**零配置**：21 个函数统一 `cloud.DYNAMIC_CURRENT_ENV`，部署到哪个环境就用哪个。项目不含任何第三方 API Key、不需要 `.env`。

---

## 目录结构

```
ShuET-games/
├── miniprogram/              小程序前端
│   ├── config.js             ★ 配置中心（环境 ID、云存储桶、广告位）
│   ├── app.js                入口 + 云开发初始化 + 儿童模式计时器
│   ├── app.json              路由与分包配置
│   ├── pages/                主包 11 页 + 4 个游戏分包
│   ├── components/           自定义组件
│   └── utils/                缓存、设置同步、评级数据
├── cloudfunctions/           21 个云函数（每个独立部署）
├── scripts/                  辅助脚本（关卡求解、校验，纯本地算法）
├── docs/                     补充文档
├── design-system/            设计规范
├── project.config.json       ★ 项目配置（AppID、目录指向）
├── DEPLOY.md                 部署指南
├── DATABASE.md               数据库字段与索引
└── AGENTS.md                 给 AI 助手的项目上下文
```

### 页面结构

- **主包**：`game-select`（首页）→ `index`（模式）→ `level`（难度）→ `game` → `result`
- **4 个分包**：`huarongDao`、`movingBlocks`、`sudoku`、`memoryGame`，进入首页时全部预加载

---

## 技术栈

- 微信小程序原生框架（基础库 3.15.2）
- 腾讯云 CloudBase（云函数 + 云数据库 + 云存储）
- 无构建工具，无 npm 依赖

## 说明

- `project.private.config.json`、`node_modules` 已在 `.gitignore` 中
- `cloudfunctions/*/node_modules` 由云端安装，本地不需要提交
- 前端不直连数据库，所有读写经云函数，因此集合权限可设 `{"read": false, "write": false}`
