import { tool } from '@ai-sdk/provider-utils'
import { z } from 'zod'
import { createSkillRegistry } from '../skills/registry'

export type LocalSkillRegistry = ReturnType<typeof createSkillRegistry>

export function createLocalSkillTools(registry: LocalSkillRegistry = createSkillRegistry()) {
  return {
    list_local_skills: tool({
      description: '列出本机可用的全部提示词型 Skill。需要使用专业 Skill 完成用户请求时，先调用此工具选择最相关的 Skill。',
      inputSchema: z.object({}),
      execute: async () => ({
        skills: await registry.list(),
        usage: '选择最相关的 skill.id，再调用 load_local_skill。Skill 仅提供提示词工作流，不会自动执行其中描述的命令或外部工具。',
      }),
    }),
    load_local_skill: tool({
      description: '按 list_local_skills 返回的 ID 加载一个本地提示词型 Skill 的 SKILL.md 和 Markdown references。',
      inputSchema: z.object({
        skillId: z.string().min(1).describe('list_local_skills 返回的 Skill ID'),
      }),
      execute: async ({ skillId }) => {
        const skill = await registry.load(skillId)
        return {
          ...skill,
          executionBoundary: '只能遵循提示词和使用当前 Agent 已提供的工具；不得声称执行了 Skill 中描述但当前不存在的命令、联网、文件读写或外部工具。',
        }
      },
    }),
  }
}
