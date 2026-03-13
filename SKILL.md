---
name: tianphoto
description: >
  This skill should be used when the user asks to "generate a mobile article image",
  "create a WeChat-style long image", "turn this article into a phone image",
  "make a mobile infographic", "把文章做成手机长图", "生成公众号图文",
  "做一张手机海报", "文章转长图", "生成手机图片", "做成网页图文",
  "tianphoto", "/tp",
  or provides article text/URL wanting visual output as a mobile-optimized page or image.
user_invocable: true
---

# Tianphoto — 智能图文生成工作室

将文章内容转化为**精美的、可编辑的自包含 HTML 网页**，可直接在浏览器中阅读、编辑文字、插入图片，一键导出 PNG 切片（适合公众号上传）。

## 核心理念

**网页优先，图片可选。** 先输出一个漂亮的、有设计感的 HTML 页面。用户可以：
- 在浏览器中直接查看效果
- 点击文字即可编辑
- 拖拽/粘贴图片
- 点击底部"保存"按钮（或 Cmd+S）保存修改后的网页
- 点击"导出"按钮生成 PNG 切片

## /tp 指令系统

用户可以用以下指令来配置 Tianphoto 的行为：

### `/tp logo on`
启用 Logo 功能。提示用户将 Logo 图片放到以下位置：
```
~/.claude/skills/tianphoto/logos/brand-logo.png
```
文件必须命名为 `brand-logo.png`（或 `.svg` / `.jpg`）。放好后再次运行即可自动嵌入品牌横幅。

### `/tp logo off`
关闭 Logo 功能，生成的页面不显示品牌横幅。

### `/tp style auto`
自动模式（默认）。根据文章内容主题自动匹配最佳预设风格。

### `/tp style <preset-id>`
手动指定预设风格，例如：
- `/tp style nebula-frost` — 星云雾面（科技/AI）
- `/tp style dawn-journal` — 曦白札记（知识/观点）
- `/tp style comet-neon` — 彗星霓光（暗色发布）
- `/tp style jade-zen` — 青玉留白（禅意阅读）

完整的 32 套预设见下方速查表。

### `/tp style list`
列出所有可用预设，附带预览说明。

### `/tp help`
显示所有可用指令说明。

### `/tp version`
显示当前安装的 Tianphoto 版本号，并检查 GitHub 是否有新版本可用。

### `/tp update`
从 GitHub 拉取最新版本，自动升级本地 skill 文件。

## 指令处理逻辑

当用户输入 `/tp` 指令时，按以下规则处理：

1. **`/tp logo on`** → 检查 `~/.claude/skills/tianphoto/logos/` 目录下是否有 `brand-logo.*` 文件（支持 png/jpg/svg）。有则确认已启用；没有则提示用户放置文件到该目录，文件名固定为 `brand-logo`
2. **`/tp logo off`** → 告诉用户后续生成将不包含品牌横幅
3. **`/tp style auto`** → 确认已切换为自动匹配模式
4. **`/tp style <id>`** → 验证 id 是否在 presets.json 中存在。存在则确认；不存在则给出最接近的建议
5. **`/tp style list`** → 输出预设速查表
6. **`/tp help`** → 输出指令帮助
7. **`/tp version`** → 读取 `~/.claude/skills/tianphoto/version.json` 中的 `version` 字段，显示当前版本。然后用以下命令检查远程最新版本：
   ```bash
   curl -s https://raw.githubusercontent.com/Moinsky-sht/tianphoto/main/version.json
   ```
   对比版本号，告诉用户是否需要更新。如果 curl 失败（网络问题），提示用户可以手动访问 GitHub 检查。
8. **`/tp update`** → 执行以下命令升级：
   ```bash
   cd ~/.claude/skills/tianphoto && git pull origin main
   ```
   如果本地有未提交的修改，先提示用户。如果 git pull 因网络失败，建议用户手动更新：
   ```bash
   cd ~/.claude/skills/tianphoto && git fetch origin main && git reset --hard origin/main
   ```
   更新完成后读取新的 version.json 确认版本号。

## 生成工作流

### Step 1: 获取内容

- **纯文本**：直接使用
- **URL**：`node ~/.claude/skills/tianphoto/scripts/fetch-content.js <url>`

### Step 2: 识别内容主题 → 选预设

参考 `references/content-types.md`，分析内容类型。如果用户用 `/tp style` 指定了预设则直接使用，否则自动匹配。

告诉用户选了什么预设及理由。

### Step 3: 生成 HTML

