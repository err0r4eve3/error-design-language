# 第十轮：稳定操作位置与连续键盘操作

读取日期：2026-10-01。目标是修复现有清单的首次勾选跳动和连续查看焦点丢失，不增加新的产品外壳。Telegram 仍固定为 Web A `28ffcf710b15571e5a2f7bb3bdce3fc90fc8ec80`，不是本轮发现的新发布。没有登录 Telegram、访问聊天或测量其线上性能。

## 实际来源与采用边界

| 来源与读取范围 | 观察到的实现／指导 | 本次采用与不采用 |
|---|---|---|
| [Telegram MessageSelectToolbar.scss](https://github.com/Ajaxy/telegram-tt/blob/28ffcf710b15571e5a2f7bb3bdce3fc90fc8ec80/src/components/middle/MessageSelectToolbar.scss)，全文 | 批量动作有独立的定位区域、计数和移动端安全区处理 | 借鉴操作区与内容区分工；数据表改用自身工具区的自然尺寸网格，不复制其底部绝对定位、透明隐藏、outline:none 或 disabled 整体 opacity |
| [Telegram MessageSelectToolbar.tsx](https://github.com/Ajaxy/telegram-tt/blob/28ffcf710b15571e5a2f7bb3bdce3fc90fc8ec80/src/components/middle/MessageSelectToolbar.tsx)，90–290 行 | 活动选择且无模态层时才注册对应键盘处理；计数和可执行命令按上下文呈现；部分命令结束选择模式 | 采用上下文与操作归属；不照搬聊天命令、div role=button 或导出后自动清空选择。本清单继续保留所选对象以支持核对与失败重试 |
| [Carbon Data table — Guidelines](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines)，Toolbar / Batch action bar 相关文字 | 表格工具与批量动作具有各自用途；选择后出现对应动作，取消退出 | 采用一致的操作区域；不强制固定行高／工具栏高度，也不照搬批量模式下禁用行内查看的建议。这里查看 B 不影响勾选 A |
| [W3C APG — Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)，焦点可见、持续、可预测与禁用控件／快捷键章节 | 焦点需可见并按上下文合理移动；控件消失／禁用需考虑回退；快捷键不替代基本键盘体验 | 进入详情与连续操作使用不同焦点策略；到达原生禁用边界回到当前标题，不跳到反向按钮。没有给普通按钮组冒加 role=toolbar |
| [WCAG 2.2 — Understanding Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)，要求与意图 | 状态消息可以通过程序语义被感知，而不必移动焦点 | 在稳定的简短状态区域通知数量／对象变化；标题已获焦点时不重复通知。DOM 断言不等于实体读屏验收 |

上述为源码／官方文字研究，未取得本轮产品截图或执行真实产品流程。没有移植第三方实现代码；网格共享尺寸、范围摘要和焦点分支为本仓库针对现有流程的实现，不声称 Telegram 使用同一方案。采用项写入现有 [集合工作流](collection-workflows.md) 与 [连续导航](continuous-navigation.md)，不再增加一个默认必读规则层。

## 由现有样例复现的问题决定修改

同一探针、同一数据下，首次勾选让首行复选框向下移动：1440px 为 90px，390px 为 141.578125px。原因是结果栏之后插入不同高度的选择栏。修改后结果摘要与选择摘要／命令共享由实际内容确定的网格区域；同一探针两种宽度位移均为 0px。这是元素几何位移，不是 CLS 分数或性能指标。

旧版以键盘激活下一项时，公共 inspect 函数重新聚焦标题；第二次 Enter 留在同一对象。候选保持可用的触发按钮焦点，第二次 Enter 继续到下一项。到末项禁用原按钮后回到标题，避免继续 Enter 反向；首次进入详情及明确关闭仍按原路径迁移焦点。

隐藏但参与尺寸计算的工具组使用 visibility、aria-hidden 和 inert，不残留隐藏 Tab 目标。当前结果范围、已选数量、已知金额覆盖依然可见；没有金额的集合不以零填缺失。颜色、分栏、原生表格和离线业务边界不变。

验证通过相同探针、定向回归和负向注入完成，结果见 [本轮记录](../evals/validation-2026-10-01-round10.md)。不把局部实现通过推断成用户速度、整站无障碍或模型平均质量提升。
