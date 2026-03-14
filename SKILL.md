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

## 30 秒快速开始

约定：下文中的 `$SKILL_DIR` 表示**当前正在使用的 `tianphoto` 技能根目录**。不要把路径硬编码成 `~/.claude` 或其他固定目录，始终以当前加载的 skill 目录为准。

1. 用户直接给文章文字或 URL 时，先判断内容模式，再判断 UI 模式，再选预设，最后生成 `<article>` 片段。
2. 把片段保存为临时 HTML 后，调用 `node $SKILL_DIR/scripts/render-image.js ...` 输出桌面网页。
3. 如果用户要品牌横幅，把 logo 放到 `$SKILL_DIR/logos/brand-logo.png`，再用 `/tp logo title 名字` 和 `/tp logo subtitle 副标题` 写入本地配置。
4. 如果用户输入 `/tp ui rule`、`/tp ui free 2` 或 `/tp doctor`，优先处理这些快速指令，不要开始生成。
5. 如果用户只是输入 `/tp style list` 或 `/tp help`，直接返回纯文本速查表，不要开始生成。

## /tp 指令系统

用户可以用以下指令来配置 Tianphoto 的行为：

### 高优先级快速指令

这些指令一旦出现，就应当**优先处理并立即返回结果**，不要继续进入内容分析和页面生成：

### `/tp ui rule`
切换到**规则模式**。后续生成继续使用当前这套强结构、强组件、强校验的稳定排版流程。

### `/tp ui free`
切换到**自由模式**。后续生成默认一次输出 2 个不同方向的抽卡版本。

### `/tp ui free <count>`
切换到自由模式，并设置一次生成的抽卡版本数。默认 `2`，最大 `5`。例如：
- `/tp ui free 2`
- `/tp ui free 4`

### `/tp doctor`
快速检查当前 skill 状态：版本、UI 模式、logo 配置、Chrome 可用性、预设数量等。
如果附带本地 HTML 文件路径，还会检查：
- 是否用了 `tp-free-*` helper
- 是否存在明显的硬编码主题色
- 是否有危险的 3 列以上网格

### `/tp logo on`
启用 Logo 功能。提示用户将 Logo 图片放到以下位置：
```
$SKILL_DIR/logos/brand-logo.png
```
文件必须命名为 `brand-logo.png`（或 `.svg` / `.jpg`）。放好后再次运行即可自动嵌入品牌横幅。

### `/tp logo off`
关闭 Logo 功能，生成的页面不显示品牌横幅。

### `/tp logo title <text>`
设置品牌横幅主标题，并持久化到 `$SKILL_DIR/local-settings.json`。

### `/tp logo subtitle <text>`
设置品牌横幅副标题，并持久化到 `$SKILL_DIR/local-settings.json`。

### `/tp style auto`
自动模式（默认）。根据文章内容主题自动匹配最佳预设风格。

### `/tp style <preset-id>`
手动指定预设风格，例如：
- `/tp style nebula-frost` — 星云雾面（科技/AI）
- `/tp style dawn-journal` — 曦白札记（知识/观点）
- `/tp style comet-neon` — 彗星霓光（暗色发布）
- `/tp style jade-zen` — 青玉留白（禅意阅读）

完整的 36 套预设见下方速查表。

### `/tp style list`
列出所有可用预设，附带预览说明。直接返回纯文本速查表，不要开始生成。

### `/tp help`
显示所有可用指令说明。直接返回简短帮助，不要开始生成。

### `/tp version`
显示当前安装的 Tianphoto 版本号，并检查 GitHub 是否有新版本可用。

### `/tp update`
从 GitHub 拉取最新版本，自动升级本地 skill 文件。

### `/tp select auto`
自动内容模式（默认）。AI 根据文章类型自动判断：适合浓缩的内容会精炼提取，适合完整展示的内容会保留全文。

