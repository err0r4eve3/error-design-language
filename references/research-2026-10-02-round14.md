# 2026-10-02 第十四轮：方向不是整体镜像

本轮继续修复可复用组件，不把中文控制台改为另一种语言。读取固定提交与官方正文；没有运行上游项目、安装方向库或测试第三方账户。

## 实际来源

| 来源 | 本轮读取范围 | 可以支持的结论 |
|---|---|---|
| [Radix Direction 源码](https://github.com/radix-ui/primitives/blob/f7ecd5ab16f5e1e820eb5786a1419a98a2d594ae/packages/react/direction/src/direction.tsx) | 全文，固定提交 `f7ecd5ab16f5e1e820eb5786a1419a98a2d594ae` | Provider 返回 React Context；`useDirection` 按局部参数、上下文、LTR 默认值解析。它本身没有生成带 dir 的 DOM。 |
| [Radix Direction Provider 文档](https://www.radix-ui.com/primitives/docs/utilities/direction-provider) | 官方 API 与示例 | 组件行为可从方向上下文取得配置，不能据此推断手写 CSS 会自动正确。 |
| [React Aria Quality](https://react-aria.adobe.com/quality) | Internationalization 与 Setting the locale 正文；旧 internationalization URL 实际重定向至此 | 明确同时设置根元素 lang／dir，布局可用逻辑属性，方向相关交互与样式各有责任。 |
| [W3C Inline markup and bidirectional text](https://www.w3.org/International/articles/inline-bidi-markup/) | Quick answer、已知／未知方向短语与 markup 小节 | 相反方向短语紧密包裹并设置 dir；未知文本可用 bdi／dir=auto。读取正文及代码，不把未查看的配图计为视觉证据。 |

## 采用与不采用

采用三个分离：布局的 inline-start／end，技术短语内部顺序，已有控件的键盘方向。保留本地显式配置，避免祖先 RTL 样式覆盖局部 LTR。测试按实际容器尺寸进行，不要求把现有系统换成 Radix、React Aria 或另一套 CSS 架构。

不采用全页 `scaleX(-1)`、反转源字符串、统一翻转图标、自动切换用户已确认语言或手写全局方向键映射。金额／图表的对齐和空间坐标按任务判断，不从语言方向机械推断。当前修复只是原生 radio 选择卡；库 Provider、Portal 方向传播和整个清单的 RTL 导航只写规则，没有运行实现。

## 当前仓库的具体问题

基线 `6d55d68fce266bed9975fca80bb65b1f4ecaa1be` 的 `.dl-choice input` 使用 `inset-inline-start:18px`，`.dl-choice-body` 却保留物理左侧 48px padding。有效方向为 RTL 时，圆点来到右侧，文字仅留 18px，覆盖圆点。相同 260px 卡片中，LTR 文本与控件间距为 14px，RTL 为 -16px；后者表示水平区域重叠，不是负对比度或性能分数。

修复为 `padding-block:18px; padding-inline:48px 18px`，保持 LTR 的原始几何。真实 HTML 中三个 vCPU 规格与两个 GB 短语增加 `bdi dir="ltr"`；只增标记，不改文字、参数、价格或 JavaScript。另用实际字符矩形验证数字仍位于 Latin 单位左边，避免仅凭 DOM 文本相同判定呈现正确。

规则合并进 [界面细节](craft-details.md)，入口使用稳定的 README 调研索引，避免每轮以过期“本轮”链接要求读取旧记录。普通调用仍然按需读取，不加载全部来源和测试。

## 证据边界

本轮 Node 与浏览器执行、负向控制和原样例回归见 [验证记录](../evals/validation-2026-10-02-round14.md)。输入法、完整屏幕阅读器、原生移动设备、Safari／Firefox、竖排书写和全应用国际化均未验证。中文文案放入 RTL 容器属于结构压力样例，不是阿拉伯语或希伯来语翻译验收。读取开源项目不能当作其整体质量认证。
