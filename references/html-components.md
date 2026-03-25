# HTML 组件文档

重要：

- 禁止在任何组件中使用 Emoji。
- `rule` 模式下不再鼓励模型自由手写大段 SVG。
- 先决定 `content-template`，再决定 `svg-grammar`，再决定 `hero-scene`，最后为每节分配 `mark-kind`。

## 根结构

```html
<article
  class="article-theme style-skin-{skin}"
  data-preset="{preset-id}"
  data-style-family="{family}"
  data-style-archetype="{archetype}"
  data-heading-system="{heading-system}"
  data-content-template="{content-template}"
  data-svg-grammar="{svg-grammar}"
  data-hero-scene="{hero-scene}"
>
  <div class="wx-article-shell">
    <!-- 组件在此处排列 -->
  </div>
</article>
```

这些属性是正式接口，不是装饰性元数据：

- `data-content-template`
  先定义页面是什么类型：`event-notice / weekly-report / release-brief / knowledge-article / case-recap`
- `data-svg-grammar`
  家族级图形语法，例如 `editorial-schematic / signal-panel / archive-plate`
- `data-hero-scene`
  hero 场景，例如 `paper-fold / signal-grid / museum-frame`
- `data-mark-kind`
  章节语义，例如 `registration / schedule / awards / recap`

## SVG Grammar Layer

`rule` 模式里的 SVG 分成 3 类，不要混着用：

1. `Hero Scene`
   只负责首页气质和主题启动，不承担章节语义。
1. `Section Mark`
   只服务章节语义，固定放在章节元信息层。
1. `Inline Infographic`
   只在真的帮助理解结构时出现。

默认原则：

- hero 用 scene slot，不手写大段自由坐标。
- section mark 是唯一正式章节图形接口，每节最多 1 个。
- `wx-inline-graphic` 必须命中批准过的信息图模板。
- `wx-badge-art` 不是默认装饰容器；`event-notice` 默认禁用。

## Hero Scene

### `wx-hero-card`

```html
<div class="wx-hero-card">
  <div class="wx-hero-mesh" data-hero-scene="{hero-scene}"></div>
  <span class="wx-eyebrow">栏目标签</span>
  <h1>文章主标题</h1>
  <p class="wx-lead">副标题或一句话导读</p>
  <div class="wx-pill-grid">
    <span class="wx-pill">标签 1</span>
    <span class="wx-pill">标签 2</span>
  </div>
</div>
```

允许的 hero scene：

- `ribbon-flow`
- `signal-grid`
- `paper-fold`
- `constellation-map`
- `editorial-beam`
- `museum-frame`

要求：

- `wx-hero-mesh` 是 scene slot，最终 SVG 由 grammar registry 生成。
- 不要自己写“渐变矩形 + 两三个圆”的通用 mesh。
- hero 只负责页面启动气质，不要借它替代 section 语义。

## Section Mark

### `wx-section-card`

```html
<div class="wx-section-card">
  <div class="wx-section-top">
    <div class="wx-section-heading">
      <span class="wx-section-index">01</span>
      <div class="wx-card-caption">栏目标签</div>
      <span class="wx-section-mark" data-mark-kind="{mark-kind}" aria-hidden="true"></span>
      <div class="wx-title-row">
        <h2>章节标题</h2>
      </div>
    </div>
  </div>
  <div class="wx-section-body">
    <p>正文……</p>
  </div>
</div>
```

正式语义域：

- `registration`：报名 / 通知
- `organization`：组织 / 联合发起
- `task`：目标 / 开发任务
- `schedule`：日程 / 时间节点
- `qualification`：资格 / 权益
- `awards`：奖项 / 证书
- `growth`：后续机会 / 增长路径
- `perspective`：观点 / 方法定位
- `method`：方法 / 流程
- `delivery`：交付 / 成果
- `risk`：风险 / 约束
- `recap`：复盘 / 总结

要求：

- `wx-section-mark` 必须带 `data-mark-kind`。
- 每节标题只能有 1 个 `wx-section-mark`。
- 相同语义可以复用同一套 family 画法，不同语义必须换图。
- 不允许通用加号、调试图标、空洞装饰件冒充语义徽记。

## Heading System

同一页必须只选择一种主 `heading system`：

