const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../auth');

const router = express.Router();

// GET /api/analytics — все товары (телефоны и аксессуары) с продажами + число заказов.
// Отменённые заказы в продажи не входят. Сводки и фильтры считает клиент.
router.get('/', requireAdmin, async (req, res) => {
  const products = await db.query(
    `SELECT p.*,
            COALESCE(s.sold, 0)::int          AS sold,
            COALESCE(s.orders_count, 0)::int  AS orders_count,
            COALESCE(s.revenue, 0)::float8    AS revenue
       FROM products p
       LEFT JOIN (
         SELECT i.product_id,
                SUM(i.quantity)             AS sold,
                COUNT(DISTINCT i.order_id)  AS orders_count,
                SUM(i.quantity * i.price)   AS revenue
           FROM order_items i
           JOIN orders o ON o.id = i.order_id
          WHERE o.status <> 'cancelled'
          GROUP BY i.product_id
       ) s ON s.product_id = p.id
      ORDER BY p.created_at DESC, p.id DESC`
  );
  const orders = await db.query('SELECT COUNT(*)::int AS n FROM orders');
  res.json({ products: products.rows, orders_total: orders.rows[0].n });
});

module.exports = router;
