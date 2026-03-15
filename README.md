# Tianphoto — 智能图文生成工作室

将文章内容转化为**精美的、可编辑的自包含 HTML 网页**，可直接在浏览器中阅读、编辑文字、插入图片，一键导出 PNG 切片（适合公众号上传）。

当前版本：**v1.8.3**

## 30 秒快速开始

1. 把仓库克隆到你的 skills 目录。
2. 如果你在 **Claude Code / Codex** 使用，通常安装到 `~/.claude/skills/` 或宿主实际读取的 skills 目录即可。
3. 如果你在 **OpenClaw** 使用，把仓库放到 OpenClaw 实际扫描的 skills 目录；如果它复用 `~/.claude/skills/`，可直接共用这份安装，否则给对应目录做一份拷贝或软链接。
4. 给 Tianphoto 一段文章文字、一个公开 URL，或直接粘贴飞书文档里的正文。
5. 如需品牌横幅，把 logo 放到 `logos/brand-logo.png`。
6. 如需固定品牌文案，运行：

```bash
node scripts/tp-config.js logo title "品牌名"
node scripts/tp-config.js logo subtitle "副标题"
```

7. 生成后直接打开桌面上的 `*-page.html`，可继续编辑或导出 PNG。
8. 如果你想切换 UI 策略：

```bash
node scripts/tp-config.js ui rule
node scripts/tp-config.js ui free 2
node scripts/tp-doctor.js
```

### OpenClaw 用法

在 OpenClaw 中可直接用自然语言或 `/tp` 指令触发，例如：

- `把这篇文章做成手机长图`
- `生成公众号图文，风格用 dawn-journal`
- `/tp style list`
- `/tp logo title 品牌名`

只要 OpenClaw 能读到这个 skill 目录，使用方式和 Claude Code / Codex 基本一致。

### 飞书支持

Tianphoto 支持飞书内容场景，尤其适合：

- 把飞书文档内容整理成手机长图
- 把飞书周报、通知、复盘做成适合移动端阅读的网页或切片
- 给飞书文档、飞书群消息、飞书汇报材料配图

说明：

- **公开可访问的链接** 可以直接尝试 URL
- **需要登录态或权限的飞书文档**，更稳妥的方式是直接复制正文粘贴给 Tianphoto
- 目前是**支持飞书内容输入与飞书使用场景**，不是直接调用飞书 API 自动发布

## 安装

```bash
# 克隆到 Claude Code skills 目录
git clone https://github.com/Moinsky-sht/tianphoto.git ~/.claude/skills/tianphoto
```

> 如果已有该目录，先备份或删除：`rm -rf ~/.claude/skills/tianphoto`

如果你的宿主读取的不是 `~/.claude/skills/`，请安装到对应目录，或创建软链接。例如：

```bash
ln -s ~/.claude/skills/tianphoto ~/.codex/skills/tianphoto
```

某些宿主也可能读取 `~/.trae/skills/` 等路径，原则上都以“宿主真实扫描的 skills 目录”为准。

## 使用

在 Claude Code 中输入以下指令即可触发：

- `/tp` — 启动 Tianphoto
- `/tp style list` — 查看 36 套预设风格（现归入 14 个风格家族）
- `/tp style <preset-id>` — 指定风格（如 `aurora-glass`）
- `/tp select auto` — 自动判断内容详略（默认）
- `/tp select full` — 完整保留原文内容
- `/tp select compact` — 紧凑压缩模式
- `/tp ui rule` — 强结构、强组件、稳定交付
- `/tp ui free` — 自由抽卡模式，默认输出 2 个方向
- `/tp ui free <count>` — 自由抽卡模式，最多 5 个版本
- `/tp doctor` — 检查当前版本、UI 模式、logo、Chrome、preset/family 数与基础环境
- `/tp logo on` — 启用品牌 Logo
- `/tp logo title <text>` — 设置品牌横幅标题
- `/tp logo subtitle <text>` — 设置品牌横幅副标题
- `/tp version` — 检查版本和更新
- `/tp update` — 升级到最新版本
- `/tp help` — 查看帮助

或者直接用自然语言：

- "把这篇文章做成手机长图"
- "生成公众号图文"
- "做一张手机海报"

## 功能

- **网页优先，图片可选** — 生成自包含可编辑 HTML 网页
- **固定宽度 375px** — 移动端标准宽度，导出与预览一致（所见即所得）
- **内置编辑器** — 在浏览器中直接编辑文字、拖拽插入图片，支持 6 种字体切换
- **一键导出** — 按卡片智能切片导出 PNG（所见即所得）
- **自动封面** — 导出时自动生成公众号 2.35:1 头条封面图
- **自动推送** — 生成后自动推送到当前会话（支持飞书/Discord/Slack）
- **36 套预设** — 覆盖科技、商业、文艺、暗色等多种风格
- **14 个风格家族** — preset 不再只是换色，而是先确定 family，再落到具体 archetype 和 preset
- **智能内容模式** — auto/full/compact 三档，自动识别文章类型适配详略
- **双 UI 模式** — `rule` 走稳定组件化，`free` 走手机端自由构建
- **自由模式有底盘** — `free` 默认优先使用 `tp-free-*` 轻组件，再让 AI 自定义增强
- **自由抽卡** — `free` 模式默认一次出 2 版，可提高到 5 版
- **Logo 支持** — 在 `logos/` 目录放入 `brand-logo.png` 即可启用品牌横幅
- **结构校验** — 自动清洗误传的完整 HTML 页面，避免重复包裹导致坏结构
- **本地配置** — logo 标题、副标题、开关写入本地配置，重复使用更稳定
- **Doctor 自检** — 一条命令查看当前版本、模式、logo、Chrome、预设数、family 数和页面诊断
- **飞书友好** — 适合把飞书文档、周报、通知、复盘转成手机端更好读的网页或长图
- **发布说明生成器** — 升级后自动生成美观的图文发布说明（`tianphoto-release-notes`）