### `/tp select full`
完整保留模式。保留原文所有内容，不做任何删减。适合学术论文、教程手册、完整报告等需要保持内容完整性的文章。输出会较长，像一篇正式排版的完整文章。

### `/tp select compact`
紧凑压缩模式。最大程度精炼内容，提取核心要点。适合做海报预览、快速总结、社交媒体分享卡片。

## 指令处理逻辑

当用户输入 `/tp` 指令时，按以下规则处理：

1. **先看是不是高优先级快速指令**。如果用户消息以 `/tp ui` 或 `/tp doctor` 开头，优先执行，不要继续做内容分析。
2. **`/tp ui rule`** → 执行 `node $SKILL_DIR/scripts/tp-config.js ui rule`，确认后续生成将回到稳定组件化模式
3. **`/tp ui free`** → 执行 `node $SKILL_DIR/scripts/tp-config.js ui free`，确认后续默认一次生成 2 个自由抽卡版本
4. **`/tp ui free <count>`** → 执行 `node $SKILL_DIR/scripts/tp-config.js ui free <count>`，其中 `<count>` 超过 5 时按 5 处理；确认当前自由模式抽卡数
5. **`/tp doctor`** → 执行 `node $SKILL_DIR/scripts/tp-doctor.js`，直接返回诊断结果；如果用户同时给了本地 HTML 文件路径，可以执行 `node $SKILL_DIR/scripts/tp-doctor.js <path>`
6. **`/tp logo on`** → 执行 `node $SKILL_DIR/scripts/tp-config.js logo on`，然后检查 `$SKILL_DIR/logos/` 目录下是否有 `brand-logo.*` 文件（支持 png/jpg/svg）。有则确认已启用；没有则提示用户放置文件到该目录，文件名固定为 `brand-logo`
7. **`/tp logo off`** → 执行 `node $SKILL_DIR/scripts/tp-config.js logo off`，告诉用户后续生成将不包含品牌横幅
8. **`/tp logo title <text>`** → 执行 `node $SKILL_DIR/scripts/tp-config.js logo title "<text>"`，确认新的品牌标题已保存
9. **`/tp logo subtitle <text>`** → 执行 `node $SKILL_DIR/scripts/tp-config.js logo subtitle "<text>"`，确认新的品牌副标题已保存
10. **`/tp style auto`** → 确认已切换为自动匹配模式
11. **`/tp style <id>`** → 验证 id 是否在 presets.json 中存在。存在则确认；不存在则给出最接近的建议
12. **`/tp style list`** → 直接输出预设速查表，不要生成页面
13. **`/tp help`** → 直接输出指令帮助，不要生成页面
14. **`/tp version`** → 读取 `$SKILL_DIR/version.json` 中的 `version` 字段，显示当前版本。然后用以下命令检查远程最新版本：
   ```bash
   curl -s https://raw.githubusercontent.com/Moinsky-sht/tianphoto/main/version.json
   ```
   对比版本号，告诉用户是否需要更新。如果 curl 失败（网络问题），提示用户可以手动访问 GitHub 检查。
15. **`/tp update`** → 执行以下命令升级：
   ```bash
   cd $SKILL_DIR && git pull origin main
   ```
   如果本地有未提交的修改，先提示用户，不要覆盖本地改动。更新完成后读取新的 version.json 确认版本号。
16. **`/tp select auto`** → 确认已切换为自动判断模式（默认）
17. **`/tp select full`** → 确认已切换为完整保留模式
18. **`/tp select compact`** → 确认已切换为紧凑压缩模式

## 生成工作流

### Step 0: 静默检查更新

每次生成前，先在后台检查是否有新版本可用：

```bash
curl -s --connect-timeout 3 https://raw.githubusercontent.com/Moinsky-sht/tianphoto/main/version.json
```

读取本地 `$SKILL_DIR/version.json` 的 `version` 字段，与远程返回的 `version` 对比：
- **版本相同或 curl 失败** → 不提示任何内容，静默继续
- **远程版本更新** → 在回复开头简短提醒一句：「Tianphoto 有新版本 vX.X.X 可用，运行 `/tp update` 升级」，然后继续正常生成