**⚠️ 关键：你只需要生成 `<article>` 标签内的 HTML 片段，不要生成 `<!DOCTYPE>`、`<html>`、`<head>`、`<body>` 等外层标签。render-image.js 会自动包裹这些外层结构。**

**结构规范：**

你生成的 HTML 必须严格遵循以下结构：

```html
<article class="article-theme style-skin-{skin}" data-preset="{preset-id}">
  <div class="wx-article-shell">
    <!-- 所有内容组件依次排列在这里 -->
  </div>
</article>
```

**严格 class 名白名单 — 只允许使用以下 class 名，不要发明不存在的 class：**

| class 名 | 用途 | 是否有 CSS |
|-----------|------|-----------|
| `wx-hero-card` | 头图卡片容器 | ✓ |
| `wx-hero-mesh` | hero 内 SVG 背景层 | ✓ |
| `wx-eyebrow` | 眉标标签 | ✓ |
| `wx-lead` | 副标题/导读 | ✓ |
| `wx-pill-grid` | 标签组容器 | ✓ |
| `wx-pill` | 单个标签 | ✓ |
| `wx-intro-card` | 导读卡片 | ✓ |
| `wx-section-card` | 章节卡片 | ✓ |
| `wx-section-top` | 章节头部（图标+标题） | ✓ |
| `wx-section-icon` | 章节图标容器 | ✓ |
| `wx-section-heading` | 章节标题区 | ✓ |
| `wx-section-index` | 章节编号 | ✓ |
| `wx-section-body` | 章节正文区 | ✓ |
| `wx-card-caption` | 卡片标题标签 | ✓ |
| `wx-metric-grid` | 指标网格容器 | ✓ |
| `wx-metric-card` | 单个指标卡 | ✓ |
| `wx-compare-grid` | 对比网格容器 | ✓ |
| `wx-compare-card` | 单个对比卡 | ✓ |
| `wx-timeline-card` | 时间线容器 | ✓ |
| `wx-timeline-item` | 时间线条目 | ✓ |
| `wx-timeline-dot` | 时间线圆点 | ✓ |
| `wx-quote-card` | 引言卡片 | ✓ |
| `wx-summary-card` | 总结文字区 | ✓ |
| `wx-divider-ornament` | 分隔线装饰 | ✓ |
| `wx-inline-graphic` | 内联图形容器 | ✓ |
| `wx-badge-art` | 印章/徽标容器 | ✓ |
| `wx-image-drop-zone` | 图片拖放占位 | ✓ |
| `wx-media-frame` | 图片 figure 容器 | ✓ |

**不存在以下 class（常见错误，绝对不要使用）：**
`wx-hero-eyebrow`、`wx-hero-title`、`wx-hero-lead`、`wx-hero-meta`、`wx-compare-col`、`wx-compare-head`、`wx-metric-item`、`wx-metric-num`、`wx-metric-label`、`wx-summary-label`、`wx-timeline-title`、`wx-timeline-content`、`wx-card-title`、`wx-card-body`

---

**必须遵循的组件模板（逐字复制结构，只替换文字内容）：**

#### Hero 模板（每篇文章必须有且仅有一个）

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
      <!-- 鼓励添加更多几何图形：线条、小圆点、矩形等 -->
    </svg>
  </div>
  <span class="wx-eyebrow">栏目标签</span>
  <h1 style="font-size:36px;color:var(--accent-strong);">文章主标题</h1>
  <p class="wx-lead">副标题或一句话导读</p>
</div>
```

#### 章节卡片模板（每个主要章节一个，内容不要堆叠）

```html
<div class="wx-section-card">
  <div class="wx-section-top">
    <div class="wx-section-icon">
      <!-- 从内置 SVG 库选择或自行设计 64x64 SVG，必须有 -->
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">...</svg>
    </div>
    <div class="wx-section-heading">
      <span class="wx-section-index">PART 01</span>
      <h2 style="font-size:22px;color:var(--accent-strong);font-weight:800;">章节标题</h2>
    </div>
  </div>
  <div class="wx-section-body">
    <p>正文段落（不超过80字）</p>
    <ul>
      <li><strong>关键词</strong> — 解释说明</li>
    </ul>
  </div>
</div>
```

#### 指标网格模板

```html
<div class="wx-metric-grid" style="grid-template-columns: 1fr 1fr;">
  <div class="wx-metric-card">
    <strong>数字</strong>
    <span>说明文字</span>
  </div>
</div>
```

#### 对比网格模板

```html
<div class="wx-compare-grid" style="grid-template-columns: 1fr 1fr;">
  <div class="wx-compare-card">
    <h3>方案名</h3>
    <p>描述</p>
  </div>
