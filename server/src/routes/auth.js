/**
 * 认证路由 - 登录、注册、退出（MySQL 版）
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { query, queryOne, execute } = require('../database/pool');
const { generateToken, authenticate, getUserPermissions } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * 用户登录 + 子系统访问权限校验
 *
 * 校验链路（10步）：
 *   1. 参数校验 → 400
 *   2. 用户是否存在 → 401
 *   3. 用户状态-禁用 → 403
 *   4. 用户状态-冻结 → 403
 *   5. 用户状态-过期 → 403
 *   6. 密码是否正确 → 401
 *   7. 获取用户角色列表
 *   8. [systemCode] 角色是否为空 → 403
 *   9. [systemCode] 系统是否存在/启用 → 403/404
 *  10. [systemCode] 角色是否有该系统权限 → 403
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password, systemCode } = req.body;

    // ===== Step 1: 参数校验 =====
    if (!username || !password) {
      return res.json({ code: 400, message: '请输入用户名和密码', data: null });
    }

    // ===== Step 2: 用户是否存在 =====
    const user = await queryOne('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.json({ code: 401, message: '用户不存在，请先注册账号', data: null });
    }

    // ===== Step 3-5: 用户状态校验 =====
    if (user.status !== 1) {
      return res.json({ code: 403, message: '账号已被禁用，请联系管理员', data: null });
    }
    if (user.locked === 1) {
      return res.json({ code: 403, message: '账号已被冻结', data: null });
    }
    if (user.valid_until && new Date(user.valid_until) < new Date()) {
      return res.json({ code: 403, message: '账号已过期', data: null });
    }

    // ===== Step 6: 密码校验 =====
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.json({ code: 401, message: '用户名或密码错误', data: null });
    }

    // ===== Step 7: 获取用户角色列表 =====
    const roles = await query(`
      SELECT r.id, r.name, r.code FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `, [user.id]);

    let systemInfo = null;
    let accessibleSystems = [];

    // ===== Step 8-10: 子系统权限校验（仅当传入 systemCode 时） =====
    if (systemCode) {
      // Step 8: 用户是否分配了角色
      if (roles.length === 0) {
        return res.json({ code: 403, message: '未分配任何角色，无法访问该系统，请联系管理员', data: null });
      }

      // Step 9: 系统是否存在且已启用
      systemInfo = await queryOne('SELECT id, name, code, access_url, status FROM subsystems WHERE code = ?', [systemCode]);
      if (!systemInfo) {
        return res.json({ code: 404, message: `系统[${systemCode}]不存在`, data: null });
      }
      if (systemInfo.status !== 1) {
        return res.json({ code: 403, message: `系统[${systemInfo.name}]已停用`, data: null });
      }

      // Step 10: 用户的角色是否拥有对该系统的访问权限
      const accessCheck = await queryOne(`
        SELECT COUNT(*) as cnt FROM role_permissions rp
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = ?
          AND rp.permission_type = 'subsystem'
          AND rp.permission_code = ?
      `, [user.id, systemCode]);

      if (!accessCheck || accessCheck.cnt === 0) {
        return res.json({
          code: 403,
          message: `您没有访问[${systemInfo.name}]的权限，请联系管理员分配相应角色`,
          data: null
        });
      }
    }

    // 获取用户可访问的所有子系统
    accessibleSystems = await query(`
      SELECT DISTINCT s.id, s.name, s.code, s.access_url
      FROM subsystems s
      JOIN role_permissions rp ON s.code = rp.permission_code AND rp.permission_type = 'subsystem'
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ? AND s.status = 1
    `, [user.id]);

    // 获取用户功能权限列表
    const permissions = await getUserPermissions(user.id);

    // 生成 Token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      realName: user.real_name || ''
    });

    // 记录操作日志
    const logAction = systemCode
      ? `用户登录[${systemCode}]`
      : '用户登录';
    await execute("INSERT INTO operation_logs (operator_id, operator_name, action) VALUES (?, ?, ?)",
      [user.id, user.real_name || user.username, logAction]);

    // ===== 响应 =====
    const responseData = {
      token,
      userInfo: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        email: user.email,
        phone: user.phone,
        userType: user.user_type,
        roles: roles,
        permissions: permissions
      }
    };

    if (systemCode) {
      responseData.accessCheck = {
        systemCode: systemInfo.code,
        systemName: systemInfo.name,
        systemUrl: systemInfo.access_url,
        hasAccess: true
      };
    }

    responseData.accessibleSystems = accessibleSystems;

    res.json({ code: 200, message: '登录成功', data: responseData });
  } catch (err) {
    console.error('登录失败:', err);
    res.json({ code: 500, message: '服务器内部错误', data: null });
  }
});

/**
 * POST /api/auth/register
 * 用户注册
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, phone, realName, systemCode, roleIds } = req.body;

    if (!username || !password) {
      return res.json({ code: 400, message: '请输入用户名和密码', data: null });
    }
    if (password.length < 6) {
      return res.json({ code: 400, message: '密码长度不能小于6位', data: null });
    }
    if (username.length < 2 || username.length > 20) {
      return res.json({ code: 400, message: '用户名长度应在2-20位之间', data: null });
    }

    // 检查用户名是否已存在
    const exists = await queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (exists) {
      return res.json({ code: 400, message: '该用户名已被注册', data: null });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await execute(
      'INSERT INTO users (username, password, email, phone, real_name) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, email || null, phone || null, realName || null]
    );

    const userId = result.insertId;
    let assignedRoles = [];

    if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
      for (const roleId of roleIds) {
        const role = await queryOne('SELECT id, name, code FROM roles WHERE id = ?', [roleId]);
        if (role) {
          await execute('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);
          assignedRoles.push(role);
        }
      }
    } else if (systemCode) {
      const systemRoles = await query(`
        SELECT DISTINCT r.id, r.name, r.code FROM roles r
        JOIN role_permissions rp ON r.id = rp.role_id
        WHERE rp.permission_type = 'subsystem' AND rp.permission_code = ?
      `, [systemCode]);

      for (const role of systemRoles) {
        await execute('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, role.id]);
        assignedRoles.push(role);
      }
    }

    // 兜底：没有任何角色时，自动分配普通用户角色
    if (assignedRoles.length === 0 && username !== 'admin') {
      const normalRole = await queryOne("SELECT id, name, code FROM roles WHERE code = 'normal_user'");
      if (normalRole) {
        await execute('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, normalRole.id]);
        assignedRoles.push(normalRole);
      }
    }

    await execute("INSERT INTO operation_logs (operator_id, operator_name, action) VALUES (?, ?, ?)",
      [userId, realName || username, '用户注册']);

    res.json({
      code: 200,
      message: '注册成功',
      data: {
        userId,
        username,
        realName: realName || '',
        assignedRoles: assignedRoles.map(r => ({ id: r.id, name: r.name, code: r.code }))
      }
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.json({ code: 500, message: '注册失败，请稍后重试', data: null });
  }
});

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const roles = await query(`
      SELECT r.id, r.name, r.code FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `, [req.user.id]);

    const subsystems = await query(`
      SELECT DISTINCT s.id, s.name, s.code, s.access_url
      FROM subsystems s
      JOIN role_permissions rp ON s.code = rp.permission_code AND rp.permission_type = 'subsystem'
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ? AND s.status = 1
    `, [req.user.id]);

    res.json({
      code: 200,
      message: 'success',
      data: {
        ...req.user,
        realName: req.user.real_name,
        roles,
        accessibleSystems: subsystems
      }
    });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.json({ code: 500, message: '获取失败', data: null });
  }
});

/**
 * POST /api/auth/logout
 * 退出登录
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    await execute("INSERT INTO operation_logs (operator_id, operator_name, action) VALUES (?, ?, ?)",
      [req.user.id, req.user.real_name || req.user.username, '用户退出']);
    res.json({ code: 200, message: '已退出登录', data: null });
  } catch (err) {
    res.json({ code: 200, message: '已退出登录', data: null });
  }
});

module.exports = router;
