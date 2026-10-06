const db = require('./db');

// Стартовые картинки лежат в client/public/phones (seed-1.svg … seed-17.svg)

const PHONES = [
  ['iPhone 15 Pro', 'Apple', 85000, 256, 8, 'Натуральный титан', '#8a8782', 'Apple A17 Pro', '48 + 12 + 12 МП', '3274 мА·ч', 6],
  ['iPhone 15', 'Apple', 70000, 128, 6, 'Голубой', '#a9c4d8', 'Apple A16 Bionic', '48 + 12 МП', '3349 мА·ч', 5],
  ['iPhone 16 Pro Max', 'Apple', 135000, 512, 8, 'Пустынный титан', '#c2a892', 'Apple A18 Pro', '48 + 48 + 12 МП', '4685 мА·ч', 3],
  ['iPhone 13', 'Apple', 48000, 128, 4, 'Тёмная ночь', '#2c3038', 'Apple A15 Bionic', '12 + 12 МП', '3240 мА·ч', 8],
  ['Galaxy S24', 'Samsung', 65000, 256, 8, 'Оникс', '#34343a', 'Exynos 2400', '50 + 12 + 10 МП', '4000 мА·ч', 3],
  ['Galaxy S24 Ultra', 'Samsung', 110000, 512, 12, 'Титановый серый', '#7d7f85', 'Snapdragon 8 Gen 3', '200 + 50 + 12 + 10 МП', '5000 мА·ч', 4],
  ['Galaxy A55', 'Samsung', 32000, 128, 8, 'Лаванда', '#c9bfe6', 'Exynos 1480', '50 + 12 + 5 МП', '5000 мА·ч', 10],
  ['Galaxy Z Fold6', 'Samsung', 160000, 1024, 12, 'Тёмно-синий', '#27324d', 'Snapdragon 8 Gen 3', '50 + 12 + 10 МП', '4400 мА·ч', 0],
  ['Xiaomi 14', 'Xiaomi', 60000, 256, 12, 'Зелёный', '#7fa08a', 'Snapdragon 8 Gen 3', '50 + 50 + 50 МП', '4610 мА·ч', 7],
  ['Redmi Note 13 Pro', 'Xiaomi', 24000, 256, 8, 'Фиолетовый', '#9d8bd1', 'Helio G99-Ultra', '200 + 8 + 2 МП', '5000 мА·ч', 15],
  ['Redmi 13C', 'Xiaomi', 11000, 64, 4, 'Чёрный', '#26272b', 'Helio G85', '50 + 2 МП', '5000 мА·ч', 20],
  ['Pixel 8', 'Google', 52000, 128, 8, 'Розовый', '#e8c4c0', 'Google Tensor G3', '50 + 12 МП', '4575 мА·ч', 4],
  ['Pixel 9 Pro', 'Google', 95000, 256, 16, 'Фарфор', '#e6e0d4', 'Google Tensor G4', '50 + 48 + 48 МП', '4700 мА·ч', 2],
  ['Huawei P60 Pro', 'Huawei', 58000, 256, 8, 'Жемчужный', '#dcd8cf', 'Snapdragon 8+ Gen 1 4G', '48 + 48 + 13 МП', '4815 мА·ч', 5],
  ['Huawei nova 12', 'Huawei', 29000, 256, 8, 'Синий', '#3f6fd1', 'Kirin 8000', '50 + 8 МП', '4600 мА·ч', 6],
  ['OnePlus 12', 'OnePlus', 68000, 512, 16, 'Изумрудный', '#2f6b5c', 'Snapdragon 8 Gen 3', '50 + 64 + 48 МП', '5400 мА·ч', 3],
  ['Nothing Phone (2a)', 'Nothing', 27000, 128, 8, 'Белый', '#ecebe8', 'Dimensity 7200 Pro', '50 + 50 МП', '5000 мА·ч', 9],
];

