# HTML 组件文档

**重要：禁止在任何组件中使用 Emoji 字符。所有图标和装饰必须使用 SVG。**

所有可用的 HTML 组件、结构规范和内置 SVG 资源。

## 根结构

```html
<article class="article-theme style-skin-{skin}" data-preset="{preset-id}">
  <div class="wx-article-shell">
    <!-- 组件在此处排列 -->
  </div>
</article>
```

`{skin}` 取自 presets.json 的 `skin` 字段：`editorial` / `glass` / `brutal` / `neon` / `tech` / `mono` / `luxe` / `magazine` / `soft` / `luxe-dark` / `mono-dark`。

---

## 组件列表

### 1. wx-hero-card（头图卡片）

```html
<div class="wx-hero-card">
  <div class="wx-hero-mesh">
    <svg viewBox="0 0 1080 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="1080" y2="180">
          <stop offset="0%" stop-color="var(--hero-grad-a)"/>
          <stop offset="100%" stop-color="var(--hero-grad-b)"/>
        </linearGradient>
      </defs>
      <rect width="1080" height="180" fill="url(#hg)"/>
      <circle cx="200" cy="80" r="110" fill="var(--hero-fade)"/>
      <circle cx="800" cy="50" r="70" fill="var(--hero-fade)"/>
    </svg>
  </div>
  <span class="wx-eyebrow">栏目标签</span>
  <h1>文章主标题</h1>
  <p class="wx-lead">副标题或一句话导读</p>
  <div class="wx-pill-grid">
    <span class="wx-pill">标签1</span>
    <span class="wx-pill">标签2</span>
  </div>
</div>
```

### 2. wx-intro-card（导读卡片）

```html
<div class="wx-intro-card">
  <span class="wx-card-caption">导读</span>
  <div class="wx-section-body">
    <p>导读文字……</p>
  </div>
</div>
```

### 3. wx-section-card（章节卡片）

```html
<div class="wx-section-card">
  <div class="wx-section-top">
    <div class="wx-section-icon">
      <!-- SVG 图标（见下方 SVG 库） -->
    </div>
    <div class="wx-section-heading">
      <span class="wx-section-index">PART 01</span>
      <h2>章节标题</h2>
    </div>
  </div>
  <div class="wx-section-body">
    <p>正文……</p>
    <ul><li>列表项</li></ul>
    <blockquote>引用</blockquote>
  </div>
</div>
```

### 4. wx-metric-grid（数据指标）

```html
<div class="wx-metric-grid" style="grid-template-columns: 1fr 1fr;">
  <div class="wx-metric-card">
    <strong>128%</strong>
    <span>增长率</span>
  </div>
  <div class="wx-metric-card">
    <strong>¥3.2亿</strong>
    <span>GMV</span>
  </div>
</div>
```

### 5. wx-compare-grid（对比卡片）

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

### 6. wx-timeline-card（时间线）

```html
<div class="wx-timeline-card">
  <div class="wx-timeline-item">
    <div class="wx-timeline-dot"></div>
    <div>
      <h3>2023 Q1</h3>
      <p>事件描述……</p>
    </div>
  </div>
  <!-- 更多 timeline-item -->
</div>
```

### 7. wx-quote-card（引言）

```html
<blockquote class="wx-quote-card">
  "引言内容"
  <small>—— 来源</small>
</blockquote>
```

### 8. wx-summary-card（总结）

```html
<div class="wx-section-card">
  <span class="wx-card-caption">总结</span>
  <div class="wx-summary-card">
    <p>总结文字……</p>
  </div>
</div>
```

### 9. wx-divider-ornament（分隔线，可选）

```html
<div class="wx-divider-ornament">
  <!-- 分隔线 SVG -->
</div>
```

资讯简报、早报、新闻汇总这类页面通常不需要它，优先靠留白和标题层级完成转场。

### 10. wx-inline-graphic / wx-badge-art（图形/印章）

```html
<div class="wx-inline-graphic"><!-- 数据/装饰 SVG --></div>
<div class="wx-badge-art"><!-- 印章 SVG --></div>
```

### 11. phone-brand-banner（品牌横幅）

仅当 `logos/` 目录有文件时使用：

