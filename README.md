# Tianphoto — 智能图文生成工作室

将文章内容转化为**精美的、可编辑的自包含 HTML 网页**，可直接在浏览器中阅读、编辑文字、插入图片，一键导出 PNG 切片（适合公众号上传）。

当前版本：`v1.5.1`

发布方式：推送 `v*` 标签后自动生成 GitHub Release。

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
- `/tp style list` — 查看 32 套预设风格
- `/tp style <preset-id>` — 指定风格（如 `aurora-glass`）
- `/tp select auto` — 自动判断内容详略（默认）
- `/tp select full` — 完整保留原文内容
- `/tp select compact` — 紧凑压缩模式
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
- **内置编辑器** — 在浏览器中直接编辑文字、拖拽插入图片
- **一键导出** — 按卡片智能切片导出 PNG（所见即所得）
- **自动封面** — 导出时自动生成公众号 2.35:1 头条封面图
- **32 套预设** — 覆盖科技、商业、文艺、暗色等多种风格
- **智能内容模式** — auto/full/compact 三档，自动识别文章类型适配详略
- **Logo 支持** — 在 `logos/` 目录放入 `brand-logo.png` 即可启用品牌横幅
- **结构校验** — 自动清洗误传的完整 HTML 页面，避免重复包裹导致坏结构
- **本地配置** — logo 标题、副标题、开关写入本地配置，重复使用更稳定
- **飞书友好** — 适合把飞书文档、周报、通知、复盘转成手机端更好读的网页或长图

## 预设风格速查

| ID | 名称 | 适用 |
|----|------|------|
| aurora-glass | 极光玻片 | 科技灵感 |
| nebula-frost | 星云雾面 | AI 产品 |
| comet-neon | 彗星霓光 | 发布（暗色） |
| dawn-journal | 曦白札记 | 知识、观点 |
| jade-zen | 青玉留白 | 禅意阅读 |
| pearl-board | 珍珠简报 | 品牌商业 |
| ... | 共 32 套 | `/tp style list` 查看全部 |

## 目录结构

```
tianphoto/
├── SKILL.md           # Skill 定义（Claude Code 入口）
├── README.md          # 本文件
├── version.json       # 版本信息（用于 /tp version 和 /tp update）
├── local-settings.json # 本地配置（自动生成，默认不提交）
├── assets/
│   ├── article-theme.css   # 文章主题样式
│   ├── editor.js           # 内置编辑器 + 导出引擎
│   ├── html2canvas.min.js  # 渲染依赖
│   └── presets.json        # 32 套预设配置
├── scripts/
│   ├── render-image.js     # 渲染脚本（PNG 导出需 puppeteer-core）
│   ├── fetch-content.js    # URL 内容抓取
│   ├── settings.js         # 本地配置读写
│   └── tp-config.js        # Logo 标题/副标题/开关设置
├── references/
│   ├── html-components.md  # HTML 组件文档
│   └── content-types.md    # 内容类型参考
└── logos/
    └── README.md           # Logo 放置说明
```

## 依赖

- Node.js（随 Claude Code 环境自带）
- **PNG 导出（可选）**：`npm install -g puppeteer-core`（仅 4MB，使用系统 Chrome，无需下载浏览器）
- 默认的 HTML 网页 + 浏览器内导出无需任何额外依赖

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
