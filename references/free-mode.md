# Free Mode Guide

`free` 模式不是“什么都不管”，而是“先站在轻底盘上，再做前端发挥”。

## 默认起手式

优先使用这些 helper class 作为第一层骨架：

- `tp-free-shell`
- `tp-free-hero`
- `tp-free-kicker`
- `tp-free-panel`
- `tp-free-grid`
- `tp-free-stat`
- `tp-free-quote`
- `tp-free-note`
- `tp-free-divider`
- `tp-free-table-wrap`

推荐原则：

1. 第一版自由模式，至少使用 `tp-free-shell` 加任意 2 个以上 `tp-free-*` 组件。
2. 自定义 class 用来增强、偏移、重组，不要一上来完全绕开 helper。
3. 手机端默认单列；只有短信息块才用 `tp-free-grid cols-2`。

## 配色规则

优先使用 preset 变量：

- `var(--accent)`
- `var(--accent-strong)`
- `var(--accent-soft)`
- `var(--text-main)`
- `var(--text-muted)`
- `var(--hero-grad-a)`
- `var(--hero-grad-b)`
- `var(--hero-fade)`

允许的例外：

- `rgba(255,255,255,...)`
- `rgba(0,0,0,...)`

不推荐：

- 大量硬编码 `#3bb8d6`、`#0d1f29` 这类主题色
- 自己发明整套新色盘，导致预设气质失真

## 推荐结构

### 1. 科技发布感

```html
<article data-ui-mode="free" data-preset="nebula-frost">
  <style>
    .page-hero {
      background:
        radial-gradient(circle at top right, var(--hero-fade), transparent 36%),
        linear-gradient(135deg, rgba(255,255,255,0.68), rgba(255,255,255,0.92));
    }
  </style>
  <div class="tp-free-shell">
    <section class="tp-free-hero page-hero">
      <span class="tp-free-kicker">产品发布</span>
      <h1>大标题</h1>
      <small>一句导语</small>
    </section>
    <section class="tp-free-grid cols-2">
      <div class="tp-free-stat"><strong>26</strong><span>关键指标</span></div>
      <div class="tp-free-stat"><strong>3</strong><span>流程阶段</span></div>
    </section>
    <section class="tp-free-panel">
      <h2>说明区</h2>
      <p>补充正文。</p>
    </section>
  </div>
</article>
```

### 2. 编辑刊物感

```html
<article data-ui-mode="free" data-preset="dawn-journal">
  <div class="tp-free-shell">
    <section class="tp-free-hero">
      <span class="tp-free-kicker">社论</span>
      <h1>刊物式标题</h1>
      <small>克制的副标题</small>
    </section>
    <blockquote class="tp-free-quote">一句定调的话。</blockquote>
    <section class="tp-free-panel">
      <h2>正文一</h2>
      <p>段落内容。</p>
    </section>
  </div>
</article>
```

## 按家族起手

不要把 `free` 理解成“完全随机”。更稳的方式是先按 `family` 抽一个大方向：

- `swiss-journal`
  关键词：细边、留白、线性栏目感
  起手：`tp-free-hero + 2 个 tp-free-panel + 1 个 tp-free-quote`
- `archive-paper`
  关键词：档案页、纸本副刊、展签
  起手：framed hero + dossier panel + 注释块
- `aurora-drift`
  关键词：发光、玻片、漂浮渐变
  起手：luminous hero + 2 列 stat + glow panels
- `ops-console`
  关键词：metric-first、grid、command board
  起手：数据 hero + `tp-free-grid cols-2` + 多个 panel
- `brief-bulletin`
  关键词：快报、扫读、轻资讯
  起手：短 hero + 1 组 stat + 多个简短 panel
- `salon-luxe`
  关键词：封面、陈列、沙龙
  起手：framed hero + quote + 2 个长 panel
- `neon-signal`
  关键词：HUD、霓虹、信号感
  起手：dark hero + signal stats + console note
- `poster-brutal`
  关键词：粗边、标签、海报块面
  起手：硬标签 hero + 大段落 panel + 对比 stat
- `play-lab`
  关键词：bento、跳色、轻拼贴
  起手：不规则 hero + bento grid + playful notes

## 反面模式

- 只写一堆完全自定义 class，却完全不用 `tp-free-*`
- 用大量硬编码颜色替代 preset 变量
- 把页面做成纯海报，没有连续可编辑正文
- 在手机端塞 3 列、4 列
- 装饰很重，但没有信息层级
