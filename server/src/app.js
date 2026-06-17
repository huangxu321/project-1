/**
 * 统一用户管理系统 - 主入口（MySQL 版）
 * 技术栈: Express + MySQL + JWT
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database/init');

// 路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const systemRoutes = require('./routes/systems');

const app = express();
const PORT = process.env.PORT || 3890;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

(async () => {
  // 初始化数据库（建表 + 种子数据）
  await initDatabase();

  // API 路由
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/roles', roleRoutes);
  app.use('/api/systems', systemRoutes);

  // 健康检查
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', db: 'MySQL', timestamp: new Date().toISOString() });
  });

  // 托管前端静态文件（生产模式）
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  // SPA 回退：非 API 请求都返回 index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // 全局错误处理中间件
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  });

  app.listen(PORT, () => {
    console.log(`✅ 统一用户管理系统服务已启动 → http://localhost:${PORT}`);
    console.log(`   数据库: MySQL`);
  });
})();