</div>
```

#### 引言模板

```html
<blockquote class="wx-quote-card">
  "引言内容"
  <small>—— 来源</small>
</blockquote>
```

#### 时间线模板

```html
<div class="wx-timeline-card">
  <div class="wx-timeline-item">
    <div class="wx-timeline-dot"></div>
    <div>
      <h3>时间点</h3>
      <p>事件描述</p>
    </div>
  </div>
</div>
```

#### 分隔线模板（章节之间使用）

```html
<div class="wx-divider-ornament">
  <svg viewBox="0 0 220 28" fill="none" aria-hidden="true">
    <path d="M4 14h70M146 14h70" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="110" cy="14" r="10" stroke="currentColor" stroke-width="2.5"/>
    <circle cx="110" cy="14" r="3.5" fill="currentColor"/>
  </svg>
</div>
```

#### 总结卡片模板

```html
<div class="wx-section-card">
  <span class="wx-card-caption">总结</span>
  <div class="wx-summary-card">
    <p>总结文字</p>
  </div>
</div>
```

---

**生成前必须完成的检查清单：**

- [ ] 只生成 `<article>` 内的 HTML，不包含 `<!DOCTYPE>`、`<html>`、`<head>`、`<body>`
- [ ] 所有 class 名都在上方白名单中
- [ ] 有且仅有一个 `wx-hero-card`，且包含 `wx-hero-mesh` SVG 背景
- [ ] 每个 `wx-section-card` 都有 `wx-section-top` > `wx-section-icon`（含 SVG）+ `wx-section-heading`
- [ ] 每个 `wx-section-card` 的正文都包裹在 `wx-section-body` 中
- [ ] 没有任何 Emoji 字符
- [ ] 大章节之间有 `wx-divider-ornament` 分隔线
- [ ] h1 有 inline style 指定 `font-size`（至少 28px）和 `color`
- [ ] h2 有 inline style 指定 `font-size`（至少 20px）和 `color`
- [ ] 单个 section-card 内容不超过 300 字（长内容拆分为多个 card）
- [ ] `wx-metric-card` 的 `<strong>` 放数字/关键词，`<span>` 放说明
- [ ] `wx-compare-card` 用 `<h3>` + `<p>`，不是自创的 `wx-compare-col`/`wx-compare-head`
- [ ] `wx-quote-card` 是 `<blockquote>` 标签，不是 `<div>`

**排版要点：**
- 正文字号 17px，已为手机优化
- 每段 3-4 行，避免文字墙
- 列表优于长段落
- 适度留白
- 一个 section-card 只讲一个主题/概念，不要把多个章节内容塞进同一个 card

**绝对禁止 Emoji（最高优先级规则）：**

> **在生成的 HTML 中，任何位置都不允许出现 Emoji 字符。** 这包括但不限于：
> - 标题前后的 Emoji 装饰（如 ✨🚀💡📊🎯❤️ 等）
> - 列表项前的 Emoji 图标
> - 卡片标题中的 Emoji
> - `wx-card-caption` 中的 Emoji
> - `wx-eyebrow` 中的 Emoji
> - 正文中作为装饰使用的 Emoji
>
> **所有图标、装饰必须使用 SVG 绘制。** 参考 `references/html-components.md` 中的内置 SVG 库，或根据内容主题自行设计 SVG。
>
> 错误示例：`<h2>🚀 产品亮点</h2>` `<li>✅ 支持多端</li>` `<span class="wx-card-caption">📌 核心要点</span>`
>
> 正确示例：`<h2>产品亮点</h2>`（配合 `wx-section-icon` 中的 SVG 图标）

**审美设计规范（确保高品质输出）：**

以下规范旨在确保即使模型能力较低，也能生成审美高级的 HTML 页面：

1. **配色纪律** — 严格使用预设 CSS 变量（`--accent`, `--accent-strong`, `--accent-soft`, `--text-main`, `--text-muted` 等），不要自行发明颜色值。预设变量经过专业设计师调色，保证色彩和谐。唯一的例外是在 `<style>` 块中使用 `var()` 引用这些变量做渐变/阴影。

2. **标题排版** — h1 必须有视觉冲击力，建议：
   - font-size 至少 28px，推荐 32-42px
   - 使用 `color: var(--accent-strong)` 或 `-webkit-background-clip: text` 渐变
   - 可搭配 `text-shadow` 增加层次感
   - h2 章节标题 20-26px，`color: var(--accent-strong)`，`font-weight: 800`

3. **SVG 装饰是视觉灵魂** — 每篇文章至少包含：
   - 1 个 `wx-hero-mesh` SVG 背景（渐变 + 几何图形，不少于 3 个图形元素）
   - 每个 `wx-section-card` 必须有 `wx-section-icon`（从内置 SVG 库中选择，或自行设计）
   - 1-2 个 `wx-divider-ornament` 分隔线装饰（用内置分隔线 SVG）
   - 适当使用 `wx-inline-graphic` 或 `wx-badge-art` 增加视觉丰富度

4. **留白与节奏** — 组件之间通过 `wx-article-shell` 的 `gap: 22px` 自然留白。不要给组件加额外的 `margin-top`/`margin-bottom` 来"撑开"空间，也不要用空的 `<div>` 占位。

5. **卡片层次** — 利用 CSS 已定义的 `border-radius`、`border`、`box-shadow` 创造自然的卡片层次感。不要在 inline style 中覆盖这些属性，除非有明确的设计意图。

6. **Hero 区域** — 是整篇文章的视觉核心：
   - 必须有 `wx-hero-mesh` SVG 背景（覆盖 hero 上方 160px 区域）
   - SVG 中至少包含：一个线性渐变矩形 + 2-3 个径向渐变圆形（使用 `--hero-grad-a`, `--hero-grad-b`, `--hero-fade`）
   - 标题要大、要有存在感
   - `wx-eyebrow` 标签简短有力（2-4 个中文字或英文短词）

7. **文字密度** — 移动端阅读的关键是"扫读"：
   - 段落不超过 80 字（约 3-4 行）
   - 要点用 `<ul>` 列表，每个 `<li>` 中用 `<strong>` 加粗关键词
   - 长内容分拆为多个 `wx-section-card`
   - 数字用 `wx-metric-grid` 展示，不要写在段落里

8. **字体使用** — 只使用预设的 `var(--heading-font)` 和 `var(--body-font)`，不要引入外部字体或手动指定 `font-family`（除非是 `system-ui` 作为 fallback）。

9. **内容结构化** — 将原始文章内容重新组织为结构化卡片：
   - 每个大章节（如"一、xxx"）应拆分为独立的 `wx-section-card`
   - 如果一个章节内有多个子主题，每个子主题也应该是独立的 card
   - 定义/概念用 `wx-quote-card` 突出
   - 对比关系用 `wx-compare-grid`
   - 数据/指标用 `wx-metric-grid`
   - 流程/步骤用 `wx-timeline-card`
   - 不要把所有内容堆在一两个巨型 card 里

**创意自由度（鼓励发挥，但在规范框架内）：**

- **标题**：CSS 只设了 font-family 和 line-height，**h1/h2 的 font-size、颜色、装饰效果完全自由**。鼓励使用 inline style 或 `<style>` 块设计大号标题、渐变色文字、文字阴影等
- **SVG**：鼓励**根据内容主题自行设计 SVG 图形**——几何图案、抽象装饰、图标插画等。不要只用内置 SVG，发挥创造力。自行设计的 SVG 应使用 `currentColor` 或 CSS 变量，确保与主题配色一致
- **`<style>` 块**：可以在 `<article>` 开头加 `<style>` 块设置该文章独有的样式（动画、渐变、伪元素装饰等）
- **Hero 创意**：不限于"眉标+标题+描述"模板。可以做全幅渐变、大字排版、SVG 背景、几何构图、任何创意布局。但必须保留 `wx-hero-card` 外层 class 和 `wx-hero-mesh` SVG 背景
- **整体风格**：每篇文章都应该有独特的视觉个性，展现设计品味
- **注意**：hero 背景装饰（`.wx-hero-mesh`）会自动设为 `z-index:0`，内容文字会在其上方，不会被遮挡。但自定义的 SVG 背景装饰也要注意 z-index 和 pointer-events

**CSS 兼容性要求（导出安全）：**
- **禁止使用 `color-mix()`**——html2canvas 不支持，会导致导出失败
- 使用 `rgba()` 代替透明度混合
- 使用 `var(--accent-soft)` 等预设变量代替手动混色
- `backdrop-filter` 在导出时可能不生效，确保有 `background` 兜底
- `-webkit-background-clip: text` 渐变文字在导出时会自动降级为纯色（`--accent-strong`），视觉效果略有差异但确保可读
- SVG 中的 `var()` 引用会在导出时自动解析为计算值，可以放心使用

### Step 4: 检查 Logo

检查 `~/.claude/skills/tianphoto/logos/` 目录下是否有 `brand-logo.*` 文件。
- 有文件 → 传 `--logo` 参数
- 没有文件 → 不传

### Step 5: 渲染输出

将 HTML 保存为临时文件，然后执行：

```bash
# 生成可编辑网页（默认行为）
node ~/.claude/skills/tianphoto/scripts/render-image.js /tmp/article.html \
  --output ~/Desktop \
  --preset {preset-id}

