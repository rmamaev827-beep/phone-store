// Хранилище фото. Режим выбирается сам:
//  - задан BLOB_READ_WRITE_TOKEN -> Vercel Blob;
//  - задан DATABASE_URL          -> таблица images в базе (на Render и Vercel диск не сохраняется);
//  - иначе                       -> папка server/uploads (локальная разработка).
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const db = require('./db');

const UPLOADS = path.join(__dirname, 'uploads');
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const BLOB_HOST = '.blob.vercel-storage.com';
const NAME = /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/;

const mode = () => {
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob';
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) return 'db';
  return 'disk';
};

/** Сохраняет файл из multer (memoryStorage) и возвращает адрес картинки */
async function save(file) {
  const name = crypto.randomUUID() + EXT[file.mimetype];
  switch (mode()) {
    case 'blob': {
      const { put } = require('@vercel/blob');
      const blob = await put(`phones/${name}`, file.buffer, { access: 'public', contentType: file.mimetype });
      return blob.url;
    }
    case 'db':
      await db.query('INSERT INTO images (id, mime, data) VALUES ($1, $2, $3)', [name, file.mimetype, file.buffer]);
      return `/uploads/${name}`;
    default:
      await fs.mkdir(UPLOADS, { recursive: true });
      await fs.writeFile(path.join(UPLOADS, name), file.buffer);
      return `/uploads/${name}`;
  }
}

/** Удаляет ранее загруженное фото; чужие ссылки и стартовые картинки не трогает */
async function remove(image) {
  try {
    if (!image) return;
    if (image.startsWith('/uploads/')) {
      const name = path.basename(image);
      if (mode() === 'db') await db.query('DELETE FROM images WHERE id = $1', [name]);
      else await fs.rm(path.join(UPLOADS, name), { force: true });
    } else if (mode() === 'blob' && image.includes(BLOB_HOST)) {
      const { del } = require('@vercel/blob');
      await del(image);
    }
  } catch (err) {
    console.error('Не удалось удалить фото:', err.message);
  }
}

/** GET /uploads/:name — отдаёт фото из базы; в остальных режимах передаёт запрос дальше (express.static) */
async function serve(req, res, next) {
  if (mode() !== 'db' || !NAME.test(req.params.name)) return next();
  const { rows } = await db.query('SELECT mime, data FROM images WHERE id = $1', [req.params.name]);
  if (!rows[0]) return next();
  // имя файла уникально и не переиспользуется, поэтому кэшировать можно надолго
  res.set({ 'Content-Type': rows[0].mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
  res.send(Buffer.from(rows[0].data));
}

module.exports = { save, remove, serve, EXT, UPLOADS };
