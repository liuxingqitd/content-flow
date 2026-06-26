# Tauri 原生客户端封装

## Spec

- 使用 Tauri 2 将当前 React/Vite + 本地 Express Runtime 封装成桌面客户端。
- 用户打开客户端后自动启动本地 API Runtime，不再手动运行 `npm run dev` 或单独启动服务。
- 第一阶段保持现有业务功能和本地数据目录逻辑不变，最小化改造范围。
- 详细实现计划见 `docs/plans/2026-06-25-tauri-desktop-client-implementation.md`。

## Tasks

- [x] 写入 Tauri 客户端实现计划。
- [x] 增加桌面构建依赖与 sidecar 打包脚本。
- [x] 创建 Tauri 工程配置和 Rust 启动代码。
- [x] 调整 API URL / CORS 以兼容桌面 webview。
- [x] 更新 README 桌面客户端说明。
- [x] 运行测试、构建、sidecar 打包和桌面启动验证。
- [x] 添加 Review / 复盘。

## Review / 复盘

- 新增 Tauri 2 桌面壳，复用现有 Vite/React 前端，macOS `.app` 构建产物位于 `src-tauri/target/debug/bundle/macos/ContentFlow.app`。
- 新增 API sidecar 打包链路：`npm run build:server` 使用 esbuild 输出 `dist-server/contentflow-api.mjs`，`npm run package:server` 使用 `@yao-pkg/pkg` 生成 Tauri 需要的 `contentflow-api-<target-triple>` 可执行文件。
- Tauri 启动时自动 spawn `contentflow-api` sidecar，并传入 `HOST=127.0.0.1`、`PORT=3001`、`COPILOTKIT_TELEMETRY_DISABLED=true`；窗口关闭时会 kill sidecar。
- 前端新增 `apiUrl()` helper：普通 Web 开发继续使用相对 `/api` + Vite proxy，Tauri 环境直连 `http://127.0.0.1:3001/api`。
- Express Runtime 改为默认监听 `127.0.0.1`，并允许 Tauri webview origin 访问。
- Tauri bundle 目标暂定为 macOS `.app`。DMG 生成曾在 `bundle_dmg.sh` 阶段失败，先不阻塞第一版客户端；签名、公证、DMG 和自动更新应作为分发阶段单独处理。
- `npm run test:run` 已通过：5 个测试文件、20 个测试。
- `npx tsc -b --pretty false` 已通过。
- `npm run lint` 已通过；同时补充忽略 `dist-server` 和 `src-tauri/target` 构建产物，并拆分 `providerReadyContext` 修复 fast-refresh 规则。
- `npm run tauri -- build --debug` 已通过，并确认 `.app` 内包含 `Contents/MacOS/contentflow-api` sidecar。

---

# Tauri 客户端原生文件访问修复

## Spec

- 修复 macOS Tauri 客户端中 “您的浏览器不支持 File System Access API，请使用 Chrome 或 Edge。” 的初始化阻塞。
- 保留浏览器版 File System Access API 行为，桌面客户端改用 Tauri 原生文件系统命令。
- 数据格式保持兼容：继续使用 `videos.json`、`scripts/<id>.md`、`covers/<videoId>_<orientation>.<ext>` 等现有目录结构。

## Tasks

- [x] 定位 Tauri WebView 不支持 Chrome File System Access API 的根因。
- [x] 新增 Tauri Rust 命令：选择目录、检查目录、读写文本、读写二进制、删除文件、列出 Markdown。
- [x] 新增前端 Tauri 文件系统 adapter。
- [x] 在现有 `fileSystem.ts` 对外接口中按运行环境分流，浏览器走旧实现，Tauri 走原生实现。
- [x] 调整初始化页文案，桌面客户端不再提示 Chrome/Edge 要求。
- [x] 运行类型检查、lint、测试、Cargo 检查和 Tauri debug build。

## Review / 复盘

- 根因是第一版 Tauri 壳仍依赖浏览器专属的 `showDirectoryPicker` / File System Access API；macOS Tauri 使用系统 WebView，不具备该 API。
- 新增 `src/services/tauriFileSystem.ts`，通过 `@tauri-apps/api/core` 调用 Rust 命令，并把目录路径持久化到 localStorage。
- 新增 Rust 命令集中处理本地路径，拒绝绝对路径和 `..` 相对路径，读写均限制在用户选择的数据根目录下。
- `readAppData`、`writeAppData`、逐字稿读写、封面图读写/删除/下载都已支持 Tauri 分支；浏览器路径保持原样。
- `npx tsc -b --pretty false` 已通过。
- `cargo check` 已通过。
- `npm run lint` 已通过。
- `npm run test:run` 已通过：5 个测试文件、20 个测试。
- `npm run tauri -- build --debug` 已通过，并重新产出 `src-tauri/target/debug/bundle/macos/ContentFlow.app`。

---

# 客户端封装方案评估

## Spec

- 评估把当前 Vite/React + 本地 Express Runtime 程序封装成原生客户端的方案。
- 目标是用户直接打开客户端即可使用，不需要手动执行 `npm run dev` 或单独启动本地服务。
- 优先推荐原生体验、低维护成本、最小改造的方案。