## 预设风格速查

| ID | 名称 | 适用 |
|----|------|------|
| aurora-glass | 极光玻片 | 科技灵感 |
| nebula-frost | 星云雾面 | AI 产品 |
| comet-neon | 彗星霓光 | 发布（暗色） |
| dawn-journal | 曦白札记 | 知识、观点 |
| jade-zen | 青玉留白 | 禅意阅读 |
| pearl-board | 珍珠简报 | 品牌商业 |
| ... | 共 36 套 | `/tp style list` 查看全部 |

## 目录结构

```
tianphoto/
├── SKILL.md                # Skill 定义（Claude Code 入口）
├── README.md               # 本文件
├── version.json            # 版本信息
├── local-settings.json     # 本地配置（自动生成）
├── release-v1.8.0.md       # 版本发布说明
├── assets/
│   ├── article-theme.css   # 文章主题样式
│   ├── free-base.css       # 自由模式轻底盘
│   ├── editor-stable.js    # 稳定版编辑器 v2.0
│   ├── html2canvas.min.js  # 渲染依赖
│   └── presets.json        # 36 套预设配置
├── scripts/
│   ├── render-image.js     # 渲染脚本
│   ├── push-to-session.js  # 自动推送脚本
│   ├── fetch-content.js    # URL 内容抓取
│   ├── settings.js         # 本地配置读写
│   ├── tp-config.js        # Logo / UI 模式设置
│   └── tp-doctor.js        # 环境和页面诊断
├── references/
│   ├── html-components.md  # HTML 组件文档
│   ├── free-mode.md        # free 模式建议
│   ├── style-families.md   # 风格家族指南
│   └── content-types.md    # 内容类型参考
└── logos/
    └── brand-logo.png      # 品牌 Logo（可选）
```

## 依赖

- Node.js（随 Claude Code 环境自带）
- **PNG 导出（可选）**：`npm install -g puppeteer-core`（仅 4MB，使用系统 Chrome，无需下载浏览器）
- **Chrome 浏览器**（macOS）：`brew install --cask google-chrome`
- **Chrome 浏览器**（macOS 轻量版）：`brew install --cask chromium`

默认的 HTML 网页 + 浏览器内导出无需任何额外依赖。

## 更新

```bash
# 方式 1：使用内置指令
/tp update

# 方式 2：手动更新
cd ~/.claude/skills/tianphoto && git pull
```

如果你做过本地定制，更新前建议先看一下：

```bash
git status --short
```

## 更新日志

### v1.8.3

- **紧急修复**: 恢复 v1.7.0 的 viewport 设置，修复 v1.8.x 系列的视觉品质问题
- **删除强制样式**: 移除破坏原有设计的 `!important` 覆盖规则
- **功能保留**: 自定义字体、可选分辨率、WebChat下载等功能仍然可用

### v1.8.2

- **新增可选择的导出分辨率**：支持 `--scale 2x|3x|1080` 参数，默认 2x (750px)
  - `2x` = 750px (标准高清，文件小，加载快)
  - `3x` = 1125px (超高清，适合精细展示)
  - `1080` = 1080px (兼容旧版本，公众号封面标准尺寸)
- **新增编辑器自定义字体功能**：字体选择器新增"📝 自定义字体..."选项，支持输入任意 CSS 字体名称
- **新增 WebChat 渠道支持**：在 OpenClaw Web UI 中使用时会生成带下载按钮的页面
- **修复代码问题**：删除 render-image.js 中的重复代码块
- **优化默认设置**：默认导出 2x 分辨率，平衡画质和文件大小

### v1.8.1

- **新增自动推送功能**：生成 HTML 后自动推送到当前会话（支持飞书/Discord/Slack）
- **新增发布说明生成器**：`tianphoto-release-notes` skill，升级后自动生成图文发布说明
- **固定宽度 375px**：移动端标准宽度，导出与预览完全一致（所见即所得）
- **新增字体编辑功能**：编辑器支持 6 种字体选择（系统默认、优雅宋体、现代黑体、手写风格、商务正式、科技感）
- **稳定版编辑器 v2.0**：重写 `editor-stable.js`，更稳定的初始化逻辑
- **优化调用能力**：改进 skill description 和触发关键词，提升识别准确率
- **增强导出质量**：统一视口宽度，2.88x 缩放达到 1080px 高清输出
- **改进 README**：补充安装依赖说明和自动推送文档

