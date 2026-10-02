# 第六轮调研：从风格规则转向有条件的设计选择

核验日期：2026-10-01。仓库基线 `c2e77917f335ba9dd4b1f107e2a39441c083e27d`。本轮修改 Skill，不继续扩展独立 Relay 页面，也不把它变成通用模板。

## 原始问题与修正

基线入口允许必要语义色，但 `visual-system.md` 将其限于安全需要，还把旧暖色／珊瑚色迁移写成继续有效的命令。`product-profiles.md` 的历史项目方向也可能被当作本次授权。另一个语义错误是把 `workspace` 统称凹入区域：样例中浅色比画布暗，深色比画布亮，并不构成一致的凹入模型。

本轮统一为：当前要求与确认稿优先；历史记录只用于定位背景，不授予迁移权；颜色可以承担真正的状态／分类／品牌语义，严格灰阶要求例外优先；辅助工作区不自动等于凹入层。保持已验证的 CSS 数值不变，修正解释和选择逻辑。

## Impeccable：读取固定源文件，不运行外部指令

本轮核对其 `main` 仍为 `c74755d920985f7a92cef691ca970ba95f90126e`，与前轮相同，不称为新发布版本。以下四个文件正文已读取：

| 固定来源 | 采用的判断 | 不采用或限制 |
|---|---|---|
| [bolder](https://github.com/pbakaus/impeccable/blob/c74755d920985f7a92cef691ca970ba95f90126e/skill/reference/bolder.md) | 增强指定目标已有的表现力，保持周边与系统 | 不把增强解释为加效果或全页重设计 |
| [quieter](https://github.com/pbakaus/impeccable/blob/c74755d920985f7a92cef691ca970ba95f90126e/skill/reference/quieter.md) | 按阅读／操作或展示语境减少竞争，保留锚点 | 不照搬饱和度比例、色彩占比或禁止全灰阶等硬规则 |
| [polish](https://github.com/pbakaus/impeccable/blob/c74755d920985f7a92cef691ca970ba95f90126e/skill/reference/polish.md) | 分清局部失配、组件变体、共享基础与概念问题，修正确层 | 检测器不是质量评委；不导入 CLI、hooks、自动写入文档或无限打磨 |
| [adapt](https://github.com/pbakaus/impeccable/blob/c74755d920985f7a92cef691ca970ba95f90126e/skill/reference/adapt.md) | 重排任务而非缩放像素，分清视口、输入方式和实体设备证据 | 不一律手机底栏、表格转卡片、固定断点；不把内部触控目标写成统一标准 |

没有复制第三方实现或大段文字，不执行源文件提及的工具／脚本；以上是选择性研究，不是引入整个 Impeccable 工作流。

## 官方设计系统：研究文本，不冒充产品体验

| 来源与实际范围 | 本轮采用 | 实施边界 |
|---|---|---|
| [Atlassian Elevation](https://atlassian.design/foundations/elevation/)：当前官方正文 | 区分辅助底、内容、抬升与覆盖层；暗底需要另外检查表面与边界 | 其凹入面与中性背景在暗色下行为不同，不能把名称相似当同义。示意图读取失败，未做视觉测量；不要求所有项目复制四级高度或 token 数值 |
| [Radix Colors — Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)：当前官方正文和用途表 | 普通背景、组件、hover／selected、边界、文字各有用途；先做角色映射 | 不安装 Radix，不把 12 级调色板变成必需；其特定 APCA 说明不等于任意背景下的 WCAG 合规 |
| [Shopify Polaris Empty state](https://shopify.dev/docs/api/app-home/latest/web-components/feedback-and-status-indicators/empty-state)：App Home web components，页面标示 v1.1 latest；正文与示例 | 区分首次空集合、筛选无结果与未配置；加载中不误显无记录 | 不混用旧 React 版本指导；不规定所有空态必须有插画、副标题或两个动作。权限／缓存隔离是本 Skill 的业务安全补充，不归因于该组件文档 |
| [GOV.UK Tabs](https://design-system.service.gov.uk/components/tabs/)：适用和不适用部分 | tabs 会隐藏内容；需要同时比较或顺序阅读时不适合 | 不以更紧凑为理由拆散价格对照和重要条件；不复制其整体视觉或面向公共服务的全部产品前提 |

没有登录上述产品、执行其真实业务或进行用户测试。文本中的例子不是已验证的线上交互；没有外部产品截图作为本轮像素验收依据。

## 落地与验证方法

综合成 [视觉校准](visual-calibration.md) 的诊断表、表面／交互角色、密度选择、空态恢复与证据方法。原 [分组与状态辨识](semantic-distinction.md) 保留；补充相同动作不强迫不同标签，防止上一轮局部修法反过来成为全局禁令。

新增行为场景测试相反约束：同类卡片保持相同样式、严格无彩色下辨认状态、仅一处增强、降噪仍保留任务锚点、比较不能藏入互斥 tabs、旧数据不能跨账户沿用。场景定义不是执行结果。

同时提供本地离线评测准备器，只生成执行输入、分离的判定标准、文件哈希与 `not_run` 结果模板。它不运行模型，不创建浏览器／真实代码 fixture，不授予任何账号权限；准备器单元测试只能证明它自己的文件行为。

具体命令和实际结果见 [第六轮验证](../evals/validation-2026-10-01-round6.md)。