## Tasks

- [x] 盘点当前项目启动方式、前端、后端和本地文件存储边界。
- [x] 对比 Tauri、Electron、纯原生重写 / WKWebView 方案。
- [x] 给出推荐路线和实施阶段建议。
- [ ] 等待确认是否进入设计文档和实现计划阶段。

## Review / 复盘

- 当前项目是 React 19 + Vite 8 前端，`server/index.ts` 提供 Express + CopilotKit Runtime，本地开发通过 `concurrently` 同时启动 `npm run dev:server` 与 `vite`。
- 业务数据主要通过浏览器 File System Access API 写入本地目录，AI Companion 依赖本机 HTTP Runtime。
- 推荐先走 Tauri 2 桌面壳 + Node sidecar 的渐进迁移：前端继续复用 Vite 构建产物，Express Runtime 打包为随 App 启停的 sidecar，后续再把文件系统能力逐步迁移到 Tauri 原生 API。

---

# 修复 CopilotBridge Provider 包裹顺序

## Spec

- 修复启用 AI Companion 后 `useCopilotKit must be used within CopilotKitProvider` 的运行时错误。
- 保持 CopilotKit UI 按需懒加载，未配置 AI 时不加载 Companion 资源。
- 保持路由感知上下文、Frontend Tools、HITL 和页面布局行为不变。

## Tasks

- [x] 复现并定位 CopilotBridge、CopilotGate 与 CopilotShell 的组件包裹关系。
- [x] 调整组件树，使 Copilot hooks 只在 CopilotKitProvider 内执行。
- [x] 运行类型检查、测试或构建验证。
- [x] 添加 Review / 复盘。

## Review / 复盘

- 根因是 `CopilotBridge` 会在未进入 `CopilotKitProvider` 的组件树中执行：未配置 AI 时 `CopilotGate` 直接渲染 children，配置 AI 后 lazy `CopilotShell` 的 Suspense fallback 也会短暂直接渲染 children。
- 新增 `CopilotProviderReady` 上下文，由 `CopilotShell` 在 `CopilotKitProvider` 和 `CopilotPageFocusProvider` 内标记 ready。
- `AppShell` 只在 ready 后懒加载并挂载 `CopilotBridge`，因此 `useAgentContext`、`useFrontendTool`、`useHumanInTheLoop` 等 Copilot hooks 不会越过 Provider 边界。
- 未配置 AI 时仍只显示设置入口，不加载 CopilotKit UI；配置后 `CopilotShell` 和 `CopilotBridge` 都保持独立懒加载 chunk。
- `npm run test:run` 已通过：5 个测试文件、20 个测试。
- `npx tsc -b --pretty false` 已通过。
- `npm run build` 已通过，且生成独立 `CopilotShell` JS/CSS 和 `CopilotBridge` JS 资源。
- `curl -I http://localhost:5174` 返回 200，确认本地页面服务可访问；当前仓库未安装 Playwright，未做浏览器控制台自动抓取。

---

# 移除逐字稿页旧检测功能

## Spec

- 移除逐字稿页面内独立的内容风险检测按钮、结果面板、状态和错误提示。
- 删除只被旧检测链路使用的前端 API、风险类型和服务端 `/api/detect-risk`。
- 保留右侧 AI Sidebar / Copilot Runtime 的风险检查能力，以及业务清单中的检测相关文本。
- 更新旧检测链路相关文档与服务端诊断，避免继续暗示存在独立检测 API。

## Tasks

- [x] 盘点逐字稿检测的前端入口、状态、类型与后端依赖。
- [x] 确认采用完整清理旧检测链路的方案。
- [x] 移除逐字稿页检测 UI、状态和编辑器高亮接口。
- [x] 删除旧检测组件、前端 API 和风险类型。
- [x] 删除服务端 `/api/detect-risk` 及专属规则加载逻辑。
- [x] 更新 README、Docker 配置与服务端诊断说明。
- [x] 运行测试、类型检查、lint、构建和引用扫描。
- [x] 添加 Review / 复盘。

## Review / 复盘

- 逐字稿页已移除独立“检测”按钮、通过提示、错误提示、结果面板及其临时状态。
- 已删除 `ScriptRiskPanel`、`riskDetectApi`、风险结果类型、编辑器证据高亮接口和专属风险色变量。
- 服务端已删除 `/api/detect-risk`、固定 DeepSeek 调用和专属规则加载逻辑；健康检查只返回服务状态。
- Docker 配置与 README 已移除旧检测 API 的专属环境变量和说明；AI Companion、通用 Skill Registry 与风险检查能力保持不变。
- `npm run test:run` 已通过：5 个测试文件、20 个测试。
- `npx tsc -b --pretty false`、`npm run lint`、`git diff --check` 和 `npm run build` 已通过。
- 专项引用扫描未发现旧检测链路残留。
- 使用独立端口验证当前服务端：`GET /api/health` 返回 `200 {"status":"ok"}`，`POST /api/detect-risk` 返回 `404`。
- 浏览器已打开 `/scripts`，但当前浏览器会话没有已授权数据目录，因此只能验证初始化页正常加载，无法进入真实逐字稿详情页手测。

