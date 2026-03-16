# Tianphoto v2.0.0

## 版本主题

这次不是一次小修小补，而是一次真正的视觉系统换代。

`2.0.0` 的核心目标只有两个：

1. 让章节标题重新以“文字优先”工作，而不是被图标和编号挤压。
2. 让 `37` 套 preset、`15` 个家族真正拥有不同的版式人格，而不是继续停留在换皮层。

## 重点更新

### 1. 章节标题系统重做

- `index-led` 不再把编号横着塞进标题旁边，而是改成标题上方的轻标签或编号条。
- `dual` 不再出现“图标一列、编号一列、标题只剩半列”的拥挤结构，编号退成 signal chip / panel badge。
- `icon-led` 与 `plaque` 也统一收紧了图标尺寸和标题节奏，让文字重新成为第一主角。

### 2. 风格差异全面拉开

- 家族级差异不再只靠色盘，而是进入标题框架、caption 语法、卡片骨相、SVG 笔触和页面节奏。
- `ops-console`、`neon-signal` 变成更明确的 panel / signal 语言。
- `archive-paper`、`studio-ribbon`、`salon-luxe` 的 plaque 与展签逻辑更完整。
- `swiss-journal`、`ledger-spec`、`brief-bulletin` 的编号系统更像真正的栏题，而不是一块挤在标题前的 badge。

### 3. 校验器更严

- 禁止无语义的 `+` 占位图标。
- 章节编号必须连续。
- summary / quote 这类信息卡不再被误判成必须携带章节头。

### 4. 文档重写

- README 全面改写为 2.0 版本说明。
- 组件说明与 Skill 文档同步更新章节标题系统口径。

## 适合谁升级

如果你之前对这些问题有感觉，这个版本值得直接升级：

- 标题被图标和编号挤得太窄
- 同一家族内的页面结构差异不够明显
- SVG 和章节头看上去像占位，不像设计
- 规则模式的样张越来越花，但不够稳

## 升级方式

```bash
/tp update
```

或：

```bash
git pull origin main
```

## 版本说明

- 当前版本：`2.0.0`
- GitHub Repo：`Moinsky-sht/tianphoto`