注意：这个检查不应该阻塞生成流程。如果网络慢或失败，直接跳过。

### Step 1: 获取内容

- **纯文本**：直接使用
- **URL**：`node $SKILL_DIR/scripts/fetch-content.js <url>`

### Step 1.5: 确定内容模式（auto / full / compact）

如果用户通过 `/tp select` 指定了模式则直接使用。否则默认 `auto`，按以下规则自动判断：

**auto 模式判断逻辑：**

分析原文内容类型，选择最合适的处理方式：

| 内容特征 | 自动选择 | 理由 |
|----------|----------|------|
| 学术论文、教材内容、理论手册 | → `full` | 知识体系需要完整呈现，删减会破坏逻辑链 |
| 教程指南、操作手册、技术文档 | → `full` | 步骤不能跳过，内容完整性是价值核心 |
| 完整报告、调研分析、白皮书 | → `full` | 数据和论证需要完整展示 |
| 新闻稿、营销文案、产品介绍 | → `compact` | 核心卖点突出即可，适合快速传播 |
| 公告通知、活动预告 | → `compact` | 信息简洁，重点明确 |
| 观点文章、评论、深度分析 | → `auto`（适当精简） | 保留核心论点，精简冗余论述 |
| 人物故事、品牌叙事 | → `auto`（适当精简） | 保留故事主线，精简过渡段落 |

告诉用户当前使用的内容模式及理由。

**三种模式的具体行为：**

#### `full` — 完整保留模式

- **不删减任何实质内容**，原文的每个观点、论据、数据、引用都必须保留
- 可以做的：改写句式使其更适合移动端阅读、拆分长段落、用列表替代冗长叙述、添加结构化标题
- 不可以做的：省略段落、合并不同观点、用"等"替代具体列举、跳过案例/引用
- **长文章就应该长** — 不要害怕生成很长的 HTML，一篇 5000 字的学术文章就应该输出 5000 字的排版页面
- 结构策略：按原文章节逻辑拆分为多个 `wx-section-card`，每个 card 聚焦一个子主题
- 只有在两个主段落之间确实需要“换气”时才使用 `wx-divider-ornament`，整篇控制在 0-2 个
- 对早报、资讯汇总、新闻简报、复试信息流页面，默认不要用装饰分割线，优先靠留白、标题层级和 section 节奏分层
- 适当将定义/关键概念提取为 `wx-quote-card` 突出显示
- 将数据/对比关系转化为 `wx-metric-grid` / `wx-compare-grid`（但文字说明仍然保留）

#### `compact` — 紧凑压缩模式

- 最大程度精炼，只保留**核心要点**
- 一篇 3000 字的文章压缩到 500-800 字
- 策略：提取每个章节的一句话核心观点 → 要点列表化 → 数据指标化
- 删除所有过渡段落、重复论述、详细案例
- 倾向使用：`wx-metric-grid`（数据）、简短的 `wx-section-card`（3-5 行）、`wx-quote-card`（金句）
- 适合：公众号推文预览、社交媒体分享卡、海报信息图

#### `auto` — 自动模式（默认）

- AI 根据上方判断表自动选择 `full` 或 `compact`
- 对于中间地带的内容（观点文章、故事等），做适当精简：
  - 保留所有核心论点和关键论据
  - 精简过渡段落和重复表述
  - 将冗长解释转为精炼列表
  - 典型压缩比：原文的 60%-80%

### Step 1.75: 确定 UI 模式（rule / free）

读取 `$SKILL_DIR/local-settings.json` 中的 `ui` 配置：
- `ui.mode = "rule"` → 走**规则模式**
- `ui.mode = "free"` → 走**自由模式**
- `ui.free_variants` → 自由模式的一次输出版本数，默认 `2`，最大 `5`