---

# AI Companion 插件化架构设计

## Spec

- 网站业务功能与 AI 能力解耦，页面内不堆叠 AI 按钮。
- AI 通过类似 Claudian 的 Companion 插件按需读取当前页面上下文、调用受控业务动作，并连接 Obsidian 知识库。
- 覆盖内容检测、开头优化、总结、爆款分析、选题生成和写稿等场景。
- 方案需明确插件边界、上下文协议、权限安全、数据流、渐进式落地与验证方式。

## Tasks

- [x] 探索当前产品、技术栈与现有 AI 能力。
- [x] 澄清首期插件形态与关键约束：AI Companion 必须内嵌网站，由平台控制模型接入、计费与商业合作；Obsidian 仅作为可选知识库连接器。
- [x] 收敛商业边界：采用 BYOK 模式，仅配置和调用第三方模型 API，不建设平台计费、额度统计或模型转售；通过服务商推荐与合作入口变现。
- [x] 比较 2-3 种集成方式并给出推荐：不直接 Fork Claudian；复用 MIT 聊天 UI 基础设施，自研网站上下文、技能系统、BYOK 模型适配与安全写回。
- [x] 深入研究 CopilotKit 官方文档，并将其 AG-UI、Built-in Agent、Frontend Tools、HITL、Generative UI、Shared State、MCP 能力映射到当前网站。
- [x] 收敛首期范围：暂不实现动态 Skill 加载、Obsidian 连接或 MCP；首期能力以内置 Agent 指令、固定领域工具和预定义 Generative UI 实现。
- [x] 输出架构、协议、权限、交互与场景设计。
- [x] 经确认后写入设计文档。
- [x] 进入实施计划。

## Review / 复盘

- 首期确定采用 CopilotKit OSS v2、Express Copilot Runtime、Built-in Agent、Frontend Tools 和 Controlled Generative UI。
- 模型采用 BYOK，只支持用户配置第三方 OpenAI-compatible API；不建设计费、额度统计或模型转售。
- 首期不实现动态 Skill 加载、Obsidian、MCP、LangGraph、多 Agent 或 Copilot Cloud。
- 业务数据由浏览器 File System API 持有，Agent 对业务数据的查询和写入主要通过受控 Frontend Tools 调用 Zustand 完成。
- API Key 与会话单独保存在浏览器本地，不进入 `AppData`、数据目录或导出备份。
- 设计文档：`docs/plans/2026-06-09-copilotkit-ai-companion-design.md`。
- 实施计划：`docs/plans/2026-06-09-copilotkit-ai-companion-implementation.md`。

## Implementation Progress

- [x] 固定并安装 CopilotKit OSS `1.59.5`、AI SDK、Zod 和 Vitest。
- [x] 接入 Express Copilot Runtime 与请求级 BYOK Built-in Agent。
- [x] 增加网站内全局 CopilotSidebar，并在未配置时显示设置入口。
- [x] 增加浏览器本地 Provider 配置、脱敏诊断和真实连接测试。
- [x] 增加路由感知 Agent Context，避免暴露完整 `AppData` 和原始平台数据。
- [x] 增加内容搜索、视频详情、逐字稿正文和数据聚合只读工具。
- [x] 增加经 Human-in-the-loop 确认的“创建选题草稿”Agent 操作。
- [x] 限制本地 Express CORS、关闭 CopilotKit 匿名遥测，并验证 Runtime 能力。
- [x] 将 CopilotKit UI 按需懒加载，未启用 AI 时不加载 Companion 资源。
- [x] 添加 Provider、上下文和服务端配置测试。
- [ ] 后续：更丰富的 Controlled Generative UI、逐字稿安全写回和本地会话管理。

## Implementation Review

- `npm run test:run` 已通过：3 个测试文件、6 个测试。
- `npx tsc -b --pretty false` 已通过。
- 修改范围 ESLint 已通过。
- `npm run build` 已通过；CopilotKit UI 已拆分为按需加载资源。
- 全量 `npm run lint` 仍有一处既有错误：`src/pages/Scripts/index.tsx:198` 的 `react-hooks/set-state-in-effect`。
- 独立端口验证 `/api/copilotkit/info` 成功，返回 BuiltInAgent、Frontend Tools 和 SSE streaming 能力，且 `telemetryDisabled: true`。
- 使用现有本地 DeepSeek 配置真实验证 `/api/ai-provider/test` 成功。
- 使用现有本地 DeepSeek Key 真实验证 AG-UI Agent run，完整收到 `RUN_STARTED`、流式文本事件和 `RUN_FINISHED`。
- AI SDK 必须显式使用 `provider.chat(model)`，否则默认 Responses API 会让多数 OpenAI-compatible 服务商返回 404。
- 浏览器验证目录初始化流程正常；当前浏览器会话没有已授权数据目录，因此无法进入设置页完成真实 Sidebar 点击测试。

---

# 全站新版视觉系统迁移

## Spec

