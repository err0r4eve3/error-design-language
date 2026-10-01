# 第十二轮：数据身份、占位结果与确定性竞态

继续第十一轮的只读异步规则，本轮不改已认可页面，不增 UI 框架，也不把每个代码问题升级为全站状态管理器。来源是可读的具体实现与官方解释，不以星数、品牌或“成熟项目”替代判断。

## 实际读取

TanStack Query 固定到 `782b2e6fff01175e89c6af0a4d7c7a2c5a3a2676`（连接器返回的提交时间为2026-10-01）。下列范围是实际读取，不表示当前全部实现或其他版本行为相同。

| 来源 | 读取范围 | 可以支持的判断 |
|---|---|---|
| [retryer.ts](https://github.com/TanStack/query/blob/782b2e6fff01175e89c6af0a4d7c7a2c5a3a2676/packages/query-core/src/retryer.ts) | 全文 | cancel 先拒绝内部 Promise；后续 resolve/reject 检查是否已结算，不只依赖传输遵守 signal |
| [queryObserver.ts](https://github.com/TanStack/query/blob/782b2e6fff01175e89c6af0a4d7c7a2c5a3a2676/packages/query-core/src/queryObserver.ts#L575-L735) | 440–570、575–735行 | 占位数据可使 status 成为 success，同时保留 isPlaceholderData；fetchStatus 与数据状态分别暴露 |
| [Query Cancellation](https://github.com/TanStack/query/blob/782b2e6fff01175e89c6af0a4d7c7a2c5a3a2676/docs/framework/react/guides/query-cancellation.md#L1-L85) | 1–85行 | 默认未使用查询可完成并进入缓存，消费 signal 会改变取消行为；不能概括成所有卸载都必须 abort |
| [Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) | 官方 v5 正文，2026-10-02读取 | 影响查询结果的变量应进入数据键；对象与数组的键语义有明确约定 |
| [React Router Race Conditions](https://reactrouter.com/explanation/race-conditions) | 官方正文，2026-10-02读取 | 导航和不同 fetcher 的并发域不同；浏览器取消不保证服务器停止处理 |

在线 TanStack Cancellation / Paginated 页发生读取超时，因此不依据其缺失正文作结论；取消行为采用固定仓库文档，占位语义采用实际读取的 QueryObserver 段落。未运行这两个上游项目，也没有登录、抓取账户数据、进行性能或线上视觉测试。

## 采用与边界

**键不是请求票。** 查询条件可以相同，意图和授权会话仍可能变化。数据缓存身份负责“这是什么结果”，提交域与在途身份负责“谁可以改变这个视图”。A→B→A 探针针对已被替代的请求，不否定查询库在其契约内重新订阅合法缓存或复用同键在途请求。

**成功状态不是新数据证明。** 标明当前正在请求的条件，以及可见数据实际所属的条件。占位旧数据、上次成功快照、当前请求结果不能共用一个未限定的“已更新”。不能从旧页的 hasMore、金额或记录范围推导新页操作；这些是从源码机制推导的产品规则，并非上游自动替应用实现。

**取消只影响其负责范围。** 一个列表开始新请求不应取消另一独立面板；旧成功、错误和收尾都受归属约束。只读加载保护不延伸为付款撤销、服务端幂等或乐观写回滚；本轮未添加这些实现。

**不透明游标按协议判空。** 本测试模型允许空字符串游标、以 null 表示结束。此选择专为检出 truthiness 假设，不宣称任何上游 API 使用空字符串；真实项目转换须遵循后端契约。

本轮没有复制上游源码或安装依赖。[测试参考模型](../tests/fixtures/async-list.cjs) 为本仓库独立编写、仅供测试。它不提供缓存、重试、并发多页或 UI；同查询刷新保留数据、换上下文清空权威快照是本模型明确选择，不是全项目默认规范。

## 从规则到可复用检查

[公共探针](../tests/contracts/async-list.cjs) 通过 load / loadMore / read / dispose 接口观察状态，注入可手动完成的 Promise。传输故意忽略 abort，不以快速取消掩盖迟到回调。断言不读内部 active 变量或实现源码；测试入口仅在负向对照中内存修改已知保护语句。

16个顺序探针覆盖首次空结果、旧成功／错误／收尾、A→B→A、同查询换账户／会话、排序重置游标、刷新失败、重复分页、追加失败重试、跨查询同游标、卸载、当前 AbortError、快照隔离和无效响应。另测独立实例与同步抛错；VM原版对照须通过同一套探针，八种破坏只接受预期断言失败，不能用任意异常冒充检出。

这轮将第十一轮“旧回调／分页归属”的部分要求变为可执行的测试模型契约，不是执行了那六个完整组合验收场景。嵌套浮层、portal、真实应用适配、占位数据的实际呈现和46个模型场景均未验证。参见 [适配说明](../evals/README.md) 与 [本轮实际运行](../evals/validation-2026-10-02-round12.md)。
