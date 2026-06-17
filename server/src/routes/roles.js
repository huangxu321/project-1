/**
 * 角色管理路由 - CRUD、权限配置（MySQL 版）
 */
const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../database/pool');
const { authenticate, requirePermission, BUILTIN_ROLES } = require('../middleware/auth');

router.use(authenticate);

const FUNCTION_PERMISSIONS = [
  { code: 'user_manage', name: '用户管理', module: '管理中心' },
  { code: 'role_manage', name: '角色管理', module: '管理中心' },
  { code: 'system_manage', name: '系统配置', module: '管理中心' }
];

/**
 * GET /api/roles
 * 角色列表
 */
router.get('/', async (req, res) => {
  try {
    const roles = await query(`
      SELECT r.*, 
        (SELECT COUNT(*) FROM user_roles WHERE role_id = r.id) as user_count
      FROM roles r ORDER BY r.created_at DESC
    `);
    res.json({ code: 200, message: 'success', data: roles });
  } catch (err) {
    console.error('获取角色列表失败:', err);
    res.json({ code: 500, message: '获取失败', data: null });
  }
});

/**
 * POST /api/roles
 * 创建角色
 */
router.post('/', async (req, res) => {
  try {
    const { name, code, description, permissions } = req.body;
    if (!name || !code) {
      return res.json({ code: 400, message: '请填写角色名称和编码', data: null });
    }

    const exists = await queryOne("SELECT id FROM roles WHERE code = ?", [code]);
    if (exists) {
      return res.json({ code: 400, message: '该角色编码已存在', data: null });
    }

    const result = await execute("INSERT INTO roles (name, code, description) VALUES (?, ?, ?)", [name, code, description || '']);

    if (permissions && permissions.length > 0) {
      for (const p of permissions) {
        await execute('INSERT INTO role_permissions (role_id, permission_type, permission_code) VALUES (?, ?, ?)',
          [result.insertId, p.type || 'function', p.code]);
      }
    }

    res.json({ code: 200, message: '创建成功', data: { id: result.insertId } });
  } catch (err) {
    res.json({ code: 500, message: '创建失败：' + err.message, data: null });
  }
});

/**
 * GET /api/roles/:id
 * 角色详情
 */
router.get('/:id', async (req, res) => {
  try {
    const role = await queryOne('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    if (!role) {
      return res.json({ code: 404, message: '角色不存在', data: null });
    }

    const functionPerms = await query(`
      SELECT permission_code FROM role_permissions 
      WHERE role_id = ? AND permission_type = 'function'
    `, [req.params.id]);

    const subsystemPerms = await query(`
      SELECT permission_code FROM role_permissions 
      WHERE role_id = ? AND permission_type = 'subsystem'
    `, [req.params.id]);

    const allSubsystems = await query('SELECT * FROM subsystems WHERE status = 1 ORDER BY sort_order');

    res.json({
      code: 200,
      message: 'success',
      data: {
        ...role,
        permissions: {
          functions: functionPerms.map(p => p.permission_code),
          subsystems: subsystemPerms.map(p => p.permission_code)
        },
        availableSubsystems: allSubsystems,
        availableFunctions: FUNCTION_PERMISSIONS
      }
    });
  } catch (err) {
    res.json({ code: 500, message: '获取失败', data: null });
  }
});

/**
 * PUT /api/roles/:id
 * 编辑角色
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, code, description, status, permissions } = req.body;

    const role = await queryOne('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    if (!role) {
      return res.json({ code: 404, message: '角色不存在', data: null });
    }
    if (BUILTIN_ROLES.includes(role.code)) {
      if (code && code !== role.code) {
        return res.json({ code: 400, message: '内置角色的编码不可修改', data: null });
      }
    }

    await execute("UPDATE roles SET name=?, code=?, description=?, status=? WHERE id=?",
      [name || role.name, code || role.code, description !== undefined ? description : role.description,
        status !== undefined ? status : 1, req.params.id]);

    if (permissions !== undefined) {
      await execute('DELETE FROM role_permissions WHERE role_id = ?', [req.params.id]);
      if (permissions && permissions.length > 0) {
        for (const p of permissions) {
          await execute('INSERT INTO role_permissions (role_id, permission_type, permission_code) VALUES (?, ?, ?)',
            [parseInt(req.params.id), p.type || 'function', p.code]);
        }
      }
    }

    res.json({ code: 200, message: '更新成功', data: null });
  } catch (err) {
    res.json({ code: 500, message: '更新失败：' + err.message, data: null });
  }
});

/**
 * DELETE /api/roles/:id
 * 删除角色
 */
router.delete('/:id', async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);

    const role = await queryOne('SELECT * FROM roles WHERE id = ?', [roleId]);
    if (!role) {
      return res.json({ code: 404, message: '角色不存在', data: null });
    }
    if (BUILTIN_ROLES.includes(role.code)) {
      return res.json({ code: 400, message: '内置角色不可删除', data: null });
    }

    const ur = await execute('DELETE FROM user_roles WHERE role_id = ?', [roleId]);
    await execute('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
    await execute('DELETE FROM roles WHERE id = ?', [roleId]);
    res.json({ code: 200, message: '删除成功', data: { removedUserCount: ur.affectedRows } });
  } catch (err) {
    res.json({ code: 500, message: '操作失败', data: null });
  }
});

module.exports = router;
