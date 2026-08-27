# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
npm run dev              # 启动开发服务器（端口 5174）
npm run build            # TypeScript 编译 + Vite 生产构建
npm run lint             # ESLint 检查
npm run preview          # 预览生产构建

# Docker 开发环境
npm run docker:dev       # 启动容器
npm run docker:dev:build # 重新构建并启动
npm run docker:down      # 停止容器
npm run docker:clean     # 停止并清理数据卷
```

本项目无测试框架，验证方式为手动在浏览器中操作功能。

## 技术栈

- **React 19 + TypeScript** + **Vite 8**
- **Zustand + Immer** — 全局状态管理，单一 store
- **React Router 7** — 客户端路由（`createBrowserRouter`）
- **Tailwind CSS 4** — 原子化样式
- **dnd-kit** — 看板拖拽排序
- **CodeMirror 6** — 逐字稿 Markdown 编辑器
- **Recharts** — 数据分析图表
- **dayjs** — 日期（中文 locale）
- **nanoid** — ID 生成

## 架构总览

### 数据持久化（关键设计）

所有数据存储在**用户本地文件系统**，通过 Web FileSystem API 读写，IndexedDB 持久化目录句柄（避免每次刷新重新授权）。

- `src/services/fileSystem.ts` — 目录句柄管理、文件读写、数据迁移
- 数据文件：结构化 JSON + `scripts/<标题>--<短ID>.md`（完整 ID 存在 frontmatter）
- 首次使用需用户在 `DirectorySetup` 页面授权目录访问权限
- `loadData()` 包含版本迁移逻辑，自动补全缺失字段、迁移旧状态值

### 全局状态（`src/store/appStore.ts`）

单一 Zustand store，所有业务数据都在 `data: AppData | null` 中：

```
AppData:
  videos[]       — 视频（核心实体）
  topics[]       — 选题（灵感池）
  scripts[]      — 逐字稿
  metrics[]      — 平台数据指标（每个 videoId+platform 保留最新一条）
  tags[]
  checklistItems[]
  settings
```

所有修改操作（`addVideo`、`moveVideo` 等）末尾会调用 `scheduleSave()`，节流 600ms 后写入文件。

### 视频生命周期

视频状态是整个系统的核心驱动，`moveVideo` 中包含关键副作用：

```
scripting → 自动创建关联 Script，设置 video.scriptId
published → 自动将关联 Topic 状态置为 done，修复双向引用
archived  → 自动将关联 Topic 状态置为 abandoned
```

选题（Topic）与视频通过 `linkedVideoId` / `topicId` 双向关联，`adoptTopic` 时创建 Video，之后状态随 Video 联动。

### 路由结构

所有页面共享 `AppShell`（Sidebar + Outlet），使用 `lazy()` + `Suspense` 按需加载：

```
/dashboard    — 概览
/kanban       — 看板（拖拽，6 个状态列）
/videos       — 视频库
/videos/:id   — 视频详情
/topics       — 选题库
/scripts/:id  — 逐字稿编辑（CodeMirror）
/analytics    — 数据分析
/settings     — 设置
```

### 目录结构关键点

- `src/components/ui/` — 无业务逻辑的原子组件（Button、Modal、Input 等）
- `src/pages/Kanban/` — 最复杂的页面，包含多个 Dialog 组件作为门控检查
- `src/styles/global.css` — 45+ CSS 变量定义主题（`--bg-base`、`--accent` 等），支持 dark/light 切换（`data-theme` 属性）
- `src/types/index.ts` — 所有 TypeScript 类型的唯一来源

### 路径别名

`@` 映射到 `./src`，例如 `import { useAppStore } from '@/store/appStore'`。