- 将 `/Users/liuxingqi/Downloads/ip-content` 的新版视觉系统应用到工具全部页面。
- 保持现有功能、Store action、数据结构、文件系统持久化和用户数据完全不变。
- 不复制设计稿中的模拟数据、`localStorage` 行为或未存在的业务功能。
- 通过共享设计系统和页面逐页适配实现一致风格。

## Tasks

- [x] 对比新版静态设计稿和现有 React 工具。
- [x] 梳理现有功能与数据行为契约。
- [x] 确认迁移范围和推荐方案。
- [x] 写入产品、设计与迁移规格文档。
- [x] 升级全局设计令牌、共享布局和 UI 组件。
- [x] 适配概览、看板、选题库和逐字稿页面。
- [x] 适配视频库、视频详情、数据分析和设置页面。
- [x] 适配目录初始化页和响应式表现。
- [x] 运行 lint、类型检查、构建和浏览器验证。
- [x] 检查数据层文件未发生修改并添加复盘。

## Review / 复盘

- 全站已统一为新版暗色优先、浅色兼容的紧凑产品视觉系统，包含五层背景、细边框、紫色强调、统一状态色、间距、圆角和动效。
- 共享应用壳层、侧栏、页头、按钮、表单、弹窗、徽标和空状态已统一；概览、看板、选题库、逐字稿、视频库、视频详情、数据分析、设置和目录初始化页均完成视觉适配。
- 所有现有事件处理、Store action、数据计算、文件系统读写和 API 行为保持不变；`src/store`、`src/services`、`src/types`、`server` 的 diff 为空。
- `npx tsc -b --pretty false` 已通过。
- 修改范围内的 ESLint 已通过。
- `npm run build` 已通过。
- 全量 `npm run lint` 仍有一处迁移前既有错误：`src/pages/Scripts/index.tsx:198` 的 `react-hooks/set-state-in-effect`；为避免改变现有功能，本次未修改该逻辑。
- 浏览器已验证目录初始化页新版视觉正常渲染且控制台无错误。当前浏览器会话没有已授权的数据目录，因此无法进入真实数据页面完成交互手测。

---

# 视频库封面图支持下载到本地

## Spec

- 视频详情页已有竖屏 / 横屏封面图时，需要提供“下载”操作。
- 下载应把当前视频的封面图保存到用户本地下载位置，文件名应包含视频标题、方向和扩展名，便于辨认。
- 不改变现有封面数据结构，继续使用 `covers/<videoId>_<orientation>.<ext>` 存储和 `Video.coverPortrait` / `Video.coverLandscape` 记录扩展名。
- 下载失败或封面缺失时，不影响上传、预览和删除功能。

## Tasks

- [x] 探索当前视频库封面图展示、读写和存储逻辑。
- [x] 确认推荐方案：补充读取封面 File 的服务函数，详情页按钮触发浏览器下载。
- [x] 等待设计确认。
- [x] 写入实现计划文档。
- [x] 实现封面下载服务函数和详情页下载按钮。
- [x] 运行 lint、类型检查、构建验证。
- [x] 浏览器检查详情页封面按钮状态。
- [x] 更新 `tasks/lessons.md`。
- [x] 添加 review / 复盘。

## Review / 复盘

- 新增 `readCoverFile`，从现有 `covers/<videoId>_<orientation>.<ext>` 读取原始封面 `File`，不改变现有封面存储结构。
- 视频详情页的竖屏 / 横屏封面槽在已有封面时新增“下载”操作，文件名包含视频标题和封面方向。
- 下载通过浏览器原生 `<a download>` 触发，失败或封面缺失时不会影响上传、预览、删除。
- `npm run lint` 已通过。
- `npx tsc -b --pretty false` 已通过。
- `npm run build` 已通过。
- 浏览器已打开 `http://127.0.0.1:5174/videos/vid_demo01`；当前浏览器会话没有已授权数据目录，应用停在“选择数据目录”页，因此未能完成真实封面文件的点击下载手测。

---

# 同步选题、逐字稿和视频标题

---

# 实现视频之间关联重拍 / 变体关系

## Spec

- 根据 `docs/plans/2026-06-03-video-relations-implementation.md` 实现视频到视频的显式关联关系。
- 使用独立 `videoRelations` 集合和 `videoRelations.json` 持久化，不混入选题 / 逐字稿生产链关系。
- 详情页支持新增、查看、备注和移除相关视频；看板抽屉提供只读摘要。
- Store 层负责校验：禁止自关联、禁止不存在视频、禁止重复视频对，并在删除视频时清理关系。

## Tasks

- [x] 读取实现计划并确认方案适配当前代码结构。
- [x] 添加 `VideoRelation` 类型、`AppData.videoRelations` 和关系 ID helper。
- [x] 接入默认数据、拆分文件持久化和旧数据迁移兼容。
- [x] 在 store 中添加关系增删改 action、重复校验和删除视频清理。
- [x] 在视频详情页增加“相关视频”区域和关联视频弹窗。
- [x] 在看板抽屉增加相关视频只读摘要。
- [x] 运行 lint、类型检查、构建和浏览器验证。
- [x] 更新 `tasks/lessons.md`。
- [x] 添加 review / 复盘。

## Review / 复盘

