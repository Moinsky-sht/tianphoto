# logos 目录

将你的品牌 logo 文件放在此目录下（支持 PNG / SVG / JPG 格式）。

当 skill 生成手机长图时，会自动检查此目录：
- 如果存在 logo 文件，会在图片顶部自动插入品牌横幅（phone-brand-banner）
- 如果有多个文件，默认使用第一个找到的文件
- 建议 logo 尺寸至少 200×200px，正方形最佳

## 推荐命名

优先使用以下固定文件名，便于脚本稳定识别：

- `brand-logo.png`
- `brand-logo.svg`
- `brand-logo.jpg`
- `brand-logo.jpeg`

也兼容以下旧命名：

- `logo.png`
- `logo.svg`
- `logo.jpg`
- `logo.jpeg`

## 横幅文案

品牌横幅的标题和副标题不再写死在模板里，而是来自 skill 根目录下的 `local-settings.json`。

通过下面命令修改：

```bash
node ../scripts/tp-config.js logo title "品牌名"
node ../scripts/tp-config.js logo subtitle "副标题"
node ../scripts/tp-config.js logo on
node ../scripts/tp-config.js logo off
```

## 命名建议

- `logo.png` — 默认品牌 logo
- `logo.svg` — SVG 格式 logo（推荐，更清晰）
- `brand-dark.png` — 用于暗色主题的 logo 变体
