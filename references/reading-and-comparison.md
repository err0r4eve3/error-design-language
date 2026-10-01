# 设计书籍、公开案例与本轮取舍

调研日期：2026-10-01。基线：`9df0b89372736cfb903b9c9a834cc071e9b7878e`。这里区分书目、实际可读内容、模板作者声明、现场可读页面和本 Skill 的判断。未购买或阅读全文的书，不写成已通读；不复制或分发书籍、收费资源、第三方字体或界面实现。

## 阅读资料：按问题选，不要求先读完全部书

| 资料 | 实际读取范围 | 本轮用途与边界 |
|---|---|---|
| Adam Wathan、Steve Schoger，《Refactoring UI》 | [作者官网](https://refactoringui.com/) 的公开说明、目录和减少边框前后示例图 | 从功能出发建立层级；“更少边框”不是清除控件边界。未阅读全文。 |
| Adham Dannaway，《Practical UI》 | [作者官网](https://www.practical-ui.com/) 的章节与两条公开说明 | 描述性标题和排版关系可落成检查；英文行宽建议不直接套成中文字符数。未阅读全文。 |
| Steve Krug，《Don't Make Me Think, Revisited》 | [作者书页](https://sensible.com/dont-make-me-think/) 与 [出版社书目](https://www.pearson.com/en-us/subject-catalog/p/don-t-make-me-think-revisited-a-common-sense-approach-to-web-usability/P200000000385/9780321965516) | 用于导航、信息组织与可用性学习的阅读定位；不据书页宣称已完成可用性研究。 |
| Jenifer Tidwell、Charles Brewer、Aynne Valencia，《Designing Interfaces, 3rd Edition》 | [O'Reilly 书目与目录](https://www.oreilly.com/library/view/designing-interfaces-3rd/9781492051954/) | 将界面选择理解为任务相关模式；未取得正文，不把自拟骨架归为书中原规则。 |
| Heydon Pickering、Andy Bell，《Every Layout》 | [Sidebar](https://every-layout.dev/layouts/sidebar/)、[Stack](https://every-layout.dev/layouts/stack/)、[Axioms](https://every-layout.dev/rudiments/axioms/) 公开章节 | 采用关系式间距与由可用空间驱动的组合，不移植其组件代码，不强制 Web Components。 |
| Matthew Butterick，《Practical Typography》 | [Typography in ten minutes](https://practicaltypography.com/typography-in-ten-minutes.html) 免费章节 | 字体、字号、行高、行长需要一并看；不是为每个产品换一套艺术字体。 |

要改善当前工程型 UI，可先读 Refactoring UI 的公开示例与 Every Layout 的两章，再按问题补排版与可用性阅读。这是针对本轮任务的阅读建议，不是书籍的客观排名，也不构成必须购书的前置条件。

## 成熟产品：关注关系，不临摹品牌

[Linear 官方重设计复盘](https://linear.app/now/how-we-redesigned-the-linear-ui)（2024-03-28）讨论应用壳层、对齐、层级以及不同视图的压力测试。本轮读取正文并查看其中公开的 After 截图：导航、集合、对象内容与属性有明确区域，内容不依靠每段套卡片区分。它是历史设计过程与公开图片，不是对 2026 年登录后产品的实测。

本 Skill 采用“区分全局壳层与局部任务、按视图检查、控制改动范围”，不照抄其专有布局、不将其颜色生成系统强制引入现有项目。

[shadcn/ui Blocks](https://ui.shadcn.com/blocks) 是组件／页面组合的参考，不是所有产品都必须采用的产品模型。使用同一组件库本身不等于质量差；重要的是对象关系、业务完整性和项目内一致性。

## vibe coding 对照：小型目的抽样，不代表总体

“vibe coding”不是统一风格或质量等级。本轮选择公开 AI 模板平台上的案例作结构与能力对照，未随机抽样、未购买服务、未登录测试权限，也没有运行同提示词的 v0／Lovable 生成实验。因此不报告平均分、缺陷率或“超过多少产品”。

| 样本及证据 | 可以确认／作者声称的内容 | 不能由此推出什么 |
|---|---|---|
| [v0 Dashboard 目录](https://v0.app/templates/dashboards) | 目录含金融、CRM、管理台等不同方向；用于样本发现 | 目录和人气不是质量测量，也不说明所有 AI 产物同质化。 |
| [Rexora / Ecommerce Analytics Dashboard](https://v0.app/templates/pd25Au2LhWp) 与 [公开部署](https://v0-e-commerce-dashboard-sooty.vercel.app/) | 读取部署页文本：欢迎区、四项概览、利润、商品、订单及地区模块；模板页描述其米白和低饱和绿色方向 | 图片代理抓取失败，未作视觉或交互测量。不同收入数字在可读文本中未建立共同窗口；不能据此认定计算有错，只能说证据不足。 |
| [Lovable Product Analytics](https://lovable.dev/templates/apps/business-tools/product-analytics) | 模板页描述搜索／排序、事件属性检查、CSV、主题、认证与数据库；这些是作者功能声明 | 公开 app 返回空的可读正文；没有验证按钮、后台、权限或可访问性，不能标为测试通过或缺陷。 |
| 本仓库上一轮 `assets/patterns.html` 和相关 CSS/JS | 实际读取的本地源文件：集合筛选、数值排序、选择、详情与组词保护 | 它是交互样张，不是成熟产品；已有样张通过不能证明模型稳定地产生同等结果。 |

比较得到的不是“AI 模板只有假按钮”。公开模板已经覆盖相当多的交互能力。我们下一步的差距在于：上一轮主要证明独立控件／表格模式，需要进一步演示完整页面的视觉主次、模块协作、跨模块数据口径和下半页节奏。

## 差距 → 新规则 → 可检查结果

| 差距／风险（本轮判断） | 新规则 | 如何检查 |
|---|---|---|
| 先挑模板，后填内容 | 先写主对象、动作、必要证据，再选页面骨架 | 能解释每个区块的任务；无关 hero、地图或 KPI 不加入 |
| 反模板写成风格黑名单 | 判断内容适配，不按 serif／紫色／bento 名字判错 | 用户确认风格得到保留；有任务依据的卡片可用 |
| 组件很好看，整页没有重点 | 指定主要阅读顺序；降低邻近噪声；不同任务采用合适密度 | 审阅桌面和手机实际截图，不从 CSS 值推断质感 |
| 指标各自正确但互不一致 | 相同口径的视图共用数据源；不同时间窗或独立序列分开标注 | 增加／更新对象后核对全部依赖，不把未知当零 |
| 首屏完整，下半页拼凑 | 同时设计核心操作区、相关记录与失败恢复 | 检查全页及操作后的状态，而非只交 hero |
| 只让 happy path 好看 | 做一个能返回任务的失败路径，保留对象身份和输入 | 失败重试、关闭焦点返回、筛选后恢复 |
| 以一个示例证明 Skill 提升 | 分开示例验收和模型对照实验 | 模型场景仍为 not_run；无胜率／token 收益声明 |

具体执行规则见 [从原则到完整页面](design-synthesis.md)。上表规则由本轮综合形成，不是假借书籍或产品名义的逐字标准。

## 当前规范核对

[W3C Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)：WCAG 2.2 2.5.8 的基本尺寸与间距例外应一起解释；不能将本 Skill 偏好的 44px 舒适目标误写为所有 AA 场景的最低值。

[WAI-ARIA Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)：用于检查模态背景隔离、键盘和关闭后焦点。页面中若重新渲染列表，原触发节点可能失效；根据稳定对象 ID 恢复焦点是本轮的实现细化，不是新的浏览器规范。

未引入外部 CLI、字体下载、第三方跟踪、自动部署或付费服务。此文不要求普通前端任务联网重读全部资料。
