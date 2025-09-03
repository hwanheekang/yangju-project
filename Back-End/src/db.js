import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

// Configuration for the database connection
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
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
  console.log('Database connected successfully.');
} catch (err) {
  console.error('Database Connection Failed! Bad Config:', err);
  process.exit(1);
}

export { sql, pool };
