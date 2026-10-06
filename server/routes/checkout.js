const express = require('express');
const db = require('../db');
const { DELIVERY } = require('../config');
const payments = require('../payments');
const { loadByKey } = require('./orders');

const router = express.Router();

// GET /api/checkout/options — способы доставки и оплаты для формы заказа
router.get('/checkout/options', (req, res) => {
  res.json({
    delivery: DELIVERY,
    payment: { card: { demo: payments.isDemo() } },
  });
});

const markPaid = (orderId) =>
  db.query("UPDATE orders SET payment_status = 'paid', paid_at = now() WHERE id = $1 AND payment_status <> 'paid'", [orderId]);
const markFailed = (orderId) =>
  db.query("UPDATE orders SET payment_status = 'failed' WHERE id = $1 AND payment_status <> 'paid'", [orderId]);

// Демо-оплата: работает только пока не подключён настоящий провайдер
router.post('/payments/demo/:id', async (req, res) => {
  if (!payments.isDemo()) return res.status(404).json({ error: 'Маршрут не найден' });
  const order = await loadByKey(req);
  if (order.payment_method !== 'card') return res.status(400).json({ error: 'Заказ оплачивается при получении' });
  if (order.payment_status !== 'paid') {
    await (req.body?.result === 'success' ? markPaid(order.id) : markFailed(order.id));
  }
  res.json({ ok: true });
});

// Уведомление Freedom Pay о результате оплаты (сервер провайдера -> наш сервер)
router.post('/payments/freedompay/result', express.urlencoded({ extended: false }), async (req, res) => {
  const { freedompay } = payments;
  res.type('application/xml');
  const result = freedompay.parseResult(req.body || {});
  if (!result || !Number.isInteger(result.orderId)) return res.send(freedompay.resultResponse('error', 'Неверная подпись'));

  const { rows } = await db.query('SELECT id, total_price FROM orders WHERE id = $1', [result.orderId]);
  if (!rows[0]) return res.send(freedompay.resultResponse('error', 'Заказ не найден'));
  // сумма в уведомлении должна совпадать с суммой заказа
  if (result.paid && Number(req.body.pg_amount) !== rows[0].total_price) {
    return res.send(freedompay.resultResponse('error', 'Сумма не совпадает'));
  }

  await (result.paid ? markPaid(result.orderId) : markFailed(result.orderId));
  res.send(freedompay.resultResponse('ok', result.paid ? 'Заказ оплачен' : 'Оплата не прошла'));
});

module.exports = router;
