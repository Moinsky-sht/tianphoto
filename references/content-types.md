# 内容主题与模板识别规则

Tianphoto 先判断 `content-template`，再决定 family / preset / SVG grammar。

识别顺序：

1. 判断内容属于哪个 `content-template`
1. 选择最适合的 `style family`
1. 选择该 family 内的 `preset`
1. 确认 `svg-grammar -> hero-scene -> mark-kind`

## 内置模板

| Template | 适合内容 | 默认 mark-kind | Hero Scene 候选 | Inline Infographic | 组件重心 |
| --- | --- | --- | --- | --- | --- |
| `event-notice` | 活动招募 / 通知 / 公告 / 报名页 | `registration` | `paper-fold`, `ribbon-flow`, `museum-frame` | `path-map`, `process-track`，最多 1 个 | section 扫读、时间/资格/日程 |
| `weekly-report` | 周报 / 项目进展 / 状态汇总 | `delivery` | `editorial-beam`, `signal-grid`, `paper-fold` | `evidence-stack`, `compare-grid`, `path-map`，最多 1 个 | metric / compare / risk |
| `release-brief` | 发布说明 / 功能上线 / 版本公告 | `delivery` | `signal-grid`, `ribbon-flow`, `editorial-beam` | `compare-grid`, `node-network`, `structure-breakdown`，最多 1 个 | release points、能力对比 |
| `knowledge-article` | 教程 / 科普 / 研究 / 方法论 | `perspective` | `editorial-beam`, `paper-fold`, `constellation-map` | `structure-breakdown`, `evidence-stack`, `path-map`，最多 1 个 | 阅读节奏、论点拆解 |
| `case-recap` | 案例拆解 / 项目复盘 / 落地回顾 | `recap` | `constellation-map`, `museum-frame`, `editorial-beam` | `process-track`, `compare-grid`, `evidence-stack`，最多 1 个 | 过程、结果、复盘结构 |

## 模板与结构建议

### `event-notice`

- 默认搭配：`data-page-tone="event-notice"` + `data-heading-system="index-led"`
- 重点语义：报名、时间、地点、资格、奖项、日程
- `wx-badge-art` 默认禁用
- 允许最多 1 个真正有职责的 `wx-inline-graphic`
- 章节徽记优先识别 `registration / schedule / qualification / awards`

### `weekly-report`

- 优先出现 `wx-metric-grid` 或 `wx-compare-grid`
- 更强调状态、完成项、风险、下周计划
- 章节徽记优先识别 `delivery / risk / schedule / recap`

### `release-brief`

- hero 可以更强，但不能只剩一个 hero
- 至少需要 2 个 section 或 1 个数据块
- 章节徽记优先识别 `delivery / task / method / growth`

### `knowledge-article`

- 阅读节奏优先
- 更适合 `wx-intro-card`、`wx-quote-card`、多段 `wx-section-card`
- 阅读型页面默认可以没有 `wx-inline-graphic`
- 如果用了 `wx-inline-graphic`，它必须能独立解释结构

### `case-recap`

- 至少应该有 `timeline / compare / summary` 中的一类结构
- 强调“过程、结果、经验、下一步”
- 章节徽记优先识别 `recap / delivery / risk / growth`

## 识别规则

1. 关键词匹配：标题 ×3，导语 ×2，正文 ×1
1. caption 优先级高于 h2，h2 高于正文
1. 如果无法明确识别，兜底为 `knowledge-article`

## 模板级组件建议

### `event-notice`

- `wx-hero-card`：通知标题
- `wx-section-card`：报名 / 日程 / 资格 / 奖项
- `wx-inline-graphic`：只在说明流程或路径时使用

### `weekly-report`

- `wx-hero-card`：本周结论
- `wx-metric-grid`：核心指标
- `wx-compare-grid`：本周 / 下周、计划 / 实际
- `wx-section-card`：进展 / 风险 / 下一步

### `release-brief`

- `wx-hero-card`：产品名称 + release statement
- `wx-section-card`：功能点逐条展开
- `wx-metric-grid`：性能或收益
- `wx-inline-graphic`：结构拆解 / 节点关系 / 对比

### `knowledge-article`

- `wx-hero-card`：主题标题 + 导读
- `wx-intro-card`：前情或背景
- `wx-section-card`：知识点逐条拆解
- `wx-quote-card`：观点或研究引述
- `wx-inline-graphic`：只在结构说明有价值时使用

### `case-recap`

- `wx-hero-card`：案例标题
- `wx-timeline-card`：过程路径
- `wx-section-card`：问题 / 动作 / 结果 / 复盘
- `wx-summary-card`：经验与下一步