```html
<div class="phone-brand-banner">
  <div class="phone-brand-mark"><img src="logo.png" alt="Logo"></div>
  <div class="phone-brand-copy">
    <span class="phone-brand-overline">BRAND</span>
    <strong>品牌名称</strong>
    <small>slogan</small>
  </div>
  <span class="phone-brand-chip">标签</span>
</div>
```

### 12. 表格

标准 HTML table，自动美化。

### 13. 图片占位

可在 HTML 中留出图片区域供用户后续插入：

```html
<div class="wx-image-drop-zone" contenteditable="false">
  点击或拖拽图片到此处
</div>
```

---

## 内置 SVG 库

所有 SVG 来自 article-studio，使用 `currentColor` 自适应主题色。viewBox 均为 `0 0 64 64`（图标）或其他标注尺寸。

### 栏目图标（用于 wx-section-icon）

#### spark-orbit · 灵感轨迹
```svg
<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><circle cx="32" cy="32" r="21" stroke="currentColor" stroke-width="3.5"/><path d="M32 8v11M32 45v11M8 32h11M45 32h11" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><circle cx="32" cy="32" r="7" fill="currentColor"/></svg>
```
适用：灵感、科技、AI

#### book-crest · 开卷纹章
```svg
<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M14 16.5C14 14 16 12 18.5 12H30c3.2 0 6.1 1.4 8 3.6C39.9 13.4 42.8 12 46 12h1.5C50 12 52 14 52 16.5V48a2 2 0 0 1-2.9 1.8L40 45l-9 4-9-4-9.1 4A2 2 0 0 1 10 48V16.5a2 2 0 0 1 2-2h2Z" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><path d="M32 18v27" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>
```
适用：知识、阅读、课程

#### compass-ring · 方向环
```svg
<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><circle cx="32" cy="32" r="22" stroke="currentColor" stroke-width="3.5"/><path d="M40.5 23.5 36 36l-12.5 4.5L28 28l12.5-4.5Z" fill="currentColor"/><circle cx="32" cy="32" r="4.5" fill="white" stroke="currentColor" stroke-width="3"/></svg>
```
适用：策略、方向、规划

#### column-tiles · 信息拼块
```svg
<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><rect x="12" y="12" width="18" height="18" rx="5" fill="currentColor"/><rect x="34" y="12" width="18" height="12" rx="5" stroke="currentColor" stroke-width="3"/><rect x="34" y="28" width="18" height="24" rx="5" fill="currentColor" opacity=".2"/><rect x="12" y="34" width="18" height="18" rx="5" stroke="currentColor" stroke-width="3"/></svg>
```
适用：卡片、结构、信息

#### quote-flare · 引言光标
```svg
<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M20 22c-4.4 2.7-7 7.1-7 12.4C13 42.7 18 48 25 48c6.4 0 11-4.2 11-10.4 0-5.2-3.4-8.7-8.8-8.7-.9 0-1.6.1-2.4.2 1.3-2.2 3.6-4.4 6.2-5.8L20 22Zm20 0c-4.4 2.7-7 7.1-7 12.4C33 42.7 38 48 45 48c6.4 0 11-4.2 11-10.4 0-5.2-3.4-8.7-8.8-8.7-.9 0-1.6.1-2.4.2 1.3-2.2 3.6-4.4 6.2-5.8L40 22Z" fill="currentColor"/></svg>
```
适用：引言、金句、观点

#### pulse-grid · 脉冲格网
```svg
<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M12 18h40M12 32h14l5-9 7 19 5-10h9M12 46h40" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="12" y="12" width="40" height="40" rx="10" stroke="currentColor" stroke-width="3.2"/></svg>
```
适用：科技、数据、系统、健康

### 数据图形（用于 wx-inline-graphic）

#### chart-arc · 弧线增长
```svg
<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M12 46c8-8 13-20 22-20 5.5 0 7 5 12 5 3.6 0 5.7-2.5 8-6" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M48 18h8v8" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 52h36" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
```

#### bar-stack · 层叠柱形
```svg
<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M14 50h36" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><rect x="18" y="28" width="8" height="18" rx="3" fill="currentColor" opacity=".32"/><rect x="30" y="18" width="8" height="28" rx="3" fill="currentColor"/><rect x="42" y="24" width="8" height="22" rx="3" fill="currentColor" opacity=".65"/></svg>
```

