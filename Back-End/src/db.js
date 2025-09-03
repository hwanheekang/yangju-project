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
  options: {
    encrypt: true, // Required for Azure SQL
    trustServerCertificate: false // Change to true for local dev / self-signed certs
  }
};

// Create a connection pool
let pool;

try {
  // Create and connect the pool on module load
  pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();
  // 실제 연결된 DB명 출력
  const dbNameResult = await pool.request().query('SELECT DB_NAME() AS dbname');
  console.log('Database connected successfully. Connected DB:', dbNameResult.recordset[0].dbname);
  // 실제 테이블 목록 출력
  const tablesResult = await pool.request().query("SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
  console.log('Tables in DB:', tablesResult.recordset.map(t => `${t.TABLE_SCHEMA}.${t.TABLE_NAME}`).join(', '));
} catch (err) {
  console.error('Database Connection Failed! Bad Config:', err);
  process.exit(1);
}

export { sql, pool };
