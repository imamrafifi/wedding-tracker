import mysql from "mysql2/promise";

// Reuse a single pool across serverless invocations (Vercel keeps the
// module cache warm between calls on the same instance).
let pool;

function getPool() {
  if (!pool) {
    const caCert = process.env.DB_CA_CERT;
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: caCert ? { ca: caCert.replace(/\\n/g, "\n") } : undefined,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function query(sql, params) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

// Run several statements as one transaction. `fn` receives a connection
// with the same `.execute` signature as the pool.
export async function withTransaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
