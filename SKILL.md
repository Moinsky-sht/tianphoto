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

## 指令处理逻辑

当用户输入 `/tp` 指令时，按以下规则处理：

1. **`/tp logo on`** → 检查 `~/.claude/skills/tianphoto/logos/` 目录下是否有 `brand-logo.*` 文件（支持 png/jpg/svg）。有则确认已启用；没有则提示用户放置文件到该目录，文件名固定为 `brand-logo`
2. **`/tp logo off`** → 告诉用户后续生成将不包含品牌横幅
3. **`/tp style auto`** → 确认已切换为自动匹配模式
4. **`/tp style <id>`** → 验证 id 是否在 presets.json 中存在。存在则确认；不存在则给出最接近的建议
5. **`/tp style list`** → 输出预设速查表
6. **`/tp help`** → 输出指令帮助

## 生成工作流

### Step 1: 获取内容

- **纯文本**：直接使用
- **URL**：`node ~/.claude/skills/tianphoto/scripts/fetch-content.js <url>`

### Step 2: 识别内容主题 → 选预设

参考 `references/content-types.md`，分析内容类型。如果用户用 `/tp style` 指定了预设则直接使用，否则自动匹配。

告诉用户选了什么预设及理由。

### Step 3: 生成 HTML

**结构规范：**

```html
<article class="article-theme style-skin-{skin}" data-preset="{preset-id}">
  <div class="wx-article-shell">
    <!-- 内容组件 -->
  </div>
</article>
```

**可用组件**（详见 `references/html-components.md`）：
- `wx-hero-card` — 头图区域（必须有）
- `wx-intro-card` — 导读
- `wx-section-card` — 章节卡片
- `wx-metric-grid` — 数据指标
- `wx-compare-grid` — 对比
- `wx-timeline-card` — 时间线
- `wx-quote-card` — 引言
- `wx-summary-card` — 总结
- `wx-divider-ornament` — 分隔线装饰
- `wx-inline-graphic` / `wx-badge-art` — 图形装饰
- `wx-image-drop-zone` — 图片占位
- `table` — 表格
- `phone-brand-banner` — 品牌横幅（有 logo 时）

**排版要点：**
- 正文字号 17px，已为手机优化
- 每段 3-4 行，避免文字墙
- 列表优于长段落
- 适度留白

**创意自由度（鼓励发挥）：**

- **标题**：CSS 只设了 font-family 和 line-height，**h1/h2 的 font-size、颜色、装饰效果完全自由**。鼓励使用 inline style 或 `<style>` 块设计大号标题、渐变色文字、文字阴影等
- **SVG**：鼓励**根据内容主题自行设计 SVG 图形**——几何图案、抽象装饰、图标插画等。不要只用内置 SVG，发挥创造力
- **`<style>` 块**：可以在 `<article>` 开头加 `<style>` 块设置该文章独有的样式（动画、渐变、伪元素装饰等）
- **Hero 创意**：不限于"眉标+标题+描述"模板。可以做全幅渐变、大字排版、SVG 背景、几何构图、任何创意布局
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
- **封面图**：导出时自动生成两张封面图排在切片最前：
  - **2.35:1 头条封面**（公众号头条封面）— 含 hero 背景和文章标题
  - **1:1 小图封面**（多图文封面）— 含 SVG 装饰图标和标题

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
