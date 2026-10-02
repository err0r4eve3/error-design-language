# 2026-10-01：Impeccable、文案隔离与层级

本轮响应用户明确反馈：不要把开发功能说明写进标题／副标题；Relay 不应主要依靠分割线划分区域。以下为实际阅读范围与独立取舍，不是效果排名，也没有运行第三方 CLI。

## Impeccable：固定源码

核对提交 `c74755d920985f7a92cef691ca970ba95f90126e`，不是沿用已弃用的 frontend-design 入口。读取：

- [入口](https://github.com/pbakaus/impeccable/blob/c74755d920985f7a92cef691ca970ba95f90126e/skill/SKILL.src.md)：按具体页面的访客任务区分模式，打磨保留既有身份；验证应分批且有停止条件。
- [clarify](https://github.com/pbakaus/impeccable/blob/c74755d920985f7a92cef691ca970ba95f90126e/skill/reference/clarify.md)：整条路径检查文案；标题已说清的内容，不应被介绍重复；帮助应回答隐含问题。
- [layout](https://github.com/pbakaus/impeccable/blob/c74755d920985f7a92cef691ca970ba95f90126e/skill/reference/layout.md)：阅读顺序、接近关系、紧疏节奏、内容拓扑与窄屏适配；干净的机械扫描不能证明层级成立。
- [distill](https://github.com/pbakaus/impeccable/blob/c74755d920985f7a92cef691ca970ba95f90126e/skill/reference/distill.md)：删重复和装饰性复杂度，但保留任务能力、无障碍和决策信息。
- [官方反模式目录](https://impeccable.style/slop/)：核对重复 UX 文案、平坦字号、同值间距和标题接近上一组等条目；目录本身说明示例经过刻意夸张，命中需要结合语境判断。

采用这些分析问题，不复制命令体系、强制安装器、hooks、评分、角色扮演或自动持久化。不会机械采用“文案连续减半”、字体数量上限、移除所有侧栏、去法律提示等激进简化。用户的灰阶方向、必要玻璃和事实约束优先。

## 社区与设计资料

| 原始资料与阅读范围 | 采用 | 边界 |
|---|---|---|
| [Smashing：How To Improve Your Microcopy（2024-06）](https://www.smashingmagazine.com/2024/06/how-improve-microcopy-ux-writing-tips-non-ux-writers/)，公开正文 | 使用具体动作与有用的解释；在要求敏感信息或非显然操作时交代理由 | 作者实务建议，不是点击率的普适因果证据 |
| [Smashing：Dominance, Focal Points And Hierarchy（2015-02）](https://www.smashingmagazine.com/2015/02/design-principles-dominance-focal-points-hierarchy/)，公开正文 | 通过相对视觉重量表达内容优先级；尺寸、明暗、密度和空间共同作用 | 不照搬固定层级数量或断言单个手段必然改善任务速度 |
| [NN/g：Proximity Principle in Visual Design](https://www.nngroup.com/articles/gestalt-proximity/)，公开正文 | 标题应更靠近自己的内容，相关元素接近，分组不只靠框线 | 不是某个像素间距或比例的统一规范 |
| [UX Stack Exchange：重复标签页标题是否保留页标题（2015-03）](https://ux.stackexchange.com/questions/74626/do-i-still-need-to-show-a-header-if-im-just-replicating-the-title-of-a-tab)，问题、回答及评论 | 社区回答提醒：移动端导航收起、读屏按标题浏览时，页标题仍有作用 | 单个回答，不代表社区共识；不采用“内部应用不会有盲人使用”的评论推断 |
| [Better Stack Community：Impeccable（2026-05-04）](https://betterstack.com/community/guides/ai/ai-development/impeccable-ai/)，公开教程 | 参考把模糊的美化任务拆成具体诊断与操作的讲解 | 版本和命令数量以固定源码为准；不移植教程安装流程，不宣称复现实验 |

## 从反馈到变更

“开发功能清单不得混入产品标题”是用户明确要求，本 Skill 将其扩展成有语境的文案规则；不是声称 Impeccable 有完全相同的禁令。主标题保留对象，副标题可空，能力由控件表达；演示性质、费用缺口、时间窗和失败恢复仍在需要的位置可见。

“去装饰分割线截图”是本轮的本地诊断方法：保留输入边界和焦点，检查内容是否仍自然成组；它不是标准测试或第三方检测器功能声明。Relay 的字号／背景／间距断言只是此样例的回归条件，不写成普适美学分数。

资料来自目的性小样本，不足以概括一般 vibe coding 产品。未运行 Impeccable 二进制、独立模型 A/B 或用户任务时间测试。
