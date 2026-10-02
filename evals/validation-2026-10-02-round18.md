# 第十八轮：合并主分支、完整 Node CI 与结果协议

PR #1 已通过普通 merge 合并，合并提交为 `1fa7c7ad90c99c4fbd8a111422a1bc8af8ef4041`，树为 `30eadaa62263df3c0d6e7f96386994232ecd4be7`，与第十七轮候选树相同。本轮从这个固定主分支建立新迭代，不在已关闭的 PR 分支续写。

## 复现与修复

- 离线准备器测试仍断言场景数为46，而当前定义为52。相同基线脚本实际运行：10项中9通过、1失败。改为检查当前定义的全部ID与输入、独立评审记录一一对应；新增场景后不再仅更新一个数量常量。
- Runner 的 `reportPassed` 对 `{status:'pass',passed:false}` 和带 `error` 的 pass 报告原来返回通过。修复后矛盾成功标志、错误或不完整报告都失败；保留现有套件的合法报告形式。
- Unit 原来只凭进程零退出通过。新增 `tests/support/unit-reporter.cjs`，直接消费 Node 的 `test:summary`，区分各文件摘要和最终累计摘要。没有唯一最终汇总、全 skip／todo、失败或取消都不能判通过；原 TAP 日志仍保留，不解析它来推断计数。
- `tests/skill.test.cjs` 的 HTML 检查不再只列最初的preview和patterns，而是枚举当前实际样例，纳入regions。
- 新增固定 Node 22.16.0 的 `.nvmrc` 与仅 Node 的 GitHub Actions；PR至main、main推送或手动触发时运行完整unit及覆盖索引。Actions固定完整SHA，权限只有contents:read，检出凭据不持久化，无安装业务依赖、部署或模型调用。浏览器CI不在这次新增范围。

## 已执行的本地检查

Node22.16.0；Playwright Core `1.57.0-beta-1764944708000`，Chromium144.0.7559.96，复用现有安装。Browser插件未列为可用；浏览器只用原有inline模式，不绕过导航限制。shell不能解析github.com，远端读写用连接器。本地是附件恢复并按Git blob核对的相关快照，不是完整checkout。

```sh
node --test tests/color.test.cjs tests/patterns.test.cjs tests/regions.test.cjs tests/async-contract.test.cjs tests/style-composition.test.cjs tests/choice-layout.test.cjs tests/submit-feedback.test.cjs tests/dialog-reading.test.cjs tests/qa-runtime.test.cjs tests/qa-runner.test.cjs tests/coverage.test.cjs tests/eval-prepare.test.cjs tests/unit-reporter.test.cjs
node tests/run.cjs --suite preview,patterns,regions,style-composition,choice-layout,submit-feedback,dialog-reading --mode inline --out /tmp/edl-r18-new
```

上述13份Node文件共130项通过，0失败、0取消、0跳过；不称为完整仓库全部Node测试。通过统一入口运行七套浏览器全部通过，unit在这条浏览器命令中未选择，保持not_run。全部8个assets、入口SKILL.md、52个场景与覆盖索引未改；没有新增设计截图或页面质量结论。

结构化报告器另有真实Node子进程的通过、失败、全skip、全todo探针。后二者本身退出0，但Runner判为fail，避免把未执行的检查算作成功。报告器不证明测试内部具有充分断言，也不是敌对代码的安全隔离。

第一次浏览器命令因外层工具超时被终止，保留为中断记录，不计为通过；随后在新的独立目录重跑七套完成。报告器测试初版继承父Node测试IPC环境而没有生成预期JSON，已修正独立测试子进程环境并重跑，不将测试脚手架问题称为页面缺陷。

## CI与证据边界

工作流写入时尚未取得对应提交的远端CI结果；最终是否成功以PR检查与后续实际运行记录为准，不能把YAML校验当成CI已执行。静态解析已核对触发范围、只读权限、Actions完整SHA和固定Node版本输入。

52个模型场景、冻结的多项目应用基准、宿主路由、框架Portal／缓存／多字段表单、浏览器依赖锁与洁净浏览器安装仍未验证。没有Safari／Firefox、真实URL资源、完整读屏、实体设备或业务后端。此次Node CI不代表这些层级已通过。

## 官方依据与读取范围

[Node 22.16 test:summary](https://nodejs.org/download/release/v22.16.0/docs/api/test.html#event-testsummary)：读取累计／每文件事件、counts和success语义；使用结构化事件，不依赖TAP文本版式。没有运行上游Node测试。

[GitHub Actions安全使用](https://docs.github.com/en/actions/reference/security/secure-use)：读取最小权限、完整SHA固定与不可信输入处理。核对actions/checkout v5、actions/setup-node v5、actions/upload-artifact v4对应Git ref；setup-node固定提交的action.yml确认node-version-file和package-manager-cache输入。固定版本为复现而非宣称最新。
