export type Platform = 'douyin' | 'xiaohongshu' | 'shipinhao'

export type VideoStatus =
  | 'topic'
  | 'scripting'
  | 'review'
  | 'filming'
  | 'editing'
  | 'pending_publish'
  | 'published'
  | 'archived'

export type TopicStatus = 'inspiration' | 'adopted' | 'in_progress' | 'done'

export type PlatformPublishStatus = 'published' | 'violated'

export type CommercialSettlementStatus = 'unsettled' | 'settled'

export type CommercialPaymentRecipient = 'individual' | 'company' | 'platform'

export type CommercialDealType = 'platform' | 'underwater'

export type UnderwaterPaymentMethod = 'personal_transfer' | 'corporate_payment'

export interface PlatformCommercialSettlement {
  platform: Platform
  amount?: number
  settlementCycle?: string
  settlementStatus: CommercialSettlementStatus
}

export interface ViolationInfo {
  reason: string
  reportedAt: string
}

export interface PromotionRecord {
  id: string
  platform: Platform
  amount: number
  spentAt: string
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface ChecklistItem {
  id: string
  text: string
  createdAt: string
}

export interface PlatformPublish {
  platform: Platform
  status: PlatformPublishStatus
  publishedAt?: string
  url?: string
  platformVideoId?: string
  violation?: ViolationInfo
  diagnosis?: string
}

export type ShootingFormat =
  | 'landscape'
  | 'portrait'
  | 'talking'
  | 'demo'
  | 'talking_demo'
  | 'walking_shot'
  | 'electronic_whiteboard'
  | 'whiteboard'

export const SHOOTING_FORMAT_LABELS: Record<ShootingFormat, string> = {
  landscape:            '横屏',
  portrait:             '竖屏',
  talking:              '口播',
  demo:                 '演示',
  talking_demo:         '口播+演示',
  walking_shot:         '走拍',
  electronic_whiteboard: '电子白板',
  whiteboard:           '白板',
}

export const ALL_SHOOTING_FORMATS: ShootingFormat[] = [
  'landscape', 'portrait', 'talking', 'demo', 'talking_demo',
  'walking_shot', 'electronic_whiteboard', 'whiteboard',
]

export interface StatusHistoryEntry {
  status: VideoStatus
  changedAt: string
}

export interface Video {
  id: string
  title: string
  status: VideoStatus
  tagIds: string[]
  shootingFormats?: ShootingFormat[]
  isCommercial?: boolean
  commercialBrandName?: string
  commercialDealType?: CommercialDealType
  platformCommercialSettlements?: PlatformCommercialSettlement[]
  underwaterPaymentMethod?: UnderwaterPaymentMethod
  /** Legacy commercial fields kept for backward-compatible reads. */
  commercialAmount?: number
  commercialSettlementStatus?: CommercialSettlementStatus
  commercialPaymentRecipient?: CommercialPaymentRecipient
  scriptId?: string
  topicId?: string
  statusHistory: StatusHistoryEntry[]
  platforms: PlatformPublish[]
  promotionRecords?: PromotionRecord[]
  thumbnailNote?: string
  duration?: number
  description?: string
  /** First time this production item became a video-library record. */
  videoLibraryAddedAt?: string
  createdAt: string
  updatedAt: string
  notes?: string
  coverPortrait?: string  // 竖屏封面文件扩展名（有值表示封面存在）
  coverLandscape?: string // 横屏封面文件扩展名（有值表示封面存在）
}

export interface VideoRelation {
  id: string
  fromVideoId: string
  toVideoId: string
  note?: string
  createdAt: string
  updatedAt: string
}

export interface Topic {
  id: string
  title: string
  description?: string
  /** 发布前人工评估的选题潜力分，范围 0–100。 */
  potentialScore?: number
  status: TopicStatus
  tagIds: string[]
  inspiration?: string
  linkedVideoId?: string
  abandonedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Script {
  id: string
  videoId?: string
  topicId?: string
  title: string
  wordCount: number
  estimatedDuration: number
  tagIds: string[]
  version: number
  createdAt: string
  updatedAt: string
}

export interface VideoMetrics {
  id: string
  videoId: string
  platform: Platform
  recordedAt: string
  dataDate: string
  plays: number
  likes: number
  comments: number
  shares: number
  saves?: number
  follows?: number
  completionRate?: number
}

export interface AppSettings {
  theme: 'dark' | 'light'
  defaultPlatforms: Platform[]
  violationReasons: string[]
  hidePromotionCost?: boolean
  hideCommercialAmount?: boolean
}

// 抖音作品原始数据（直接从抖音后台导出）
export interface DouyinRawRecord {
  id: string
  title: string          // 作品名称
  videoId?: string       // 关联的视频库条目ID（AI语义匹配）
  publishedAt: string    // 发布时间
  genre: string          // 体裁
  status: string         // 审核状态
  plays: number          // 播放量
  completionRate: number // 完播率
  fiveSecRate: number    // 5s完播率
  coverCtr: string       // 封面点击率（可能为 '-'）
  twoSecBounceRate: number // 2s跳出率
  avgPlayDuration: number  // 平均播放时长（秒）
  likes: number          // 点赞量
  shares: number         // 分享量
  comments: number       // 评论量
  saves: number          // 收藏量
  profileVisits: number  // 主页访问量
  followerGain: number   // 粉丝增量
  createdAt: string
}

// 小红书笔记原始数据（直接从小红书后台导出）
export interface XiaohongshuRawRecord {
  id: string
  title: string           // 笔记标题
  videoId?: string        // 关联的视频库条目ID（AI语义匹配）
  publishedAt: string     // 首次发布时间
  genre: string           // 体裁
  impressions: number     // 曝光
  views: number           // 观看量
  coverCtr: number        // 封面点击率（如 0.068）
  likes: number           // 点赞
  comments: number        // 评论
  saves: number           // 收藏
  follows: number         // 涨粉
  shares: number          // 分享
  avgWatchDuration: number // 人均观看时长（秒）
  danmaku: number         // 弹幕
  createdAt: string
}

// 视频号动态原始数据（直接从视频号后台导出）
export interface ShipinhaoRawRecord {
  id: string
  description: string    // 视频描述
  videoId: string        // 视频ID
  publishedAt: string    // 发布时间
  completionRate: number // 完播率
  avgPlayDuration: string // 平均播放时长（含单位，如 "24.67秒"）
  plays: number          // 播放量
  recommendations: number // 推荐
  likes: number          // 喜欢
  comments: number       // 评论量
  shares: number         // 分享量
  follows: number        // 关注量
  forwardChat: number    // 转发聊天和朋友圈
  setRingtone: number    // 设为铃声
  setStatus: number      // 设为状态
  setMomentCover: number // 设为朋友圈封面
  createdAt: string
}

export type TransitionKey =
  | 'topic→scripting'
  | 'scripting→review'
  | 'review→filming'
  | 'filming→editing'

export interface AppData {
  version: string
  tags: Tag[]
  checklistItems: ChecklistItem[]
  transitionChecklists: Record<TransitionKey, ChecklistItem[]>
  videos: Video[]
  videoRelations: VideoRelation[]
  topics: Topic[]
  metrics: VideoMetrics[]
  scripts: Script[]
  settings: AppSettings
  douyinRecords: DouyinRawRecord[]
  shipinhaoRecords: ShipinhaoRawRecord[]
  xiaohongshuRecords: XiaohongshuRawRecord[]
}

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  topic: '待启动',
  scripting: '写稿中',
  review: '待审核',
  filming: '拍摄中',
  editing: '剪辑中',
  pending_publish: '待发布',
  published: '已发布',
  archived: '已归档',
}

export const VIDEO_STATUS_ORDER: VideoStatus[] = [
  'topic', 'scripting', 'review', 'filming', 'editing', 'pending_publish', 'published', 'archived',
]

export const TOPIC_STATUS_LABELS: Record<TopicStatus, string> = {
  inspiration: '灵感',
  adopted: '已采纳',
  in_progress: '制作中',
  done: '已完成',
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  shipinhao: '视频号',
}

export const ALL_PLATFORMS: Platform[] = ['douyin', 'xiaohongshu', 'shipinhao']

export const PLATFORM_STATUS_LABELS: Record<PlatformPublishStatus, string> = {
  published: '已发布',
  violated: '已违规',
}

export const PLATFORM_STATUS_COLORS: Record<PlatformPublishStatus, string> = {
  published: '#10B981',
  violated: '#EF4444',
}
