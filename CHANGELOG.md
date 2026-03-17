# Changelog

Tianphoto 的版本更新记录。

说明：

- 这里保留完整的版本历史摘要
- 更详细的发布说明收纳在 [releases](releases)

## v2.1.1

- 阅读型章节头重新收成两层：上层只放 `wx-section-index / wx-card-caption / wx-section-mark`，下层让 `h2` 单独占满主要宽度
- `wx-section-mark` 在阅读型模板里退成更轻的语义角标，不再做成白底按钮感徽记
- 并列 `wx-metric-card / wx-compare-card` 默认进一步压小标题字号，避免小卡片被大标题撑坏
- 编辑器新增分类组件面板，并补上稳定的撤销 / 重做历史栈
- `/tp doctor` 新增章节元信息顺序检查，以及并列卡片标题是否过长的审美风险提示

详细说明：
[v2.1.1 release notes](releases/v2.1.1.md)

## v2.1.0

- 新增内容模板层，页面不再只靠 preset / family 决定，而会额外落到 `event-notice / weekly-report / release-brief / knowledge-article / case-recap`
- `/tp doctor` 升级为设计审校器，可检查 OpenClaw/飞书插件能力、章节图形数量、模板匹配度、组件密度和阅读型风险
- 编辑器加入 `章节 / 引语 / 指标 / 对比 / 时间线` 五类快捷组件入口，适合直接搭页面结构
- 会话回传链路新增明确状态结果，能区分“已回传到当前会话”和“仅保存在本地”
- 阅读型页面进一步收紧 `wx-image-drop-zone` 和冗长 metric card 的使用边界

详细说明：
[v2.1.0 release notes](releases/v2.1.0.md)

## v2.0.0

- 章节标题系统重做，标题重新拿回主要宽度
- `index-led / dual / icon-led / plaque` 四套 heading system 重新分工
- `37` 套 preset、`15` 个风格家族在标题、卡片、SVG、caption 和页面节奏上全面拉开
- 校验器会拦截无语义 `+` 占位图标、章节编号断档和错误的章节头结构
- README、Skill、组件文档和发布说明统一升级到 2.0 口径

详细说明：
[v2.0.0 release notes](releases/v2.0.0.md)

## v1.9.6

- 移除不实用的字体设置入口，编辑栏回到高频主路径
- 新增左对齐 / 居中 / 右对齐按钮
- 编辑器升级为浮动玻璃坞，导出预览舞台进一步完善
- 默认输出目录改为桌面 `tianphoto-iterations`
- 新增 `studio-ribbon` 家族和 `opal-ribbon` 预设

详细说明：
[v1.9.6 release notes](releases/v1.9.6.md)

## v1.9.5

- 导出预览改为主舞台 + 缩略条
- 支持“完整适配 / 原始宽度”切换
- 修复编辑态尾白导致的导出高度漂移
- 新增“跟随系统 UI”字体预设
- 字体应用支持“智能 / 卡片 / 整篇”三种范围

详细说明：
[v1.9.5 release notes](releases/v1.9.5.md)

## v1.9.4

- 全面修复导出 WYSIWYG，导出引擎升级到 v5.2
- 将计算后的视觉样式内联，降低 html2canvas 丢样式概率
- 物化 `::before / ::after` 伪元素，修复装饰图层丢失
- 冻结导出过程中的动画与过渡，避免捕获中间态
- 修复导出预览滚动体验

## v1.9.3

- 修复 v5.0 导出引擎中的坐标偏移导致的空白问题
- 导出流程改为先渲染再弹窗，避免 overlay 干扰
- 简化导出准备逻辑，减少不必要的 DOM 临时改动

## v1.9.2

- 导出引擎升级到 v5.0
- 改成直接在实时 DOM 上渲染，减少离屏克隆误差
- 修复 CSS 变量、伪元素和 SVG 变量在导出中的丢失问题
- 临时降级样式在导出后自动恢复

## v1.9.1

- 重写导出引擎
- 支持切片导出 + 单图导出
- 强化所见即所得路径

## v1.9.0

- 恢复更精致的整体 UI
- 移除早期文档和页面中的 emoji 干扰
- 优化弹窗与编辑器交互

## v1.8.3

- 紧急修复 viewport 设置
- 恢复视觉品质与预览稳定性

## v1.8.2

- 新增可选分辨率
- 支持自定义字体
- 增加 WeChat 下载支持

## v1.8.1

- 生成 HTML 后自动推送到会话
- 新增发布说明生成器
- 稳定编辑器继续加固

## v1.8.0

- 增强调用能力与触发稳定性
- 固定宽度 375px，统一移动端标准视口
- 引入稳定版编辑器
- 新增字体编辑功能
- 增强导出所见即所得能力

详细说明：
[v1.8.0 release notes](releases/v1.8.0.md)

## v1.7.0

- 形成较完整的规则模式 / 自由模式双路径
- 预设风格扩展到 36 套
- 加入品牌横幅支持
- 支持 PNG 切片导出

## v1.6.1

- 强化自由模式 guidance 和结构 guard

## v1.6.0

- 引入双 UI 模式
- 加入 `/tp doctor`

## v1.5.2

- 收紧 editorial 审美
- 优化 divider 使用规则

## v1.5.1

- 精修 divider system
- 自动化 release 流程
