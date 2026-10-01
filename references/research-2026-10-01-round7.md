# 第七轮资料：从设计判断到可复用组件

查阅日期：2026-10-01。基于本仓库 `e1f089d28b4dab7712f3b87bc15f974b1ec913d3`。本轮主要解决规则已有、轻量实现样例不足的问题，不以增加来源数量代替改进。

## 实际阅读与取舍

1. [Impeccable Extract](https://github.com/pbakaus/impeccable/blob/c74755d920985f7a92cef691ca970ba95f90126e/skill/reference/extract.md)：读取完整文件。采用先识别已有系统、按相同意图提取、明确变体和检查调用方的思路。不采用“3+ 次”作为普适阈值，不把系统不存在变成所有小任务的强制问答。使用同一个已固定版本，不称为新发布。

2. [Impeccable Component review](https://github.com/pbakaus/impeccable/blob/c74755d920985f7a92cef691ca970ba95f90126e/skill/reference/component-review.md)：读取完整文件。它主要处理批准构图、栅格素材与人工审核凭据，不是通用表单组件状态指南。本轮没有移植 CLI、素材审批门禁、后台审核服务或“用户已批准”凭据；只是保留参考证据与完成状态不能混写的边界。

3. [Carbon Data table](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines)：阅读 Anatomy、Sizing、Placement、Interactions、toolbar、Batch actions 等文字。采用集合工具区、已选择子集、行操作的范围划分；同类组件密度与对齐相协调。没有照搬固定行高、最多五个按钮、hover-only 排序或一律禁用行操作。其尺寸建议只适用于 Carbon，不作为本 Skill 的全局标准。尝试查看 condensed-grid 与 batch-action 官方图片均失败，未据此做图像测量或声称视觉复刻。

4. [NN/g — Why Does a Design Look Good?](https://www.nngroup.com/articles/why-does-design-look-good/)：2021-03-07 的文章；读取排版、间距与层级相关公开文字。采用一致的对齐和同义排版变体，不把例图当当前产品界面，不将固定英文行距直接移植到中文。未查看其图片，不声称测试了 Medium、Ritual 或 Spotify。

5. [W3C APG Radio Group Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)：读取键盘操作和语义说明。采用单选、分组标签、方向键及选择状态检查；实现优先原生 radio，不另造 ARIA 控件。APG 说明了原生浏览器与示例的部分初始焦点差异；本轮只实测了所用 Chromium 的有初始选中场景。

6. [W3C Understanding SC 4.1.3 — Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)：读取状态消息、上下文变化与过多播报的区别。把读取反馈与对象生命周期分开，并给动态结果提供 `role="status"` 和完整上下文。不是要求每个对象状态都设 live region，也不是承诺完整读屏兼容。

7. [W3C Understanding SC 1.4.1 — Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)：读取颜色不能成为唯一信息渠道的解释。采用文字、图形与轮廓作为颜色之外的线索。它并不要求所有网站严格灰阶，也不要求每类状态都必须三重编码。

W3C Understanding 和 APG 是解释／实践材料，不能把本样例通过几项检查称作全站 WCAG 合规。未复制第三方实现或长段文字，未运行 Impeccable、plugin-eval 或登录上述产品执行业务。

## 与本仓库的对应

| 发现的缺口 | 本轮改变 | 实际验证方式 |
|---|---|---|
| “相同样式”与“相同职责”容易混用 | 新增组件契约，区分静态指标、原生选择和对象状态 | 静态对象无点击语义；radio 真实键盘切换 |
| 服务状态与读取失败可能共用一个状态字段 | 示例分离 `data-state` 与 `data-phase` | 失败仍未知，重试后维护，费用不被填补 |
| 严格灰阶只有文字规则 | 可选 CSS 在未开启语义色时保持灰阶 | 两主题的 computed style、符号和轮廓检查 |
| 工具检查可能只证明快乐路径 | 增加失效焦点与压平分组的负向检查 | 同一断言先通过，再检出注入故障 |
| 截图样张依赖全局 reset | 可复用 CSS 限定作用域和盒模型 | 提取指标片段到无文档 reset 容器测试 |

不改变 Relay 已认可的页面，不改已有两个样张、共享 token、业务场景定义或离线准备器。样例增加是供按需参考和验证，不要求每次调用读取 HTML、CSS 或测试文件。