如果用户本轮消息里明确提到了 `/tp ui rule` 或 `/tp ui free 2`，以当前消息为准；否则沿用本地已保存的 UI 模式。

告诉用户当前使用的 UI 模式及理由。

#### `rule` — 规则模式

- 使用固定组件体系、class 白名单和结构校验
- 输出稳定、规整、适合成绩单、复试资料、汇报页、知识长图
- 优先追求交付稳定性，而不是版式冒险

#### `free` — 自由模式

- **只保留手机端底层约束，不强制使用 `wx-*` 组件体系**
- 允许 AI 自定义 class、自写 `<style>`、自建版式节奏和视觉语言
- 默认一次生成 `2` 个不同方向的页面；如果用户指定 `/tp ui free 4`，则生成 `4` 个版本；最大 `5`
- 仍然必须符合手机视觉、可编辑、可导出、可阅读
- 这不是“乱做”，而是“底盘固定、设计自由”
- **默认采用 helpers-first 起手**：优先使用 `tp-free-*` 基础组件搭骨架，再用自定义 class 做增强
- **默认采用 variables-first 配色**：优先使用 preset CSS 变量，不要大量硬编码主题色

### Step 2: 识别内容主题 → 选预设

参考 `references/content-types.md`，分析内容类型。如果用户用 `/tp style` 指定了预设则直接使用，否则自动匹配。

- 在 `rule` 模式下，preset 代表**版式系统 + 色彩气质 + 组件习惯**
- 在 `free` 模式下，preset 代表**色盘 + 气质锚点 + 视觉语气**，不是硬模板

告诉用户选了什么预设及理由。
并且在开始生成前，必须再为这篇内容补一句**明确的视觉方向描述**，例如：
- “走杂志社论感，重点做大标题、留白和纸面纹理”
- “走科技发布感，重点做冷色渐变、发光边缘和数据面板”
- “走文艺档案感，重点做细分隔线、印章感和低饱和纸色”

这句视觉方向不是可有可无的解释，而是后续排版的执行准绳。即使同一个 preset，也要根据文章内容给出不同的视觉落点，避免只换颜色不换气质。

### Step 3: 生成 HTML

**⚠️ 关键：你只需要生成 `<article>` 标签内的 HTML 片段，不要生成 `<!DOCTYPE>`、`<html>`、`<head>`、`<body>` 等外层标签。render-image.js 会自动包裹这些外层结构。**

`render-image.js` 现在会在渲染前自动做两层保护：
- 如果输入的是完整 HTML 页面，会先抽取其中的 `<article>` 片段再继续
- 如果抽取后仍然存在 `<html>` / `<head>` / `<body>`，或者 `<article>` 根节点不是唯一一个，就直接报错并停止输出
- 如果是 `free` 模式但完全没有使用 `tp-free-*` 基础件，或大面积硬编码主题色，也会直接报错并要求重做

所以当结构校验失败时，不要硬着头皮继续渲染，应该回到这一步重新生成正确片段。

#### 如果当前是 `free` 模式

使用**自由模式根结构**，不要硬套 `wx-*` 白名单组件：

```html
<article data-ui-mode="free" data-preset="{preset-id}">
  <style>
    /* 当前页面自己的视觉系统 */
  </style>
  <!-- 自由组织的手机端内容 -->
</article>
```

