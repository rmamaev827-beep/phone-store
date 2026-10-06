const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireAdmin } = require('../auth');
const storage = require('../storage');
const { ACCESSORY_CATEGORIES } = require('../config');

const router = express.Router();

const KNOWN_BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Huawei'];
const OTHER = 'other';
const KINDS = ['phone', 'accessory'];
const IMAGE_EXT = storage.EXT;

const upload = multer({
  // файл держим в памяти и отдаём в storage — так код одинаков для диска и облака
  storage: multer.memoryStorage(),
  // 4 МБ: у функций Vercel тело запроса ограничено 4.5 МБ
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_EXT[file.mimetype]) return cb(null, true);
    const err = new Error('Фото должно быть в формате JPG, PNG, WEBP или GIF');
    err.status = 400;
    cb(err);
  },
});

const list = (value) =>
  String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const intList = (value) => list(value).map(Number).filter(Number.isInteger);

const SORTS = {
  price_asc: 'p.price ASC, p.id ASC',
  price_desc: 'p.price DESC, p.id ASC',
  new: 'p.created_at DESC, p.id DESC',
  popular: 'sold DESC, p.created_at DESC, p.id DESC',
};

// GET /api/products?brand=Samsung,Apple&storage=256&ram=8&minPrice=50000&maxPrice=80000&q=...&sort=price_asc
// kind=phone (по умолчанию) | accessory | all;  для аксессуаров: category=Чехлы,Кабели  inStock=1
router.get('/', async (req, res) => {
  const where = [];
  const params = [];
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };
  const inList = (values) => values.map(add).join(', ');

  // без параметра отдаём только телефоны — каталог телефонов не должен показывать аксессуары
  const kind = req.query.kind === 'all' ? null : KINDS.includes(req.query.kind) ? req.query.kind : 'phone';
  if (kind) where.push(`p.kind = ${add(kind)}`);

  const brands = list(req.query.brand);
  if (brands.length) {
    const named = brands.filter((b) => b !== OTHER);
    const parts = [];
    if (named.length) parts.push(`p.brand IN (${inList(named)})`);
    if (brands.includes(OTHER)) parts.push(`p.brand NOT IN (${inList(KNOWN_BRANDS)})`);
    where.push(`(${parts.join(' OR ')})`);
  }

  const categories = list(req.query.category);
  if (categories.length) where.push(`p.category IN (${inList(categories)})`);

  if (req.query.inStock === '1') where.push('p.stock > 0');

  const storageGb = intList(req.query.storage);
  if (storageGb.length) where.push(`p.storage IN (${inList(storageGb)})`);

  const ram = intList(req.query.ram);
  if (ram.length) where.push(`p.ram IN (${inList(ram)})`);

  const minPrice = Number(req.query.minPrice);
  if (req.query.minPrice && Number.isFinite(minPrice)) where.push(`p.price >= ${add(Math.floor(minPrice))}`);

  const maxPrice = Number(req.query.maxPrice);
  if (req.query.maxPrice && Number.isFinite(maxPrice)) where.push(`p.price <= ${add(Math.ceil(maxPrice))}`);

  const q = String(req.query.q ?? '').trim();
  if (q) {
    const p = add(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
    where.push(
      `(p.name ILIKE ${p} OR p.brand ILIKE ${p} OR p.category ILIKE ${p} OR (p.brand || ' ' || p.name) ILIKE ${p})`
    );
  }

  const { rows } = await db.query(
    `SELECT p.*, COALESCE(s.sold, 0)::int AS sold
       FROM products p
       LEFT JOIN (SELECT product_id, SUM(quantity) AS sold FROM order_items GROUP BY product_id) s
         ON s.product_id = p.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY ${SORTS[req.query.sort] || SORTS.new}`,
    params
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Товар не найден' });
  const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Товар не найден' });
  res.json(rows[0]);
});

const TEXT_FIELDS = ['name', 'brand', 'category', 'color', 'processor', 'camera', 'battery', 'description', 'image'];
const INT_FIELDS = ['price', 'storage', 'ram', 'stock'];
// у телефона обязательны характеристики, у аксессуара — категория
const REQUIRED = {
  phone: ['name', 'brand', 'price', 'storage', 'ram'],
  accessory: ['name', 'category', 'price'],
};
const LABELS = {
  name: 'Название',
  brand: 'Бренд',
  category: 'Категория',
  price: 'Цена',
  storage: 'Память',
  ram: 'RAM',
  stock: 'Остаток',
};

// Собирает из тела запроса только известные поля; partial=true для PATCH
function readProduct(req, kind, partial) {
  const body = req.body || {};
  const data = {};

  for (const f of TEXT_FIELDS) {
    if (body[f] !== undefined) data[f] = String(body[f]).trim();
  }
  for (const f of INT_FIELDS) {
    if (body[f] === undefined || body[f] === '') continue;
    const n = Number(body[f]);
    if (!Number.isInteger(n) || n < 0) return { error: `Поле «${LABELS[f]}» должно быть целым неотрицательным числом` };
    data[f] = n;
  }

  for (const f of REQUIRED[kind]) {
    const missing = partial ? f in data && data[f] === '' : data[f] === undefined || data[f] === '';
    if (missing) return { error: `Заполните поле «${LABELS[f]}»` };
  }
  if (kind === 'accessory' && data.category !== undefined && !ACCESSORY_CATEGORIES.includes(data.category)) {
    return { error: 'Выберите категорию из списка' };
  }
  return { data };
}

router.post('/', requireAdmin, upload.single('photo'), async (req, res) => {
  const kind = KINDS.includes(req.body?.kind) ? req.body.kind : 'phone';
  const { data, error } = readProduct(req, kind, false);
  if (error) return res.status(400).json({ error });
  data.kind = kind;
  if (req.file) data.image = await storage.save(req.file);
  const cols = Object.keys(data);
  const { rows } = await db.query(
    `INSERT INTO products (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    cols.map((c) => data[c])
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', requireAdmin, upload.single('photo'), async (req, res) => {
  const id = Number(req.params.id);
  const fail = (status, message) => res.status(status).json({ error: message });
  if (!Number.isInteger(id)) return fail(404, 'Товар не найден');

  const before = await db.query('SELECT image, kind FROM products WHERE id = $1', [id]);
  if (!before.rows[0]) return fail(404, 'Товар не найден');

  // тип товара не меняется: телефон остаётся телефоном
  const { data, error } = readProduct(req, before.rows[0].kind, true);
  if (error) return fail(400, error);

  if (req.file) data.image = await storage.save(req.file);
  const cols = Object.keys(data);
  if (!cols.length) return fail(400, 'Нет данных для обновления');

  const { rows } = await db.query(
    `UPDATE products SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')} WHERE id = $${cols.length + 1} RETURNING *`,
    [...cols.map((c) => data[c]), id]
  );
  if (data.image !== undefined && data.image !== before.rows[0].image) await storage.remove(before.rows[0].image);
  res.json(rows[0]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Товар не найден' });
  const { rows } = await db.query('DELETE FROM products WHERE id = $1 RETURNING image', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Товар не найден' });
  await storage.remove(rows[0].image);
  res.status(204).end();
});

module.exports = router;
