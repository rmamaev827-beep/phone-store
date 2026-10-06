// Хранилище фото: локально — папка server/uploads, на Vercel — Vercel Blob
// (включается само, когда к проекту подключён Blob и задан BLOB_READ_WRITE_TOKEN).
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const UPLOADS = path.join(__dirname, 'uploads');
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const BLOB_HOST = '.blob.vercel-storage.com';

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** Сохраняет файл из multer (memoryStorage) и возвращает адрес картинки */
async function save(file) {
  const name = crypto.randomUUID() + EXT[file.mimetype];
  if (useBlob()) {
    const { put } = require('@vercel/blob');
    const blob = await put(`phones/${name}`, file.buffer, { access: 'public', contentType: file.mimetype });
    return blob.url;
  }
  await fs.mkdir(UPLOADS, { recursive: true });
  await fs.writeFile(path.join(UPLOADS, name), file.buffer);
  return `/uploads/${name}`;
}

/** Удаляет ранее загруженное фото; чужие ссылки и стартовые картинки не трогает */
async function remove(image) {
  try {
    if (!image) return;
    if (image.startsWith('/uploads/')) {
      await fs.rm(path.join(UPLOADS, path.basename(image)), { force: true });
    } else if (useBlob() && image.includes(BLOB_HOST)) {
      const { del } = require('@vercel/blob');
      await del(image);
    }
  } catch (err) {
    console.error('Не удалось удалить фото:', err.message);
  }
}

module.exports = { save, remove, EXT, UPLOADS };
