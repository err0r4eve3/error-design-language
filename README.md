# 项目设计语言

面向产品前端的个人 Skill。默认黑白灰、玻璃辅助层、有限圆角与实色业务内容；保留品牌、布局和任务差异。当前明确要求与确认稿优先，历史偏好不构成迁移授权。

## 使用

安装完整目录，目录名保持 `error-design-language`，不要只复制 `SKILL.md`。支持显式 Skill 调用的 Codex 环境可使用：

```text
使用 $error-design-language，改善订单页的分组与失败恢复。
保留现有导航、品牌色和业务逻辑，验证本次涉及的桌面与手机状态。
```

| 任务 | 范围示例 |
|---|---|
| 只读评审 | 只评审，给位置、触发步骤与用户后果，不修改文件 |
| 局部修复 | 只修深色 hover 不可读，不换主题 |
| 页面打磨 | 保留认可区域，先判断主次、同级分组、状态或操作线索哪里失配 |
| 新建／重设计 | 按主任务组织完整页面，不只实现首屏 |

入口不依赖特定框架。`agents/openai.yaml` 是宿主适配，不保证各环境安装／触发方式相同。本 Skill 不自动部署、付款、注册，也不修改其他项目。

## 按需内容

| 资源 | 用途 |
|---|---|
| [入口](SKILL.md) | 范围、核心约束与完成标准 |
| [任务工作流](references/task-workflows.md) | 评审、修复、打磨、新建、参考稿和环境限制 |
| [视觉校准](references/visual-calibration.md) | 增强／降噪、表面／交互角色、密度、空态、移动任务 |
| [同级分组与状态](references/semantic-distinction.md) | 相邻对象辨识、严格灰阶、跨视图状态与动作 |
| [组件契约](references/component-contracts.md) | 同义复用、操作范围、状态维度及可复用 CSS |
| [集合工作流](references/collection-workflows.md) | 可移除筛选、选择范围、非模态详情与返回位置 |
| [页面综合](references/design-synthesis.md) | 内容骨架、构图和跨模块口径 |
| [产品文案](references/product-copy.md) | 不把开发说明写进产品标题；保留必要条件 |
| [数值与材料](references/visual-system.md) | 灰阶、字号、形状、玻璃与降级起点 |
| [界面细节](references/craft-details.md) | 中文、数字、图标、密度与内容压力 |
| [交互契约](references/interaction-contracts.md)／[界面模式](references/interface-patterns.md) | 表单、异步、键盘、输入法、表格、选择、URL 隐私 |
| [项目适配](references/product-profiles.md) | 历史任务组织；不是当前实现证据或写入授权 |
| [验收与证据](references/verification.md) | 按风险选检查，区分页面、工具与模型证据 |
| [行为评测](evals/README.md) | 46 个待执行场景、配对方法和离线准备器 |
| [第八轮调研](references/research-2026-10-01-round8.md) | Cloudflare、Supabase、Vercel 与 Cloudscape 的对照 |
| [第七轮调研](references/research-2026-10-01-round7.md) | Impeccable Extract、Carbon、W3C 与采用边界 |
| [第六轮调研](references/research-2026-10-01-round6.md) | Impeccable 与四个官方设计系统的采用／不采用 |

普通执行不一次读取全部参考、历史和测试。追溯时再看 [早期调研](references/research-2026-10-01.md)、[书籍与案例](references/reading-and-comparison.md)、[第四轮资料](references/research-2026-10-01-round4.md) 和 [历史依据](references/evidence.md)。分享个人 Skill 前检查项目名和来源文档是否适合公开。

## 复用样例

依次加载 [tokens.css](assets/tokens.css) 与 [components.css](assets/components.css)。容器设 `data-design="error"`，主题设 `data-theme="neutral"` 或 `dark`。按钮 `dl-button`，主操作加 `primary`，轻操作加 `quiet`；输入为 `dl-input`／`dl-select`。控件有独立盒模型，不依赖样张全局 reset；事件和可访问语义由使用方实现。

已有设计系统先映射角色，不叠加第二套主题。`workspace` 指辅助工作区，并非两主题都更暗的凹入层。语义色不局限于安全提示，明确的严格灰阶要求仍优先。CSS 材料是轻量近似，不宣称光学折射。

