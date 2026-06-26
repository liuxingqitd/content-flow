# ContentFlow — 短视频内容管理系统

面向内容创作者的短视频全生命周期管理工具，覆盖从**选题灵感 → 写稿审核 → 拍摄剪辑 → 多平台发布 → 数据分析**的完整工作流。

## 功能特性

- **看板管理** — 拖拽式 Kanban 看板，6 个状态列（待启动 → 写稿中 → 待审核 → 拍摄中 → 剪辑中 → 已发布 → 已归档），可视化追踪每个视频进度
- **选题库** — 灵感采集、选题采纳、与视频双向关联，选题状态随视频生命周期自动联动
- **逐字稿编辑器** — 基于 CodeMirror 6 的 Markdown 编辑器，支持字数统计、时长估算、版本管理
- **AI Companion** — 通过全局侧边栏读取当前页面、搜索逐字稿，并按需加载本地提示词型 Skill
- **多平台分发追踪** — 记录每个视频在抖音、小红书、视频号的发布状态（已发布/已违规/已跳过）、链接、推广费用
- **数据分析** — 基于 Recharts 的多维度数据图表，支持从各平台后台导入原始运营数据
- **本地优先** — 数据存储在用户本地文件系统（File System API），隐私可控，无需服务器
- **Docker 开发环境** — 一键启动的开发容器，包含前端 Vite 开发服务器 + 本地 Express Runtime
- **深色/浅色主题** — 45+ CSS 变量驱动，一键切换

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 |
| 状态管理 | Zustand + Immer |
| 路由 | React Router 7 |
| 样式 | Tailwind CSS 4 |
| 拖拽 | dnd-kit |
| 编辑器 | CodeMirror 6 |
| 图表 | Recharts |
| 日期 | dayjs |
| ID 生成 | nanoid |
| 后端 | Express 5 + CopilotKit Runtime + OpenAI-compatible Provider |
| Docker | Node 22 Alpine + docker compose |

## 快速开始

### 前置要求

- Node.js 22+
- npm 10+

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（前端 5174 + 后端 3001）
npm run dev

# 仅前端
npm run dev:vite

# 仅后端（AI Companion Runtime）
npm run dev:server
```

### 桌面客户端（Tauri）

桌面版会把前端和本机 Express Runtime 封装到一个 macOS App 中。打开 App 后，Tauri 会自动启动本地 API sidecar，用户不需要手动运行 `npm run dev`。

```bash
# 生成本机 API sidecar
npm run package:server

# 启动 Tauri 开发客户端
npm run desktop:dev

# 构建 macOS .app
npm run desktop:build
```

当前构建产物为 macOS `.app`，输出在 `src-tauri/target/*/bundle/macos/ContentFlow.app`。DMG、签名、公证和自动更新留到分发阶段处理。

### AI Companion

AI Companion 基于 CopilotKit OSS，在网站内提供页面感知、内容搜索、逐字稿读取、数据分析和受控 Agent 操作。

1. 同时启动前端和本地 Express 服务：`npm run dev`
2. 进入“设置 → AI Companion”
3. 配置支持 OpenAI-compatible API 的服务商地址、API Key 和模型名称
4. 测试连接并启用 Companion

API Key 仅保存在当前浏览器，并在调用时发送给本机 Express Runtime；不会写入 ContentFlow 数据目录或导出备份。当前不支持执行型 Skill、MCP、多 Agent、计费或自动发布/删除。

AI Companion 会动态发现本机的提示词型 Skill。默认扫描 `~/.claude/skills`、`~/.agents/skills` 和 Docker 中的 `/skills`；Docker 开发配置会同时只读挂载 `.claude` 与 `.agents` 两套目录。也可以通过逗号分隔的 `SKILLS_ROOTS` 覆盖：

```env
SKILLS_ROOTS=~/.claude/skills,~/.agents/skills
```

所有包含 `SKILL.md` 的 Skill 都可以被侧栏按需加载，不限制 Skill 名称。为保持本地安全边界，Companion 只读取 Skill 目录内的 `SKILL.md` 和 `references/**/*.md`，不执行其中描述的 Shell、Python、联网、文件修改或其他外部工具。

### Docker 开发

```bash
# 启动容器（首次自动构建）
npm run docker:dev

# 重新构建并启动
npm run docker:dev:build

# 停止
npm run docker:down

# 停止并清理数据卷
npm run docker:clean
```

## 项目结构

```
src/
├── components/
│   ├── layout/          # 布局组件（AppShell、Sidebar、PageContainer）
│   └── ui/              # 原子 UI 组件（Button、Modal、Input、Select）
├── pages/
│   ├── Dashboard/       # 仪表盘
│   ├── Kanban/          # 看板（最复杂页面，包含门控检查弹窗）
│   ├── Videos/          # 视频库 & 视频详情
│   ├── Topics/          # 选题库
│   ├── Scripts/         # 逐字稿编辑器
│   ├── Analytics/       # 数据分析
│   └── Settings/        # 系统设置
├── services/
│   ├── fileSystem.ts    # 文件系统读写、数据迁移
│   └── defaultData.ts   # 默认数据
├── store/
│   └── appStore.ts      # 全局 Zustand store（所有业务逻辑）
├── styles/
│   └── global.css       # 全局样式 & CSS 变量
├── types/
│   └── index.ts         # TypeScript 类型定义
└── utils/
    ├── id.ts            # ID 生成
    └── date.ts          # 日期工具

server/
├── copilot/             # AI Companion Runtime 与 Provider 配置
├── skills/              # 本地提示词型 Skill Registry
└── index.ts             # Express API 入口

docs/
└── plans/               # 设计文档 & 实现方案
```

## 数据存储

所有业务数据通过 Web FileSystem API 写入用户本地文件系统：

- `data.json` — 所有结构化数据（视频、选题、逐字稿、指标等）
- `scripts/<id>.md` — 逐字稿 Markdown 内容
- 目录句柄通过 IndexedDB 持久化，避免每次刷新重新授权

首次使用需在初始化页面授权目录访问权限。数据加载时包含版本迁移逻辑，自动补全缺失字段。

## 视频生命周期

```
topic → scripting → review → filming → editing → published → archived
```

关键状态转换副作用：

- `scripting` → 自动创建关联 Script，设置 `video.scriptId`
- `published` → 自动将关联 Topic 状态置为 `done`
- `archived` → 自动将关联 Topic 状态置为 `abandoned`

选题（Topic）与视频通过 `linkedVideoId` / `topicId` 双向关联，状态随视频自动联动。

## 路线图

- [ ] 批量导入/导出
- [ ] AI 辅助逐字稿写作
- [ ] 自动封面生成
- [ ] 多用户协作
- [ ] 移动端适配

## License

MIT
