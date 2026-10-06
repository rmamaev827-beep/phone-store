const fs = require('fs');
const path = require('path');

// Два режима работы с одним и тем же SQL:
//  - DATABASE_URL задан  -> обычный PostgreSQL через pg
//  - DATABASE_URL пустой -> встроенный PostgreSQL (PGlite), данные лежат в server/data
let impl = null;

async function connect() {
  // Neon через Vercel отдаёт адрес базы в DATABASE_URL (или POSTGRES_URL)
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url && process.env.VERCEL) {
    throw new Error('подключите базу Postgres (Neon) к проекту — нужна переменная DATABASE_URL');
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
    const { PGlite } = await import('@electric-sql/pglite');
    const dataDir = path.join(__dirname, 'data', 'pgdata');
    fs.mkdirSync(dataDir, { recursive: true });
    const db = new PGlite(dataDir);
    await db.waitReady;
    impl = {
      kind: 'PGlite (встроенный PostgreSQL)',
      query: (text, params) => db.query(text, params),
      exec: (sql) => db.exec(sql),
      tx: (fn) => db.transaction((t) => fn((text, params) => t.query(text, params))),
      close: () => db.close(),
    };
  }
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
