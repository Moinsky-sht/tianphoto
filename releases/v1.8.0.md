# 🎉 Tianphoto v1.8.0 发布

## ✨ 本次更新亮点

### 1. 增强调用能力
- 重写 Skill Description，优化触发关键词
- 新增中文关键词列表，提升识别准确率
- 更好的多轮对话上下文理解

### 2. 固定宽度 375px
- 统一使用移动端标准宽度 375px
- 导出 PNG 时自动 2.88x 缩放至 1080px 高清
- 解决预览与导出不一致的问题（所见即所得）

### 3. 稳定版编辑器 v2.0
- 全新 `editor-stable.js`，更稳定的初始化
- 写死编辑器逻辑，避免加载失败
- 改进的事件处理和错误恢复

### 4. 字体编辑功能
- 新增工具栏字体选择器
- 6 种精选字体组合：
  - 系统默认
  - 优雅宋体
  - 现代黑体
  - 手写风格
  - 商务正式
  - 科技感

### 5. 自动推送到会话
- 生成 HTML 后自动推送到当前会话
- 支持飞书、Discord、Slack 等渠道
- 解决服务器部署后无法获取文件的问题

## 📦 安装方式

### 新用户安装

```bash
# 方式一：通过 ClawHub（推荐）
npx clawhub install tianphoto

# 方式二：从 GitHub 克隆
git clone https://github.com/Moinsky-sht/tianphoto.git ~/.openclaw/workspace/skills/tianphoto

# 安装依赖
npm install -g puppeteer-core
```

### macOS 用户额外安装 Chrome

```bash
brew install --cask google-chrome
# 或
brew install --cask chromium
```

## 🔄 更新方式

### 已有用户升级

```bash
cd ~/.openclaw/workspace/skills/tianphoto
git pull origin main
```

### 使用 /tp 指令升级

```
/tp update
```

## 📝 详细更新日志

**v1.8.0 (2025-03-15)**
- 增强调用能力：优化 skill description，提升触发稳定性
- 固定宽度 375px：移动端标准宽度，导出与预览一致
- 稳定版编辑器：重写 editor-stable.js，确保初始化成功
- 字体编辑功能：新增 6 种字体选择器
- 修复导出所见即所得：统一视口宽度，scale 2.88x 高清输出
- 新增自动推送功能：生成后自动推送到会话
- 新增发布说明生成器：tianphoto-release-notes skill

**v1.7.0 (2025-03-10)**
- 36 套预设风格
- 规则模式与自由模式
- 品牌横幅支持
- PNG 切片导出

## 💡 快速开始

1. **发送文章** - 直接粘贴文字或 URL
2. **选择风格** - 使用 `/tp style <id>` 或自动匹配
3. **编辑内容** - 在浏览器中点击文字即可编辑
4. **导出图片** - 点击"导出"按钮生成 PNG

### 常用指令

```
/tp help              # 查看帮助
/tp style list        # 列出所有预设
/tp doctor            # 检查状态
/tp ui rule           # 切换到规则模式
/tp ui free 2         # 自由模式，生成2个版本
```

## 🎨 风格示例

| 场景 | 推荐预设 |
|------|---------|
| 科技产品 | nebula-frost |
| 深度分析 | slate-column |
| 品牌宣传 | pearl-board |
| 教程指南 | mint-deck |
| 新闻资讯 | dawn-journal |

---

**GitHub**: https://github.com/Moinsky-sht/tianphoto  
**Made with ❤️ by Tianphoto**
