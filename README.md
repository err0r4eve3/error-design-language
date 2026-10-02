# Error Design Language

面向产品前端的个人Skill：灰阶结构、实色内容、精确数字、有限圆角。当前品牌和确认稿优先；评审、局部修复、打磨、新建分别约束范围。

## 使用

安装完整`error-design-language`目录，保留名称与相对路径。普通任务从[SKILL.md](SKILL.md)开始，按需读取规则；无需安装测试依赖。中文与英文UI请求都写入description，实际激活行为由宿主决定。

```text
使用 $error-design-language，改善订单页的层级和失败恢复。
保留导航、品牌色及业务逻辑，只检查本次涉及的桌面与手机状态。
```

## 找到正确入口

| 任务 | 资源 |
|---|---|
| 页面方向与工作范围 | [Skill入口](SKILL.md)、[任务工作流](references/task-workflows.md) |
| 主次与同级分组 | [视觉校准](references/visual-calibration.md)、[状态辨识](references/semantic-distinction.md) |
| 外部设计参考与动效 | [参考转译](references/reference-transfer.md)、[动效与效果](references/motion-and-effects.md) |
| 内容与文案 | [页面综合](references/design-synthesis.md)、[产品文案](references/product-copy.md) |
| 字阶、数字、主题 | [tokens.css](assets/tokens.css)、[token契约](references/token-contracts.md)、[数值与材料](references/visual-system.md) |
| 组件与应用工程 | [组件契约](references/component-contracts.md)、[应用工程](references/application-engineering.md) |
| 状态与导航 | [交互契约](references/interaction-contracts.md)、[集合工作流](references/collection-workflows.md)、[连续导航](references/continuous-navigation.md) |
| 维护与测试 | [维护边界](references/maintenance.md)、[验证原则](references/verification.md)、[行为评测](evals/README.md) |
| 历史来源和逐轮结果 | [迭代索引](history/README.md) |

## 三种不同用途的样例

[preview.html](assets/preview.html)与[regions.html](assets/regions.html)是**组件参考文档**，可以讲解控件或模拟状态；它们的讲解不能直接复制到业务副标题。[patterns.html](assets/patterns.html)是**集合任务演示**，保留原生表格、筛选、独立选择及详情；移动端显示就近的费用／状态摘要，完整列仍可滚动比较。[Relay Panel](examples/panel/README.md)是**应用工程演示**，从同一组原生模块构建页面，包含项目、账单和创建流程。

全部使用本地演示数据，不创建真实服务器或收费。复制HTML时保留对应CSS，先加载tokens再加载控件及页面样式。已有设计系统先映射角色，不重复叠加主题。`dl-collection-state`是紧凑清单状态，`dl-state`是独立图标状态；旧代码升级需同步HTML与CSS。

```sh
node examples/panel/build.cjs /tmp/relay-panel.html
```

目标必须是源外尚不存在的文件。生成HTML的import map/data模块用于便携演示，不是生产CSP建议。

## 维护检查

使用`.nvmrc`的Node基线；Node测试无需npm依赖。浏览器复用已有Playwright与Chromium，不自动安装。

```sh
node tests/run.cjs --list
node tests/run.cjs --suite unit
node tests/run.cjs --suite patterns,preview --mode inline --out /tmp/edl-qa-new
node evals/coverage.cjs
```

`--suite all --mode inline`显式选择注册的全部套件；`--out`的父目录须存在，目标位于源码／输入资源之外且尚不存在。未指定时创建新的临时目录。旧脚本可继续直接调用，仍使用共享目录保护。`PLAYWRIGHT_MODULE`可指定已有包；`CHROME_EXECUTABLE_PATH`与`CHROME_CHANNEL`二选一。

`run.json`区分pass、fail、blocked、not_run，并保留源文件哈希和环境；Node结构化累计摘要另存。零退出无完整结果不能通过。套件数、断言、布局采样与模型场景不相加。inline不验证真实URL或资源加载；合成输入法与模拟偏好不替代实体设备。

[Skill QA工作流](.github/workflows/qa.yml)只运行完整Node与覆盖定义检查，不运行浏览器或模型。52个模型场景仍是定义，样例回归不能提升它们的状态。历史CI成功不替代当前提交检查。

本轮从getdesign.md的24份设计档案与Libraries.dev的7类效果提炼[参考方法与取舍](history/research-2026-10-02-reference-transfer.md)，加入按需规则、文档结构检查及人工挑战题。没有改动现有页面、token、依赖或模型场景目录；文档结构通过不代表设计质量或模型效果已验证。历史文件物理归档、独立模型评测和真实框架集成仍是分开的维护任务。
