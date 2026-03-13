# Tianphoto — 智能图文生成工作室

将文章内容转化为**精美的、可编辑的自包含 HTML 网页**，可直接在浏览器中阅读、编辑文字、插入图片，一键导出 PNG 切片（适合公众号上传）。

当前版本：`v1.4.0`

## v1.4.0 更新

- **结构保护** — `render-image.js` 会先清洗输入，如果误传完整 HTML 页面，会自动抽出唯一的 `<article>` 再渲染；如果结构仍不合法，会直接报错停止，避免产出双 `body` / 重复 `DOCTYPE`
- **Logo 文案持久化** — 新增 `/tp logo title <text>` 和 `/tp logo subtitle <text>`，品牌横幅文案会保存到本地配置，不再每次手改
- **快速返回命令** — `/tp style list` 和 `/tp help` 现在被明确约束为纯文本速查，不触发生成
- **目录兼容说明** — 不再把 skill 路径写死为 `~/.claude/...`，改为以当前 skill 根目录为准，更适合 Claude、Codex 或其他宿主环境复用

## 30 秒快速开始

1. 把仓库克隆到你的 skills 目录。
2. 给 Tianphoto 一段文章文字或一个 URL。
3. 如需品牌横幅，把 logo 放到 `logos/brand-logo.png`。
4. 如需固定品牌文案，运行：

```bash
node scripts/tp-config.js logo title "品牌名"
node scripts/tp-config.js logo subtitle "副标题"
```

5. 生成后直接打开桌面上的 `*-page.html`，可继续编辑或导出 PNG。

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

## License

MIT