[交互样张](assets/preview.html) 使用同目录 `tokens.css`、`components.css`、`preview.css`；[服务清单样张](assets/patterns.html) 使用 `tokens.css`、`components.css`、`patterns.css`。保留相对路径即可打开。清单演示数值排序、逐项移除筛选、已选 CSV 导出与非模态详情；批量选择和当前查看对象分开，未知月费与覆盖范围保持可见。两份样张均不请求外部服务、不持久化交互状态；只有主动导出才生成文件，不代表真实账单或业务。Relay 是会话独立应用示例，不是仓库默认模板。

[分组与状态样例](assets/regions.html) 另加载可选的 [regions.css](assets/regions.css)：提供静态指标组、原生单选变体，以及独立的服务状态／读取反馈。无新框架或运行依赖；默认灰阶，显式 `data-status-color="semantic"` 才启用局部语义色。它是组件文档，不是产品页面模板；不把其中演示说明复制到业务标题。

## 维护检查

普通使用不需要测试依赖。结构、颜色数学及本地工具检查使用 Node.js 内置运行器：

```sh
node --test tests/*.test.cjs
```

可选浏览器检查复用已有 Playwright 与 Chromium：

```sh
node tests/preview.cjs
node tests/patterns.cjs
node tests/regions.cjs
```

`PLAYWRIGHT_MODULE` 可指定现有包。`CHROME_CHANNEL=chrome` 或 `CHROME_EXECUTABLE_PATH` 选择浏览器，两者不要同时设置。`DESIGN_QA_DIR` 指向仓库外新证据目录，父目录须存在；`DESIGN_PREVIEW_DIR` 仅用于维护时对照同结构资源。

若环境禁止页面导航，显式选择内存 fixture，不绕过策略：

```sh
DESIGN_QA_MODE=inline node tests/preview.cjs
DESIGN_QA_MODE=inline node tests/patterns.cjs
DESIGN_QA_MODE=inline node tests/regions.cjs
```

内存模式把本地 CSS 嵌入 HTML，使用 `setContent`；不验证 URL 或真实资源加载。默认仍为 `file`。对比度工具只覆盖受控实色与支持的合成；未知背景拒绝判断，不冒充复杂玻璃像素验证。合成 composition 事件、窄视口和模拟系统偏好也不替代真实设备。

第六轮另提供离线输入准备：

```sh
node evals/prepare.cjs --out /tmp/edl-run-01 \
  --cases peer-same-style,strict-monochrome-status,comparison-disclosure
```

目标必须是源目录外尚不存在的目录，父目录须存在。只生成输入、分离的判定记录、SHA-256 和 `not_run` 模板，不执行模型／页面，也不创建应用 fixture。输入文件分离不等于权限隔离，细节见 [评测说明](evals/README.md)。46 个场景的定义和准备器单元测试不是 46 项模型通过结果。

## 迭代与验证记录

历史结果只代表对应轮次的实际执行；不能合并为当前所有文件均已重新验证。

| 轮次 | 重点 | 验证记录 |
|---|---|---|
| 1 | 范围、交互契约、控件与焦点 | [第一轮](evals/validation-2026-09-30.md) |
| 2 | 同类 Skill、产品模式、输入法与清单 | [第二轮](evals/validation-2026-10-01.md) |
| 3 | 书籍与完整页面、Relay 示例 | [第三轮](evals/validation-2026-10-01-round3.md) |
| 4 | 开发文案隔离、宏观层级 | [第四轮](evals/validation-2026-10-01-round4.md) |
| 5 | 同级指标与维护／未知辨识 | [第五轮](evals/validation-2026-10-01-round5.md) |
| 6 | 统一冲突规则、有条件的设计选择、离线评测准备 | [第六轮](evals/validation-2026-10-01-round6.md) |
| 7 | 组件契约、状态样例与浏览器负向回归 | [第七轮](evals/validation-2026-10-01-round7.md) |
| 8 | 同类控制台、集合工作流、清单样例更新 | [第八轮](evals/validation-2026-10-01-round8.md) |

自动断言、截图审阅、真实路径和模型配对是不同证据；测试通过不证明平均生成质量、全站无障碍合规或相对其他工具的优势。
