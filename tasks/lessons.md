# Lessons

- 阶段流转检查项应优先挂在对应状态转换入口，而不是复用发布前全局检查项；这样能保持流程语义清晰，也减少对现有数据模型的影响。
- 本地真实数据目录的读取异常不能和“首次初始化”混在一个 catch 里处理；只有明确 `NotFoundError` 才能初始化，解析/权限/迁移失败必须显式报错，避免默认 demo 数据覆盖真实索引。
- demo 数据只能用于开发演示，不应作为真实目录、脚本文件读取失败或空目录初始化的运行时 fallback。
- 当已有历史备份时，恢复看板状态、选题、标签和发布记录必须优先使用备份 `data.json`；从 Markdown 重建只能作为没有可用备份时的兜底，因为 Markdown 不包含完整业务元数据。
- 选题、逐字稿、视频这类通过 ID 明确关联的标题字段，应在 store 层集中同步；不要只在页面创建时复制一份，否则后续任一入口编辑都会造成标题漂移。
- 同一个平台集合出现在多列状态里时，应抽出固定排序和统一渲染组件；这样“已发布/已违规/已跳过”不会因为各列各自 map 而出现平台顺序漂移或文本/图标混用。
- 概览页统计投放成本时应优先使用平台发布记录的时间归属月份；缺少发布时间再用视频创建时间兜底，避免把跨月发布的视频成本误算进创建月份。
- 视频之间的复拍/变体关系应独立于选题、逐字稿、视频的生产链关系存储，避免标题同步或流程状态误影响相关视频。
- 封面预览 URL 和下载文件读取应分开处理；预览函数返回 object URL，下载函数返回原始 `File`，这样文件名、缺失判断和资源释放都更清晰。
# CopilotKit 与 OpenAI-compatible Provider

- CopilotKit v2 前端组件统一从 `@copilotkit/react-core/v2` 导入；旧 `@copilotkit/react-ui` 不应作为 v2 UI 依赖。
- CopilotKit Runtime 应使用 fetch-native `createCopilotRuntimeHandler`，Express 只负责桥接 Request/Response 并保持 SSE 流。
- Vercel AI SDK 的 `createOpenAI()` 默认模型入口可能使用 Responses API。面向 DeepSeek 等 OpenAI-compatible 服务商时，应显式使用 `provider.chat(model)`，并通过真实 AG-UI run 验证流式输出与 Tool Calling，不能只验证普通 Chat Completion 请求。
- CopilotKit UI 依赖较重，应通过配置 Gate 和动态 import 按需加载，避免未启用 AI 的用户承担启动成本。
- 当业务数据由浏览器 File System API 持有时，Agent 的业务工具应在前端执行，并通过 Human-in-the-loop 约束写操作；Express Runtime 不应尝试直接写业务目录。
- 动态扫描本地 Skill 时，根目录自身可能也是一个 Skill；发现当前目录的 `SKILL.md` 后仍要继续递归子目录，否则会漏掉全部嵌套 Skill。

---
- AI 使用本地 Vault 时，不应把全部正文作为常驻上下文；页面只提供稳定实体引用与摘要，正文和历史稿件通过受控工具按需读取。
- 本项目逐字稿正文文件名使用 `Script.id`，视频到正文的可靠映射是 `Video.scriptId -> scripts/<scriptId>.md`；读取时仍需兼容旧数据中的 `Script.videoId` 单向关系和孤立 Markdown。
