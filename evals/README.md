# 行为评测

这些是可重复使用的场景与判定标准，不是已经通过的模型测试结果。`node --test` 验证结构、资源、本地工具及显式编写的代码契约，**不会运行模型，也不能证明 Skill 触发或行为正确**。

## 覆盖索引

运行 `node evals/coverage.cjs` 检查 [coverage.json](coverage.json)：52个模型场景均有能力归属，9个注册浏览器套件（8个样例、1个fixture复现）均有关联；新增6项针对样式归属、局部主题、提交草稿、长文阅读、独立请求域和嵌套浮层。场景定义、样例回归与真实应用／模型运行分别记录，不能因关联套件通过就把模型状态改成pass。真实双面板或框架Portal fixture缺失时仍是blocked，不用参考模型代替。

索引没有执行器，也没有解决宿主权限隔离；52项仍是未执行的模型场景。独立基准应先冻结应用输入和运行预算，再保留原始输出、轨迹和判定结果。套件统一入口与规则所有者见 [维护边界](../references/maintenance.md)。

## 怎么比较

使用 [cases.json](cases.json)。每次在独立会话与独立工作目录中，向同一模型提供 `prompt` 和 `context`；不要把 `must`、`must_not` 与评分信息放进模型输入。执行型场景先按 context 准备相同的最小代码 fixture；没有对应环境时标为 `blocked`，不能按想象判通过。两个不触发场景需要宿主的实际 Skill 路由环境，不能先强制加载本 Skill 再测是否触发。

对比基线与候选时保持模型版本、工具权限、输入、fixture、预算及采样配置一致；保存 Skill 的 commit、原始输出、工具轨迹、diff 与截图。先记录输出，再按标准判定，避免边看答案边修改标准。主观视觉项可隐藏版本并交换展示顺序；一次成功不能代表稳定性。

每项 `must` 与 `must_not` 都独立给出证据和 pass／fail／blocked。出现越权写入、伪造验证、虚构业务结果或违反明确范围时，该场景直接失败，不用审美分数抵消。未执行项为 `not_run`。不要用关键词命中率替代真实路径和范围判断。

## 最小结果记录

```json
{
  "case_id": "fix-hover-only",
  "skill_commit": "实际提交 SHA",
  "model": "实际模型版本",
  "status": "not_run",
  "assertions": [],
  "artifacts": [],
  "limitations": []
}
```

`artifacts` 只记录实际存在的输出、轨迹、diff、截图。统计时分别报告已执行、通过、失败、blocked、not_run；不同宿主不能混成一个触发率。计费 token 使用宿主真实 usage；UTF-8 字节、字符和行数都不等于 token。

## 离线准备执行包

可用内置 Node.js 运行；不安装依赖、不联网，不运行模型：

```sh
node evals/prepare.cjs --out /tmp/edl-run-01 \
  --cases peer-same-style,strict-monochrome-status,comparison-disclosure
```

输出目录的父目录须已存在，目标必须在本 Skill 之外且尚不存在。省略 `--cases` 会准备全部 52 个场景。原文件不改动，已有结果不覆盖；错误的 ID、重复选择、越界目标及源码符号链接会被拒绝。运行前自行检查源目录只含准备纳入哈希的 Skill 文件，工具不会识别任意命名的私人文件。

`inputs/<id>.json` 只有 `prompt` 与 `context`；`review/<id>.json` 单独保存预期触发、判定条目和结果空表。全部模型结果仍为 `not_run`。六个 pilot 场景的离线起点复制到 `workspaces/<id>/`，只有复制和哈希完成后才标 `fixture_status: prepared`；没有随仓库提供起点的其余场景仍为 `not_prepared`，不预置通过。`manifest.json` 记录实际文件 SHA-256 与稳定文件树摘要；`source_commit` 为 null，不能用未验证的 Git HEAD 冒充当前文件版本。点目录／点文件、依赖和指定本地测试产物目录不计入，规则写入 manifest。

**这是输入文件分离，不是宿主权限隔离或盲测保证。** 执行器只拿选中的 `inputs/<id>.json` 和 `workspaces/<id>/`，不得访问 `review/`、`manifest.json`、原 `cases.json` 或判定记录；操作者需要在独立会话／目录中设置真实工具权限与相同 fixture。不要把完整准备包发给被评模型；不触发场景仍必须经过宿主的真实路由。源文件准备后应冻结，运行前核对哈希，baseline 与 candidate 独立建包。