#### donut-split · 分层环图
```svg
<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M32 14a18 18 0 0 1 17.4 12.8" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M49.4 26.8A18 18 0 1 1 21 15.8" stroke="currentColor" stroke-width="8" stroke-linecap="round" opacity=".28"/><circle cx="32" cy="32" r="5" fill="currentColor"/></svg>
```

#### radar-star · 雷达星图
```svg
<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="m32 11 16 9v18l-16 9-16-9V20l16-9Z" stroke="currentColor" stroke-width="3"/><path d="m32 18 10 5.8v11.4L32 41l-10-5.8V23.8L32 18Z" fill="currentColor" opacity=".18"/><path d="M32 11v36M16 20l32 18M48 20 16 38" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
```

#### timeline-rail · 时间轨道
```svg
<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M15 16v32" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="15" cy="18" r="5" fill="currentColor"/><circle cx="15" cy="32" r="5" fill="currentColor" opacity=".6"/><circle cx="15" cy="46" r="5" fill="currentColor" opacity=".3"/><path d="M28 18h21M28 32h16M28 46h24" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>
```

### 装饰图形（用于 wx-inline-graphic）

#### mesh-wave · 流动曲面
```svg
<svg viewBox="0 0 160 64" fill="none" aria-hidden="true"><path d="M6 45c18-28 41-35 66-23 12 5.8 23 12.8 40 12.8 15.4 0 27.2-4.7 42-16.8" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M18 54c21-16 40-18 60-12 15 4.6 33 11 59 4" stroke="currentColor" stroke-width="2.8" opacity=".4" stroke-linecap="round"/></svg>
```

#### constellation · 星群连线
```svg
<svg viewBox="0 0 160 64" fill="none" aria-hidden="true"><path d="M16 46 40 24l28 14 24-22 18 6 20-10 14 20" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="46" r="4" fill="currentColor"/><circle cx="40" cy="24" r="4" fill="currentColor"/><circle cx="68" cy="38" r="4" fill="currentColor"/><circle cx="92" cy="16" r="4" fill="currentColor"/><circle cx="110" cy="22" r="4" fill="currentColor"/><circle cx="130" cy="12" r="4" fill="currentColor"/><circle cx="144" cy="32" r="4" fill="currentColor"/></svg>
```

#### ribbon-fold · 折页缎带
```svg
<svg viewBox="0 0 160 64" fill="none" aria-hidden="true"><path d="M12 20h48l18 12 18-12h52v24H96L78 32 60 44H12V20Z" fill="currentColor" opacity=".16"/><path d="M12 20h48l18 12 18-12h52" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 44h48l18-12 18 12h52" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
```

#### halo-panels · 半透明光片
```svg
<svg viewBox="0 0 160 64" fill="none" aria-hidden="true"><rect x="18" y="10" width="44" height="44" rx="14" stroke="currentColor" stroke-width="3"/><rect x="58" y="16" width="44" height="34" rx="12" fill="currentColor" opacity=".16"/><rect x="96" y="8" width="46" height="48" rx="16" stroke="currentColor" stroke-width="3" opacity=".7"/></svg>
```

#### ink-splash · 墨点扩散
```svg
<svg viewBox="0 0 160 64" fill="none" aria-hidden="true"><path d="M36 18c8 0 12 5 12 12 0 6-4 12-11 12-8 0-13-5-13-12 0-7 4-12 12-12Zm46 2c13 0 20 7 20 16 0 10-8 18-20 18-12 0-19-7-19-18 0-9 8-16 19-16Zm42 6c8 0 13 5 13 12 0 8-5 13-13 13-7 0-12-5-12-13 0-7 5-12 12-12Z" fill="currentColor" opacity=".18"/><circle cx="56" cy="24" r="3" fill="currentColor"/><circle cx="114" cy="18" r="3.5" fill="currentColor"/><circle cx="28" cy="42" r="2.5" fill="currentColor"/></svg>
```

### 分隔线 SVG（用于 wx-divider-ornament）

#### editorial-notch · 极简折点（克制 / 编辑 / 轻资讯主题优先）
```svg
<svg viewBox="0 0 220 20" fill="none" aria-hidden="true"><path d="M18 10h78M124 10h78" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".26"/><path d="M110 5.5 114.5 10 110 14.5 105.5 10Z" fill="currentColor" opacity=".5"/></svg>
```

