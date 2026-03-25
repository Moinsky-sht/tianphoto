# Tianphoto

> ✨ 把文章、公告、周报、品牌内容和知识稿，直接变成一份可编辑、可导出的移动端 HTML 页面。它不只适用于 Claude Code、Codex、Trae 等 AI IDE / agent 环境，也尤其适配装了飞书官方 `feishu-openclaw-plugin` 的 OpenClaw。

**当前版本：`v2.4.0`**

Tianphoto 的核心不是“先做图”，而是先生成一份真正能工作的手机页面：

- 📄 默认产出 **自包含 HTML**
- ✍️ 在浏览器里继续改字、换图、调对齐
- 🖼️ 需要时再导出 PNG
- 👀 以网页预览优先、所见即所得优先

在宿主适配层面，Tianphoto 是一套明显偏向 OpenClaw 工作流的 skill：在 Claude Code、Codex、Trae 等环境里它一样能工作，但在 OpenClaw，尤其是已经安装飞书官方 `feishu-openclaw-plugin` 之后，它可以更自然地读取飞书在线文档等内容，也更适合一句话直接生成长图 HTML 并回传到当前会话。

---

## ✨ 为什么是 Tianphoto

很多“文章转长图”工具最后给你的只是一个难以继续修改的成品图。

Tianphoto 走的是另一条路：

- **HTML-first**
  先生成稳定、漂亮、可继续编辑的移动端页面。
- **WYSIWYG-first**
  尽量保证浏览器里看到的样子，就是后续导出的样子。
- **Design-system-first**
  不是简单换一组颜色，而是用完整的版式系统做差异化表达。

它尤其适合：

- 📱 公众号图文 / 手机长图
- 🧾 飞书周报、复盘、通知、汇报材料
- 🚀 发布说明、版本公告、案例页
- 🧠 知识文章、教程、评论、深度分析
- 🏷️ 品牌内容、策展型页面、轻量专题页

## 🦞 为什么它特别适配 OpenClaw

Tianphoto 不是“只能在 OpenClaw 里用”，但它确实是**特别适合 OpenClaw** 的。

- **多宿主可用**
  在 Claude Code、Codex、Trae 等 AI IDE / agent 环境里都可以正常生成 HTML 页面。
- **装上 `feishu-openclaw-plugin` 后能力更强**
  在 OpenClaw 里接上飞书官方插件后，Tianphoto 可以更顺滑地承接飞书在线文档、通知、周报等内容源。
- **一句话就能出长图 HTML**
  不必先手动倒内容，再拼页面；很多飞书场景可以直接用一句自然语言指令生成可编辑的长图 HTML。
- **飞书场景优势更明显**
  周报、通知、活动招募、复盘、汇报、社区传播内容，本来就更适合先生成 HTML 再继续改，而不是一上来只产一张死图。
- **更像真实协作工具**
  在 OpenClaw 尤其是飞书里，Tianphoto 不是单次出图器，而更像一个能持续产出、回传、复用页面的图文工作台。

---

## 🆕 2.4.0 有什么变化

### SVG 正式进入“语义语法层”

- 新增 `data-svg-grammar`、`data-hero-scene`、`data-mark-kind` 三层稳定元数据。
- `wx-hero-mesh` 不再默认回到“渐变矩形 + 两三个圆”的通用 mesh，而是命中受控 hero scene。
- `wx-section-mark` 不再只是通用小图标，而是根据章节语义映射到明确的 `mark-kind`。
- 生成链改成 `content-template -> svg-grammar -> hero-scene -> mark-kind`，默认不再鼓励模型自由手写大段抽象 SVG。

### 15 个家族的 SVG 差异真正拉开

- 阅读优先家族走编辑式、细线、低密度图形。
- 产品家族走 signal / panel / node / grid。
- 表达型家族走 ribbon / frame / block / orbit。
- 差异不再只靠颜色，而是同时拉开线条粗细、转角语言、填充策略、构图密度和几何倾向。
- 现在即使把颜色拿掉，hero scene 和章节徽记也更容易看出是不同系统。

