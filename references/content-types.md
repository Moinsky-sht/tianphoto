# 内容主题识别规则

AI 根据文章文本自动识别内容属于以下 8 种主题之一，并据此选择最合适的排版预设。

## 识别映射表

| 主题 | 识别关键词 | 推荐预设（主） | 推荐预设（备） | 排版特点 |
|------|-----------|---------------|---------------|---------|
| 营销战报 | GMV、增长、转化率、ROI、环比、同比增长、大促、成交额、拉新 | `cobalt-ops` | `saffron-brief` | 大数字指标卡（wx-metric-grid）+ 对比卡片，数据突出 |
| 公告通知 | 通知、公告、即日起、特此、生效、全体、告知、规定 | `slate-column` | `mono-ledger` | 简洁严肃，少装饰，以文字段落为主 |
| 知识科普 | 原理、为什么、科学、研究、发现、机制、解释、实验 | `dawn-journal` | `meadow-report` | 图文穿插，列表拆解，引言卡片 |
| 产品发布 | 发布、上线、新功能、升级、版本、更新、体验、全新 | `aurora-glass` | `nebula-frost` | hero 视觉强，功能点用 section-card 逐条展示 |
| 人物故事 | 创始人、采访、经历、回忆、故事、人生、对话、成长 | `paper-museum` | `ink-editorial` | 杂志风排版，引言突出（wx-quote-card），时间线 |
| 数据分析 | 数据、报告、趋势、同比、指标、统计、分析、洞察 | `metro-metrics` | `cyan-data` | 指标网格（wx-metric-grid）+ 时间线 + 对比网格 |
| 教程指南 | 步骤、教程、如何、方法、指南、操作、配置、设置 | `mint-deck` | `ocean-brief` | 步骤编号 section-card + 清单列表 |
| 品牌故事 | 品牌、理念、愿景、价值观、使命、文化、初心、坚持 | `pearl-board` | `velvet-luxe` | 高端留白，logo 突出，品牌横幅 |

## 识别规则

1. **关键词匹配**：扫描文章全文，统计各主题关键词的出现频次
2. **权重计算**：标题中出现的关键词权重 ×3，首段 ×2，正文 ×1
3. **优先级**：如果多个主题得分接近，优先选择排版组件更丰富的主题
4. **兜底**：如果无法明确识别，默认使用"知识科普"主题（`dawn-journal`）

## 各主题推荐组件

### 营销战报
- `wx-hero-card` — 核心战绩标题
- `wx-metric-grid` + `wx-metric-card` — 关键数据指标（GMV/增长率/ROI）
- `wx-compare-grid` — 同比/环比对比
- `wx-summary-card` — 总结展望

### 公告通知
- `wx-hero-card` — 通知标题（简洁，少装饰）
- `wx-section-card` — 各条通知内容
- `wx-quote-card` — 重要条款引述
- 不使用 metric/compare/timeline 等花哨组件

### 知识科普
- `wx-hero-card` — 主题标题 + 导读
- `wx-intro-card` — 背景知识
- `wx-section-card` — 知识点逐条拆解（配图标）
- `wx-quote-card` — 研究引述
- `wx-inline-graphic` — 概念示意图
- `wx-summary-card` — 总结

### 产品发布
- `wx-hero-card` — 产品名称 + slogan（强视觉 mesh 背景）
- `wx-section-card` — 每个新功能一个卡片
- `wx-metric-grid` — 性能指标
- `wx-badge-art` — 版本号/标志

### 人物故事
- `wx-hero-card` — 人物名 + 标签
- `wx-quote-card` — 关键语录（多处使用）
- `wx-timeline-card` — 人生/职业经历时间线
- `wx-section-card` — 故事章节
- `wx-inline-graphic` — 装饰图

### 数据分析
- `wx-hero-card` — 报告标题
- `wx-metric-grid` — 核心指标汇总
- `wx-section-card` — 各维度分析
- `wx-compare-grid` — 数据对比
- `wx-timeline-card` — 趋势时间线
- `wx-summary-card` — 结论

### 教程指南
- `wx-hero-card` — 教程标题 + 简介
- `wx-section-card` — 每个步骤一个卡片（使用 wx-section-index 编号）
- `wx-quote-card` — 注意事项/提示
- `wx-summary-card` — 总结清单

### 品牌故事
- `phone-brand-banner` — 品牌 logo 横幅（如有）
- `wx-hero-card` — 品牌名称 + 理念
- `wx-quote-card` — 创始人语录
- `wx-section-card` — 品牌历程/价值观章节
- `wx-timeline-card` — 品牌大事记
- `wx-badge-art` — 品牌印章