#### soft-stars · 星点分隔（暖色 / 轻盈主题优先）
```svg
<svg viewBox="0 0 220 28" fill="none" aria-hidden="true"><path d="M6 14h72M142 14h72" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity=".5"/><path d="m102 7 2.5 5.5L110 15l-5.5 2.5L102 23l-2.5-5.5L94 15l5.5-2.5L102 7Zm16-3 2.2 4.8L125 11l-4.8 2.2L118 18l-2.2-4.8L111 11l4.8-2.2L118 4Z" fill="currentColor"/></svg>
```

#### chevron-band · 切角分隔（科技 / 结构化主题优先）
```svg
<svg viewBox="0 0 220 28" fill="none" aria-hidden="true"><path d="M8 14h66l12-8 12 8 12-8 12 8h90" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
```

#### fold-divider · 折纸分隔（厚重 / 暗色主题优先）
```svg
<svg viewBox="0 0 220 28" fill="none" aria-hidden="true"><path d="M8 14h78l16-8 16 8 16-8 16 8h62" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" opacity=".76"/><circle cx="110" cy="14" r="3.5" fill="currentColor"/></svg>
```

#### line-orbit · 环形分隔（仅少量特殊场景使用，不建议默认）
```svg
<svg viewBox="0 0 220 28" fill="none" aria-hidden="true"><path d="M4 14h70M146 14h70" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="110" cy="14" r="10" stroke="currentColor" stroke-width="2.5"/><circle cx="110" cy="14" r="3.5" fill="currentColor"/></svg>
```

### 印章 SVG（用于 wx-badge-art）

#### tag-stamp · 标签印章
```svg
<svg viewBox="0 0 120 64" fill="none" aria-hidden="true"><path d="M12 18a10 10 0 0 1 10-10h44l24 24-24 24H22A10 10 0 0 1 12 46V18Z" stroke="currentColor" stroke-width="3"/><circle cx="30" cy="20" r="5" fill="currentColor"/></svg>
```

#### seal-round · 圆章封签
```svg
<svg viewBox="0 0 120 64" fill="none" aria-hidden="true"><circle cx="32" cy="32" r="18" stroke="currentColor" stroke-width="3.2"/><circle cx="32" cy="32" r="7" fill="currentColor"/><path d="M62 20h42M62 32h34M62 44h46" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
```

#### side-ticket · 票据侧签
```svg
<svg viewBox="0 0 120 64" fill="none" aria-hidden="true"><path d="M16 14h72a8 8 0 0 1 8 8v4a6 6 0 0 0 0 12v4a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8V22a8 8 0 0 1 8-8Z" stroke="currentColor" stroke-width="3"/><path d="M34 24h36M34 32h28M34 40h42" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
```

#### bookmark-chip · 书签芯片
```svg
<svg viewBox="0 0 120 64" fill="none" aria-hidden="true"><path d="M18 12h34a8 8 0 0 1 8 8v30l-25-10-25 10V20a8 8 0 0 1 8-8Z" fill="currentColor" opacity=".18"/><path d="M18 12h34a8 8 0 0 1 8 8v30l-25-10-25 10V20a8 8 0 0 1 8-8Z" stroke="currentColor" stroke-width="3"/><path d="M72 22h34M72 34h26M72 46h38" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
```

---

## 排版建议

1. **字号已为手机优化**：正文 17px、标题 28-38px，无需手动调整
2. **每段不超过 4 行**：手机上长段会形成文字墙，应拆分
3. **列表优于长段**：要点用 ul/li 比 p 更易读
4. **适度使用分隔线**：一篇文章 0-2 个 divider 即可；资讯页默认尽量不用
5. **图标选择**：根据章节内容从内置 SVG 库中选最合适的，或自行设计 SVG（使用 `currentColor`）
6. **图片占位**：用 `wx-image-drop-zone` 标记用户可后续插图的位置
7. **禁止 Emoji**：不要在任何地方使用 Emoji 字符（🚀✨💡📊❌✅ 等），所有图标必须用 SVG
8. **每个 section-card 必须有 SVG 图标**：使用 `wx-section-icon` + 内置或自绘 SVG
