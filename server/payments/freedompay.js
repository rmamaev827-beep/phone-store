// Freedom Pay (Кыргызстан): покупатель вводит данные карты на защищённой странице провайдера,
// магазин номера карт не видит. Документация: https://freedompay.kg/docs-en/merchant-api/pay
const crypto = require('crypto');

const API_URL = 'https://api.freedompay.kg/init_payment.php';
const RESULT_PATH = '/api/payments/freedompay/result';

const merchantId = () => process.env.FREEDOMPAY_MERCHANT_ID;
const secret = () => process.env.FREEDOMPAY_SECRET;
const publicUrl = () => (process.env.PUBLIC_URL || '').replace(/\/$/, '');

const salt = () => crypto.randomBytes(8).toString('hex');

// md5("имя_скрипта;значения параметров по алфавиту ключей;секрет")
function sign(script, params) {
  const values = Object.keys(params)
    .filter((k) => k !== 'pg_sig')
    .sort()
    .map((k) => params[k]);
  return crypto.createHash('md5').update([script, ...values, secret()].join(';')).digest('hex');
}

const tag = (xml, name) => (xml.match(new RegExp(`<${name}>([\s\S]*?)</${name}>`)) || [])[1];

async function createPayment(order) {
  const orderUrl = `${publicUrl()}/order/${order.id}?key=${order.access_key}`;
  const params = {
    pg_order_id: String(order.id),
    pg_merchant_id: merchantId(),
    pg_amount: String(order.total_price),
    pg_currency: 'KGS',
    pg_description: `Заказ №${order.id} в PhoneShop`,
    pg_salt: salt(),
    pg_result_url: `${publicUrl()}${RESULT_PATH}`,
    pg_request_method: 'POST',
    pg_success_url: orderUrl,
    pg_failure_url: orderUrl,
    pg_success_url_method: 'GET',
    pg_failure_url_method: 'GET',
    pg_user_phone: order.phone.replace(/\D/g, ''),
  };
  if (process.env.FREEDOMPAY_TEST === '1') params.pg_testing_mode = '1';
  params.pg_sig = sign('init_payment.php', params);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const xml = await res.text();
  const url = tag(xml, 'pg_redirect_url');
  if (tag(xml, 'pg_status') !== 'ok' || !url) {
    throw new Error(`Freedom Pay: ${tag(xml, 'pg_error_description') || 'не удалось создать платёж'}`);
  }
  return { paymentId: tag(xml, 'pg_payment_id'), url: url.replace(/&amp;/g, '&') };
}

// Уведомление провайдера о результате оплаты. Возвращает { orderId, paid } или null, если подпись неверна.
function parseResult(body) {
  const script = RESULT_PATH.split('/').pop();
  const expected = sign(script, body);
  const given = String(body.pg_sig || '');
  if (expected.length !== given.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given))) return null;
  return { orderId: Number(body.pg_order_id), paymentId: String(body.pg_payment_id || ''), paid: String(body.pg_result) === '1' };
}

function resultResponse(status, description) {
  const params = { pg_status: status, pg_description: description, pg_salt: salt() };
  params.pg_sig = sign(RESULT_PATH.split('/').pop(), params);
  const fields = Object.entries(params).map(([k, v]) => `<${k}>${v}</${k}>`).join('');
  return `<?xml version="1.0" encoding="utf-8"?><response>${fields}</response>`;
}

module.exports = { name: 'freedompay', createPayment, parseResult, resultResponse };
