# 项目设计语言

面向产品前端的个人 Skill。默认黑白灰、液态／毛玻璃辅助层、有限圆角与实色业务内容；保留各项目的身份、布局和任务差异。当前明确要求与已确认参考设计优先，不把每次修复都变成换肤。

## 使用

把完整目录安装到宿主支持的 Skill 目录，目录名保持 `error-design-language`，不要只复制 `SKILL.md`。支持显式 Skill 调用的 Codex 环境可使用：

```text
使用 $error-design-language，优化订单页的层级与失败恢复，
保留现有导航和业务逻辑，验证本次修改涉及的桌面与手机状态。
```

| 任务 | 调用时说明 |
|---|---|
| 只读评审 | “只评审，不修改文件；给出位置、触发步骤和用户后果。” |
| 局部修复 | “只修复深色按钮 hover 不可读，不改导航或整体配色。” |
| 页面打磨 | “保留结构，改善阅读层级、操作流程与移动体验。” |
| 新建／重设计 | “按主任务决定布局，做完整路径，不只做首屏。” |

入口和相对资源不依赖特定框架；`agents/openai.yaml` 是宿主适配元数据，不保证所有工具都支持相同安装方式或触发行为。Skill 不自动部署、付款、注册或修改其他项目。

## 内容

| 文件 | 用途 |
|---|---|
| [SKILL.md](SKILL.md) | 模式选择、核心约束和完成标准 |
| [任务工作流](references/task-workflows.md) | 评审、修复、打磨、新建及工具受限处理 |
| [交互契约](references/interaction-contracts.md) | 控件语义、键盘、异步状态、失败恢复和中文压力 |
| [数值与材料](references/visual-system.md) | 灰阶、排版、圆角、玻璃与降级 |
| [项目适配](references/product-profiles.md) | 按已知项目的任务组织选择相关语境 |
| [验收与证据](references/verification.md) | 选取检查、区分证据层级与验证边界 |
| [依据与边界](references/evidence.md) | 私人偏好来源，仅在追溯或处理冲突时读 |
| [交互样张](assets/preview.html) | 离线演示，不是真实业务数据 |
| [行为评测](evals/README.md) | 14 个回归场景与配对比较方法；不是已通过结果 |

普通执行只读相关参考文件，不一次加载全部历史和维护测试。分享此个人 Skill 前检查来源文档是否适合公开。

## 复用样例

按顺序加载 `assets/tokens.css` 和 `assets/components.css`。容器设 `data-design="error"`，主题设 `data-theme="neutral"` 或 `dark`；按钮类 `dl-button`，主操作加 `primary`，轻操作加 `quiet`；输入和选择器为 `dl-input`／`dl-select`。它们拥有自己的盒模型约束，不需要样张的全局 reset。事件处理和可访问语义仍由使用方实现。

已有设计系统先映射语义 token，不叠加另一套全局主题。液态玻璃为 CSS 材质近似，不是真实光学折射。样张直接用浏览器打开，保留同目录三个 CSS 文件；无远程资源、业务请求或持久化。

## 维护检查

普通使用不需要测试依赖。仓库结构与颜色工具测试使用 Node.js 内置测试运行器：

```sh
node --test tests/*.test.cjs
```

可选浏览器回归使用现有 Playwright 和 Chromium：

```sh
node tests/preview.cjs
```

`PLAYWRIGHT_MODULE` 可指向现有 Playwright 包；`CHROME_CHANNEL=chrome` 选择已安装 Chrome，或用 `CHROME_EXECUTABLE_PATH` 指定浏览器，两者不要同时设置。`DESIGN_QA_DIR` 可设为仓库外的截图和 JSON 结果目录。`DESIGN_PREVIEW_DIR` 仅供维护时对比另一套同结构样张资源。

环境禁止页面导航时，显式选择内存 fixture 模式，不绕过宿主策略：

```sh
DESIGN_QA_MODE=inline node tests/preview.cjs
```

它把样张的三个本地 CSS 嵌入 HTML，通过 `setContent` 运行；**不验证 URL 导航或真实资源加载**。默认仍为 `file` 模式。

浏览器检查涵盖 24 组主题／材质／宽度、39 项受控实色文字对比、6 项键盘焦点、4 项输入边界，以及单选、模态背景隔离和焦点返回、空结果、提交防重与失败恢复。另检查控件独立复用、长标签、系统偏好，并用反例确认检查器能拒绝消失的焦点环和不支持的渐变测色。

自动测试不能代替截图审阅、真实设备、接口验收或整站无障碍审核。玻璃上的复杂背景不在该对比度算法范围内。行为场景必须另行运行模型；结构测试通过不代表 14 个场景通过。参见 [本次验证记录](evals/validation-2026-09-30.md)。
