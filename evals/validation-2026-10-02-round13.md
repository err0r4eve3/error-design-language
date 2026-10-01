# 2026-10-02 第十三轮：状态组件组合与局部主题

基线 `5738a2a65aabee451010565414b6706b4847f403`，完整远程基线树 `fc6f920527a4070a7f5ea55749808a0524c7f063`。沿 PR #1 原分支提交，不合并，不改 main 或其他项目。使用相关文件快照，不是完整 checkout；15 个本轮使用的基线文件按远程 Git blob 核对。

## 修改与复现

十个文件：README、SKILL、组件契约、来源与本记录；清单 HTML／CSS、regions CSS；新增组合浏览器检查和定向 Node 检查。没有改动应用 JavaScript、共享 tokens／控件、regions HTML、旧测试、异步参考模型、46 个模型场景或准备器。入口只更新维护来源链接，仍为 7,738 UTF-8 字节。

两份样例样式此前都定义 `.dl-state`。只加载所属 CSS 时，紧凑标签为 12px，带 SVG 标记为 14px；同时加载后随顺序变为 12px 或 14px，并在 SVG 前叠加一个 9px 伪元素圆点。新清单类名 `.dl-collection-state` 与原独立状态组件分开，保留状态枚举、文本、ID 和所有交互。

独立的嵌套主题探针中，外层浅色语义模式使内层深色灰阶维护状态变成 `rgb(128, 81, 0)`。现在在每个设计边界解析维护色 token，内层显式灰阶为 `rgb(222, 222, 222)`，与同配置独立根一致。省略 opt-in 也重新采用灰阶。该默认策略不同于 Radix 的父配置继承，不能混写。

## 实际运行

Node.js 22.16.0、Chromium 144.0.7559.96、环境已有 Playwright，无新增依赖。Browser 插件未列为可用；按已知导航限制使用明确的内存样例，不尝试绕过浏览器策略。shell 拉取 GitHub 仍因 DNS 解析失败，源码与提交通过已连接 GitHub 完成。

```sh
node --test tests/color.test.cjs tests/patterns.test.cjs tests/regions.test.cjs tests/style-composition.test.cjs
DESIGN_QA_MODE=inline node tests/patterns.cjs
DESIGN_QA_MODE=inline node tests/regions.cjs
node tests/style-composition.cjs
```

浏览器命令使用 PLAYWRIGHT_MODULE／CHROME_EXECUTABLE_PATH 指向环境已有安装；每次 DESIGN_QA_DIR 为仓库外新目录。组合脚本始终是内存 fixture，可用 DESIGN_PREVIEW_DIR 指向另一份完整 assets 快照进行同检查对照。它不支持或冒充真实 URL 验证。

| 检查 | 结果与范围 |
|---|---|
| 定向 Node | 30/30：原颜色／patterns／regions 26 项与新样式所有权、变量及输出保护 4 项 |
| 原清单浏览器套件 | 22 组通过；20 个布局条件、47 对原文字对比；选择／详情、CSV、输入法、滚动和连续键盘保留 |
| 原 regions 浏览器套件 | 32 项通过，其中 16 个布局条件；84 对原文字／标记对比；原生单选、查询失败与重试保留 |
| 新组合浏览器套件 | 8 组通过；2 主题 × 3 加载顺序（含重复加载）共 6 条件 |
| 局部主题 | 24 组内外主题／颜色配置逐项与独立根对照；另测外层动态切换、内层 opt-in 变更与移除 |
| 新对比检查 | 48 对嵌套状态文字／实底采样，最低 6.7855:1；不等于整站合规 |
| 完整页面混合加载 | 两种顺序分别把额外样式加载到真实 patterns／regions 页面，走选择→详情→关闭和失败→重试路径 |
| 内容／退化 | 320px 长状态文字、单一非颜色符号、强制颜色模拟通过；不是实体设备测试 |
| 负向对照 | 新套件检出原基线；注入字号／伪元素污染或跨边界颜色后，仅由预期断言失败判为检出 |
| 输出保护 | 已有目录与源内目录均在加载浏览器前拒绝，已有报告不被错误报告覆盖 |
| 静态与范围 | 新脚本语法、新增相对链接、入口预算、十文件 diff 空白检查；清单 JavaScript 与基线逐字节相同 |

检查器初版将 `inner-scope` 容器误纳入状态采样，已限定为实际 `data-state` 节点。另发现连续 setContent 不会清理另一文档的监听，完整页面测试改为各自独立 Window，同时仍组合两份样式。不忽略控制台错误，也不把这两个测试装载问题记成产品缺陷。修正后重跑组合检查与定向 Node 全部通过。

实际查看组合前的桌面截图、修订后的桌面／手机组合截图；两份旧页面回归截图另作定向查看。截图为浏览器渲染，不是生成图；相同布局下的代码样例对照不是用户审美实验。

## 边界

本轮修复本仓库可选样式的具体组合问题，不验证全套 CSS 任意加载顺序、iframe、Shadow DOM、框架 Portal、实际宿主主题服务、网络资源加载、SSR／hydration 或真实路由。Portal 主题桥接只有源码研究与规则，没有新增运行实现。

未重跑未改的 preview／Relay、异步模型及其他 Node 套件。46 个模型行为场景、独立 A/B、真实宿主触发与 plugin-eval 未运行。没有生产接口、账户、真实服务器或费用操作；没有 Safari／Firefox、实体手机、完整读屏和真实缩放验证。不能据此推断平均生成质量、token 收益、用户效率或全站无障碍合规。
