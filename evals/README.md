# 行为评测

这些是可重复使用的场景与判定标准，不是已经通过的模型测试结果。`node --test` 只验证结构、资源和颜色工具，**不会运行模型，也不能证明 Skill 触发或行为正确**。

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

输出目录的父目录须已存在，目标必须在本 Skill 之外且尚不存在。省略 `--cases` 会准备全部 46 个场景。原文件不改动，已有结果不覆盖；错误的 ID、重复选择、越界目标及源码符号链接会被拒绝。运行前自行检查源目录只含准备纳入哈希的 Skill 文件，工具不会识别任意命名的私人文件。

`inputs/<id>.json` 只有 `prompt` 与 `context`；`review/<id>.json` 单独保存预期触发、判定条目和结果空表。全部结果为 `not_run`，fixture 为 `not_prepared`，不预置通过。`manifest.json` 记录实际文件 SHA-256 与稳定文件树摘要；`source_commit` 为 null，不能用未验证的 Git HEAD 冒充当前文件版本。点目录／点文件、依赖和指定本地测试产物目录不计入，规则写入 manifest。

**这是输入文件分离，不是宿主权限隔离或盲测保证。** 执行器不得访问 `review/`、原 `cases.json` 或判定记录；操作者需要在独立会话／目录中设置真实工具权限与相同 fixture。不要把完整准备包发给被评模型；不触发场景仍必须经过宿主的真实路由。源文件准备后应冻结，运行前核对哈希，baseline 与 candidate 独立建包。

准备器不复制测试应用，不构建截图，不调用模型或统计成绩。单元测试只检查分离、哈希、拒绝覆盖及异常处理，不能证明这 46 个场景通过或模型生成质量改善。

## 为什么这样组织

入口和按需资源遵循 [Agent Skills 规范](https://agentskills.io/specification)；用真实场景而非堆叠规则来检验改进，参考 [Anthropic 的 Skill 编写实践](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)。规范建议不是本仓库的模型效果证明。
