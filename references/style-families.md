# Style Families

Tianphoto 的 preset 不再只是“一个颜色名字”，而是先属于某个**风格家族**，再落到具体 preset。

生成时遵循这个顺序：

1. 先判断内容最适合哪个 `family`
2. 再选这个 family 里最匹配的 `preset`
3. 最后补一句明确的视觉执行方向

## 家族速查

| Family | 代表 preset | 适合内容 | Rule 模式表现 | Free 模式起手式 |
| --- | --- | --- | --- | --- |
| `swiss-journal` | `dawn-journal`, `slate-column`, `jade-zen` | 评论、知识、观点、深度分析 | 细边、留白、理性栏目感 | 干净 hero + 线性 panel + 少装饰 |
| `field-atlas` | `forest-atlas`, `meadow-report` | 教育、历史、人物、自然感知识 | 有机纸感、地图/图志气质 | 纸面 hero + 柔和 note + 自然纹理 |
| `ledger-spec` | `mono-ledger`, `ivory-docs`, `obsidian-notes` | 文档、流程、方法论、规范 | 账簿/规格书、弱阴影、强秩序 | sheet 风 panel + ruled lines + 紧密节奏 |
| `archive-paper` | `paper-museum`, `sand-archive`, `amber-market`, `ink-editorial` | 人物、案例、纪实、商业评论 | 档案页、展签、纸本副刊 | framed hero + dossier 卡 + 注释标签 |
| `aurora-drift` | `aurora-glass`, `nebula-frost`, `peach-bloom` | AI、设计、科技趋势、生活方式灵感 | 发光玻片、流动渐变、氛围层 | luminous hero + glow panel + floating stats |
| `skyline-pane` | `skyline-air` | 轻商务、增长简报、快读型资讯 | 轻玻璃商务刊、干净透明层次 | airy hero + slim panels + clear chips |
| `ops-console` | `lunar-grid`, `cobalt-ops`, `cyan-data`, `metro-metrics` | 数据、复盘、策略、汇报、看板 | console / board / metric 系统 | metric-first hero + grid + console panels |
| `brief-bulletin` | `saffron-brief`, `ocean-brief` | 快报、教程、方法、运营干货 | 轻快报、强扫读、少装饰 | stacked brief cards + left bands + concise stats |
| `deck-story` | `sunset-deck`, `rose-memo` | 提案、观点拆解、品牌故事 | 卡片 deck、提案页、强节奏 | stacked cards + tag ribbons + softer drama |
| `salon-luxe` | `pearl-board`, `velvet-luxe`, `ruby-salon`, `porcelain-muse` | 品牌、商业、高级感发布、策展 | 沙龙/封面/陈列板 | framed hero + editorial serif + elegant spacing |
| `night-gallery` | `noir-gallery` | 作品、人物、黑金陈列、夜间高定感 | 深色画廊、聚光、金属边界 | dark gallery hero + spotlight panels |
| `neon-signal` | `comet-neon`, `lilac-comet` | 发布、未来趋势、赛博表达、AI 强视觉 | HUD、霓虹、扫描线 | dark HUD hero + signal stats + neon accents |
| `poster-brutal` | `graphite-brutal`, `mint-deck`, `cherry-press` | 态度表达、拆解、清单、结论强烈内容 | 粗边海报、厚边框、偏印刷感 | big blocks + offset shadow + hard labels |
| `play-lab` | `playful-blocks`, `retro-signal` | 社媒化内容、轻内容、年轻表达、拼贴观点 | 跳色拼板、bento、轻俏皮 | colorful bento + playful cards + collage hints |

## 选择规则

### 先选 family，不要先看颜色

- 如果你已经在想“蓝色还是粉色”，说明还没做完 family 判断。
- family 决定的是：hero 构图、卡片节奏、标签形态、装饰语汇、表格/数据的呈现方式。
- 颜色只是 family 内部再往下的一层。

### 内容和 family 要对上“阅读气质”

- 需要沉静阅读、讲逻辑：优先 `swiss-journal` / `ledger-spec`
- 需要案例、人物、纪实、评论：优先 `archive-paper`
- 需要数据板、策略图、汇报感：优先 `ops-console`
- 需要氛围和未来感：优先 `aurora-drift` / `neon-signal`
- 需要品牌感和高级感：优先 `salon-luxe` / `night-gallery`
- 需要态度和冲击：优先 `poster-brutal`
- 需要年轻、社媒化、跳色：优先 `play-lab`

## Rule / Free 的差别

### `rule`

- family 决定组件的“长相”和“节奏”
- 即使仍然使用 `wx-*` 组件，不同 family 也要明显不是同一套版式换色

### `free`

- family 决定 AI 的前端构图方向
- 优先沿用对应 family 的气质：例如 `ops-console` 就应该先做 metric / grid / panel，而不是先做文艺大段留白

## 禁止的做法

- 只因为喜欢某个颜色就选 preset
- 同样的 hero、同样的 caption、同样的 card 节奏，只换 `data-preset`
- 把 `free` 模式做成没有 family 的随机页面
