import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

// Configuration for the database connection
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE, // 실제 유저 데이터베이스명 사용
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 1433,
  // mssql (tedious) 공통 타임아웃(ms)
  connectionTimeout: Number(process.env.DB_CONN_TIMEOUT_MS) || 60000,
  requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT_MS) || 60000,
  pool: {
    max: Number(process.env.DB_POOL_MAX) || 10,
    min: Number(process.env.DB_POOL_MIN) || 0,
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS) || 30000,
  },
  options: {
    encrypt: true, // Azure SQL 필수
    trustServerCertificate: true, // Azure SQL Database 연결을 위해 임시로 true 설정
    enableArithAbort: true,
    cryptoCredentialsDetails: { minVersion: 'TLSv1.2' },
  }
};

// Create a connection pool with soft-retry for serverless warm-up or transient issues
let pool;

async function connectWithRetry(retries = 3) {
  const server = dbConfig.server;
  const database = dbConfig.database;
  const attemptDelay = [0, 2000, 4000, 8000]; // backoff (ms)
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      pool = new sql.ConnectionPool(dbConfig);
      await pool.connect();
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DB] Connected to ${server} / ${database}`);
      }
      return pool;
    } catch (err) {
      lastErr = err;
      const delay = attemptDelay[Math.min(attempt, attemptDelay.length - 1)];
      console.error(`[DB] Connection attempt ${attempt + 1} failed:`, err?.code || err?.message || err);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }
  throw lastErr;
}

try {
  await connectWithRetry(3);
  const dbNameResult = await pool.request().query('SELECT DB_NAME() AS dbname');
  console.log('Database connected:', dbNameResult.recordset[0].dbname);
} catch (err) {
  if (process.env.SKIP_DB_FATAL === '1') {
    console.error('[WARN] Database connection failed, continuing in degraded mode (SKIP_DB_FATAL=1):', err?.message || err);
  } else {
    console.error('Database Connection Failed! Bad Config or Network:', err);
    process.exit(1);
  }
}

export { sql, pool };
