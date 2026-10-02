# Token用途与兼容边界

需要建立字阶、数字列、局部主题或区分表面职责时读取。视觉方向先从任务决定，本文件不要求向已有设计系统叠入第二套变量。

## 从内容角色选样式

| 用途 | 变量 | 默认起点 |
|---|---|---|
| 页面标题 | `--dl-type-page` | 1.875rem |
| 区块标题 | `--dl-type-section` | 1.1875rem |
| 对象名／内容标题 | `--dl-type-title` | 1rem |
| 正文／输入帮助 | `--dl-type-body` | .9375rem |
| 控件文字 | `--dl-type-ui` | .875rem |
| 元数据 | `--dl-type-meta` | .75rem |
| 主指标 | `--dl-type-metric` | 2.3125rem |

搭配heading／body行高和heading／label字重；`--dl-numerals`定义等宽、齐线数字，标识与代码按需用`--dl-font-mono`。数字等宽不等于整页使用等宽字体。费用和风险属于决策内容，不能为塞进metadata尺寸而降低可读性。HTML的h1/h2由文档结构决定，不与字号硬绑定。

这些值由现有样张提炼，不是行业标准或最优字阶。已有页面的局部值优先；仅在需要时于页面边界覆盖。例如文章正文可上调，表格保持比较密度；同时检查中文行高、长内容、根字号与窄容器。

## 表面按用途，不按名字猜明暗

`--dl-canvas`是画布；`--dl-surface`是内容；`--dl-surface-rail`承载辅助导航／工具区域；`--dl-surface-inset`承载嵌入槽或轨道。rail不承诺在每个主题里都比画布暗；inset当前值在相应内容面内形成凹入对比，但不得据此推断状态。

旧`--dl-workspace`保留为rail的兼容别名，不删除外部使用方。新组件选择明确的role，已有组件仅在需要改动时迁移。浅深主题的颜色不做算术反转。

`--dl-status-foreground`是默认灰阶状态文字；旧`--dl-danger`／`--dl-success`仍映射到它，标记为兼容别名。它们不提供完整危险／成功颜色系统；灰阶中意义由名称、符号与操作语义表达。选择语义色时另定义有主题配对和对比度验证的变体，严格灰阶时不着色。

## 高光不是对象边界

`--dl-glass-highlight`是装饰性光边，浅色叠浅色不保证可见。独立的`--dl-glass-line`才提供材质分界，必要交互边界继续使用control-border／focus。不能靠加深高光制造虚假的光学效果，也不能用玻璃参数证明复杂背景的文字对比。

`--dl-elevation-flat/popover/dialog`描述分层用途。阴影不是唯一边界，高对比模式保留实边。layer变量只在既有层叠上下文里排序；z-index再高也不替代原生dialog的top layer、焦点隔离或portal主题传播。

## 验证

检查变量定义只是结构测试。浏览器还需验证计算字号、数字样式、明暗主题及兼容别名的实际值；修改局部字号后，真实使用处应变化且不溢出。例外与旧值保留不意味着完成全站token迁移。

依据：[Spectrum Typography](https://spectrum.adobe.com/foundations/typography/typography-system)的内容角色、字号／行高与数字样式；本项目采用角色划分，不照搬其完整字号表、字体或品牌参数。[Agent Skills规范](https://agentskills.io/specification)要求description说明任务与适用时机；增加英文触发措辞只是元数据改进，不证明宿主触发率。
