# Copilot 页面上下文与 Vault 检索设计

## 目标

让 AI Companion 在切换页面后自动理解当前聚焦对象，并能按需读取或搜索与 ContentFlow 共用的 Obsidian Vault，同时避免每轮对话注入全部逐字稿正文。

## 已确认的数据关系

ContentFlow 授权的数据根目录本身就是 Obsidian Vault。结构化索引与正文映射为：

```text
Video.id
  -> Video.scriptId
  -> Script.id
  -> scripts/<Script.id>.md
```

逐字稿页面路由直接包含 `scriptId`；视频详情页面通过 `video.scriptId` 获取对应逐字稿。兼容旧数据时，可使用 `script.videoId === video.id` 反查。

## 推荐架构

采用“页面自动聚焦 + Vault 按需搜索 + 正文按需读取”。

- 常驻上下文只包含路由、页面标题、当前实体、关联实体、摘要和正文可用状态。
- 当前页面正文不默认进入上下文。
- 用户要求总结、分析或改写当前逐字稿时，Agent 调用 `read_current_script`。
- 用户要求参考历史稿件时，Agent 调用 `search_vault_scripts`。
- Vault 搜索范围固定为数据根目录下的 `scripts/*.md`。
- 不搜索 `.obsidian`、JSON、README 或 Vault 根目录中的其他 Markdown。

## 工具

### `get_current_page_context`

返回最新页面摘要，主要用于模型核验页面切换后的聚焦对象。

### `read_current_script`

根据当前页面解析逐字稿：

1. `/scripts/:scriptId` 直接读取该 Script。
2. `/videos/:videoId` 优先读取 `video.scriptId`。
3. 缺少 `video.scriptId` 时，使用 `script.videoId` 反查。
4. 最终读取 `scripts/<scriptId>.md`。

正文缺失时返回明确错误，Agent 不得生成事实性总结。

### `search_vault_scripts`

扫描 `scripts/*.md`，按查询词匹配标题和正文，最多返回 8 条结果。每条结果只包含 `scriptId`、标题、关联视频 ID、命中片段和更新时间；需要全文时再调用正文读取工具。

## 页面体验

- 自定义侧栏 Header 展示当前页面与聚焦实体。
- 页面切换后 Header 与 Agent 上下文同步更新。
- 逐字稿和视频详情页展示与当前对象相关的快捷建议。
- 侧栏使用 ContentFlow 的颜色、字体、圆角、边框和阴影。
- 工具调用卡片弱化，正文和表格保持可读。

## 错误与兼容

- 视频未关联逐字稿：返回“当前视频未关联逐字稿”。
- 索引存在但 Markdown 缺失：返回“逐字稿正文文件不存在”。
- Markdown 没有 Script 索引：仍可被 Vault 搜索发现。
- 旧数据只有单向关系：解析时同时检查 `Video.scriptId` 和 `Script.videoId`。
- Vault 文件量较小时直接扫描；达到数百篇后再考虑持久化全文索引。

## 验收

1. 从逐字稿页切换到视频详情页后，侧栏聚焦提示立即更新。
2. 在逐字稿页询问“总结当前稿件”，Agent 读取对应 Markdown。
3. 当前正文不存在时，Agent 明确说明缺失，不编造总结。
4. 搜索历史稿件只返回 `scripts/*.md` 中的结果。
5. 页面上下文测试、Vault 搜索测试、构建和 lint 通过。
