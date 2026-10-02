# 2026-10-02 第十三轮：样式所有权与局部主题边界

本轮从已有样例的组合缺陷出发，不继续增加异步数据层，也不重设计已认可页面。基线为 `5738a2a65aabee451010565414b6706b4847f403`。

## 读取的实现与采用边界

| 来源 | 实际读取 | 采用与不采用 |
|---|---|---|
| [Radix Themes Theme](https://github.com/radix-ui/themes/blob/1faff10ac26ae17f09944d418c6949b93fc6b566/packages/radix-ui-themes/src/components/theme.tsx) | 文件正文；根主题、上下文默认值、局部属性与 DOM 标记 | 明确主题配置的边界与覆盖方式。不引入 React Provider、Radix 配色或新依赖；该提交不是本轮新发布的证明 |
| [Radix Themes Select](https://github.com/radix-ui/themes/blob/1faff10ac26ae17f09944d418c6949b93fc6b566/packages/radix-ui-themes/src/components/select.tsx) | 文件正文；触发器／内容的独立类名，Portal 中用 Theme 包裹内容 | 区分样式所有者；逻辑上下文与物理 CSS 继承分开。不声称本轮实现或验证了框架 Portal |
| [Theme 官方文档](https://www.radix-ui.com/themes/docs/components/theme) | API 与 Nesting 正文 | 参考局部主题覆盖。Radix 采用父配置继承；本 Skill 的 `data-design="error"` 是重新建立默认 token 的边界，两者不是同一默认策略 |
| [Color 官方文档](https://www.radix-ui.com/themes/docs/theme/color) | token、局部颜色覆盖和焦点／选择部分 | 颜色按角色与局部上下文解析；不照搬固定色阶、色彩比例或对比度保证 |

另外复用第十一轮已读取的 [Primer TrailingAction](https://github.com/primer/react/blob/c4189aa896eaf53b7ce41a71150df10d757732f1/packages/react/src/ActionList/TrailingAction.tsx) 的 CSS Module 与明确组件类名思路。这是既有固定源码证据，不是新跑了一次 Primer 应用。未登录第三方产品，未运行上游代码、测试或进行其界面的视觉测量。

## 先复现，而不是从项目名推出质量

本项目的 `patterns.css` 与 `regions.css` 都拥有 `.dl-state`，但前者表示 12px 的紧凑行内标签并生成圆点，后者表示 14px、显式 SVG 标记的状态组件。两份 CSS 一起加载后，紧凑标签会被改成 14px／600 字重；反向加载则使独立标记变为 12px。无论顺序如何，独立标记前都会多出一个圆点。单页测试没有暴露这个组合问题。

另一个独立问题是外层 `[data-status-color="semantic"] .dl-state` 后代选择器会穿过内层明确的 `data-design="error" data-status-color="mono"`。浅色语义主题内的深色灰阶区域仍得到棕色维护文字。只有外层没有相同后代选择器时，独立内层的颜色才正确。

## 规则与本轮实现

- 同一公共类名只对应一致的呈现契约。共同的业务含义不要求不同结构共用同一全局选择器；需要差异时使用明确变体、局部样式或独立所有者，不靠 CSS 加载顺序消除冲突。
- 本清单的紧凑标签改名为 `.dl-collection-state`；`regions.css` 的 `.dl-state` 保留。只同步当前样例的五处 HTML 类名，ID、`data-state`、状态文案及 JavaScript 不变。复制过旧清单片段的使用方需要同时更新 HTML 与 CSS；不要添加重新造成冲突的全局别名。
- 局部主题属性在边界解析成组件 token，而不是每个匹配祖先都直接给后代上色。`regions.css` 在每个 `data-design="error"` 上定义维护前景／背景，只有该边界显式 opt-in 才采用语义色。已有共享 tokens 文件不改动。
- 普通包装层仍继承颜色；新的 `data-design` 边界重新使用默认灰阶；显式 `mono` 和省略状态颜色均不被外层着色。仅在无 `data-design` 的普通 div 上写 `data-status-color` 不创建新主题边界。
- Portal 需要另外核对挂载点的主题传播，逻辑焦点范围正确不意味着颜色也正确。优先用已有库的主题桥接；本轮仅增加规则，不添加 Portal 功能或宣称此路径通过。

## 验证设计

新检查从实际 `patterns.html` 和 `regions.html` 抽取状态节点，而非另写一组理想组件。分别记录只加载所属 CSS 时的计算样式，再比较两种混合顺序和重复加载；内层主题与同配置独立根逐项对照。覆盖 24 种内外主题／颜色策略组合、实时切换、320px 长文本与强制颜色模式。

再把完整 patterns 和 regions 页面各自与另一份 CSS 一起加载，走选择／详情与读取失败／重试路径。每个完整页面使用独立 Window：`setContent` 不负责销毁上一份文档的全局监听，不把测试装载器遗留监听误当成业务的 SPA 卸载合同。

同一检查能检出原基线，并在候选中故意恢复圆点／字号污染或跨边界着色后由预期断言拒绝。它检查的是确定的呈现不变量，不是一般美观评分，也不证明任意 CSS、iframe、Shadow DOM 或框架 Portal 的兼容性。结果见 [验证记录](../evals/validation-2026-10-02-round13.md)。