自由模式下：
- 不强制使用 `article-theme`、`style-skin-*`、`wx-section-card` 这套结构
- 可以自由命名 class，也可以完全自己写 `<style>`
- 可以选用 `assets/free-base.css` 已提供的轻 helper class，但**第一版默认应当先站在这些 helper 上**
- 先阅读 `references/free-mode.md`，再开始自由排版
- 建议优先使用这些 helper：
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
- 第一版自由模式至少应使用 `tp-free-shell` 加任意 2 个以上 `tp-free-*` 组件；自定义 class 用来增强，而不是完全绕开 helper
- 颜色优先使用 `var(--accent)`、`var(--accent-strong)`、`var(--accent-soft)`、`var(--text-main)`、`var(--text-muted)`、`var(--hero-grad-a)`、`var(--hero-grad-b)`、`var(--hero-fade)`
- 允许使用 `rgba(255,255,255,...)` 和 `rgba(0,0,0,...)` 做覆盖层，但不要大面积硬编码品牌色十六进制
- 若当前自由模式抽卡数大于 `1`，则需要生成多个完整版本，视觉方向必须明显不同；输出文件名应使用 `-v1`、`-v2`、`-v3` 这样的后缀

自由模式必须遵守的底线：
- 只生成一个 `<article>` 根节点，不包含文档级标签
- 手机端不能横向滚动
- 正文最小字号不低于 `15px`
- 手机端默认单列，短内容区域最多 2 列
- 图片、SVG、表格都必须自适应宽度
- 内容必须可读、可编辑、可导出，不能退化成纯海报
- 禁止 Emoji
- `free` 模式的丑陋高发原因通常有三种：完全绕开 helper、乱用硬编码颜色、只有装饰没有层次。生成时要主动规避

#### 如果当前是 `rule` 模式

使用下方固定组件体系和白名单。

**规则模式结构规范：**

你生成的 HTML 必须严格遵循以下结构：

```html
<article class="article-theme style-skin-{skin}" data-preset="{preset-id}">
  <div class="wx-article-shell">
    <!-- 所有内容组件依次排列在这里 -->
  </div>
</article>
```

**严格 class 名白名单 — 仅适用于 `rule` 模式。只允许使用以下 class 名，不要发明不存在的 class：**

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
| `wx-divider-ornament` | 分隔线装饰（可选） | ✓ |
| `wx-inline-graphic` | 内联图形容器 | ✓ |
| `wx-badge-art` | 印章/徽标容器 | ✓ |
| `wx-image-drop-zone` | 图片拖放占位 | ✓ |
| `wx-media-frame` | 图片 figure 容器 | ✓ |

**不存在以下 class（常见错误，绝对不要使用）：**
`wx-hero-eyebrow`、`wx-hero-title`、`wx-hero-lead`、`wx-hero-meta`、`wx-compare-col`、`wx-compare-head`、`wx-metric-item`、`wx-metric-num`、`wx-metric-label`、`wx-summary-label`、`wx-timeline-title`、`wx-timeline-content`、`wx-card-title`、`wx-card-body`

---

**必须遵循的组件模板（仅适用于 `rule` 模式；逐字复制结构，只替换文字内容）：**

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
<div class="wx-divider-ornament" data-divider-variant="editorial-notch">
  <svg viewBox="0 0 220 20" fill="none" aria-hidden="true">
    <path d="M18 10h78M124 10h78" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".26"/>
    <path d="M110 5.5 114.5 10 110 14.5 105.5 10Z" fill="currentColor" opacity=".5"/>
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

**生成前必须完成的检查清单（`rule` 模式）：**

