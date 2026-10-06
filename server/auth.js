const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');

const secret = () => process.env.JWT_SECRET;

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

const router = express.Router();

// Два администратора: основной и (необязательно) второй — ADMIN2_LOGIN / ADMIN2_PASSWORD
const admins = () =>
  [
    { login: process.env.ADMIN_LOGIN, password: process.env.ADMIN_PASSWORD },
    { login: process.env.ADMIN2_LOGIN, password: process.env.ADMIN2_PASSWORD },
  ].filter((a) => a.login && a.password);

router.post('/login', (req, res) => {
  const { login, password } = req.body || {};
  // проверяем все пары без раннего выхода, чтобы время ответа не выдавало, какой логин существует
  let found = null;
  for (const admin of admins()) {
    const loginOk = safeEqual(login ?? '', admin.login);
    const passwordOk = safeEqual(password ?? '', admin.password);
    if (loginOk && passwordOk) found = admin;
  }
  if (!found) return res.status(401).json({ error: 'Неверный логин или пароль' });
  res.json({ token: jwt.sign({ role: 'admin', login: found.login }, secret(), { expiresIn: '7d' }) });
});

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    const payload = jwt.verify(token, secret());
    if (payload.role !== 'admin') throw new Error('not admin');
    next();
  } catch {
    res.status(401).json({ error: 'Требуется вход администратора' });
  }
}

router.get('/me', requireAdmin, (req, res) => res.json({ role: 'admin' }));

module.exports = { router, requireAdmin };
