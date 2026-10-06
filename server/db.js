const fs = require('fs');
const path = require('path');

// Два режима работы с одним и тем же SQL:
//  - DATABASE_URL задан  -> обычный PostgreSQL через pg
//  - DATABASE_URL пустой -> встроенный PostgreSQL (PGlite), данные лежат в server/data
let impl = null;

async function connect() {
  // Neon через Vercel отдаёт адрес базы в DATABASE_URL (или POSTGRES_URL)
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  // на хостинге диск не сохраняется, поэтому встроенная база там потеряла бы все данные
  if (!url && (process.env.VERCEL || process.env.RENDER)) {
    throw new Error('подключите базу PostgreSQL — нужна переменная DATABASE_URL');
  }
  if (url) {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: url, max: 3 });
    await pool.query('SELECT 1');
    impl = {
      kind: 'PostgreSQL',
      query: (text, params) => pool.query(text, params),
      exec: (sql) => pool.query(sql),
      tx: async (fn) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await fn((text, params) => client.query(text, params));
          await client.query('COMMIT');
          return result;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      },
    };
  } else {
    impl = await openEmbedded();
  }
}

// Встроенная база работает в памяти, а на диск сохраняется целым снимком в один файл.
// Снимок пишется во временный файл и затем переименовывается, поэтому внезапная остановка
// сервера не может его испортить: в худшем случае теряется последняя секунда изменений.
async function openEmbedded() {
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = path.join(__dirname, 'data');
  const file = path.join(dir, 'shop.pgdump.tar');
  fs.mkdirSync(dir, { recursive: true });

  // .tar.gz — формат первых версий; читаем его, если нового снимка ещё нет
  const source = [file, `${file}.gz`].find((f) => fs.existsSync(f));
  const db = new PGlite(source ? { loadDataDir: new Blob([fs.readFileSync(source)]) } : {});
  await db.waitReady;

  // все обращения к базе идут по очереди — снимок не пересекается с запросами
  let queue = Promise.resolve();
  const exclusive = (job) => {
    const run = queue.then(job, job);
    queue = run.catch(() => {});
    return run;
  };

  let dirty = false;
  let timer = null;
  const save = () =>
    exclusive(async () => {
      if (!dirty) return;
      dirty = false;
      try {
        // без сжатия: файл больше (~40 МБ), зато запись в несколько раз быстрее
        const snapshot = await db.dumpDataDir('none');
        await fs.promises.writeFile(`${file}.tmp`, Buffer.from(await snapshot.arrayBuffer()));
        await fs.promises.rename(`${file}.tmp`, file);
      } catch (err) {
        dirty = true;
        console.error('Не удалось сохранить базу на диск:', err.message);
      }
    });
  const changed = () => {
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(save, 800);
  };
  const isRead = (sql) => /^\s*(select|show|explain)\b/i.test(sql);

  return {
    kind: 'PGlite (встроенный PostgreSQL)',
    query: (text, params) =>
      exclusive(async () => {
        const result = await db.query(text, params);
        if (!isRead(text)) changed();
        return result;
      }),
    exec: (sql) =>
      exclusive(async () => {
        const result = await db.exec(sql);
        changed();
        return result;
      }),
    tx: (fn) =>
      exclusive(async () => {
        const result = await db.transaction((t) => fn((text, params) => t.query(text, params)));
        changed();
        return result;
      }),
    close: async () => {
      clearTimeout(timer);
      await save();
      await db.close();
    },
  };
}

async function init() {
  await connect();
  await impl.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  return impl.kind;
}

module.exports = {
  init,
  query: (text, params) => impl.query(text, params),
  tx: (fn) => impl.tx(fn),
  // встроенную базу нужно закрывать, иначе её файлы могут повредиться
  close: async () => {
    if (impl && impl.close) await impl.close();
  },
};
