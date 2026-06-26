# AI Companion 本地提示词型 Skill 设计

## 目标

让 ContentFlow AI 侧栏动态发现并按需加载用户机器上的全部提示词型 Skill，不要求为每个 Skill 修改业务代码。

## 架构

```text
用户请求
  -> Copilot Runtime Agent
  -> list_local_skills
  -> 选择相关 Skill
  -> load_local_skill
  -> 读取 SKILL.md 与同目录 Markdown references
  -> 按 Skill 指令调用现有前端工具读取业务内容
  -> 生成回答
```

Skill Registry 运行在本地 Express 进程中。浏览器不直接访问 Skill 目录，业务数据仍由现有 Frontend Tools 按需提供。

## Skill 发现

- 默认扫描 `~/.claude/skills`、`~/.agents/skills` 和 `/skills` 中实际存在的目录。
- `SKILLS_ROOTS` 可使用逗号分隔覆盖默认根目录。
- 递归发现所有 `SKILL.md`，支持嵌套 Skill。
- 不设置 Skill 名称白名单。
- 同名 Skill 按根目录优先级保留第一个，避免模型看到重复能力。
- 列表只返回 ID、名称、描述和来源，不返回完整提示词。

## Skill 加载

- `load_local_skill` 只接受由 Registry 返回的 Skill ID，不接受任意文件路径。
- 返回 `SKILL.md` 和 Skill 目录 `references/` 下的 Markdown references。
- 不读取脚本、配置、密钥或其他非 Markdown 文件。
- 不执行 Skill 中描述的命令、代码、联网操作或文件操作。
- 使用真实路径校验阻止路径越界和符号链接逃逸。
- 设置内容与文件数量上限；达到上限时返回截断状态，而不是让请求失控。

## Agent 行为

- 用户请求与某个本地 Skill 明显相关时，Agent 应先调用 `list_local_skills`，再加载最相关的 Skill。
- 加载 Skill 后，把其中内容视为当前任务的专业工作流。
- Skill 若要求未提供的执行型能力，Agent 必须说明无法执行，不得声称已运行命令或修改文件。
- Skill 不能覆盖 ContentFlow 的安全边界、事实读取要求和写入确认规则。

## 验证

- Registry 能发现普通和嵌套 Skill。
- 多根目录同名 Skill 按优先级去重。
- 非 Markdown 文件不会被加载。
- 符号链接和越界路径不会被读取。
- Copilot Runtime 的模型工具集中同时包含前端工具与本地 Skill 工具。
- 测试、lint、类型检查和构建通过。
