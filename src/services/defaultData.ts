import type { AppData, Video, Topic, Script, Tag, ChecklistItem, TransitionKey } from '@/types'

const d = (daysAgo: number) => {
  const dt = new Date()
  dt.setDate(dt.getDate() - daysAgo)
  return dt.toISOString()
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'chk_ai_label',            text: 'AI 生成内容已标注',        createdAt: d(30) },
  { id: 'chk_no_violation',        text: '抖音视频检测无违规提示',    createdAt: d(30) },
  { id: 'chk_original',            text: '已标注原创',                createdAt: d(30) },
  { id: 'chk_no_third_party_url',  text: '无第三方商业性质网址露出',  createdAt: d(30) },
]

const TAGS: Tag[] = [
  { id: 'tag_career', name: '职场干货', color: '#7C3AED', createdAt: d(30) },
  { id: 'tag_life', name: '生活方式', color: '#059669', createdAt: d(30) },
  { id: 'tag_tips', name: '实用技巧', color: '#D97706', createdAt: d(30) },
  { id: 'tag_story', name: '故事向', color: '#DC2626', createdAt: d(30) },
  { id: 'tag_hot', name: '蹭热点', color: '#0EA5E9', createdAt: d(30) },
]

const VIDEOS: Video[] = [
  {
    id: 'vid_demo01',
    title: '普通人如何实现财务自由？3个真实案例',
    status: 'published',
    tagIds: ['tag_career', 'tag_story'],
    scriptId: 'script_demo01',
    statusHistory: [
      { status: 'topic', changedAt: d(20) },
      { status: 'scripting', changedAt: d(18) },
      { status: 'review', changedAt: d(15) },
      { status: 'filming', changedAt: d(12) },
      { status: 'editing', changedAt: d(8) },
      { status: 'published', changedAt: d(5) },
    ],
    platforms: [
      { platform: 'douyin', status: 'published', publishedAt: d(5), url: 'https://www.douyin.com/video/demo', promotionCost: 500 },
      { platform: 'xiaohongshu', status: 'published', publishedAt: d(5), promotionCost: 200 },
      { platform: 'shipinhao', status: 'published', publishedAt: d(4) },
    ],
    shootingFormats: ['landscape', 'talking'],
    description: '分享3个真实的普通人财务自由案例，总结可复制的路径。',
    duration: 480,
    createdAt: d(20),
    updatedAt: d(5),
  },
  {
    id: 'vid_demo02',
    title: '我用这个方法，1个月读了12本书',
    status: 'editing',
    tagIds: ['tag_tips', 'tag_life'],
    scriptId: 'script_demo02',
    statusHistory: [
      { status: 'topic', changedAt: d(12) },
      { status: 'scripting', changedAt: d(10) },
      { status: 'filming', changedAt: d(7) },
      { status: 'editing', changedAt: d(3) },
    ],
    platforms: [],
    description: '速读方法论分享，适合碎片化时间学习。',
    createdAt: d(12),
    updatedAt: d(3),
  },
  {
    id: 'vid_demo03',
    title: '年薪50万的人，都有这些共同点',
    status: 'filming',
    tagIds: ['tag_career'],
    topicId: 'topic_demo03',
    statusHistory: [
      { status: 'topic', changedAt: d(8) },
      { status: 'scripting', changedAt: d(6) },
      { status: 'review', changedAt: d(4) },
      { status: 'filming', changedAt: d(2) },
    ],
    platforms: [],
    shootingFormats: ['portrait', 'talking_demo'],
    createdAt: d(8),
    updatedAt: d(2),
  },
  {
    id: 'vid_demo04',
    title: '极简主义生活实践1年后，我的变化',
    status: 'scripting',
    tagIds: ['tag_life', 'tag_story'],
    statusHistory: [
      { status: 'topic', changedAt: d(5) },
      { status: 'scripting', changedAt: d(3) },
    ],
    platforms: [],
    createdAt: d(5),
    updatedAt: d(3),
  },
  {
    id: 'vid_demo05',
    title: 'ChatGPT提效工作流：10个真实场景',
    status: 'topic',
    tagIds: ['tag_tips', 'tag_hot'],
    statusHistory: [
      { status: 'topic', changedAt: d(2) },
    ],
    platforms: [],
    createdAt: d(2),
    updatedAt: d(2),
  },
]

const TOPICS: Topic[] = [
  {
    id: 'topic_demo01',
    title: '30岁转行的正确姿势',
    description: '分析转行成功的关键要素，用真实数据说话',
    status: 'inspiration',
    tagIds: ['tag_career'],
    createdAt: d(10),
    updatedAt: d(8),
  },
  {
    id: 'topic_demo02',
    title: '独居生活必备的10个习惯',
    description: '从心理到物质，全面的独居生活指南',
    status: 'inspiration',
    tagIds: ['tag_life'],
    createdAt: d(7),
    updatedAt: d(7),
  },
  {
    id: 'topic_demo03',
    title: '副业月入过万的5种路径对比',
    description: '横向对比不同副业模式，帮观众选择适合自己的方向',
    status: 'in_progress',
    tagIds: ['tag_career', 'tag_tips'],
    linkedVideoId: 'vid_demo03',
    createdAt: d(15),
    updatedAt: d(3),
  },
]

