/**
 * 用户管理路由 - CRUD、搜索、筛选、角色分配、冻结、密码操作（MySQL 版）
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { query, queryOne, execute } = require('../database/pool');
const { authenticate, requirePermission } = require('../middleware/auth');

const ADMIN_USERNAME = 'admin';
const ADMIN_ROLE_CODE = 'administrator';

// 所有用户路由都需要认证
router.use(authenticate);

// 确保 admin 账号永远拥有系统管理员角色
async function ensureAdminRole() {
  const adminUser = await queryOne("SELECT id FROM users WHERE username = ?", [ADMIN_USERNAME]);
  const adminRole = await queryOne("SELECT id FROM roles WHERE code = ?", [ADMIN_ROLE_CODE]);
  if (adminUser && adminRole) {
    await execute('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [adminUser.id, adminRole.id]);
  }
}

// 为用户自动分配普通用户角色
async function assignNormalUserRole(userId) {
  const normalRole = await queryOne("SELECT id FROM roles WHERE code = 'normal_user'");
  if (normalRole) {
    await execute('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, normalRole.id]);
  }
}

/**
 * GET /api/users
 * 用户列表（支持搜索、筛选）
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword, roleId, status, validFrom, validUntil, frozen } = req.query;

    let sql = `
      SELECT u.*,
        GROUP_CONCAT(DISTINCT r.name) as role_names,
        GROUP_CONCAT(DISTINCT r.code) as role_codes
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (keyword) {
      sql += ` AND (u.username LIKE ? OR u.real_name LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)`;
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw, kw, kw);
    }
    if (roleId && roleId !== 'all') {
      sql += ` AND r.id = ?`;
      params.push(parseInt(roleId));
    }
    if (status !== undefined && status !== '' && status !== 'all') {
      sql += ` AND u.status = ?`;
      params.push(parseInt(status));
    }
    if (frozen === '1') {
      sql += ` AND u.locked = 1`;
    } else if (frozen === '0') {
      sql += ` AND u.locked = 0`;
    }
    if (validFrom) {
      sql += ` AND u.valid_from >= ?`;
      params.push(validFrom);
    }
    if (validUntil) {
      sql += ` AND u.valid_until <= ?`;
      params.push(validUntil);
    }

    // 计数
    const fromIndex = sql.indexOf('FROM');
    const countSql = 'SELECT COUNT(DISTINCT u.id) as total ' + sql.substring(fromIndex);
    const countResult = await queryOne(countSql, params);
    const total = countResult.total;

    sql += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

    const rows = await query(sql, params);

    const list = rows.map(row => ({
      ...row,
      roleNames: row.role_names ? row.role_names.split(',') : [],
      roleCodes: row.role_codes ? row.role_codes.split(',') : [],
      statusText: row.status === 1 ? '正常' : '禁用',
      frozenText: row.locked === 1 ? '冻结' : '正常'
    }));

    res.json({
      code: 200,
      message: 'success',
      data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) }
    });
  } catch (err) {
    console.error('获取用户列表失败:', err);
    res.json({ code: 500, message: '获取用户列表失败：' + err.message, data: null });
  }
});

/**
 * POST /api/users
 * 新建用户
 */