- [ ] 只生成 `<article>` 内的 HTML，不包含 `<!DOCTYPE>`、`<html>`、`<head>`、`<body>`
- [ ] 所有 class 名都在上方白名单中
- [ ] 有且仅有一个 `wx-hero-card`，且包含 `wx-hero-mesh` SVG 背景
- [ ] 每个 `wx-section-card` 都有 `wx-section-top` > `wx-section-icon`（含 SVG）+ `wx-section-heading`
- [ ] 每个 `wx-section-card` 的正文都包裹在 `wx-section-body` 中
- [ ] 没有任何 Emoji 字符
- [ ] 如使用 `wx-divider-ornament`，整篇最多 1-2 个，且必须与主题匹配；早报/资讯/新闻类页面默认应为 0 个
- [ ] h1 有 inline style 指定 `font-size`（至少 28px）和 `color`
- [ ] h2 有 inline style 指定 `font-size`（至少 20px）和 `color`
- [ ] 单个 section-card 内容不超过 300 字（长内容拆分为多个 card）
- [ ] `wx-metric-grid` / `wx-compare-grid` 在手机端最多 2 列，不允许 3 列或 4 列
- [ ] `wx-metric-card` 的 `<strong>` 放数字/关键词，`<span>` 放说明
- [ ] `wx-compare-card` 用 `<h3>` + `<p>`，不是自创的 `wx-compare-col`/`wx-compare-head`
- [ ] `wx-quote-card` 是 `<blockquote>` 标签，不是 `<div>`
- [ ] 没有把 `aurora-glass`、`Skill Demo`、`preset-id`、"我可以继续" 这类内部元信息写进用户可见正文
- [ ] `wx-inline-graphic` / `wx-badge-art` 不是“空白占位块”，而是有清晰可见的视觉内容

**生成前必须完成的检查清单（`free` 模式）：**

- [ ] 只生成 `<article>` 内的 HTML，不包含 `<!DOCTYPE>`、`<html>`、`<head>`、`<body>`
- [ ] 根节点带有 `data-ui-mode="free"`
- [ ] 页面在 390-430px 宽度下可读，不出现横向滚动
- [ ] 正文字号不低于 `15px`
- [ ] 默认单列，短内容区域最多 2 列
- [ ] 图片、SVG、表格都不会溢出容器
- [ ] 没有 Emoji
- [ ] 页面不是纯海报，仍然具备明确的信息层级和可编辑正文
- [ ] 如果一次生成多个版本，各版本的视觉方向必须明显不同，而不是只换配色

**排版要点：**
- 正文字号 17px，已为手机优化
- 每段 3-4 行，避免文字墙
- 列表优于长段落
- 适度留白
- 一个 section-card 只讲一个主题/概念，不要把多个章节内容塞进同一个 card
- 对比卡片默认 1 列；只有内容非常短时才使用 2 列
- 指标卡片默认 2 列；不要在手机端排 4 列小方格

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

- `rule` 模式：下方涉及 `wx-*` 组件、hero mesh、section icon 的要求按字面执行
- `free` 模式：下方规范主要作为审美原则；凡是涉及固定组件名的条目，都可以用你自定义的等价结构实现

1. **配色纪律** — 严格使用预设 CSS 变量（`--accent`, `--accent-strong`, `--accent-soft`, `--text-main`, `--text-muted` 等），不要自行发明颜色值。预设变量经过专业设计师调色，保证色彩和谐。唯一的例外是在 `<style>` 块中使用 `var()` 引用这些变量做渐变/阴影。

2. **标题排版** — h1 必须有视觉冲击力，建议：
   - font-size 至少 28px，推荐 32-42px
   - 使用 `color: var(--accent-strong)` 或 `-webkit-background-clip: text` 渐变
   - 可搭配 `text-shadow` 增加层次感
   - h2 章节标题 20-26px，`color: var(--accent-strong)`，`font-weight: 800`

3. **SVG 装饰是视觉灵魂** — 每篇文章至少包含：
   - 1 个 `wx-hero-mesh` SVG 背景（渐变 + 几何图形，不少于 3 个图形元素）
   - 每个 `wx-section-card` 必须有 `wx-section-icon`（从内置 SVG 库中选择，或自行设计）
   - 如确实需要章节转场，可使用 0-2 个 `wx-divider-ornament`，并按主题选择 `editorial-notch` / `soft-stars` / `chevron-band` / `fold-divider`
   - 适当使用 `wx-inline-graphic` 或 `wx-badge-art` 增加视觉丰富度

   **重要补充**：
   - `wx-inline-graphic` / `wx-badge-art` 是可选项，不是必须项
   - `wx-divider-ornament` 也是可选项，不是“每个大章节都要贴一个”
   - 对早报、资讯简报、新闻汇总、理论梳理这类信息密集页面，默认不放分割线；章节切换靠卡片留白和标题变化完成
   - 如果做不出有辨识度、可见度足够的 SVG，宁可不用，也不要生成一个像空白玻璃板的“假装饰”
   - 禁止反复使用通用的“横线 + 圆环”分隔线；克制型页面优先 `editorial-notch` 或直接省略，科技风优先 `chevron-band`，厚重风格可用 `fold-divider`
   - 在亮色主题中，禁止使用纯白或近白的低对比 SVG 作为唯一视觉内容
   - 优先使用 `currentColor`、`var(--accent-strong)`、`var(--accent)`、`var(--text-main)` 等可见颜色

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