# 如果有 logo
node ~/.claude/skills/tianphoto/scripts/render-image.js /tmp/article.html \
  --output ~/Desktop \
  --preset {preset-id} \
  --logo ~/.claude/skills/tianphoto/logos/brand-logo.png
```

### Step 6: 交付

告诉用户：
1. HTML 网页文件路径 — 在浏览器中打开即可查看和编辑
2. 提供修改建议（换预设、调排版、加图片等）

生成的 HTML 网页文件**内置编辑器**：
- 直接在浏览器中点击文字即可编辑
- 支持拖拽/粘贴/选择图片插入
- 底部工具栏：撤销/重做、加粗/斜体、列表/引用、插入图片
- **保存**：点击"保存"按钮或 Cmd+S 下载编辑后的网页文件
- **导出**：点击"导出"按钮生成 PNG 切片（按卡片/段落智能切分，所见即所得，适合公众号上传）
- **封面图**：导出时自动生成公众号头条封面图排在切片最前：
  - **2.35:1 头条封面**（公众号头条封面）— 含 hero 背景、Logo 和文章标题

## 渲染命令参数

```
node render-image.js <html-file> [--output dir] [--preset id] [--logo path] [--png]
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `<html-file>` | HTML 文件（必需） | — |
| `--output` | 输出目录 | ~/Desktop |
| `--preset` | 预设 ID | HTML 中的 data-preset |
| `--logo` | Logo 图片路径 | — |
| `--png` | 额外导出 PNG | 不导出 |

