# ✨ Tianphoto v2.0.0

一次真正的视觉系统换代。

`2.0.0` 不是小修小补，而是把 Tianphoto 从“风格很多”推进到“风格真正有骨相”。

---

## 🎯 这次解决了什么

### 1. 章节标题终于不再拥挤

过去最明显的问题之一，是一些风格里图标、编号、标题一起抢宽度，导致标题像被挤进半边栏里。

这次重做后：

- `index-led` 不再把编号横向塞在标题旁边
- `dual` 不再出现“图标一列、编号一列、标题只剩半列”的结构
- `icon-led` 与 `plaque` 也统一收紧了图标比例和标题节奏

现在的原则只有一个：

> 标题文字必须始终是第一主角。

### 2. 37 套 preset / 15 个家族真正拉开

差异不再只靠配色，而是进入了这些层面：

- 标题框架
- caption 语法
- 卡片骨相
- SVG 笔触
- 页面节奏
- section 头部的组织方式

例如：

- `ops-console` / `neon-signal` 更明确地变成 signal panel 语言
- `archive-paper` / `studio-ribbon` / `salon-luxe` 的 plaque 更完整
- `swiss-journal` / `ledger-spec` / `brief-bulletin` 的编号更像真正的栏题系统

### 3. 结构校验更可靠

- 禁止无语义的 `+` 占位图标
- 检查章节编号是否连续
- 避免把 summary / quote 这类信息卡误判成章节头

---

## 🧩 你会感受到的变化

- 页面更像真正的移动端文章，而不是套着主题色的图文模板
- 标题可读性更强，章节结构更稳定
- 不同风格之间的“人格差”更明显
- 仓库文档、Skill 文档和组件说明都同步到了 2.0 口径

---

## 🚀 升级方式

```bash
/tp update
```

或：

```bash
git pull origin main
```

---

## 📌 版本信息

- Version: `2.0.0`
- Repo: `Moinsky-sht/tianphoto`
