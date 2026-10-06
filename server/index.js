require('dotenv').config({ quiet: true });

const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const db = require('./db');
const { seedIfEmpty, seedAccessoriesOnce } = require('./seed');
const auth = require('./auth');
const storage = require('./storage');

const missing = ['ADMIN_LOGIN', 'ADMIN_PASSWORD', 'JWT_SECRET'].filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Не заданы переменные: ${missing.join(', ')} — локально заполните server/.env, на хостинге — Environment Variables`);
  if (require.main === module) process.exit(1);
}

// База готовится один раз: при запуске сервера или при «холодном старте» функции на Vercel
let ready = null;
const prepare = () =>
  (ready ??= (async () => {
    if (missing.length) throw new Error(`Не заданы переменные: ${missing.join(', ')}`);
    const kind = await db.init();
    const seeded = await seedIfEmpty();
    if (seeded) console.log(`База пустая — добавлено ${seeded} телефонов`);
    const accessories = await seedAccessoriesOnce();
    if (accessories) console.log(`Добавлено ${accessories} аксессуаров для примера`);
    return kind;
  })());

const app = express();
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => res.json({ name: 'PhoneShop API', ok: true }));
app.use(async (req, res, next) => {
  try {
    await prepare();
    next();
  } catch (err) {
    ready = null; // следующая попытка начнёт заново
    console.error(err);
    res.status(503).json({ error: 'Сервер не настроен: ' + err.message });
  }
});
// проверка для хостинга: отвечает 200, только когда база доступна
app.get('/health', async (req, res) => {
  await db.query('SELECT 1');
  res.json({ ok: true });
});
app.get('/uploads/:name', storage.serve);
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '1h' }));

app.use('/api/auth', auth.router);
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api', require('./routes/checkout'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Маршрут не найден' }));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Фото больше 4 МБ' : 'Не удалось загрузить фото';
    return res.status(400).json({ error: message });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Некорректный JSON' });
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const PORT = Number(process.env.PORT) || 4000;

// Локально слушаем порт; на Vercel приложение вызывается как функция
if (require.main === module) {
  // Ctrl+C: сначала аккуратно закрываем базу, потом выходим
  let stopping = false;
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => {
      if (stopping) return;
      stopping = true;
      await db.close().catch(() => {});
      process.exit(0);
    });
  }

  prepare()
    .then((kind) => app.listen(PORT, () => console.log(`API: http://localhost:${PORT}  |  БД: ${kind}`)))
    .catch((err) => {
      console.error('Не удалось запустить сервер:', err.message);
      process.exit(1);
    });
}

module.exports = app;
