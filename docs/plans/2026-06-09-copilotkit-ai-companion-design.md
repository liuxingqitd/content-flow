# CopilotKit AI Companion 设计

## 背景

ContentFlow 已覆盖选题、逐字稿、制作流程、视频发布和数据分析。AI 能力不应以大量页面按钮的形式侵入每个业务页面，而应作为网站内统一的 AI Companion 存在：它理解用户当前所在页面，能够读取必要上下文、调用受控业务工具，并通过结构化界面展示结果。

首期使用 CopilotKit OSS 作为 Agent 与网站交互框架。模型采用 BYOK 模式，用户配置第三方模型服务商的 API 地址、API Key 和模型名称。ContentFlow 不代理售卖模型额度，不建设计费、用量统计或分润系统。

## 设计目标

- 在网站内提供统一、可控的 AI Companion，而不是依赖 Obsidian 或浏览器扩展。
- 使用 CopilotKit 复用 Agent 运行、AG-UI 流式通信、工具调用、Human-in-the-loop 和 Generative UI。
- 支持用户配置 OpenAI-compatible 第三方模型 API。
- Agent 自动理解当前页面，但只获得最小必要上下文。
- Agent 可查询内容数据、生成分析和创建草稿。
- 所有写入通过受控业务工具执行；高风险写入必须确认。
- 保持本地优先：业务数据和 API Key 不经过 ContentFlow 云端。

## 首期不做

- 不实现动态 Skill 加载器或外部 Skill 市场。
- 不连接 Obsidian，不实现 MCP Server、MCP Apps 或其他知识库连接器。
- 不引入 LangGraph、多 Agent 或复杂长期工作流。
- 不使用 Copilot Cloud、CopilotKit Enterprise Threads 或托管持久化。
- 不建设账号、计费、模型额度、Token 统计或模型转售。
- 不允许 Agent 自动发布、自动删除或绕过现有工作流门禁。

## 推荐架构

```text
React Application
├── CopilotKit Provider + Sidebar
├── Copilot Bridge
│   ├── Route-aware Agent Context
│   ├── Fixed Frontend Tools
│   ├── Human-in-the-loop confirmations
│   └── Controlled Generative UI
├── Zustand Store
└── Browser File System Access API

Local Express Server
├── CopilotRuntime
├── BuiltInAgent
├── Provider Factory
└── Existing Risk Detection API

Third-party Model Provider
└── User-owned API Key
```

CopilotKit Runtime 和 Built-in Agent 运行在现有 Express 服务中。由于业务数据由浏览器持有的 `FileSystemDirectoryHandle` 管理，Express 无法直接访问这些数据，业务查询与写入主要通过 React 端注册的 Frontend Tools 调用 Zustand action 完成。

## CopilotKit 能力映射

| CopilotKit 能力 | ContentFlow 用途 |
|---|---|
| `CopilotSidebar` | 网站全局 AI Companion 入口 |
| `CopilotRuntime` | 本地 Express 中的 Agent 请求入口 |
| `BuiltInAgent` | 首期单 Agent 的推理与工具调用循环 |
| AG-UI | 流式消息、运行状态、工具调用和结果传输 |
| `useAgentContext` | 提供当前页面和当前实体的只读摘要 |
| `useFrontendTool` | 查询或修改浏览器端业务数据 |
| `useHumanInTheLoop` / 确认组件 | 高风险操作确认 |
| `useRenderTool` / `useComponent` | 展示风险报告、候选方案、分析和修改预览 |
| Shared State | 暂存 Agent 计划、中间结果和草稿，不作为业务数据库 |

首期采用 CopilotKit v2 API。固定依赖版本，避免混用 v1 的 `useCopilotAction`、`useCopilotReadable` 示例。

## 模型配置与密钥流

用户在设置页维护一个本地 AI Provider 配置：

```ts
interface AIProviderConfig {
  enabled: boolean
  name: string
  baseUrl: string
  apiKey: string
  model: string
}
```

该配置单独保存在浏览器本地存储中，不进入 `AppData`、备份导出或业务数据目录，避免备份文件泄漏密钥。前端调用本地 `/api/copilotkit` 时，将当前 Provider 配置作为受保护请求元数据发送到本地 Express。Express 仅在本次请求中创建 Provider/Agent，不记录 API Key，不输出到日志。

首期仅承诺 OpenAI-compatible Provider。设置页提供“测试连接”，验证：

- API 地址可达。
- API Key 有效。
- 模型存在。
- 流式文本可用。
- 基础 Tool Calling 可用。

如果服务商只支持文本而不支持 Tool Calling，允许对话和分析，但禁用业务操作工具，并在 UI 中明确提示。

## Agent 上下文

Agent 不读取 DOM，也不直接获得完整 `AppData`。`CopilotBridge` 根据当前路由构建小型上下文摘要：

```ts
interface PageAgentContext {
  route: string
  pageType: 'dashboard' | 'kanban' | 'videos' | 'video-detail' | 'topics' | 'scripts' | 'analytics' | 'settings'
  focusedEntity?: {
    type: 'video' | 'topic' | 'script'
    id: string
    title: string
    updatedAt: string
  }
  filters?: Record<string, string | boolean>
  summary: Record<string, unknown>
}
```