| System | 结构重点 | 适合家族 |
| --- | --- | --- |
| `icon-led` | 只在少数图形主导页面保留显式 `wx-section-icon` | `field-atlas`, `aurora-drift`, `play-lab` |
| `index-led` | 阅读型默认方案，强调 `wx-section-index + wx-card-caption + wx-section-mark` | `swiss-journal`, `ledger-spec`, `brief-bulletin`, `poster-brutal`, `skyline-pane` |
| `dual` | 只给 dashboard / signal panel 家族保留 icon + index 双轨 | `ops-console`, `neon-signal` |
| `plaque` | 牌匾感标题区，但仍只允许 1 个 `wx-section-mark` | `archive-paper`, `salon-luxe`, `night-gallery`, `studio-ribbon`, `deck-story` |

禁止做法：

- 第一节是 icon system，第二节突然变成纯编号。
- 同一页所有 section 共用一个无语义空图形，只换颜色。
- 标题左右各挂一个 SVG，或者在标题下面再补一条无职责轨道线。
- 继续使用 `wx-title-flank / wx-heading-ornament / wx-section-emblem`。

## Inline Infographic

### `wx-inline-graphic`

```html
<div class="wx-inline-graphic" data-infographic-kind="{infographic-kind}"></div>
```

只允许以下受控模板：

- `process-track`
- `node-network`
- `compare-grid`
- `path-map`
- `evidence-stack`
- `structure-breakdown`

要求：

- 必须带 `data-infographic-kind`。
- 最终 SVG 由 grammar registry 生成。
- `event-notice / weekly-report / release-brief / knowledge-article / case-recap` 默认最多 1 个。
- 阅读优先页面默认可以是 0，不强制出现。
- 如果不能独立解释结构，就不要放。

### `wx-badge-art`

```html
<div class="wx-badge-art"></div>
```

边界：

- 这是受限高级组件，不是“让页面更丰富”的默认装饰块。
- `event-notice` 默认禁用。
- 阅读优先 family 默认不推荐。

## 其他组件

### `wx-intro-card`

```html
<div class="wx-intro-card">
  <span class="wx-card-caption">导读</span>
  <div class="wx-section-body">
    <p>导读文字……</p>
  </div>
</div>
```

### `wx-metric-grid`

```html
<div class="wx-metric-grid" style="grid-template-columns: 1fr 1fr;">
  <div class="wx-metric-card">
    <strong>128%</strong>
    <span>增长率</span>
  </div>
  <div class="wx-metric-card">
    <strong>¥3.2 亿</strong>
    <span>GMV</span>
  </div>
</div>
```

### `wx-compare-grid`

```html
<div class="wx-compare-grid" style="grid-template-columns: 1fr 1fr;">
  <div class="wx-compare-card">
    <h3>方案 A</h3>
    <p>描述……</p>
  </div>
  <div class="wx-compare-card">
    <h3>方案 B</h3>
    <p>描述……</p>
  </div>
</div>
```

### `wx-timeline-card`

```html
<div class="wx-timeline-card">
  <div class="wx-timeline-item">
    <div class="wx-timeline-dot"></div>
    <div>
      <h3>阶段一</h3>
      <p>事件描述……</p>
    </div>
  </div>
</div>
```

### `wx-quote-card`

```html
<blockquote class="wx-quote-card">
  “引言内容”
  <small>—— 来源</small>
</blockquote>
```

### `wx-summary-card`

```html
<div class="wx-summary-card">
  <p>总结文字……</p>
</div>
```

### `wx-divider-ornament`

```html
<div class="wx-divider-ornament"></div>
```

要求：

- 分隔线也是 family grammar 的一部分，不再使用通用 divider。
- 资讯简报、阅读型页面通常不需要它，优先靠留白和标题节奏完成转场。

### `phone-brand-banner`

```html
<div class="phone-brand-banner">
  <div class="phone-brand-mark"><img src="logo.png" alt="Logo"></div>
  <div class="phone-brand-copy">
    <strong>品牌名称</strong>
    <small>slogan</small>
  </div>
</div>
```

### `wx-image-drop-zone`

```html
<div class="wx-image-drop-zone" contenteditable="false">
  点击或拖拽图片到此处
</div>
```

要求：

- 阅读型交付页默认不要用它。
- 最终交付页优先使用原生图片块。