router.post('/', requirePermission('user_manage'), async (req, res) => {
  try {
    const { username, password, email, phone, realName, employeeId, userType, validFrom, validUntil, locked, roleIds } = req.body;

    if (!username || !password) {
      return res.json({ code: 400, message: '请输入账号和密码', data: null });
    }

    const exists = await queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (exists) {
      return res.json({ code: 400, message: '该账号已存在', data: null });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await execute(`
      INSERT INTO users (username, password, email, phone, real_name, employee_id, user_type, valid_from, valid_until, locked, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [username, hashedPassword, email || null, phone || null, realName || null, employeeId || null,
        userType || 'platform', validFrom || null, validUntil || null, locked ? 1 : 0, req.user.id]);

    const userId = result.insertId;

    if (roleIds && roleIds.length > 0) {
      for (const rid of roleIds) {
        await execute('INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)', [userId, parseInt(rid), req.user.id]);
      }
    }

    await execute("INSERT INTO operation_logs (operator_id, operator_name, action, target_type, target_id) VALUES (?, ?, '创建用户', 'user', ?)",
      [req.user.id, req.user.real_name || req.user.username, userId]);

    res.json({ code: 200, message: '创建成功', data: { userId } });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '创建失败：' + err.message, data: null });
  }
});

/**
 * GET /api/users/:id
 * 获取用户详情
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.json({ code: 404, message: '用户不存在', data: null });
    }

    const roles = await query(`
      SELECT r.id, r.name, r.code FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `, [user.id]);

    res.json({ code: 200, message: 'success', data: { ...user, roles } });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '获取失败', data: null });
  }
});

/**
 * PUT /api/users/:id
 * 编辑用户信息
 */
router.put('/:id', requirePermission('user_manage'), async (req, res) => {
  try {
    const { email, phone, realName, employeeId, validFrom, validUntil, locked, roleIds } = req.body;

    const user = await queryOne('SELECT id, username FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.json({ code: 404, message: '用户不存在', data: null });
    }

    if (user.username === ADMIN_USERNAME) {
      await ensureAdminRole();
    }

    await execute(`
      UPDATE users SET email=?, phone=?, real_name=?, employee_id=?, valid_from=?, valid_until=?,
        locked=?, updated_by=?
      WHERE id=?
    `, [email || null, phone || null, realName || null, employeeId || null,
        validFrom || null, validUntil || null, locked ? 1 : 0, req.user.id, req.params.id]);

    if (roleIds !== undefined) {
      await execute('DELETE FROM user_roles WHERE user_id = ?', [req.params.id]);
      if (roleIds.length > 0) {
        for (const rid of roleIds) {
          await execute('INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)', [req.params.id, parseInt(rid), req.user.id]);
        }
      }
    }

    await execute("INSERT INTO operation_logs (operator_id, operator_name, action, target_type, target_id) VALUES (?, ?, '编辑用户', 'user', ?)",
      [req.user.id, req.user.real_name || req.user.username, req.params.id]);

    res.json({ code: 200, message: '更新成功', data: null });
  } catch (err) {
    console.error(err);
    res.json({ code: 500, message: '更新失败：' + err.message, data: null });
  }
});

/**
 * PUT /api/users/:id/password
 * 修改密码
 */
router.put('/:id/password', requirePermission('user_manage'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.json({ code: 400, message: '新密码长度不能小于6位', data: null });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await execute('UPDATE users SET password=? WHERE id=?', [hashedPassword, req.params.id]);

    await execute("INSERT INTO operation_logs (operator_id, operator_name, action, target_type, target_id) VALUES (?, ?, '修改密码', 'user', ?)",
      [req.user.id, req.user.real_name || req.user.username, req.params.id]);

    res.json({ code: 200, message: '密码修改成功', data: null });
  } catch (err) {
    res.json({ code: 500, message: '操作失败', data: null });
  }
});

/**
 * POST /api/users/:id/reset-password
 * 重置密码
 */
router.post('/:id/reset-password', requirePermission('user_manage'), async (req, res) => {
  try {
    const defaultPwd = bcrypt.hashSync('123456', 10);
    await execute('UPDATE users SET password=? WHERE id=?', [defaultPwd, req.params.id]);

    await execute("INSERT INTO operation_logs (operator_id, operator_name, action, target_type, target_id) VALUES (?, ?, '重置密码', 'user', ?)",
      [req.user.id, req.user.real_name || req.user.username, req.params.id]);

    res.json({ code: 200, message: '密码已重置为默认密码 123456', data: null });
  } catch (err) {
    res.json({ code: 500, message: '操作失败', data: null });
  }
});

/**
 * PUT /api/users/:id/freeze
 * 冻结/解冻用户
 */
router.put('/:id/freeze', requirePermission('user_manage'), async (req, res) => {
  try {
    const { freeze } = req.body;
    await execute('UPDATE users SET locked=?, updated_by=? WHERE id=?',
      [freeze ? 1 : 0, req.user.id, req.params.id]);

    const action = freeze ? '冻结用户' : '解冻用户';
    await execute("INSERT INTO operation_logs (operator_id, operator_name, action, target_type, target_id, detail) VALUES (?, ?, ?, 'user', ?, ?)",
      [req.user.id, req.user.real_name || req.user.username, action, req.params.id, freeze ? '账号已冻结' : '账号已解冻']);

    res.json({ code: 200, message: freeze ? '账号已冻结' : '账号已解冻', data: null });
  } catch (err) {
    res.json({ code: 500, message: '操作失败', data: null });
  }
});

/**
 * DELETE /api/users/:id
 * 删除用户
 */
router.delete('/:id', requirePermission('user_manage'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) {
      return res.json({ code: 400, message: '不能删除自己', data: null });
    }
    const targetUser = await queryOne('SELECT username FROM users WHERE id = ?', [userId]);
    if (targetUser && targetUser.username === ADMIN_USERNAME) {
      return res.json({ code: 400, message: 'admin 账号不可删除', data: null });
    }
    await execute('DELETE FROM user_roles WHERE user_id = ?', [userId]);
    await execute('DELETE FROM users WHERE id = ?', [userId]);

    await execute("INSERT INTO operation_logs (operator_id, operator_name, action, target_type, target_id) VALUES (?, ?, '删除用户', 'user', ?)",
      [req.user.id, req.user.real_name || req.user.username, userId]);

    res.json({ code: 200, message: '删除成功', data: null });
  } catch (err) {
    res.json({ code: 500, message: '操作失败', data: null });
  }
});

module.exports = router;
