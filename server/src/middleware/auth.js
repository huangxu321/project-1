/**
 * JWT 认证中间件 + 权限校验中间件（MySQL 版）
 */
const jwt = require('jsonwebtoken');
const { queryOne, query } = require('../database/pool');

const JWT_SECRET = 'unified-user-management-secret-key-2024';
const JWT_EXPIRES_IN = '24h';

// 内置角色编码 — 不可删除/修改编码
const BUILTIN_ROLES = ['administrator', 'normal_user'];

// 生成 Token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// 验证 Token 中间件
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录或登录已过期', data: null });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // 异步获取用户信息
    (async () => {
      try {
        const user = await queryOne('SELECT id, username, real_name, email, phone, status, locked FROM users WHERE id = ?', [decoded.userId]);

        if (!user) {
          return res.status(401).json({ code: 401, message: '用户不存在', data: null });
        }
        if (user.status !== 1) {
          return res.status(403).json({ code: 403, message: '账号已被禁用', data: null });
        }
        if (user.locked === 1) {
          return res.status(403).json({ code: 403, message: '账号已被冻结', data: null });
        }

        req.user = user;
        next();
      } catch (err) {
        console.error('认证查询失败:', err);
        res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
      }
    })();
  } catch (err) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录', data: null });
  }
}

/**
 * 获取用户的所有功能权限码
 */
async function getUserPermissions(userId) {
  const perms = await query(`
    SELECT DISTINCT rp.permission_code FROM role_permissions rp
    JOIN user_roles ur ON rp.role_id = ur.role_id
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = ? AND rp.permission_type = 'function'
  `, [userId]);
  return perms.map(p => p.permission_code);
}

/**
 * 权限校验中间件工厂
 * @param {string} permissionCode - 所需的功能权限码
 * @param {object} options - { allowSelf: true } 允许用户操作自己（如修改自己密码）
 */
function requirePermission(permissionCode, options = {}) {
  return (req, res, next) => {
    const userId = req.user.id;
    (async () => {
      try {
        const permissions = await getUserPermissions(userId);
        if (!permissions.includes(permissionCode)) {
          return res.status(403).json({ code: 403, message: '您没有权限执行此操作', data: null });
        }
        next();
      } catch (err) {
        console.error('权限校验失败:', err);
        res.status(500).json({ code: 500, message: '权限校验失败', data: null });
      }
    })();
  };
}

module.exports = { generateToken, authenticate, requirePermission, getUserPermissions, JWT_SECRET, BUILTIN_ROLES };