## 输出文件

- `{name}-page.html` — 自包含可编辑网页（始终生成）
- `{name}.png` 或 `{name}_01.png` ... — PNG 图片（仅 --png 时）

## 32 套预设速查

| ID | 名称 | 皮肤 | 适用 |
|----|------|------|------|
| dawn-journal | 曦白札记 | editorial | 知识、观点 |
| slate-column | 石板专栏 | editorial | 深度分析 |
| mono-ledger | 黑白账簿 | mono | 产品 spec |
| paper-museum | 纸面展签 | magazine | 人物故事 |
| aurora-glass | 极光玻片 | glass | 科技灵感 |
| nebula-frost | 星云雾面 | glass | AI 产品 |
| comet-neon | 彗星霓光 | neon | 发布（暗色） |
| lunar-grid | 月面矩阵 | tech | 分析策略 |
| cobalt-ops | 钴蓝指挥台 | tech | 企业汇报 |
| pearl-board | 珍珠简报 | luxe | 品牌商业 |
| saffron-brief | 琥珀快报 | soft | 干货运营 |
| metro-metrics | 都市指标 | tech | 数据分析 |
| forest-atlas | 林地图志 | editorial | 知识文艺 |
| ocean-brief | 海面快讯 | soft | 教程方法 |
| sunset-deck | 落日信息卡 | soft | 提案观点 |
| rose-memo | 玫瑰备忘录 | soft | 品牌故事 |
| velvet-luxe | 天鹅绒陈列 | luxe | 精品品牌 |
| ruby-salon | 绯红沙龙 | luxe | 品牌表达 |
| noir-gallery | 黑曜画廊 | luxe-dark | 人物（暗色） |
| porcelain-muse | 瓷白灵感板 | luxe | 审美灵感 |
| graphite-brutal | 石墨粗边 | brutal | 观点拆解 |
| mint-deck | 薄荷板块 | brutal | 教程清单 |
| playful-blocks | 跳色拼板 | brutal | 社媒年轻 |
| retro-signal | 复古信号 | brutal | 复古海报 |
| jade-zen | 青玉留白 | editorial | 禅意阅读 |
| ivory-docs | 象牙文档 | mono | 文档转图文 |
| meadow-report | 草地报告 | soft | 教育科普 |
| skyline-air | 天际轻刊 | glass | 新闻增长 |
| sand-archive | 沙色档案 | magazine | 案例复盘 |
| lilac-comet | 流星紫幕 | neon | AI 创意（暗色） |
| cyan-data | 青空数据板 | tech | 数据运营 |
| amber-market | 琥珀市场刊 | magazine | 商业消费 |
| cherry-press | 樱桃社论 | brutal | 态度社论 |
| obsidian-notes | 曜石手记 | mono-dark | 夜读（暗色） |
| peach-bloom | 桃雾晨刊 | glass | 生活品牌 |
| ink-editorial | 墨色社刊 | magazine | 纪实报道 |