### v1.7.0

- 把 36 套 preset 升级成“14 个风格家族 + 36 个 archetype”的体系，不再只是换色
- 新增 `references/style-families.md`，先按 family 选版式人格，再落到具体 preset
- `render-image.js` 会在渲染前自动补齐 `data-style-family` 与 `data-style-archetype`，并按 family 调整 divider 策略
- 大幅增强 `article-theme.css` 和 `free-base.css` 的 family 覆盖层，让 `rule` / `free` 都有更清晰的版式人格
- `/tp doctor` 现在会显示 family / archetype 数量，并在诊断 `*-page.html` 时只分析真正的 `<article>`

### v1.6.1

- 继续强化 `free` 模式：默认采用 helpers-first 与 variables-first 策略，先使用 `tp-free-*` 轻组件再做自定义增强
- 新增 `references/free-mode.md`，补上 free 模式的正确起手方式、变量使用规则与示例骨架
- 提升 `free-base.css` 的前端能力，强化 `tp-free-hero`、`tp-free-panel`、`tp-free-stat` 等组件的默认视觉层次
- 增强 `/tp doctor` 页面诊断：可识别 free helper 使用情况、危险网格与硬编码颜色
- UI 配置新增 `updated_at` 记录，方便追踪当前模式切换时间

### v1.6.0

- 新增 `/tp ui rule` 与 `/tp ui free [count]`，把内容模式和 UI 模式彻底拆开
- 新增自由模式轻底盘 `free-base.css`，让 AI 可以在手机视觉约束内更自由地组织前端页面
- 新增 `/tp doctor` 诊断命令，可查看当前版本、UI 模式、logo、Chrome、预设数与可选页面诊断
- 本地设置持久化新增 `ui.mode` 与 `ui.free_variants`，默认自由模式一次抽卡 2 版，最大 5 版
- 更新 skill 主文档，优先识别 `ui / doctor` 指令，并补齐 `rule / free` 双工作流说明

### v1.5.2

- 删除 README 顶部的发布流程提示，只保留产品介绍与使用说明
- 进一步提高资讯 / 早报类页面的审美要求，这类页面默认去掉装饰分割线，依靠留白与标题层级组织信息
- 新增 `editorial-notch` 极简分割线，并把渲染器的自动处理策略改成“资讯页优先删分割线，科技页才保留结构化分割”
- 强化审美守卫，禁止编辑型页面依赖装饰件硬切章节

### v1.5.1

- 重做 `wx-divider-ornament` 的默认审美策略，不再鼓励通用圆环分隔线反复出现
- 渲染器会自动把旧页面里的通用圆环分隔线替换为更适合当前主题的款式
- 增加分割线数量守卫，移动端页面默认控制在 0-2 个章节分隔
- 强化分割线基础样式和主题适配，让暖色杂志风与科技风的章节转场更协调
- 新增基于 Git tag 的 GitHub Release 工作流，版本发布记录不再依赖本地 `gh` 登录状态

### v1.5.0

- 增加视觉质量保护，拦截轻主题中低对比、看起来像空白占位的装饰 SVG
- 增加移动端网格保护，禁止 metric / compare 区域生成 3 列以上的信息卡
- 强化图形容器基础样式，让 `wx-inline-graphic` 和 `wx-badge-art` 更有存在感
- 补强技能规范，禁止把内部制作口吻和预设元信息直接写进成品页面
- 重做 demo 方向，强调结果展示而不是解释说明

### v1.4.2

- 调整 README 结构，把版本更新记录统一保留在文档底部
- 在快速开始中补充 OpenClaw 使用说明
- 明确补充飞书内容场景支持与注意事项

### v1.4.1

- README 底部新增常驻版本更新记录，便于在 GitHub 页面直接查看历史变化
- 进一步强化视觉生成规范，要求生成前先明确 art direction，再组织标题、配色、装饰和节奏
- 明确要求“风格多样性”来自布局语言、装饰系统和卡片组织，不只是换色

### v1.4.0

- 增加结构清洗与校验，避免误把完整 HTML 页面再次包装成坏结构
- 增加本地 `local-settings.json` 配置层，持久化 logo 标题、副标题和开关
- 增加 `/tp logo title <text>` 与 `/tp logo subtitle <text>` 指令
- 明确 `/tp style list` 和 `/tp help` 是纯文本快速返回命令
- 统一 skill 路径表述，减少对 `~/.claude/skills/` 的硬编码依赖

### v1.3.1

- 每次生成前静默检查 GitHub 远端版本，发现新版本时给出升级提醒

### v1.3.0

- 新增 `/tp select auto|full|compact` 三档内容模式
- 根据文章类型自动判断保留全文还是压缩摘要

### v1.2.0

- 强化 HTML 模板约束和 class 白名单
- 明确要求只生成 `<article>` 片段，减少结构错误

### v1.1.0

- 去除对完整 Puppeteer 下载的依赖，改为优先使用系统 Chrome
- 增加版本管理与更新机制

## License

MIT
