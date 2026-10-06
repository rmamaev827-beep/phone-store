// Демо-провайдер: имитирует страницу оплаты, деньги не списываются и данные карты не запрашиваются.
// Используется, пока в .env не заданы ключи настоящего провайдера.
module.exports = {
  name: 'demo',
  async createPayment(order) {
    return { paymentId: `demo-${order.id}-${Date.now()}`, url: `/pay/demo/${order.id}?key=${order.access_key}` };
  },
};
