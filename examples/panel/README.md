# Relay Panel

一个基于现有黑白灰语言的原生模块控制台演示。所有实例、用量与USD价格是固定样例，数据时间为2026-10-02 13:00（Asia/Shanghai）。无真实服务器、登录、付款、持久化、HTTP请求或依赖安装。

## 运行

在仓库根目录构建到源码以外尚不存在的HTML文件，然后在支持import maps的现代浏览器中打开：

```sh
node examples/panel/build.cjs /tmp/relay-panel.html
node --test tests/panel.test.cjs
node tests/run.cjs --suite panel --mode inline --out /tmp/relay-panel-qa-new
```

Node沿用仓库`.nvmrc`。浏览器检查复用已有Playwright／Chromium，选项沿用测试运行时。无需npm install；局部package.json只声明原生Node模块别名，没有依赖。生成HTML使用import map + data模块；本地浏览器不支持或生产CSP禁止这种形式时，不能直接用作生产构建。

## 文件职责

| 文件 | 职责 |
|---|---|
| domain.mjs | 输入合同、整数分费用、GiB用量、汇总、过滤排序、CSV |
| service.mjs | 可注入延迟的本地数据源；一次性故障开关；取消前不提交本地写入 |
| store.mjs | 项目作用域、请求有效期、修订保护、选择与查看、创建与事件记录 |
| ui.mjs / views.mjs | 安全文本、图标、局部更新、纯呈现函数 |
| app.mjs | 事件绑定、原生对话框、焦点恢复、订阅与销毁 |
| panel.css / shell.html | 应用布局和样式；复用assets/tokens.css，不修改旧样张 |
| build.cjs | 从实际模块生成自包含HTML，输出源文件哈希 |

项目切换清空当前过滤、选择与查看ID，保留同一服务实例中各项目已创建的演示数据。选择不等于当前查看对象；费用概览始终是全项目范围，列表筛选不会改变它。月度用量来自10月1–2日，近7日图含9月26日至10月2日，窗口与覆盖分别标识。

在演示设置可让下一次读取或创建失败。创建失败保留字段；等待时仅锁定本表单字段；取消会话撤销当前写回资格。未知实例重读后仅更新状态，缺失价格和流量不补零。CSV只导出选中记录，费用未知为空格而非数字零，并对公式前缀作文本处理。

## 检查范围

Node测试直接调用实际store，涵盖旧成功／错误／finally、项目切换、读取与写入交错、取消、防重、独立实例读取、输入错误及派生值。浏览器检查从实际模块构建产物执行，覆盖主题／宽度、筛选、输入法合成事件、详情、创建重试、CSV、项目与视图切换以及重挂载。

这是原生DOM应用的本地端到端示例，不是生产接口集成、真实系统输入法、Safari/Firefox或模型A/B。没有路由器；侧栏切换是页内视图，不宣称Back/Forward或重载保留状态。这里未测得任何性能加速。
