# 第十一轮：从开源实现提炼组合规则

研究日期：2026-10-01。针对当前 Skill 已有的组件、状态、集合与连续导航规则查缺，不再重复建立另一套视觉主题。选择 Primer React、Radix Primitives、Adobe React Spectrum，是因为本轮能将组件职责、事件边界和异步状态与具体源码对应；这不是按 star 数做的排名，也不是三个项目无缺陷的背书。

## 固定研究快照

| 项目 | 本次固定提交 | 关注问题 |
|---|---|---|
| Primer React | `c4189aa896eaf53b7ce41a71150df10d757732f1` | 行内信息槽位、尾部操作与语义容器 |
| Radix Primitives | `f7ecd5ab16f5e1e820eb5786a1419a98a2d594ae` | 组合浮层、外部交互与 portal 焦点范围 |
| Adobe React Spectrum | `57c56b8cbfa65294fbaed528ab9580ade0d339cb` | 列表加载阶段、取消和结果提交身份 |

提交通过对应仓库默认分支的提交接口读取后固定；不是安装包版本，也不宣称部署网站与这些字节一致。实际阅读以下七个源码／测试文件的所列范围；未安装或运行这三个仓库，未做第三方界面截图或账户操作。

## 源码证据与边界

**P1 — 行内槽位。** Primer 的 [Item.tsx](https://github.com/primer/react/blob/c4189aa896eaf53b7ce41a71150df10d757732f1/packages/react/src/ActionList/Item.tsx) 1–230 行区分 leadingVisual、trailingVisual、trailingAction 与 description，并依据容器决定项目语义；该组件对特定 menu／listbox 使用 trailingAction 设有运行时约束，附近亦留有兼容既有使用的 TODO。[TrailingAction.tsx](https://github.com/primer/react/blob/c4189aa896eaf53b7ce41a71150df10d757732f1/packages/react/src/ActionList/TrailingAction.tsx) 全文将独立操作实现为 Button／IconButton，区分 button 和 link；[Description.tsx](https://github.com/primer/react/blob/c4189aa896eaf53b7ce41a71150df10d757732f1/packages/react/src/ActionList/Description.tsx) 全文区分 inline／block，并显式处理截断。采用职责区分，不把组件专属限制扩大成所有菜单规范，不照抄其事件对象处理或内部接口。

**R1 — 浮层关闭责任。** Radix 的 [dismissable-layer.tsx](https://github.com/radix-ui/primitives/blob/f7ecd5ab16f5e1e820eb5786a1419a98a2d594ae/packages/react/dismissable-layer/src/dismissable-layer.tsx) 实际查看了层登记、最高层 Escape、可取消关闭、branch 外部判定、背景指针锁清理及外部指针交互的相关段落，未将截断返回当成完整文件。采用层与交互归属，不移植全局事件实现。可见的 Escape 处理不自带本 Skill 已要求的组词退让，因此不能覆盖已有输入法规则。触摸、拖动与点击取消还需目标环境验证。

**R2 — 逻辑焦点范围。** [focus-scope.tsx](https://github.com/radix-ui/primitives/blob/f7ecd5ab16f5e1e820eb5786a1419a98a2d594ae/packages/react/focus-scope/src/focus-scope.tsx) 1–218 行通过 container 与 branches 判断合法焦点范围，具有 paused 检查及可取消挂载／卸载自动焦点。[focus-scope.test.tsx](https://github.com/radix-ui/primitives/blob/f7ecd5ab16f5e1e820eb5786a1419a98a2d594ae/packages/react/focus-scope/src/focus-scope.test.tsx) 1–210 行包含已登记／未登记外部节点的对照、Tab 循环、隐藏元素和负 tabindex 用例。这里是读过测试定义，不是运行了测试。采用逻辑边界，不靠整个 body 放行修复 portal，也不宣称单个原语解决所有读屏、iframe 或 Shadow DOM 情况。

**A1 — 分阶段异步。** React Spectrum 的 [useAsyncList.ts](https://github.com/adobe/react-spectrum/blob/57c56b8cbfa65294fbaed528ab9580ade0d339cb/packages/react-stately/src/data/useAsyncList.ts) 1–345 行区分 loading、sorting、filtering、loadingMore；普通读取／排序／筛选的成功与错误分支核对 abortController 身份，同游标重复加载会取消新请求。loading 分支清空 items，sorting／filtering 不按同样方式清空。不能把它概括成“reload 始终保留旧数据”，也不能从部分分支推断所有分页竞态均受同一保护。统一约束 success／error／finally／分页提交，是本 Skill 的加强规则，不冒充源码各分支已经完整实现。

补充阅读了 [Primer ActionList 官方说明](https://primer.style/product/components/action-list/) 与 [React Aria useAsyncList 文档](https://react-aria.adobe.com/useAsyncList) 的相关文字，用于术语和 API 语境；它们是可变页面，不作为固定源码版本的替代证据。

## 六条规则及落点

| 规则 | 相比旧规则新增的判断 | 落点 |
|---|---|---|
| 1. 行内先分槽位 | 主标签、说明、状态、快捷键和动作分别安排；不只是整张卡分组 | [组件契约](component-contracts.md)：行内信息 |
| 2. 信息与操作分开 | 同在行尾不代表同一个点击目标；检查次操作是否冒泡触发行主操作及语义是否合法 | [组件契约](component-contracts.md)：尾部信息与容器 |
| 3. 逐层关闭 | 当前层关闭／阻止关闭都不穿透；焦点和背景锁按实际持有者恢复 | [交互契约](interaction-contracts.md)：组合浮层 |
| 4. Portal 属于逻辑范围 | DOM 不包含不等于交互在外；父模态与子浮层不能争抢焦点 | [交互契约](interaction-contracts.md)：组合浮层 |
| 5. 加载反馈按阶段放置 | 首次读取、刷新、追加页失败有不同反馈位置；旧结果不能套新查询标签 | [交互契约](interaction-contracts.md)：异步状态 |
| 6. 取消与提交分别负责 | 旧错误、旧 finally 和旧页也会污染新上下文，不只防旧成功覆盖 | [交互契约](interaction-contracts.md)：请求身份 |

本轮不创建 UI、不修改已有样张，不抄源码、不引入依赖或新的全局事件系统。上述规则是有条件的默认设计约束，不是要求每个局部修复实现整套框架。仅新增数据型／异步功能时，才按其风险展开。

## 下一次实际实现时使用的检验场景

以下是本轮写入的验收设计，**均未运行**，也没有混入既有 46 个模型场景或改变其状态。

| 场景 | 必须观察到的结果 |
|---|---|
| 资源行含“查看”和“复制编号” | 鼠标、Enter、Space 激活复制均不打开详情；完整文本可用键盘／触摸取得 |
| 长中文＋三位计数＋尾部命令 | 描述可换行，金额／关键限制不截断，命令不脱离所属对象 |
| 对话框→菜单→Escape 两次 | 第一次仅关闭菜单并返回触发器，第二次按父层规则处理；组词 Escape 不关闭 |
| 同一菜单分别内嵌／portal | 菜单可选，父层不误判外部点击，焦点不反复跳回；背景仍隔离 |
| A 请求→B 请求→B 成功→A 错误／finally | B 的结果与加载状态不被 A 改写；主动取消不冒充 B 的真实错误 |
| 第一页成功→第二页失败→重试；其间切换查询 | 已读内容按权限保留，旧游标不能追加新查询，同页重复触发不重复追加 |

这些场景需要真实组件、可控异步完成顺序和相应浏览器／输入环境。不要用随机 sleep、漂亮静态截图或出现一次成功提示替代；完整读屏、真实触摸与服务端幂等仍是独立验证范围。
