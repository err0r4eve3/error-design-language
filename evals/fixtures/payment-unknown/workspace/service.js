(function (scope) {
  'use strict';
  // In-memory demonstration service. No network, credentials, persistence or real money.
  function createPaymentService({scenario = 'timeout-after-commit', delay = 20} = {}) {
    const scenarios = new Set(['timeout-after-commit', 'timeout-before-commit', 'declined', 'success', 'query-unavailable']);
    if (!scenarios.has(scenario) || !Number.isFinite(delay) || delay < 0) throw new TypeError('Invalid demo configuration');
    const orders = new Map([['ORD-DEMO-001', {orderId: 'ORD-DEMO-001', amountMinor: 5900, currency: 'CNY', status: 'pending'}],
      ['ORD-DEMO-002', {orderId: 'ORD-DEMO-002', amountMinor: 1990, currency: 'CNY', status: 'pending'}]]);
    const payments = []; const events = []; const keys = new Map();
    const pause = () => new Promise(resolve => setTimeout(resolve, delay));
    const copy = value => JSON.parse(JSON.stringify(value));
    function orderFor(id) { if (!orders.has(id)) throw new Error('Unknown demo order'); return orders.get(id); }
    function fail(code) { const error = new Error(code); error.code = code; throw error; }
    return {
      async submit(orderId, {idempotencyKey} = {}) {
        const order = orderFor(orderId);
        if (idempotencyKey !== undefined && (typeof idempotencyKey !== 'string' || !idempotencyKey.trim())) throw new TypeError('Invalid key');
        const operationKey = idempotencyKey === undefined ? null : JSON.stringify([orderId, idempotencyKey]);
        events.push({type: 'submit', orderId, idempotencyKey: idempotencyKey ?? null});
        if (operationKey && keys.has(operationKey)) { await pause(); return copy(keys.get(operationKey)); }
        if (scenario === 'timeout-before-commit') { await pause(); fail('TIMEOUT'); }
        if (scenario === 'declined') { order.status = 'failed'; await pause(); return copy(order); }
        order.status = 'paid';
        const payment = {paymentId: `PAY-${payments.length + 1}`, orderId, amountMinor: order.amountMinor, currency: order.currency};
        payments.push(payment);
        const result = {...order, paymentId: payment.paymentId};
        if (operationKey) keys.set(operationKey, copy(result));
        await pause();
        if (scenario === 'timeout-after-commit' || scenario === 'query-unavailable') fail('TIMEOUT');
        return copy(result);
      },
      async query(orderId) {
        const order = orderFor(orderId);
        events.push({type: 'query', orderId});
        await pause();
        if (scenario === 'query-unavailable') fail('QUERY_UNAVAILABLE');
        return copy(order);
      },
      inspect() { return copy({orders: [...orders.values()], payments, events}); }
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {createPaymentService};
  else scope.createPaymentService = createPaymentService;
})(globalThis);
