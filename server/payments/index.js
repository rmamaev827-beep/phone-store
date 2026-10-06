const demo = require('./demo');
const freedompay = require('./freedompay');

// Настоящий провайдер включается, когда в .env заданы его ключи и публичный адрес сайта
const live = () => Boolean(process.env.FREEDOMPAY_MERCHANT_ID && process.env.FREEDOMPAY_SECRET && process.env.PUBLIC_URL);

module.exports = {
  provider: () => (live() ? freedompay : demo),
  isDemo: () => !live(),
  freedompay,
};
