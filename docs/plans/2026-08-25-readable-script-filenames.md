# 可读逐字稿文件名迁移规格

## 目标

- Obsidian 中的逐字稿使用 `标题--短ID.md`，文件树可直接辨认内容。
- `Script.id` 继续作为唯一业务主键，视频、选题、路由和 Copilot 调用不改语义。
- Markdown 通过 `contentflow_id` frontmatter 携带完整身份，手工改名后仍可找回。
- ContentFlow 编辑器、字数统计和搜索只处理正文，不暴露或统计系统 frontmatter。

## 数据契约

```yaml
---
contentflow_id: script_CE2JUxZJvu
contentflow_schema: 1
---
```

- `Script.fileName?: string` 是路径缓存，不是业务关联键。
- 文件解析顺序：有效缓存 → 旧 `<scriptId>.md` → 扫描完整 `contentflow_id`。
- 同一个完整 ID 出现在多个文件时停止并报错，绝不猜测或覆盖。
- 新文件名经过 Unicode NFC、非法字符替换、长度限制，并带稳定短 ID 消歧。

## 迁移

1. 枚举 `scripts/*.md`，识别已索引稿件和旧 `script_*.md` 孤立稿。
2. 在 `.contentflow-backups/script-filenames-v1/` 备份原文件。
3. 合并系统 frontmatter，保留用户已有属性和正文。
4. 安全重命名；Tauri 使用防覆盖原子 rename，Web 使用写入、读回校验、删除旧文件。
5. 成功后更新 `Script.fileName`；启动时也根据 frontmatter 修复手工改名后的缓存。
6. 迁移可重复执行；目标冲突、重复 ID 或内容不一致时停止。

## 标题变化

- 标题联动不自动触发文件重命名，避免 Vault 路径抖动。
- 逐字稿编辑页提供显式“同步文件名”操作。
- 显式重命名时把旧 basename 加入 `aliases`，便于 Obsidian 继续识别旧名称。

