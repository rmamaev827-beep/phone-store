// Настройки магазина: способы доставки. Цены в сомах.
// needsAddress=false — адрес покупателя не нужен (самовывоз).
const DELIVERY = [
  { id: 'courier', title: 'Курьером по Бишкеку', note: '1–2 дня', price: 200, freeFrom: 50000, needsAddress: true },
  { id: 'region', title: 'Доставка по Кыргызстану', note: '3–5 дней', price: 400, freeFrom: null, needsAddress: true },
  { id: 'pickup', title: 'Самовывоз из магазина', note: process.env.STORE_ADDRESS || 'Бишкек, пр. Чуй, 100', price: 0, freeFrom: null, needsAddress: false },
];

const deliveryPrice = (method, itemsTotal) =>
  method.freeFrom !== null && itemsTotal >= method.freeFrom ? 0 : method.price;

// Категории аксессуаров. Тот же список — в client/lib/accessories.ts
const ACCESSORY_CATEGORIES = [
  'Чехлы',
  'Защитные стёкла',
  'Зарядные устройства',
  'Кабели',
  'Наушники',
  'Power bank',
  'Держатели',
  'Адаптеры',
  'Другое',
];

module.exports = { DELIVERY, deliveryPrice, ACCESSORY_CATEGORIES };
