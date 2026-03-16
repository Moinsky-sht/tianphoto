# Tianphoto

把文章、公告、周报、品牌内容和知识稿，直接变成一份可编辑、可导出的移动端 HTML 页面。

当前版本：**v2.0.0**

## 它是什么

Tianphoto 的核心不是“先做图”，而是先做一份真正能工作的手机页面：

- 默认输出 **自包含 HTML**
- 在浏览器里直接改字、换图、调对齐
- 再按需要导出 PNG
- 所见即所得优先，网页预览优先

它适合这些场景：

- 公众号图文
- 手机长图 / 信息长页
- 飞书周报、复盘、通知可视化
- 发布说明、案例页、品牌内容页
- 知识类文章、评论、教程、报告的移动端排版

## 2.0.0 重点

- **章节标题系统重做**：标题重新拿回主要宽度，图标与编号退为强调件，不再出现“图标和标题各占一半”的拥挤布局。
- **风格系统升级**：`37` 套 preset、`15` 个家族不再只是换色，标题框架、卡片秩序、SVG 笔触、caption 语法和页面节奏都被重新拉开。
- **结构校验变严**：会拦截无语义 `+` 占位图标、章节编号断档，以及把 summary / quote 误判成章节头的情况。
- **HTML 迭代流固定**：默认继续把每次结果输出到桌面的 `tianphoto-iterations`，方便连续回看每一轮页面。
- **文档重写**：README、Skill、组件说明和发布说明都换成了 2.0 口径。

## 快速开始

### 安装

把仓库放到你的技能目录即可。常见路径：

```bash
git clone git@github.com:Moinsky-sht/tianphoto.git ~/.claude/skills/tianphoto
```

如果你的宿主实际读取的是别的 skills 目录，就把仓库放到那个目录，或创建软链接。

### 最快的使用方式

1. 给 Tianphoto 一段正文，或一个公开可访问的 URL。
2. 直接说：

```text
把这篇文章做成手机长图
```

或者：

```text
/tp style dawn-journal
/tp select full
```

3. 生成完成后，打开桌面目录里的 HTML：

```text
~/Desktop/tianphoto-iterations/
```

4. 在浏览器里继续编辑，再决定是否导出 PNG。

## 工作流

### 1. 内容输入

支持：

- 纯文本
- 公开 URL
- 飞书内容粘贴
- 已有 HTML 片段

### 2. 选择模式

- `auto`：自动判断该保留全文还是压缩重点
- `full`：尽量完整保留内容
- `compact`：更适合海报化、摘要化表达

### 3. 选择 UI 策略

- `rule`：稳定、强结构、适合正式交付
- `free`：允许更自由的手机端构图

### 4. 生成 HTML

默认产物是桌面迭代目录中的 `*-page.html`。

### 5. 浏览器内编辑

当前工具栏聚焦高频动作：

- 左对齐 / 居中 / 右对齐
- 插入图片
- 保存
- 导出

### 6. 导出 PNG

HTML 永远是主产物。PNG 只是补充出口。

## 常用指令

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
  检查环境、版本、模式、logo 和页面结构。
- `/tp version`
  查看本地版本，并检查远程是否有新版本。
- `/tp update`
  从 GitHub 拉取最新版本。

## 风格系统

Tianphoto 现在是一个两层风格系统：

- **Preset**：具体成品风格，共 `37` 套。
- **Family**：更深层的版式和视觉人格，共 `15` 个家族。

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
  deck / proposal / warm brief。
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

### 标题系统

2.0 之后，章节头不再允许“为了摆图标而牺牲标题宽度”。当前统一使用四类 heading system：

- `icon-led`
  图标主导，适合 atlas / glass / playful。
- `index-led`
  编号主导，但编号会放到标题上方或作为轻标签，不再横向挤压正文。
- `dual`
  图标和编号都保留，但编号会退成 panel signal / chip，而不是再吃掉一整列宽度。
- `plaque`
  更像展签、铭牌、栏题，强调 caption + h2 的牌匾感。

## 生成结果放哪

默认输出目录：

```text
~/Desktop/tianphoto-iterations
```

特点：

- 每次生成都带时间戳
- 默认不覆盖旧版本
- 方便连续比对迭代

## 目录结构

```text
tianphoto/
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
└── release-v2.0.0.md
```

## 依赖

- Node.js
- Chrome 或 Chromium
- 如需命令行 PNG 导出：`puppeteer-core`

安装可选依赖：

```bash
npm install -g puppeteer-core
```

## 更新

```bash
/tp update
```

或：

```bash
git -C ~/.claude/skills/tianphoto pull
```

## 兼容与建议

- **最推荐的产物永远是 HTML**
- PNG 导出更适合作为发布补充
- 飞书、公告、周报、知识文都更适合先生成 HTML 再微调
- 如果你在做品牌页或复杂内容，优先在 `rule` 模式下拿到稳定底稿，再考虑 `free`

## License

MIT