10. **风格必须可辨认** — 输出不应只是“统一模板 + 换主题色”。每次生成都要先决定一个足够鲜明的视觉人格，并让它贯穿标题、边框、卡片密度、SVG 语言和节奏编排。

11. **预设差异要落到版式** — 不同预设之间至少应在以下 3 项里有明显变化：
   - Hero 构图方式（居中、偏置、海报式、刊物式）
   - 标题气质（端正、锋利、华丽、理性、轻盈）
   - 卡片组织（整齐栅格、错落穿插、重标题轻正文、重数据轻段落）
   - 装饰系统（印章、线框、网格、雾面、霓虹、纸感、档案标签）
   - 空间节奏（疏朗、密集、强对比、连续流动）

12. **避免模板同质化** — 默认不要总是固定成“hero + intro + 若干同尺寸 section-card + 总结”这一种套路。允许根据内容采用：
   - hero 后直接接 `wx-metric-grid`
   - hero 后先用 `wx-quote-card` 定调
   - 中段穿插 `wx-inline-graphic` 或 `wx-badge-art`
   - 用 `wx-compare-grid` 取代部分纯文本 section
   - 让重点章节做更强的视觉强调，其余章节保持克制

13. **不要暴露内部制作痕迹** — 输出给用户看的页面必须像正式成品，而不是 AI 工作台的中间稿：
   - 不要写 `Skill Demo`、`aurora-glass`、`preset-id`、`README 已经明确` 这种内部语汇
   - 不要出现“这次执行”“我可以继续”“如果你愿意我还能”这类助手口吻
   - eyebrow、标签、指标、总结都应该是面向读者的成品化语言

14. **标题必须有性格** — h1 不仅要大，还要体现预设性格：
   - editorial / magazine：更像刊物封面，克制但高级
   - tech / glass：更像产品发布页，强调层次、光感、面板感
   - brutal：更像态度海报，强调边框、对撞和块面
   - luxe：更像品牌视觉稿，强调留白、精致和装饰感
   - neon / mono-dark：更像夜间封面，强调光晕、反差和轮廓

15. **产品型 / 工具型内容要“展示结果”** — 如果文章本身在介绍一个产品、技能或方法，不要只解释它能做什么，还要至少做出一个“结果证明区”：
   - 工作流图
   - 输出前后对比
   - 使用场景面板
   - 功能模块矩阵
   - 典型交付物示意

**创意自由度（鼓励发挥，但在规范框架内）：**

- **标题**：CSS 只设了 font-family 和 line-height，**h1/h2 的 font-size、颜色、装饰效果完全自由**。鼓励使用 inline style 或 `<style>` 块设计大号标题、渐变色文字、文字阴影等
- **SVG**：鼓励**根据内容主题自行设计 SVG 图形**——几何图案、抽象装饰、图标插画等。不要只用内置 SVG，发挥创造力。自行设计的 SVG 应使用 `currentColor` 或 CSS 变量，确保与主题配色一致
- **`<style>` 块**：可以在 `<article>` 开头加 `<style>` 块设置该文章独有的样式（动画、渐变、伪元素装饰等）
- **Hero 创意**：不限于"眉标+标题+描述"模板。可以做全幅渐变、大字排版、SVG 背景、几何构图、任何创意布局；`rule` 模式保留 `wx-hero-card` / `wx-hero-mesh`，`free` 模式则可以完全自定义 hero 结构
- **整体风格**：每篇文章都应该有独特的视觉个性，展现设计品味
- **注意**：`rule` 模式的 hero 背景装饰（`.wx-hero-mesh`）会自动设为 `z-index:0`，内容文字会在其上方；`free` 模式的自定义背景装饰也要注意 z-index 和 pointer-events

