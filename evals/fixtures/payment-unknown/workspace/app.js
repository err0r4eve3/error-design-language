'use strict';
const orderId = document.querySelector('#order-id').textContent;
const payButton = document.querySelector('#pay');
const statusText = document.querySelector('#status');
const scenario = new URLSearchParams(location.search).get('scenario') || 'timeout-after-commit';
window.paymentService = createPaymentService({scenario});
payButton.addEventListener('click', async () => {
  payButton.disabled = true;
  statusText.textContent = '正在付款…';
  try {
    const result = await paymentService.submit(orderId);
    statusText.textContent = result.status === 'paid' ? '付款成功。' : '付款失败，请重新付款。';
    if (result.status === 'paid') { payButton.textContent = '已付款'; return; }
  } catch (error) {
    statusText.textContent = '付款失败，请重新付款。';
  }
  payButton.textContent = '重新付款';
  payButton.disabled = false;
});
