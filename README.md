# Tianphoto

> ✨ 把文章、公告、周报、品牌内容和知识稿，直接变成一份可编辑、可导出的移动端 HTML 页面。它不只适用于 Claude Code、Codex、Trae 等 AI IDE / agent 环境，也尤其适配装了飞书官方 `feishu-openclaw-plugin` 的 OpenClaw。

**当前版本：`v2.1.1`**

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

## 🆕 2.1.1 有什么变化

### 章节头回到“元信息一行，主标题一行”

- 阅读型页面现在默认收成两层：
  - 上层：`序号 / 小标题 / 语义徽记`
  - 下层：`h2` 主标题
- 大标题左右不再挂内容，不再被编号、caption 或图形挤压。
- `wx-section-mark` 退成更轻的语义辅助，而不是按钮感的白底徽记。

### 并列模块默认更稳

- `wx-metric-card`、`wx-compare-card`、时间线和摘要卡的小标题继续降了一档字号。
- 两列卡片不再默认沿用 section 级标题气势，移动端扫读会更自然。

### 编辑器终于有正常的撤销/重做

- 新插入的结构组件现在可以稳定撤销、重做。
- 组件入口也整理成了分类面板：
  - `章节结构`
  - `强调表达`
  - `信息模块`

### `/tp doctor` 会拦这类审美退化

- 现在会额外提示：
  - 章节元信息是否跑到 `h2` 后面
  - 并列卡片标题是否过长
  - metric 标题是否不适合小卡片

---

## 🆕 2.1.0 有什么变化

### 内容模板层上线

- 页面现在不只落到 `preset + family`，还会自动识别成：
  - `event-notice`
  - `weekly-report`
  - `release-brief`
  - `knowledge-article`
  - `case-recap`
- 这层模板会继续约束页面结构、组件节奏和编辑建议，不再只是“选个皮肤”。

### `/tp doctor` 升级成设计审校器

- 除了环境和版本，它现在还会检查：
  - OpenClaw CLI 是否存在
  - `feishu-openclaw-plugin` 相关能力是否可见
  - 页面属于什么内容模板
  - 章节图形是不是超量
  - 阅读型页面是否误用了拖拽占位或过重装饰
  - metric card 是否写得太长，不适合手机扫描

### 编辑器更像页面搭建器

- 底部编辑栏新增 5 个高频组件入口：
  - `章节`
  - `引语`
  - `指标`
  - `对比`
  - `时间线`
- 适合在浏览器里直接把一篇材料继续搭成完整页面，而不是只做文字微调。

### 回传状态更清晰

- 生成后会明确区分：
  - 已回传到当前会话
  - 只保存在本地
- 更适合 OpenClaw / 飞书这类需要把 HTML 继续发回去的工作流。

---

## 🆕 2.0.0 有什么变化

### 标题系统重做

- 章节标题重新拿回主要宽度。
- 图标与编号退为强调件，而不是去横向挤压标题正文。
- `index-led`、`dual`、`icon-led`、`plaque` 四套 heading system 的职责更清晰。

### 风格系统升级

- `37` 套 preset、`15` 个风格家族真正拉开。
- 差异不再只靠配色，而是进入：
  - 标题框架
  - 卡片秩序
  - caption 语法
  - SVG 笔触
  - 页面节奏

### 结构校验更严

- 会拦截无语义 `+` 占位 SVG。
- 会检查章节编号是否连续。
- 不再把 summary / quote 这类信息卡误判成必须带章节头。

### HTML 迭代流固定

- 默认继续输出到桌面的 `tianphoto-iterations`
- 每次带时间戳
- 更适合连续回看每一轮页面迭代

---

## 📚 更新记录

更新记录这次重新整理过了：

- 完整版本历史在 [CHANGELOG.md](CHANGELOG.md)
- 详细发布说明统一放到 [releases](releases)

目前已整理好的详细版本说明：

- [v2.1.1](releases/v2.1.1.md)
- [v2.1.0](releases/v2.1.0.md)
- [v2.0.0](releases/v2.0.0.md)
- [v1.9.6](releases/v1.9.6.md)
- [v1.9.5](releases/v1.9.5.md)
- [v1.8.0](releases/v1.8.0.md)

以后根目录只保留当前项目入口文件，历史发布说明都收进 `releases/`。

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
├── assets/
│   ├── article-theme.css
│   ├── free-base.css
│   ├── editor-stable.js
│   ├── html2canvas.min.js
│   └── presets.json
├── scripts/
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

## 📜 License

MIT
