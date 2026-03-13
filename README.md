# Tianphoto — 智能图文生成工作室

将文章内容转化为**精美的、可编辑的自包含 HTML 网页**，可直接在浏览器中阅读、编辑文字、插入图片，一键导出 PNG 切片（适合公众号上传）。

## 安装

```bash
# 克隆到 Claude Code skills 目录
git clone https://github.com/Moinsky-sht/tianphoto.git ~/.claude/skills/tianphoto
```

> 如果已有该目录，先备份或删除：`rm -rf ~/.claude/skills/tianphoto`

## 使用

在 Claude Code 中输入以下指令即可触发：

- `/tp` — 启动 Tianphoto
- `/tp style list` — 查看 32 套预设风格
- `/tp style <preset-id>` — 指定风格（如 `aurora-glass`）
- `/tp logo on` — 启用品牌 Logo
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
- **Logo 支持** — 在 `logos/` 目录放入 `brand-logo.png` 即可启用品牌横幅

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
├── assets/
│   ├── article-theme.css   # 文章主题样式
│   ├── editor.js           # 内置编辑器 + 导出引擎
│   ├── html2canvas.min.js  # 渲染依赖
│   └── presets.json        # 32 套预设配置
├── scripts/
│   ├── render-image.js     # 渲染脚本（PNG 导出需 puppeteer-core）
│   └── fetch-content.js    # URL 内容抓取
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

## License

MIT
