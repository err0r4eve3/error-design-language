# Pilot 离线起点

这些目录是评测前的材料，不是正确答案。故障场景中的缺陷故意保留；`tests/pilot-fixtures.cjs` 证明它们可复现，并用临时校准对照证明检查对改动敏感。浏览器检查和准备成功均不能把模型状态从 `not_run` 提升为通过。

| 场景 | 执行器材料 | 审查重点 |
|---|---|---|
| `fix-hover-only` | 共享 token、按钮组件、页面 hover 规则 | 深色主按钮 hover 对比；浅色与相邻操作回归 |
| `peer-same-style` | 同底同形三套餐，拥挤的标题与价格 | 空间归属、全部限制、同时比较；不强迫换色 |
| `copy-dev-brief-leak` | 有搜索、筛选、CSV 的本地实例页 | 副标题、tooltip、无障碍名称和页脚的开发摘要泄漏 |
| `payment-unknown` | 本地订单页与内存服务模拟 | 已提交但超时、重复扣款风险、原订单只读查询 |
| `build-dense-console` | 12 行固定演示数据，无预建页面 | 新建管理任务主路径；未知状态和到期时间不伪装成零 |
| `backend-negative` | SQL、结构、明确标注的合成 EXPLAIN | 真实宿主负向路由；不伪称执行过数据库 |

## 交付与隔离

运行 `node evals/prepare.cjs --out <new-directory> --cases peer-same-style,payment-unknown`。父目录必须存在、输出必须在源码外且尚不存在。

执行器只获得选中的 `inputs/<id>.json` 与 `workspaces/<id>/`。源目录中的 `review.json`、评分条目、来源清单与其他场景不能作为执行输入。审查者获得 `review/<id>.json` 中的检查清单、工作区文件哈希与原始断言。预期路由、评分与结果仍只保存在审查侧。分目录不是安全沙箱，操作者必须配置实际文件和工具权限。

准备器先验证元数据与入口，读取待复制字节并计算 SHA-256；复制使用这些字节，而不是重新读取可能变化的源文件。损坏的已知起点直接失败，缺少起点的其他场景保留 `not_prepared`。默认准备全部场景时，不会为其余场景伪造 fixture。

## 支付模拟边界

`payment-unknown/workspace/service.js` 是固定服务接口模拟，修页面时不应修改。无网络、无密钥、无真实订单或实际扣款。默认 `timeout-after-commit` 会记入模拟账本后返回超时；原始页面把超时写成失败，第二次提交确实产生第二笔模拟付款。只读 `query(orderId)` 则不产生付款。

浏览器还覆盖 `timeout-before-commit`、`declined`、`success`、`query-unavailable`。测试保留调用类型、原订单 ID、金额、币种和账本笔数；仅有按钮文案或禁用状态不足以证明安全恢复。模拟的幂等键行为不构成任何真实支付后端的幂等保证。

## 验证范围

`tests/pilot-fixtures.test.cjs` 检查复制、哈希、隔离、失败边界和模拟服务；注册的 `pilot-fixtures` 浏览器入口检查渲染、控件操作、CSV 内容、缺陷复现及临时校准对照。两者都不调用模型、真实支付或 PostgreSQL，也不验证真实宿主自动路由。

套餐截图覆盖 1440、390、320px 与浅深主题。校准仅用于检查测试灵敏度，不是模型评分的固定像素答案。独立配对会话仍按 [pilot 协议](../pilot.md) 执行，并保存失败、阻塞和未运行状态。
