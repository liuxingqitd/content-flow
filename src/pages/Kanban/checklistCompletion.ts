import type { ChecklistItem } from '@/types'

export function isChecklistComplete(
  items: readonly ChecklistItem[],
  checked: Readonly<Record<string, boolean>>,
): boolean {
  return items.every(item => checked[item.id] === true)
}
