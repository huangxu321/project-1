/**
 * MySQL 连接池（mysql2/promise）
 */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root123',
  database: process.env.DB_NAME || 'unified_user',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// 简易 query 执行器（用 query() 而非 execute()，支持动态 SQL 参数）
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// 获取单行
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// 执行写操作（返回 { insertId, affectedRows }）
async function execute(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return { insertId: result.insertId, affectedRows: result.affectedRows };
}

module.exports = { pool, query, queryOne, execute };