- 已新增 `VideoRelation` 类型和 `videoRelations` 数据集合，并通过 `videoRelations.json` 独立持久化。
- 旧 `data.json` 迁移、拆分文件读取、空目录初始化、Markdown 恢复索引路径都补齐了 `videoRelations: []` 兼容。
- Store 新增 `addVideoRelation`、`updateVideoRelation`、`deleteVideoRelation`，并在 `deleteVideo` 时清理关联；新增关系会阻止自关联、缺失视频和重复双向视频对。
- 视频详情页新增“相关视频”区块，可关联视频、填写备注、跳转查看、移除关系，并可在已有关系卡片中编辑备注。
- 看板抽屉新增最多两条相关视频摘要，点击可跳转到相关视频详情。
- `npx tsc -b --pretty false` 已通过。
- `npm run lint` 已通过。
- `npm run build` 已通过。
- 浏览器打开 `http://127.0.0.1:5174/videos/vid_demo01` 成功；当前浏览器会话没有已授权数据目录，应用停在“选择数据目录”页，因此未能完成新增/删除关系的真实数据交互手测。

---

# 视频库支持关联重拍 / 变体视频

## Spec

- 目标是在视频库中让一条视频可以关联另一条视频，用于记录同一内容的重拍、换形式复拍、违规后重发、爆款复刻等关系。
- 先完成产品和技术设计，不直接修改业务代码。
- 设计需要区分“视频与选题 / 逐字稿的生产链关系”和“视频与视频之间的内容变体关系”，避免触发标题同步或误改原有关联链。
- 设计完成前需要给出 2-3 个实现方案、推荐方案、数据模型、交互入口、验证方式和风险边界。

## Tasks

- [x] 探索当前视频数据模型、存储和状态管理。
- [x] 探索视频库列表、视频详情、看板抽屉的展示和编辑入口。
- [x] 澄清视频关联的业务语义和成功标准。
- [x] 提出 2-3 个方案并说明取舍。
- [x] 输出推荐设计规格。
- [x] 经确认后写入 `docs/plans/YYYY-MM-DD-video-relations-design.md`。
- [x] 进入实现计划。

## Review / 复盘

- 已确认视频关联需要支持自由备注，不使用固定原因枚举。
- 推荐采用独立 `videoRelations` 集合，避免把复拍 / 变体关系混入 `Video.topicId`、`Video.scriptId` 这条生产链关系。
- 关系按一条记录存储，详情页双向展示，备注只维护一份。
- 设计文档已写入 `docs/plans/2026-06-03-video-relations-design.md`。
- 实现计划已写入 `docs/plans/2026-06-03-video-relations-implementation.md`。

---

# 概览页移除动态并增加投放成本

## Spec

- 概览页不再展示“最近动态 / 最新动态”列表。
- 顶部统计卡增加“本月投放成本”，汇总本月平台投放费用。
- 本月投放成本优先按平台 `publishedAt` 归属月份统计；没有 `publishedAt` 但有投放费用时，按视频 `createdAt` 兜底归属。
- 概览页展示拍摄形式分布图，使用 `Video.shootingFormats` 和既有拍摄形式标签。
- 只调整概览展示层，不改变数据模型和其它页面。

## Tasks

- [x] 定位概览页统计卡、动态列表、投放成本字段和拍摄形式字段。
- [x] 在 `tasks/todo.md` 写入本次可验证任务清单。
- [x] 实现本月投放成本统计和格式化展示。
- [x] 移除概览页动态列表及无用计算。
- [x] 调整底部图表布局，展示标签构成和拍摄形式分布。
- [x] 运行验证命令。
- [x] 更新 `tasks/lessons.md`。
- [x] 添加 review / 复盘。

## Review / 复盘

- 概览页顶部统计卡新增“本月投放成本”，金额来自 `PlatformPublish.promotionCost`。
- 成本统计优先使用平台 `publishedAt` 判断是否属于本月；缺少发布时间时使用视频 `createdAt` 兜底。
- 概览页已移除“最近动态 / 最新动态”区域，并删除对应的 `recentActivity` 计算。
- 底部图表调整为“内容标签构成”和“拍摄形式分布”并列展示，拍摄形式分布复用 `Video.shootingFormats` 与既有标签映射。
- `npx eslint src/pages/Dashboard/index.tsx` 已通过。
- `npx tsc -b --pretty false` 已通过。
- `npm run build` 已通过。

---

# 视频库平台状态列改为图标

---

# 视频库去掉状态列

## Spec

- 视频库列表不再展示“状态”列。
- 保留“已发布”“已违规”“已跳过”三列的平台图标状态展示。
- 只调整列表展示层，不改变筛选、视频状态数据和详情页。

## Tasks

- [x] 确认视频库状态列位置和列宽配置。
- [x] 移除表格“状态”列和行内状态徽标。
- [x] 运行验证命令。
- [x] 添加 review / 复盘。

## Review / 复盘

- 视频库列表已移除“状态”列和行内 `StatusBadge`。
- 筛选区仍保留“全部 / 已发布 / 已归档 / 已违规 / 已跳过”，没有改变数据筛选语义。
- 表格主体仍保留“已发布”“已违规”“已跳过”的平台图标状态列。
- `npm run lint` 已通过。
- `npm run build` 已通过。

