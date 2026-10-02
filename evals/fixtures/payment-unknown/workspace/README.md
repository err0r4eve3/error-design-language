# 本地订单页面

直接打开 `index.html`。订单、付款和调用记录只存在内存；不输入真实资料、不接入支付渠道，刷新即重置。

`service.js` 是已经提供的服务端接口模拟。页面位于 `index.html`、`styles.css`、`app.js`。服务接口为 `submit(orderId, {idempotencyKey}?)`、`query(orderId)` 和只读诊断快照 `inspect()`；金额单位为分，币种为 CNY。

默认模拟响应超时。可在 URL 查询参数 `scenario` 选择 `timeout-after-commit`、`timeout-before-commit`、`declined`、`success`、`query-unavailable`；这些仅是本地模拟条件。没有联网请求或数据库依赖。