准备器会复制已有的离线 fixture，但不执行代码、不构建截图、不调用模型或统计成绩。每个工作区之外的 `review.json` 只供审查者使用；准备时拒绝缺失入口、损坏元数据、隐藏文件与符号链接。原始故障特意保留，浏览器套件验证故障复现与校准对照，而不是替模型完成修复。这些检查不能证明 52 个模型场景通过或生成质量改善。

六个起点、服务模拟条件与审查边界见 [fixture 说明](fixtures/README.md)。运行 `node tests/run.cjs --suite pilot-fixtures --mode inline` 可单独验证这些起点；`--suite all --mode inline` 自动包含它。

## 确定性只读列表契约（不是模型评测）

```sh
node --test tests/async-contract.test.cjs
```

使用 Node.js 18+ 的内置 API，无依赖、网络、浏览器和随机延迟。维护测试由 [公共探针](../tests/contracts/async-list.cjs)、[测试参考模型](../tests/fixtures/async-list.cjs) 和 [测试入口](../tests/async-contract.test.cjs) 组成；后者在内存中移除保护以验证断言确实能检出已知错误，不改写磁盘文件。虚拟机只用于隔离测试代码，不是安全沙箱。

当前策略是单个只读列表的“新请求替代旧请求”：同查询刷新保留权威数据，切换查询／排序／授权范围使旧权威快照失效，分页串行去重。它不实现共享缓存、乐观写、HTTP 重试或 UI，不应被作为生产查询客户端导入。多个独立实例互不取消。

真实项目复用探针时提供 `factory(loadPage)`，返回以下接口；适配器只映射已有状态，不过滤失败结果、补做保护或改变业务来让测试通过：

| 接口 | 约定 |
|---|---|
| `load({scope, query, sort})` | 启动读取，返回在本次成功／错误／收尾均处理后完成的 Promise；启动状态须同步可观察 |
| `loadMore()` | 读取当前结果的下一页；没有下一页／正在首读时完成为 `skipped`；重复激活只发一个请求 |
| `read()` | 返回独立快照：`context`、`dataContext`、`items`、`hasData`、`cursor`、`busy`、`phase`、`error`、`disposed` |
| `dispose()` | 当前提交域失效，后续完成不得写回；该测试策略清空权威快照并拒绝再次 load |
| 注入的 `loadPage({context,cursor,signal})` | 返回 `{items:[{id:string}], nextCursor?:string|null}`；探针故意忽略 signal，主动安排成功／拒绝顺序 |

`scope` 是已有授权边界的非敏感标识；权限／会话变化应改变该标识或使相应缓存失效，不是令牌本身。`items` 是当前上下文的权威快照；呈现中的旧占位行必须另有身份，不能在适配层假装已经匹配。`hasData=false` 和成功空数组不同；`phase` 为 idle／loading／refreshing／loadingMore，`error.kind` 为 initial／refresh／page。此模型只接受字符串游标，以 null 表示结束；其他协议须明确转换，不将合法的空串／零误作结束。

需要 React 调度或其他异步提交的适配应先提供受控的 flush／act 版本探针；不要声称未经适配即可直接验证 Hook。采用缓存命中、共享在途去重、保留占位、并行多页或不同销毁策略的应用应记录差异并调整验收前提，不能强迫所有库实现同一种“最新请求优先”。测试参考模型和应用不是同一受测对象。

本套件不读 `cases.json`，不更新52个模型场景，也不验证嵌套浮层、读屏、视觉、浏览器历史、网络层或服务端幂等。读过上游源码、参考模型通过和应用适配通过必须分别报告。运行结果及八个反例的实际覆盖见 [第十二轮记录](validation-2026-10-02-round12.md)。

## 为什么这样组织

入口和按需资源遵循 [Agent Skills 规范](https://agentskills.io/specification)；用真实场景而非堆叠规则来检验改进，参考 [Anthropic 的 Skill 编写实践](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)。规范建议不是本仓库的模型效果证明。
