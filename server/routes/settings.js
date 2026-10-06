const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../auth');

const router = express.Router();

// Контакты магазина: список { id, label, url }.
// label — текст, который видит покупатель; url — куда он попадает по нажатию.
const KEY = 'contacts';
const MAX_CONTACTS = 12;
const MAX_LABEL = 60;
const MAX_URL = 500;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s()-]{6,20}$/;

/**
 * Приводит введённое админом к безопасной ссылке или возвращает null.
 * Разрешены только http(s), tel: и mailto: — так в базу не попадёт, например, javascript:.
 */
function normalizeUrl(raw) {
  const value = String(raw ?? '').trim();
  if (!value || value.length > MAX_URL) return null;

  const phone = value.replace(/^tel:/i, '');
  if (PHONE.test(phone)) return `tel:${phone.replace(/[^\d+]/g, '')}`;

  const email = value.replace(/^mailto:/i, '');
  if (EMAIL.test(email)) return `mailto:${email}`;

  // «instagram.com/shop» без протокола — дописываем https; любые другие схемы отклоняем
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  if (hasScheme && !/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(hasScheme ? value : `https://${value}`);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function readContacts() {
  const { rows } = await db.query('SELECT value FROM settings WHERE key = $1', [KEY]);
  try {
    const list = JSON.parse(rows[0]?.value || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// GET /api/settings/contacts — открыто для всех: это публичные контакты магазина
router.get('/contacts', async (req, res) => {
  res.json(await readContacts());
});

// PUT /api/settings/contacts { contacts: [{ id?, label, url }] } — заменяет весь список, порядок сохраняется
router.put('/contacts', requireAdmin, async (req, res) => {
  const input = req.body?.contacts;
  if (!Array.isArray(input)) return res.status(400).json({ error: 'Некорректный список контактов' });
  if (input.length > MAX_CONTACTS) return res.status(400).json({ error: `Не больше ${MAX_CONTACTS} контактов` });

  const contacts = [];
  for (let index = 0; index < input.length; index++) {
    const label = String(input[index]?.label ?? '').trim();
    const fail = (field, error) => res.status(400).json({ error, index, field });

    if (!label) return fail('label', 'Укажите текст, который увидит клиент');
    if (label.length > MAX_LABEL) return fail('label', `Текст длиннее ${MAX_LABEL} символов`);
    const url = normalizeUrl(input[index]?.url);
    if (!url) return fail('url', 'Укажите ссылку (https://…), номер телефона или e-mail');

    const id = /^[\w-]{1,40}$/.test(String(input[index]?.id ?? '')) ? String(input[index].id) : crypto.randomUUID();
    contacts.push({ id, label, url });
  }

  await db.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [KEY, JSON.stringify(contacts)]
  );
  res.json(contacts);
});

module.exports = router;