---

## Spec

- 视频库列表不再展示单独的“平台”列。
- “已发布”“已违规”“已跳过”三列都使用平台图标展示，不使用平台名称文本。
- 三个状态列内的平台图标顺序固定为：视频号、小红书、抖音。
- 只调整视频库列表展示层，不改变筛选、状态判断和数据结构。

## Tasks

- [x] 定位视频库列表表格和平台图标组件。
- [x] 确认实现方案：复用 `PlatformIcon`，新增固定平台排序，状态列按排序渲染图标。
- [x] 更新表格列配置、表头和状态列渲染。
- [x] 运行验证命令并检查页面表现。
- [x] 更新 `tasks/lessons.md`。
- [x] 添加 review / 复盘。

## Review / 复盘

- 视频库列表现在移除了单独的“平台”列，保留“已发布”“已违规”“已跳过”三列。
- 三个状态列统一通过 `PlatformStatusIcons` 渲染图标，按 `shipinhao`、`xiaohongshu`、`douyin` 固定排序，对应展示为视频号、小红书、抖音。
- 平台状态判断沿用原逻辑：缺省状态仍按 `published` 处理，`violated` 和 `skipped` 只匹配显式状态。
- 为让全仓 lint 通过，同时修正了视频库封面 effect 的同步 setState 问题，并处理了逐字稿页同类既有 lint 问题；移除了 `App.tsx` 中一个已失效的 eslint-disable 注释。
- `npm run lint` 已通过。
- `npm run build` 已通过。
- 浏览器已打开 `http://127.0.0.1:5174/videos`，但当前会话没有已授权的数据目录，应用停在“选择数据目录”页，无法直接进入真实视频库做截图验证。

---

## Spec

- 选题库、逐字稿和视频库中有关联关系的条目，应始终使用同一个标题。
- 用户在任一入口修改标题后，关联的 `Topic.title`、`Script.title`、`Video.title` 应同步更新。
- 同步范围只覆盖已有明确关联的条目，不靠相同标题做猜测匹配，避免误改无关条目。
- 保持页面交互不变，将同步逻辑集中在 store 层，减少三个页面重复处理。
- 非标题字段更新不应触发无关同步。

## Tasks

- [x] 定位三类条目的数据模型、关联字段和标题编辑入口。
- [x] 确认实现方案：在 `src/store/appStore.ts` 的更新方法内集中同步关联标题。
- [x] 在 `tasks/todo.md` 写入可验证任务清单。
- [x] 实现标题同步 helper，并接入 `updateTopic`、`updateScript`、`updateVideo`。
- [x] 检查关联创建/绑定路径，确保新建立关系时标题不会继续漂移。
- [x] 运行类型检查或构建验证。
- [x] 更新 `tasks/lessons.md`。
- [x] 添加 review / 复盘。

## Review / 复盘

- 根因是 `Topic.title`、`Script.title`、`Video.title` 各自存储，创建/流转时只复制初始标题，后续任一入口编辑都只更新自身。
- 修复集中在 `src/store/appStore.ts`：新增标题同步 helper，并在 `updateVideo`、`updateTopic`、`updateScript` 中触发同步。
- 同步只沿明确 ID 关联的一条主链进行，不靠标题猜测匹配，也不把整个历史连通分量都同化，避免旧绑定造成误同步。
- 绑定变更时会清理旧的反向引用，并补齐新的双向引用，例如视频换选题、选题换视频、逐字稿换视频。
- `linkTopicToVideo`、`adoptTopic`、`moveVideo` 中建立或修复关系的路径也会对齐标题，避免刚关联后继续漂移。
- 移除了 `src/pages/Scripts/ScriptEditor.tsx` 中未使用的 theme 订阅；该组件已使用 CSS 变量，不需要显式读取主题。
- `npx eslint src/store/appStore.ts` 已通过。
- `npx tsc -b --pretty false` 已通过。
- `npm run build` 已通过。

---

# 修复视频库筛选列展示

## Spec

- 视频库在“全部”和“已发布”筛选下应展示完整表格列，而不是只露出标题相关信息。
- 保持“已违规”“已跳过”等平台筛选的现有行为和数据语义不变。
- 修复应优先定位根因，尽量限制在视频库列表或必要样式上。
- 完成前通过类型检查/构建和页面验证证明功能有效。

## Tasks

- [x] 读取视频库页面、容器和全局样式，定位表格列渲染逻辑。
- [x] 复现或确认“全部 / 已发布”下列不可见的根因。
- [x] 实现最小范围修复。
- [ ] 运行验证命令并检查页面表现。
- [ ] 更新 `tasks/lessons.md`。
- [ ] 添加 review / 复盘。

## Review / 复盘

- 待补充。

---

# 视频库性能优化与商单金额

## Spec

- 视频库列表点击后应尽快展示表格内容，封面读取不阻塞首屏体验。
- 优先优化封面缩略图加载：按需加载、缓存已读封面，避免进入页面时一次性读取全部封面。
- 视频详情页支持标记视频为商单，并填写商单金额。
- 概览页展示商单金额汇总。
- 商单金额展示开关复用隐私区逻辑，与投放金额的展示/隐藏控制保持一致。
- 拍摄形式新增“走拍”，复用现有集中定义。