**CSS 兼容性要求（导出安全）：**
- **禁止使用 `color-mix()`**——html2canvas 不支持，会导致导出失败
- 使用 `rgba()` 代替透明度混合
- 使用 `var(--accent-soft)` 等预设变量代替手动混色
- `backdrop-filter` 在导出时可能不生效，确保有 `background` 兜底
- `-webkit-background-clip: text` 渐变文字在导出时会自动降级为纯色（`--accent-strong`），视觉效果略有差异但确保可读
- SVG 中的 `var()` 引用会在导出时自动解析为计算值，可以放心使用

### Step 4: 检查 Logo

检查 `$SKILL_DIR/logos/` 目录下是否有 `brand-logo.*` 文件，必要时读取 `$SKILL_DIR/local-settings.json`。
- `logo.enabled = false` → 即使目录里有 logo 文件，也不要显示品牌横幅
- `logo.enabled = true` 且存在 logo 文件 → 会自动使用 `brand-logo.*`，并带上已保存的 title / subtitle
- 没有 logo 文件 → 不显示品牌横幅

如果用户刚设置过 `/tp logo title` 或 `/tp logo subtitle`，用 `node $SKILL_DIR/scripts/tp-config.js show` 确认一下当前配置。

### Step 5: 渲染输出

将 HTML 保存为临时文件，然后执行：

```bash
# 生成可编辑网页（默认行为）
node $SKILL_DIR/scripts/render-image.js /tmp/article.html \
  --output ~/Desktop \
  --preset {preset-id}

# 如果要临时覆盖 logo 文案
node $SKILL_DIR/scripts/render-image.js /tmp/article.html \
  --output ~/Desktop \
  --preset {preset-id} \
  --logo-title "品牌名" \
  --logo-subtitle "副标题"
```

如果当前是 `free` 模式且抽卡数大于 `1`，则需要为每个版本分别保存临时文件并渲染，例如：

```bash
node $SKILL_DIR/scripts/render-image.js /tmp/article-v1.html --output ~/Desktop --preset {preset-id}
node $SKILL_DIR/scripts/render-image.js /tmp/article-v2.html --output ~/Desktop --preset {preset-id}
```

### Step 6: 交付

告诉用户：
1. HTML 网页文件路径 — 在浏览器中打开即可查看和编辑
2. 如果是 `free` 模式多版本输出，要清楚标注每个版本的视觉方向差异
3. 提供修改建议（换预设、调排版、加图片等）

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
node render-image.js <html-file> [--output dir] [--preset id] [--logo path] [--logo-title text] [--logo-subtitle text] [--logo-enabled bool] [--png]
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `<html-file>` | HTML 文件（必需） | — |
| `--output` | 输出目录 | ~/Desktop |
| `--preset` | 预设 ID | HTML 中的 data-preset |
| `--logo` | Logo 图片路径 | — |
| `--logo-title` | 临时覆盖横幅主标题 | `local-settings.json` 中的 title |
| `--logo-subtitle` | 临时覆盖横幅副标题 | `local-settings.json` 中的 subtitle |
| `--logo-enabled` | 临时强制开/关横幅 | `local-settings.json` 中的 enabled |
| `--png` | 额外导出 PNG | 不导出 |

## 输出文件

- `{name}-page.html` — 自包含可编辑网页（始终生成）
- `{name}.png` 或 `{name}_01.png` ... — PNG 图片（仅 --png 时）

## 36 套预设速查

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
