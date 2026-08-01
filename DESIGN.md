# Design System

## Direction

ContentFlow 使用 Calm Editorial Workbench 视觉语言：以浅色 neutral desktop utility 为默认体验，同时完整支持深色主题。界面参考成熟海外生产力工具的信息密度和原生桌面克制感，强调内容、列表、属性和工作状态，不使用通用 AI SaaS 常见的紫色渐变、发光与全页面卡片化。

## Principles

- Content first：标题、稿件、视频和数据优先于装饰。
- Structure, not decoration：用对齐、留白、分隔线和信息顺序建立层级。
- One primary action：每个页面只允许一个实心主按钮。
- Semantic color only：高饱和颜色只用于行动、状态、风险与真实标签色。
- Quiet surfaces：普通内容面无阴影；阴影只属于弹窗、浮层与拖拽态。
- Desktop density：控件保持紧凑，但正文与说明不低于可读字号。

## Tokens

- Light canvas/sidebar/surface: `#f6f6f3` / `#efefeb` / `#fdfdfb`
- Dark canvas/sidebar/surface: `#141618` / `#111315` / `#1b1e21`
- Primary action: cobalt blue
- Text: primary, secondary, tertiary and disabled neutral scales
- Status: color appears primarily as dots, short rules or key text
- Spacing: 4px base scale
- Radius: 4px controls, 6px standard controls, 8px panels, 12px overlays
- Motion: 120ms controls, 180ms overlays, no decorative page motion

## Typography

使用 macOS 系统无衬线字体与中文系统字体。正文与表格以 13px 为基础，辅助信息 11.5–12px，区块标题 14px，页面标题 18px，关键数字 22–24px。数字密集区域使用 tabular numerals。中文界面不使用 uppercase 或夸张字距。

## Layout

- Sidebar width: 232px
- Page header height: 68px
- Standard page padding: 20px 24px 32px
- Controls: 28px compact, 32px standard, 36px large
- Panels: flat surface, 1px border, 8px radius
- Dense tables retain sticky headers and horizontal scrolling
- Responsive layouts collapse columns before hiding information

## Components

- Navigation: grouped workspace navigation with quiet active surface and a 2px action marker
- Buttons: primary, secondary surface, ghost and danger variants
- Forms: neutral surface, visible border and a restrained 2px focus ring
- Cards: reserved for discrete movable objects; ordinary page sections use flat panels or rows
- Tables: the primary form for structured assets and performance data
- Badges: short rectangular status labels; pill shape is reserved for counts and user tags
- Modals: neutral overlay surface with elevation, no strong backdrop blur
- AI companion: uses the same product chrome and tokens as the rest of the app

## Behavior Guardrails

- Styling changes must not alter store actions, data structures, persistence or API calls.
- Existing controls and workflows remain available.
- Videos virtual row height and Kanban drag behavior must stay synchronized with visual changes.
- Commercial privacy covers fields, filters, search, detail, dashboard and analytics surfaces.
- Static reference-product interactions are not copied when ContentFlow already has different real behavior.