## Tasks

- [x] 定位视频库加载慢的主要候选路径。
- [x] 定位投放金额隐私开关、详情页输入和概览统计的现有实现。
- [x] 确认性能优化与商单金额的数据设计。
- [x] 实现视频库封面懒加载/缓存优化。
- [x] 实现商单标记、金额录入和概览展示。
- [x] 添加“走拍”拍摄形式。
- [x] 运行 lint、类型检查、构建和必要的行为验证。
- [x] 检查 diff 并添加 review / 复盘。

## Review / 复盘

- 视频库列表封面从“进入页面即读取全部封面”改为接近视口后再读取，并用会话级 object URL 缓存避免返回列表时重复读取。
- `Video` 新增 `isCommercial` 和 `commercialAmount`，详情页可标记商单并填写金额；取消商单会清空金额，避免被隐藏数据继续统计。
- `AppSettings` 新增 `hideCommercialAmount`，默认值和旧数据迁移均为 `false`；设置页隐私区现在并列控制投放金额和商单金额。
- 概览页新增“本月商单金额”卡片，按视频首个发布时间回退创建时间统计，隐藏商单金额时不展示。
- `ShootingFormat` 新增 `walking_shot`，展示为“走拍”，视频详情、视频列表和概览拍摄形式统计自动支持。
- `npx eslint src/types/index.ts src/services/defaultData.ts src/services/fileSystem.ts src/pages/Videos/index.tsx src/pages/Videos/VideoDetail.tsx src/pages/Dashboard/index.tsx src/pages/Settings/index.tsx` 已通过。
- `npx tsc -b --pretty false` 已通过。
- `npm run build` 已通过；仍有既有 Vite 大 chunk 警告，与本次改动无关。
- `git diff --check` 已通过。

---

# 拍摄形式增加电子白板和白板

## Spec

- 拍摄形式新增“电子白板”和“白板”两个可多选选项。
- 复用现有集中定义，使视频详情选择、视频列表、看板抽屉和概览统计自动支持新选项。
- 不改变现有拍摄形式数据和交互逻辑。

## Tasks

- [x] 定位拍摄形式类型、标签映射、选项顺序和消费入口。
- [x] 确认最小实现方案。
- [x] 添加“电子白板”和“白板”拍摄形式。
- [x] 运行 lint、类型检查和构建验证。
- [x] 检查 diff 并添加 review / 复盘。

## Review / 复盘

- `ShootingFormat` 新增 `electronic_whiteboard` 和 `whiteboard`，对应展示为“电子白板”和“白板”。
- 两个新选项加入 `ALL_SHOOTING_FORMATS`，现有视频详情选择、视频列表、看板抽屉和概览统计会自动支持。
- `npx eslint src/types/index.ts` 已通过。
- `npx tsc -b --pretty false` 已通过。
- `npm run build` 已通过。
- 全量 `npm run lint` 仍有一处既有错误：`src/pages/Scripts/index.tsx:198` 的 `react-hooks/set-state-in-effect`，与本次改动无关。

---

# 修复 Docker 开发环境 CopilotKit v2 导入失败

## Spec

- Docker 开发容器应使用当前 `package-lock.json` 中声明的依赖，而不是继续使用匿名卷里的旧 `node_modules`。
- 保留 `@copilotkit/react-core/v2` 导入，因为已安装的 `1.59.5` 版本明确导出该入口。
- 修复应覆盖后续依赖新增或升级场景，不要求开发者手动删除 Docker volume。

## Tasks

- [x] 核对 CopilotKit 版本、package exports 和源码导入。
- [x] 定位 Docker 匿名 `node_modules` 卷复用旧依赖的根因。
- [x] 让开发容器启动时同步当前 lockfile 依赖。
- [x] 运行本机构建与 Docker 容器验证。
- [x] 检查 diff 并添加 review / 复盘。

## Review / 复盘

- 根因不是 `@copilotkit/react-core/v2` 导入错误；`@copilotkit/react-core@1.59.5` 明确导出 `/v2`。Docker 的匿名 `/app/node_modules` 卷保留了新增依赖前的旧内容，并覆盖了新镜像中的依赖。
- 新增开发容器 entrypoint，比较当前 `package-lock.json` 哈希与 `node_modules` 中的标记；仅在依赖变化或旧卷没有标记时执行 `npm ci`。
- Docker 镜像构建时写入同一哈希标记，因此新建容器无需重复安装；旧容器卷首次启动会自动修复。
- `sh -n scripts/docker-dev-entrypoint.sh` 已通过。
- `git diff --check` 已通过。
- `npm run build` 已通过，CopilotKit v2 JS/CSS 资源成功构建。
- Docker 容器已验证 `@copilotkit/react-core@1.59.5` 和 `/v2` 入口存在，Vite 可通过 `http://127.0.0.1:5174/` 访问。
- 容器快速重启未再次执行 `npm ci`，Vite 在约 0.6 秒内恢复。

---