async function seedIfEmpty() {
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM products');
  if (rows[0].n > 0) {
    // базы, созданные до переноса картинок в client/public
    await db.query("UPDATE products SET image = replace(image, '/uploads/seed-', '/phones/seed-') WHERE image LIKE '/uploads/seed-%'");
    return 0;
  }

  // created_at разносим по дням, чтобы сортировка «Новинки» была осмысленной
  for (let i = 0; i < PHONES.length; i++) {
    const [name, brand, price, storage, ram, color, hex, processor, camera, battery, stock] = PHONES[i];
    const file = `seed-${i + 1}.svg`;
    const description =
      `${brand} ${name} — ${storage >= 1024 ? storage / 1024 + ' TB' : storage + ' GB'} памяти и ${ram} GB RAM. ` +
      `Процессор ${processor}, камера ${camera}, аккумулятор ${battery}. Официальная гарантия 12 месяцев.`;
    await db.query(
      `INSERT INTO products
         (name, brand, price, storage, ram, color, processor, camera, battery, description, image, stock, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now() - ($13 || ' days')::interval)`,
      [name, brand, price, storage, ram, color, processor, camera, battery, description, `/phones/${file}`, stock, String((i * 7) % PHONES.length)]
    );
  }
  return PHONES.length;
}

// [название, категория, цена, остаток, краткое описание]
const ACCESSORIES = [
  ['Силиконовый чехол для iPhone 15 Pro', 'Чехлы', 900, 25, 'Мягкий матовый силикон, защита камеры и экрана бортиком.'],
  ['Прозрачный чехол для Galaxy S24', 'Чехлы', 700, 18, 'Тонкий прозрачный чехол, не желтеет со временем.'],
  ['Защитное стекло 9H для iPhone 15', 'Защитные стёкла', 500, 40, 'Закалённое стекло на весь экран с олеофобным покрытием.'],
  ['Защитное стекло для Redmi Note 13 Pro', 'Защитные стёкла', 400, 0, 'Полноэкранное стекло с чёрной рамкой.'],
  ['Сетевое зарядное устройство 25 Вт USB-C', 'Зарядные устройства', 1500, 14, 'Быстрая зарядка Power Delivery, компактный корпус.'],
  ['Беспроводная зарядка 15 Вт', 'Зарядные устройства', 2200, 6, 'Подставка с зарядкой Qi, работает через чехол до 3 мм.'],
  ['Кабель USB-C — USB-C, 1 м', 'Кабели', 450, 50, 'Плетёная оплётка, до 60 Вт, передача данных.'],
  ['Кабель USB-C — Lightning, 1 м', 'Кабели', 650, 30, 'Быстрая зарядка iPhone, усиленные разъёмы.'],
  ['Беспроводные наушники TWS', 'Наушники', 3500, 9, 'Bluetooth 5.3, до 6 часов музыки, кейс с зарядкой.'],
  ['Power bank 10 000 мА·ч', 'Power bank', 2800, 12, 'Два порта USB, быстрая зарядка 22.5 Вт, индикатор заряда.'],
  ['Автомобильный держатель на дефлектор', 'Держатели', 800, 16, 'Магнитное крепление, поворот на 360°.'],
  ['Адаптер USB-C — 3.5 мм', 'Адаптеры', 350, 22, 'Подключение проводных наушников к телефону без аудиоразъёма.'],
];

// Примеры аксессуаров добавляются один раз: если админ их удалит, они не вернутся
async function seedAccessoriesOnce() {
  const flag = await db.query("SELECT 1 FROM settings WHERE key = 'accessories_seeded'");
  if (flag.rows.length) return 0;
  await db.query("INSERT INTO settings (key, value) VALUES ('accessories_seeded', '1') ON CONFLICT (key) DO NOTHING");

  const existing = await db.query("SELECT COUNT(*)::int AS n FROM products WHERE kind = 'accessory'");
  if (existing.rows[0].n > 0) return 0;

  for (let i = 0; i < ACCESSORIES.length; i++) {
    const [name, category, price, stock, description] = ACCESSORIES[i];
    await db.query(
      `INSERT INTO products (kind, name, category, price, stock, description, created_at)
       VALUES ('accessory', $1, $2, $3, $4, $5, now() - ($6 || ' hours')::interval)`,
      [name, category, price, stock, description, String(i)]
    );
  }
  return ACCESSORIES.length;
}

module.exports = { seedIfEmpty, seedAccessoriesOnce };
