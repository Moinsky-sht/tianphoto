# Style Families

Tianphoto 的 preset 不是“颜色皮肤”，而是一套完整的 family visual system。

生成顺序必须是：

1. 先判断 `content-template`
1. 再判断最适合哪个 `style family`
1. 再落到具体 `preset`
1. 再决定 `composition`（位置 / 强度 / quietness）
1. 最后才决定是否真的需要额外 `inline infographic`
1. 最后再写一句明确的视觉执行方向

## 家族速查

| Family | 代表 preset | 适合内容 | Heading | SVG Grammar | Hero Scene 基线 | 图形气质 |
| --- | --- | --- | --- | --- | --- | --- |
| `swiss-journal` | `dawn-journal`, `slate-column`, `jade-zen` | 评论、知识、观点、深度分析 | `index-led` | `editorial-schematic` | `editorial-beam` | 细线、低密度、编辑导线 |
| `field-atlas` | `forest-atlas`, `meadow-report` | 教育、历史、人物、自然感知识 | `icon-led` | `atlas-annotation` | `constellation-map` | 导览、轨迹、坐标标注 |
| `ledger-spec` | `mono-ledger`, `ivory-docs`, `obsidian-notes` | 文档、流程、方法论、规范 | `index-led` | `ledger-wireframe` | `paper-fold` | 直角、账簿、规整线框 |
| `archive-paper` | `paper-museum`, `sand-archive`, `amber-market`, `ink-editorial` | 人物、案例、纪实、商业评论 | `plaque` | `archive-plate` | `museum-frame` | 展签、档案板、纸本框体 |
| `aurora-drift` | `aurora-glass`, `nebula-frost`, `peach-bloom` | AI、设计、科技趋势、生活方式灵感 | `icon-led` | `aurora-orbit` | `constellation-map` | 轨道、光晕、柔性漂移 |
| `skyline-pane` | `skyline-air` | 轻商务、增长简报、快读型资讯 | `index-led` | `skyline-wire` | `editorial-beam` | 轻 pane、透亮面板、软边线框 |
| `ops-console` | `lunar-grid`, `cobalt-ops`, `cyan-data`, `metro-metrics` | 数据、复盘、策略、汇报、看板 | `dual` | `signal-panel` | `signal-grid` | panel、signal、node、grid |
| `brief-bulletin` | `saffron-brief`, `ocean-brief` | 快报、教程、方法、运营干货 | `index-led` | `bulletin-editorial` | `editorial-beam` | 快报条带、短促、扫读优先 |
| `deck-story` | `sunset-deck`, `rose-memo` | 提案、观点拆解、品牌故事 | `plaque` | `story-ribbon` | `ribbon-flow` | 讲述型丝带、提案页节奏 |
| `salon-luxe` | `pearl-board`, `velvet-luxe`, `ruby-salon`, `porcelain-muse` | 品牌、商业、高级感发布、策展 | `plaque` | `salon-emblem` | `museum-frame` | 牌匾、勋章、陈列边框 |
| `night-gallery` | `noir-gallery` | 作品、人物、黑金陈列、夜间高定感 | `plaque` | `gallery-frame` | `museum-frame` | 画框、聚光、夜场陈列 |
| `neon-signal` | `comet-neon`, `lilac-comet` | 发布、未来趋势、赛博表达、AI 强视觉 | `dual` | `neon-signal` | `signal-grid` | HUD、霓虹、扫描信号 |
| `poster-brutal` | `graphite-brutal`, `mint-deck`, `cherry-press` | 态度表达、拆解、清单、结论强烈内容 | `index-led` | `poster-block` | `ribbon-flow` | 强块面、厚边、海报裁切 |
| `play-lab` | `playful-blocks`, `retro-signal` | 社媒化内容、轻内容、年轻表达、拼贴观点 | `icon-led` | `play-symbolic` | `constellation-map` | 圆角符号、拼贴、俏皮结构 |
| `studio-ribbon` | `opal-ribbon` | 发布说明、轻策展、温和专业的品牌叙事 | `plaque` | `ribbon-plaque` | `ribbon-flow` | 丝带牌匾、柔性陈列、清透面板 |

## 5 个差异维度

换 family 之后，即使去掉颜色，也应该能看出不是同一套系统。最少要拉开这 5 个维度：

- `stroke_weight`
  `swiss-journal / ledger-spec / brief-bulletin / skyline-pane` 更细，`ops-console / poster-brutal` 更重
- `corner_language`
  `ledger-spec / ops-console / poster-brutal` 更直角，`field-atlas / aurora-drift / play-lab` 更柔和
- `fill_strategy`
  `archive-paper / salon-luxe / studio-ribbon` 更偏牌匾与纸本填充，`ledger-spec / night-gallery` 更偏线框
- `density_level`
  阅读型更低密度，产品型更高密度，表达型允许更强构图但仍要有职责
- `geometry_bias`
  编辑导线、panel、ribbon、frame、orbit、block 等几何倾向必须明确

## 选择规则

### 先选 family，不要先看颜色

- 如果你已经在想“蓝色还是粉色”，说明 family 还没判断完。
- family 决定 hero、section mark、divider、inline infographic 的图形语法，不只是卡片配色。

### family 和内容要对阅读气质

- 需要沉静阅读、讲逻辑：优先 `swiss-journal / ledger-spec / brief-bulletin`
- 需要案例、人物、纪实、评论：优先 `archive-paper`
- 需要数据板、策略图、汇报感：优先 `ops-console`
- 需要路径、导览、自然知识：优先 `field-atlas`
- 需要氛围和未来感：优先 `aurora-drift / neon-signal`
- 需要品牌感和高级感：优先 `salon-luxe / night-gallery / studio-ribbon`
- 需要态度和冲击：优先 `poster-brutal`
- 需要年轻、社媒化、拼贴：优先 `play-lab`

## Rule / Free 的差别

### `rule`

- family 先决定 grammar，再决定 composition。
- hero、section mark、divider、infographic 都必须命中对应 role slot。
- 不允许正文主航道漂浮大型抽象 SVG。

### `free`

- family 决定构图人格和视觉语气。
- 允许开放构图，但显著 SVG 只能留在 hero / divider / 独立说明区。
- 即使是自由页面，也不要做成“没有 family 的随机样式页”。

## 禁止做法

- 只因为喜欢某个颜色就选 preset。
- 同样的 hero、同样的 caption、同样的 section rhythm，只换 `data-preset`。
- 让不同 family 继续共用同一套通用 SVG，只在 CSS 里改颜色。