const SCRIPTS: Script[] = [
  {
    id: 'script_demo01',
    videoId: 'vid_demo01',
    title: '普通人如何实现财务自由？3个真实案例',
    wordCount: 1680,
    estimatedDuration: 480,
    tagIds: ['tag_career', 'tag_story'],
    version: 3,
    createdAt: d(18),
    updatedAt: d(10),
  },
  {
    id: 'script_demo02',
    videoId: 'vid_demo02',
    title: '我用这个方法，1个月读了12本书',
    wordCount: 900,
    estimatedDuration: 257,
    tagIds: ['tag_tips'],
    version: 1,
    createdAt: d(10),
    updatedAt: d(8),
  },
]

const DEFAULT_TRANSITION_CHECKLISTS: Record<TransitionKey, ChecklistItem[]> = {
  'topic→scripting': [],
  'scripting→review': [
    { id: 'chk_sr_hook', text: '已完成开头优化（降低 2～5 秒跳出率）', createdAt: d(30) },
  ],
  'review→filming': [],
  'filming→editing': [
    { id: 'chk_fe_playback', text: '自己看回放满意，无需重拍', createdAt: d(30) },
    { id: 'chk_fe_sync', text: '已和剪辑同学同步剪辑建议和要点', createdAt: d(30) },
  ],
}

export function defaultAppData(): AppData {
  return {
    version: '1.0',
    tags: TAGS,
    checklistItems: CHECKLIST_ITEMS,
    transitionChecklists: DEFAULT_TRANSITION_CHECKLISTS,
    videos: VIDEOS,
    videoRelations: [],
    topics: TOPICS,
    scripts: SCRIPTS,
    metrics: [],
    douyinRecords: [],
    shipinhaoRecords: [],
    xiaohongshuRecords: [],
    settings: {
      theme: 'dark',
      defaultPlatforms: ['douyin', 'xiaohongshu', 'shipinhao'],
      violationReasons: ['违反社区公约', '涉嫌第三方导流'],
      skipReasons: ['该平台不适合此类内容', '本期跳过发布'],
      hidePromotionCost: false,
      hideCommercialAmount: false,
    },
  }
}

const DEMO_SCRIPT_CONTENT_01 = `# 普通人如何实现财务自由？3个真实案例

## 开场钩子（0-15秒）

大家好，今天我要分享三个我亲眼见到的普通人，他们是如何一步步走向财务自由的。他们没有富爸爸，没有中彩票，有的只是正确的方向和持续的行动。

## 第一个案例：程序员小王（15-2分钟）

28岁，月薪1.5万，通过这三步做到了35岁提前退休——

**第一步：极致降低消耗比**
他把储蓄率提升到了70%，每个月存下1万。听起来不可能？他是怎么做到的……

**第二步：指数基金定投**
把存款全部投入宽基指数基金，坚持了7年……

**第三步：建立被动收入**
副业从每月500块做到了每月2万……

## 第二个案例：设计师小林（2-4分钟）

30岁，二线城市，通过知识变现走上了不同的路……

## 第三个案例：普通工厂工人老陈（4-7分钟）

没有高学历，靠的是这一个字：稳……

## 总结（7-8分钟）

三个人，三条路，但他们有一个共同点……

## 结尾CTA

如果你觉得这个视频对你有用，点个关注，我每周分享真实的财务成长故事。
`

const DEMO_SCRIPT_CONTENT_02 = `# 我用这个方法，1个月读了12本书

## 开场（0-10秒）

上个月我读了12本书，平均每本3天不到。我不是天才，也没有比你多出多余的时间——我只是改变了一个读书方法。

## 传统读书法的问题（10-40秒）

我们从小被教导：读书要从第一页读到最后一页，不能跳……

## 我的方法：目标导向拆解法（40秒-3分钟）

**第一步：带着问题读**
每本书开始之前，先问自己3个问题……

**第二步：快速扫描框架**
先看目录、前言、每章小结……

**第三步：只读和你的问题相关的章节**
平均下来每本书真正需要读的部分只有30%……

**第四步：立即输出**
读完写一个100字的总结……

## 适合哪类书（3-4分钟）

这个方法适合工具类、商业类书籍，不适合小说……

## 结尾

试试这个方法，评论区告诉我你读完的第一本书是什么。
`

export const DEMO_SCRIPT_CONTENTS: Record<string, string> = {
  script_demo01: DEMO_SCRIPT_CONTENT_01,
  script_demo02: DEMO_SCRIPT_CONTENT_02,
}
