import { nanoid } from 'nanoid'

export const genId = (prefix: string) => `${prefix}_${nanoid(10)}`

export const videoId   = () => genId('vid')
export const topicId   = () => genId('topic')
export const scriptId  = () => genId('script')
export const tagId     = () => genId('tag')
export const metricId  = () => genId('metric')
export const promotionRecordId = () => genId('promo')
export const videoRelationId = () => genId('rel')
export const checklistItemId = () => genId('chk')
