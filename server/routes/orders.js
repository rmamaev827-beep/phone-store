const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../auth');
const { DELIVERY, deliveryPrice } = require('../config');
const payments = require('../payments');

const router = express.Router();

const STATUSES = ['new', 'processing', 'done', 'cancelled'];
const PAYMENT_METHODS = ['card', 'cash'];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// «Xiaomi 14» уже содержит бренд — не превращаем его в «Xiaomi Xiaomi 14»
const titleOf = (product) =>
  product.name.toLowerCase().includes(product.brand.toLowerCase()) ? product.name : `${product.brand} ${product.name}`;

async function loadOrder(id) {
  const order = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
  if (!order.rows[0]) return null;
  const items = await db.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [id]);
  return { ...order.rows[0], items: items.rows };
}

// То, что можно показать покупателю: без идентификатора платежа
function publicView(order) {
  const { payment_id, ...rest } = order;
  const delivery = DELIVERY.find((d) => d.id === order.delivery_method);
  return { ...rest, delivery_title: delivery ? delivery.title : order.delivery_method };
}

// Заказ по id + секретному ключу из ссылки покупателя
async function loadByKey(req) {
  const id = Number(req.params.id);
  const key = String(req.query.key ?? req.body?.key ?? '');
  const order = Number.isInteger(id) && key ? await loadOrder(id) : null;
  const valid =
    order && order.access_key && order.access_key.length === key.length &&
    crypto.timingSafeEqual(Buffer.from(order.access_key), Buffer.from(key));
  if (!valid) throw httpError(404, 'Заказ не найден');
  return order;
}

async function startPayment(order) {
  const payment = await payments.provider().createPayment(order);
  await db.query("UPDATE orders SET payment_status = 'pending', payment_id = $1 WHERE id = $2", [payment.paymentId, order.id]);
  return payment.url;
}

// POST /api/orders
// { customer_name, phone, address, comment, delivery_method, payment_method, items: [{ product_id, quantity }] }
router.post('/', async (req, res) => {
  const body = req.body || {};
  const customer_name = String(body.customer_name ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const comment = String(body.comment ?? '').trim();
  const delivery = DELIVERY.find((d) => d.id === (body.delivery_method ?? 'courier'));
  const payment_method = body.payment_method ?? 'cash';

  if (customer_name.length < 2) throw httpError(400, 'Укажите имя');
  if (phone.replace(/\D/g, '').length < 9) throw httpError(400, 'Укажите корректный номер телефона');
  if (!delivery) throw httpError(400, 'Выберите способ доставки');
  if (!PAYMENT_METHODS.includes(payment_method)) throw httpError(400, 'Выберите способ оплаты');

  const address = delivery.needsAddress ? String(body.address ?? '').trim() : `Самовывоз: ${delivery.note}`;
  if (delivery.needsAddress && address.length < 5) throw httpError(400, 'Укажите адрес доставки');

  // одинаковые товары складываем, чтобы проверка остатка была честной
  const wanted = new Map();
  for (const item of Array.isArray(body.items) ? body.items : []) {
    const productId = Number(item?.product_id);
    const quantity = Number(item?.quantity);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
      throw httpError(400, 'Некорректный состав заказа');
    }
    wanted.set(productId, (wanted.get(productId) || 0) + quantity);
  }
  if (!wanted.size) throw httpError(400, 'Корзина пуста');

  const orderId = await db.tx(async (query) => {
    const lines = [];
    // блокируем строки в порядке id, чтобы параллельные заказы не ловили deadlock
    for (const productId of [...wanted.keys()].sort((a, b) => a - b)) {
      const quantity = wanted.get(productId);
      const { rows } = await query('SELECT id, name, brand, price, stock FROM products WHERE id = $1 FOR UPDATE', [productId]);
      const product = rows[0];
      if (!product) throw httpError(409, 'Один из товаров больше не продаётся — обновите корзину');
      if (product.stock < quantity) {
        throw httpError(
          409,
          product.stock === 0
            ? `«${product.name}» закончился`
            : `«${product.name}»: в наличии только ${product.stock} шт.`
        );
      }
      lines.push({ product, quantity });
    }

    // цены и стоимость доставки считает сервер — клиенту не доверяем
    const itemsTotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
    const shipping = deliveryPrice(delivery, itemsTotal);
    const order = await query(
      `INSERT INTO orders
         (customer_name, phone, address, comment, total_price, delivery_method, delivery_price, payment_method, access_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [customer_name, phone, address, comment, itemsTotal + shipping, delivery.id, shipping, payment_method, crypto.randomBytes(16).toString('hex')]
    );
    const id = order.rows[0].id;

    for (const { product, quantity } of lines) {
      await query(
        'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES ($1, $2, $3, $4, $5)',
        [id, product.id, titleOf(product), quantity, product.price]
      );
      await query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, product.id]);
    }
    return id;
  });

  const order = await loadOrder(orderId);
  let payment_url = null;
  if (payment_method === 'card') {
    try {
      payment_url = await startPayment(order);
    } catch (err) {
      // заказ уже создан — покупатель сможет повторить оплату со страницы заказа
      console.error(err);
      await db.query("UPDATE orders SET payment_status = 'failed' WHERE id = $1", [orderId]);
    }
  }
  res.status(201).json({ order: publicView(await loadOrder(orderId)), payment_url });
});

// Страница заказа для покупателя: /api/orders/1001/public?key=...
router.get('/:id/public', async (req, res) => {
  res.json(publicView(await loadByKey(req)));
});

// Повторная попытка оплаты картой
router.post('/:id/pay', async (req, res) => {
  const order = await loadByKey(req);
  if (order.payment_method !== 'card') throw httpError(400, 'Заказ оплачивается при получении');
  if (order.payment_status === 'paid') throw httpError(409, 'Заказ уже оплачен');
  if (order.status === 'cancelled') throw httpError(409, 'Заказ отменён');
  res.json({ payment_url: await startPayment(order) });
});

router.get('/', requireAdmin, async (req, res) => {
  const { rows } = await db.query(
    `SELECT o.*, COALESCE(SUM(i.quantity), 0)::int AS items_count
       FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
      GROUP BY o.id ORDER BY o.id DESC`
  );
  res.json(rows.map(publicView));
});

router.get('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const order = Number.isInteger(id) ? await loadOrder(id) : null;
  if (!order) throw httpError(404, 'Заказ не найден');
  res.json(publicView(order));
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const status = req.body?.status;
  if (!STATUSES.includes(status)) throw httpError(400, 'Неизвестный статус');
  if (!Number.isInteger(id)) throw httpError(404, 'Заказ не найден');
  const { rows } = await db.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
  if (!rows[0]) throw httpError(404, 'Заказ не найден');
  res.json(publicView(rows[0]));
});

module.exports = router;
module.exports.loadByKey = loadByKey;