### inline infographic 也被收进了受控体系

- `wx-inline-graphic` 不再鼓励自由插抽象装饰。
- 只允许受控的信息图类型，例如流程、节点网络、对比、路径、证据栈和结构拆解。
- `event-notice` 默认禁用 `wx-badge-art`。
- `event-notice / weekly-report / release-brief / knowledge-article / case-recap` 默认最多只保留 1 个真正有职责的 `wx-inline-graphic`。

### `/tp doctor` 现在会审 SVG 语义

- 现在除了环境和结构，还会检查：
  - `mark-kind` 是否和章节语义冲突
  - hero scene 是否还停留在通用 mesh
  - 是否重复使用同一个空洞图形只换颜色
  - inline infographic 是否缺少受控 kind
  - section mark / infographic 是否复杂度过高
  - scene / infographic 是否真的来自注册表，而不是临时拼出来的自由 SVG

---

## 🚀 快速开始

### 1. 安装

把仓库放到你的 skills 目录即可。常见安装方式：

```bash
git clone git@github.com:Moinsky-sht/tianphoto.git ~/.claude/skills/tianphoto
```

如果你的宿主读取的是别的 skills 目录，就安装到对应目录，或创建软链接。

### 2. 最快的使用方式

直接给一段正文，或一个公开 URL，然后说：

```text
把这篇文章做成手机长图
```

或者：

```text
/tp style dawn-journal
/tp select full
```

### 3. 查看结果

生成完成后，默认会把 HTML 放到：

```text
~/Desktop/tianphoto-iterations/
```

直接打开对应的 `*-page.html` 即可继续编辑。

---

## 🧭 工作流

### 1. 输入内容

支持：

- 纯文本
- 公开 URL
- 飞书内容粘贴
- 已有 HTML 片段

### 2. 选择内容模式

- `auto`
  自动判断该保留全文还是压缩重点
- `full`
  尽量完整保留内容
- `compact`
  更适合摘要化、海报化表达

### 3. 选择 UI 策略

- `rule`
  稳定、强结构、适合正式交付
- `free`
  更自由的手机端构图

### 4. 生成 HTML

默认主产物是 HTML，而不是 PNG。

### 5. 在浏览器内继续编辑

当前工具栏聚焦高频操作：

- 左对齐 / 居中 / 右对齐
- 插入图片
- 插入章节 / 引语 / 指标 / 对比 / 时间线
- 保存
- 导出

### 6. 需要时再导出 PNG

PNG 是补充出口，不是唯一成品。

---

## 🛠 常用指令

- `/tp style list`
  查看全部 `37` 套 preset。
- `/tp style auto`
  自动匹配风格。
- `/tp style <preset-id>`
  手动指定 preset，例如 `aurora-glass`、`cobalt-ops`、`opal-ribbon`。
- `/tp select auto`
  自动判断详略。
- `/tp select full`
  完整保留内容。
- `/tp select compact`
  紧凑压缩。
- `/tp ui rule`
  使用稳定组件化结构。
- `/tp ui free`
  切到自由构图模式。
- `/tp ui free <count>`
  自由模式一次生成多版，最多 `5` 版。
- `/tp doctor`
  检查环境、版本、模式、logo、OpenClaw 能力和页面结构。
- `/tp version`
  查看本地版本，并检查远程是否有新版本。
- `/tp update`
  从 GitHub 拉取最新版本。

---

## 🎨 风格系统

Tianphoto 现在是一套两层风格系统：

- **Preset**
  具体成品风格，共 `37` 套。
- **Family**
  更深层的版式与视觉人格，共 `15` 个家族。

### 15 个风格家族

- `swiss-journal`
  社论、专栏、知识稿，强调理性秩序和标题留白。
- `field-atlas`
  田野、自然、研究感，图标更像导览标记。