逐字稿正文、完整视频详情和原始平台数据不进入常驻上下文，必须由 Agent 按需调用工具读取。

## 固定领域工具

首期没有动态 Skill 系统。Agent 的能力由固定系统指令、固定工具和预定义展示组件组成。

### 只读工具

- `search_content`
- `get_current_page_context`
- `get_video_details`
- `get_script_content`
- `get_workflow_summary`
- `get_analytics_summary`
- `run_script_risk_detection`

### 低风险写入工具

- `create_topic_draft`
- `create_video_draft`
- `update_topic_metadata`
- `update_video_metadata`
- `create_script_draft`

### 需要强制确认的工具

- `replace_script_content`
- `move_video_status`
- `mark_platform_published`
- `archive_video`
- `delete_video`
- `delete_topic`
- `delete_script`

首期只实现必要的低风险工具。强制确认工具可以先注册为拒绝执行并返回“暂未开放”，随后逐项开放。

## 权限与安全边界

- 工具使用 Zod Schema 校验参数。
- 工具只调用白名单业务命令，不直接暴露 `Partial<Video>`、完整数组替换或 Store 实例。
- Agent 无权访问 `FileSystemDirectoryHandle`。
- API Key 不进入 Agent 上下文、日志、业务数据或导出文件。
- Express CORS 限制为本地前端来源。
- `/api/copilotkit` 使用一次性本地会话令牌，避免其他网页调用本地模型接口。
- 工具结果限制数据量，搜索和列表必须分页或限制条数。
- 写入工具检查实体存在、允许字段和 `updatedAt`，防止旧上下文覆盖新数据。
- 删除、发布、状态推进和正文替换必须由工具实现强制确认，不能只依赖模型决定调用 HITL。

## Generative UI

首期只使用 Controlled Generative UI，由网站预定义 React 组件：

- `OpeningOptionsCard`：展示多个开头候选并允许用户选择。
- `RiskReportCard`：展示内容风险、证据和修改建议。
- `ViralAnalysisCard`：展示指标摘要、原因假设和后续实验建议。
- `ContentSummaryCard`：展示总结和关键观点。
- `DraftPreviewCard`：展示新选题或新稿件预览。
- `ChangeConfirmationCard`：展示修改前后 Diff，并要求确认。

不使用 A2UI Dynamic Schema 或自由生成任意页面组件。

## 页面体验

- AI Companion 固定为全局侧边栏，可从所有业务页面唤起。
- 打开侧边栏时显示当前页面和可使用的数据范围。
- 首页和列表页默认提供摘要与搜索能力。
- 逐字稿页可直接请求总结、优化开头和风险检测。
- 视频详情和数据分析页可请求表现分析与后续选题建议。
- 设置页只允许解释配置，不允许 Agent 修改系统设置。
- Agent 每次读取完整正文或大量分析数据时，在工具调用卡片中说明读取范围。

## 会话持久化

首期不使用 CopilotKit Enterprise Threads。会话消息保存在浏览器本地存储中，按 `threadId` 管理，并提供新建、切换和删除会话。

会话历史不应嵌入业务数据备份。页面刷新后可恢复消息，但不承诺跨设备同步。Shared State 只保存当前运行中的草稿和进度，最终内容仍需通过业务工具保存。

## 已知架构风险

- 当前 Store mutation 多数返回 `void` 且可能静默失败，Agent 工具难以判断执行结果；接入时需要新增受控 command wrapper。
- `moveVideo` 的门禁主要存在于 UI，Agent 工具不能直接调用它。
- 当前保存机制可能产生并发覆盖，首期限制 Agent 批量写入，并为写工具增加版本检查。
- Express 当前开放全部 CORS，接入 Copilot Runtime 前必须收紧。
- OpenAI-compatible 服务商对流式输出和 Tool Calling 的兼容程度不同，必须通过连接测试分级能力。
- 仓库缺少自动化测试，接入前至少为配置校验、上下文裁剪和工具权限增加测试。

## 首期验收场景

1. 用户在设置页配置一个支持 Tool Calling 的 OpenAI-compatible 模型并通过连接测试。
2. 用户在逐字稿页打开 AI Companion，Agent 能识别当前逐字稿但不会自动读取全文。
3. 用户要求总结，Agent 调用读取正文工具并以结构化总结卡片返回。
4. 用户要求优化开头，Agent 展示多个候选，不直接覆盖正文。
5. 用户在数据分析页要求分析爆款，Agent 读取聚合摘要而非完整原始数据。
6. 用户要求创建选题，Agent 展示草稿并经确认后创建。
7. Agent 尝试删除、发布或推进状态时，系统拒绝或强制确认。
8. API Key 不出现在业务数据目录、导出 JSON、浏览器日志或服务端日志中。
9. 停止本地 Express 服务后，现有网站功能仍正常，仅 AI Companion 显示离线状态。

## 后续扩展

在首期闭环稳定后，可以逐步加入：

- 动态 Skill Registry。
- Obsidian 和其他知识库连接器。
- MCP Tools 与 MCP Apps。
- LangGraph 确定性工作流。
- 多 Agent 协作。
- 更可靠的本地会话数据库和跨设备同步。