# AI Companion 页面上下文与 Vault 检索

## Spec

- AI Companion 应在切换页面后自动聚焦最新页面和当前实体。
- 当前页面只注入摘要；逐字稿正文由工具按需读取。
- Obsidian Vault 搜索范围固定为已授权数据根目录的 `scripts/*.md`。
- 视频通过 `video.scriptId` 关联正文，兼容 `script.videoId` 旧数据反查。
- 正文缺失时必须明确返回缺失状态，禁止模型生成事实性总结。
- 侧栏视觉应与 ContentFlow 主站主题一致，并显示当前聚焦对象。

## Tasks

- [x] 分析真实 Vault、视频索引、逐字稿索引和 Markdown 文件映射。
- [x] 写入设计文档与实施计划。
- [x] 实现可靠的当前页面与逐字稿映射。
- [x] 实现 Vault 搜索与按需正文读取。
- [x] 注册上下文工具与页面建议。
- [x] 优化侧栏 Header 和视觉样式。
- [x] 运行测试、lint、构建和行为验证。
- [x] 添加 review / 复盘。

## Review / 复盘

- 真实 Vault 为 `/Users/liuxingqi/Documents/Claude/Projects/ip_scripts`，逐字稿正文文件名使用 `Script.id`，视频通过 `Video.scriptId` 关联；旧数据兼容 `Script.videoId` 反查。
- 页面上下文新增页面标题、版本标识和当前逐字稿引用，切换路由后会同步更新侧栏 Header 与 Agent 上下文。
- 新增 `read_current_script` 和 `search_vault_scripts`；搜索范围固定为已授权数据目录的 `scripts/*.md`，最多返回 8 条有界片段。
- `get_script_content` 现在允许读取搜索发现但尚未进入 `scripts.json` 的孤立 Markdown。
- 系统提示明确要求使用最新页面上下文、读取正文后再总结，并在正文缺失时禁止编造。
- CopilotKit 侧栏保留原生交互结构，通过自定义 Header 和作用域主题变量对齐 ContentFlow 视觉。
- `npm run test:run` 已通过：4 个测试文件、13 个测试。
- `npx eslint src/copilot src/services/fileSystem.ts server/copilot/runtime.ts` 已通过。
- `npx tsc -b --pretty false` 已通过。
- `npm run build` 已通过。
- 全量 `npm run lint` 仍有一处既有错误：`src/pages/Scripts/index.tsx:198` 的 `react-hooks/set-state-in-effect`，与本次实现无关。
- 浏览器会话没有已授权的数据目录，无法进入真实业务页完成侧栏点击验证。

---

# AI Companion 调用本地提示词型 Skill

## Spec

- AI 侧栏可以动态发现并按需加载本地提示词型 Skill。
- 不限制可加载的 Skill 名称；扫描配置根目录下的全部 `SKILL.md`。
- Skill 只作为提示词和 Markdown references 使用，不执行其中描述的 Shell、Python、联网、文件修改或其他外部工具。
- 支持宿主机 `~/.claude/skills`、`~/.agents/skills` 和 Docker `/skills`，并允许通过 `SKILLS_ROOTS` 覆盖。
- 服务端必须阻止路径越界和符号链接逃逸，并对异常或过大内容返回明确状态。

## Tasks

- [x] 分析现有 CopilotKit Runtime、前端工具链和本地 Skill 目录结构。
- [x] 确认动态发现全部提示词型 Skill 的设计。
- [x] 实现本地 Skill Registry 与测试。
- [x] 将 Skill 列表和加载工具接入 Copilot Runtime。
- [x] 更新运行配置与文档。
- [x] 运行测试、lint、类型检查和构建验证。
- [x] 检查 diff 并添加 review / 复盘。

## Review / 复盘

- 新增动态本地 Skill Registry，默认递归扫描 `~/.claude/skills`、`~/.agents/skills` 和 `/skills`，也支持 `SKILLS_ROOTS` 覆盖；不限制 Skill 名称。
- Registry 支持根目录自身和嵌套目录同时包含 Skill，同名 Skill 按根目录优先级去重。
- `load_local_skill` 只读取选中 Skill 的 `SKILL.md` 和 `references/**/*.md`，不读取或执行脚本、配置、评测产物和其他文件；未知 ID、路径越界和符号链接逃逸会被拒绝。
- Copilot Runtime 新增 `list_local_skills` 和 `load_local_skill` 服务端工具，并与现有浏览器 Frontend Tools 合并；Agent 系统提示明确禁止声称执行未提供的命令或外部工具。
- Docker 同时只读挂载 `.claude/skills` 与 `.agents/skills`，README 补充宿主机与 Docker 配置说明。
- 真实本机扫描发现 26 个可用 Skill，并成功加载 `short-video-opening-optimizer`。
- `npm run test:run` 已通过：5 个测试文件、20 个测试。
- 修改范围 ESLint、`npx tsc -b --pretty false`、`git diff --check` 和 `npm run build` 已通过。
- 全量 `npm run lint` 仍有一处既有错误：`src/pages/Scripts/index.tsx:198` 的 `react-hooks/set-state-in-effect`，与本次实现无关。