- `ledger-spec`
  文档、参数、说明书，偏 ledger / sheet 语法。
- `archive-paper`
  档案、展签、纸本陈列感。
- `aurora-drift`
  玻璃、轻科技、柔光氛围。
- `skyline-pane`
  空气感、玻璃 pane、轻商务页面。
- `ops-console`
  控制台、dashboard、产品发布 panel。
- `brief-bulletin`
  简报、通知、资讯卡片。
- `deck-story`
  proposal / brief / story deck。
- `salon-luxe`
  沙龙、品牌、陈列式内容。
- `night-gallery`
  暗色展陈、夜间画廊、艺术发布。
- `neon-signal`
  霓光、signal、未来感发布。
- `poster-brutal`
  强块面、强对比、偏海报化。
- `play-lab`
  俏皮、实验、拼贴和卡通式节奏。
- `studio-ribbon`
  品牌案例、丝带式 plaque、轻发布页。

### Heading System

2.0 之后，章节头的原则很简单：

> 标题文字必须始终是第一主角。

当前统一使用四类 heading system：

- `icon-led`
  图标主导，适合 atlas / glass / playful。
- `index-led`
  编号主导，但编号会退到标题上方或变成轻标签。
- `dual`
  图标与编号同时保留，但编号会退成 signal chip / panel badge。
- `plaque`
  更像展签、铭牌、栏题，强调 caption + h2 的牌匾感。

---

## 📁 输出与迭代

默认输出目录：

```text
~/Desktop/tianphoto-iterations
```

这个目录的设计目的很明确：

- 🕒 每次生成都带时间戳
- 🧪 不轻易覆盖旧版本
- 🔍 方便横向比较每一轮页面
- 🧾 更适合真实迭代，而不是一次性出图

---

## 🧱 项目结构

```text
tianphoto/
├── CHANGELOG.md
├── SKILL.md
├── README.md
├── version.json
├── src/
│   ├── design-system/
│   │   └── css/
│   └── editor/
├── assets/
│   ├── article-theme.css
│   ├── free-base.css
│   ├── editor-stable.js
│   ├── editor.js
│   ├── html2canvas.min.js
│   └── presets.json
├── scripts/
│   ├── build-assets.js
│   ├── lib/
│   ├── render-image.js
│   ├── push-to-session.js
│   ├── fetch-content.js
│   ├── tp-config.js
│   └── tp-doctor.js
├── references/
│   ├── html-components.md
│   ├── style-families.md
│   ├── free-mode.md
│   └── content-types.md
├── logos/
└── releases/
    ├── v1.8.0.md
    ├── v1.9.5.md
    ├── v1.9.6.md
    └── v2.0.0.md
```

---

## 📦 依赖

- Node.js
- Chrome 或 Chromium
- 如需命令行 PNG 导出：`puppeteer-core`

安装可选依赖：

```bash
npm install -g puppeteer-core
```

说明：

- `2.2.0` 的源码模块化和构建层只依赖本地 Node
- 不需要额外安装 webpack、vite、rollup 这类前端打包工具

---

## ✅ 使用建议

- **最推荐的成品永远是 HTML**
- PNG 更适合作为发布补充，而不是唯一源文件
- 飞书、公告、周报、知识稿都更适合先生成 HTML 再微调
- 品牌页或复杂内容，优先在 `rule` 模式下拿到稳定底稿，再考虑 `free`

---

## 🔄 更新

```bash
/tp update
```

或：

```bash
git -C ~/.claude/skills/tianphoto pull
```

更新后可以直接查看：

- [CHANGELOG.md](CHANGELOG.md)
- [releases](releases)

---

## 📚 更新记录

README 首页只保留当前最新版提示，历史更新统一放到这些文件里：

- 最新版本说明：[v2.2.0](releases/v2.2.0.md)
- 完整版本历史：[CHANGELOG.md](CHANGELOG.md)
- 全部发布说明：[releases](releases)

---

## 📜 License

MIT
