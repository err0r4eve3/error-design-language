# 第十七轮：架构审计后的定向修复

固定远端基线 `44d80ba325c370aea3b0d3a3db5c12a57b84e9e9`，原 PR #1 分支；只改测试基础设施、覆盖定义和维护索引，不改应用页面、共享样式、业务逻辑或主分支。当前工作目录是经 Git blob 核对的相关快照，不是完整 checkout；提交基于完整远端树增量构造，不删除未下载文件。

## 实际修复

- 七个浏览器入口复用 `tests/support/qa-runtime.cjs`：源码与替代资源范围校验、独占目录、报告所有权、浏览器选项／启动以及整页内存样式装载。保留各套件的业务断言和原报告文件名。
- 修复旧preview在错误处理中覆盖已有validation.json或写入源码的问题。被拒绝目录不写错误报告，缺少Playwright或浏览器未能启动标blocked并退出2；页面断言或配置错误退出1。旧直接调用入口仍可用。
- `tests/run.cjs`与`tests/suites.json`提供显式选套件、模式校验、独立子目录和总运行记录。未选套件为not_run，零退出但无有效通过报告不算通过；不累加不同口径的断言／布局数量。默认仅Node，不自动启动浏览器或安装依赖。
- `evals/coverage.json`与检查脚本关联11类能力、全部52个模型场景和7套样例；在原46项末尾新增6项，原条目保持原样。模型与应用集成仍为not_run，不因关联测试通过而升级。
- 维护索引指定规则主定义位置与应用文档的引用责任；没有批量重写旧规则、强制增加必读资料或改变设计偏好。SKILL.md保持7,709字节。

## 实际验证

Node.js22.16.0；现有Playwright Core `1.57.0-beta-1764944708000`，Chromium144.0.7559.96。Browser插件不在可用列表；沿用明确inline模式，不尝试绕过此前导航限制。没有安装依赖或运行真实服务。plugin-eval命令不存在，未运行。

```sh
node --test tests/color.test.cjs tests/patterns.test.cjs tests/regions.test.cjs tests/async-contract.test.cjs tests/style-composition.test.cjs tests/choice-layout.test.cjs tests/submit-feedback.test.cjs tests/dialog-reading.test.cjs tests/qa-runtime.test.cjs tests/qa-runner.test.cjs tests/coverage.test.cjs
node tests/run.cjs --suite preview,patterns,regions,style-composition,choice-layout,submit-feedback,dialog-reading --mode inline --out /tmp/edl-qa-new
node evals/coverage.cjs
```

浏览器命令另以PLAYWRIGHT_MODULE和CHROME_EXECUTABLE_PATH指定本环境实际安装。标准默认路径与其他机器的洁净安装未验证。

| 检查 | 结果与覆盖 |
|---|---|
| 定向Node | 111通过，0失败、0取消、0跳过；此前67项及新增44项，不代表完整仓库全部单元测试 |
| 七入口输出保护 | 每个入口均检查已有目录、源码路径、指向源码的父级符号链接及缺少浏览器依赖；已有报告保留、源码不写入 |
| 共享文件保护 | 只更新本次拥有的报告；拒绝越界名称、陌生文件、已被替换的目录、悬空链接及不存在的父目录 |
| 统一入口 | 未知／重复套件、重复参数、非法模式、缺少通过报告、blocked与not_run分离均有测试 |
| 浏览器回归 | preview、patterns、regions、style-composition、choice-layout、submit-feedback、dialog-reading七套均通过；原页面交互、负向控制和内容压力保留 |
| 覆盖索引 | 11类能力、52个模型场景、7套样例全部映射；无效关联、伪造pass、越界owner及漏挂场景均检出 |
| 不变范围 | 全部8个现有assets文件与基线Git blob一致；入口字节相同；原46个case逐项相同 |

七套浏览器检查不是七个模型场景。各套件详细结果保存在各自原格式报告，根run.json只统计套件状态。统一入口的运行中状态显示另由runner单元测试覆盖；业务断言未改动。

## 尚未闭合

独立模型执行器、冻结的多项目应用基准、真实宿主路由、框架Portal／缓存／多字段表单集成、非控制台独立基准、洁净机器依赖安装与CI均未验证。本轮补充覆盖定义和维护入口，没有把这些缺口说成已解决。

没有Safari／Firefox、实体手机／输入法、完整读屏、生产接口或真实URL资源检查。测试目录保护用于受控维护环境，不作为恶意本地进程或不可信代码的安全沙箱。没有平均模型质量、性能、token费用或全站合规结论。
