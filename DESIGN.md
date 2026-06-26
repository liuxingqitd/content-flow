# Design System

## Direction

暗色优先、支持浅色主题的桌面效率工具。整体采用紧凑的 Linear-inspired 产品界面语言：固定侧栏、固定页头、独立滚动内容区、细边框和克制的紫色强调。

## Tokens

- Background: root, base, surface, raised, overlay, hover, active
- Text: primary, secondary, tertiary, disabled, inverse
- Accent: purple primary with hover, pressed, subtle and soft states
- Semantic: success, warning, danger and info
- Status: topic, scripting, review, filming, editing, published and archived
- Spacing: 4px base scale
- Radius: 6px, 8px, 12px and 16px
- Motion: 120ms, 180ms and 250ms

## Typography

使用适合中文产品界面的系统无衬线字体。正文以 13px 为基础，标签与辅助信息使用 11px 至 12px，页面标题使用 16px。数字密集区域使用等宽数字。

## Layout

- Sidebar width: 224px
- Page header minimum height: 52px
- Standard page padding: 24px
- Cards use 12px radius and restrained borders
- Dense tables scroll horizontally when needed
- Responsive layouts collapse multi-column content before hiding information

## Components

- Navigation: compact icon and label rows with subtle active background
- Buttons: primary, secondary, ghost and danger variants
- Forms: raised surface, visible focus ring and consistent labels
- Cards: surface background, subtle border and minimal hover elevation
- Tables: sticky headers, compact rows and tabular numeric alignment
- Badges and chips: semantic color used only for status and selection
- Modals: existing behavior preserved with updated visual treatment

## Behavior Guardrails

- Styling changes must not alter store actions, data structures, persistence or API calls.
- Existing controls and workflows remain available.
- Static design prototype interactions are not copied when the application already has different real behavior.
