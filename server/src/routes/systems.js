/**
 * 子系统管理路由 + 子系统访问验证（MySQL 版）
 */
const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../database/pool');
const { authenticate, requirePermission } = require('../middleware/auth');

/**
 * GET /api/systems
 * 获取所有子系统列表（公开）
 */
router.get('/', async (req, res) => {
  try {
    const systems = await query('SELECT * FROM subsystems ORDER BY sort_order');
    res.json({ code: 200, message: 'success', data: systems });
  } catch (err) {
    console.error('获取子系统列表失败:', err);
    res.json({ code: 500, message: '获取失败', data: null });
  }
});

// 以下路由需要认证
router.use(authenticate);

/**
 * GET /api/systems/accessible
 * 获取当前用户可访问的子系统列表
 */
router.get('/accessible', async (req, res) => {
  try {
    const accessibleSystems = await query(`
      SELECT DISTINCT s.*, 
        GROUP_CONCAT(DISTINCT roles.name) as via_roles
      FROM subsystems s
      JOIN role_permissions rp ON s.code = rp.permission_code AND rp.permission_type = 'subsystem'
      JOIN user_roles ur ON rp.role_id = ur.role_id
      JOIN roles ON ur.role_id = roles.id
      WHERE ur.user_id = ? AND s.status = 1
      GROUP BY s.id ORDER BY s.sort_order
    `, [req.user.id]);

    res.json({
      code: 200,
      message: 'success',
      data: {
        userId: req.user.id,
        username: req.user.username,
        systems: accessibleSystems.map(s => ({
          ...s,
          viaRoles: s.via_roles ? s.via_roles.split(',') : []
        }))
      }
    });
  } catch (err) {
    console.error('获取可访问子系统失败:', err);
    res.json({ code: 500, message: '获取失败', data: null });
  }
});

/**
 * GET /api/systems/check/:systemCode
 * 检查当前用户是否有权访问指定子系统
 */
router.get('/check/:systemCode', async (req, res) => {
  try {
    const { systemCode } = req.params;

    const access = await query(`
      SELECT s.name, s.access_url, r.name as role_name, r.code as role_code
      FROM subsystems s
      JOIN role_permissions rp ON s.code = rp.permission_code AND rp.permission_type = 'subsystem'
      JOIN user_roles ur ON rp.role_id = ur.role_id
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ? AND s.code = ? AND s.status = 1
    `, [req.user.id, systemCode]);

    if (access.length > 0) {
      res.json({
        code: 200,
        message: '有权访问',
        data: {
          hasAccess: true,
          systemName: access[0].name,
          systemUrl: access[0].access_url,
          grantedVia: access.map(a => ({ roleName: a.role_name, roleCode: a.role_code })),
          userInfo: {
            id: req.user.id,
            username: req.user.username,
            realName: req.user.real_name || ''
          }
        }
      });
    } else {
      res.json({
        code: 403,
        message: '您没有权限访问此子系统',
        data: { hasAccess: false }
      });
    }
  } catch (err) {
    console.error('子系统权限检查失败:', err);
    res.json({ code: 500, message: '检查失败', data: null });
  }
});

/**
 * POST /api/systems
 * 创建子系统
 */
router.post('/', requirePermission('system_manage'), async (req, res) => {
  try {
    const { name, code, access_url, description, accessUrl } = req.body;
    const accessUrlFinal = accessUrl || access_url;
    if (!name || !code || !accessUrlFinal) {
      return res.json({ code: 400, message: '请填写系统名称、编码和访问地址', data: null });
    }
    const exists = await queryOne('SELECT id FROM subsystems WHERE code = ?', [code]);
    if (exists) {
      return res.json({ code: 400, message: '该系统编码已存在', data: null });
    }
    const rows = await query('SELECT COUNT(*) as cnt FROM subsystems');
    const sortCount = rows[0].cnt;
    const result = await execute(
      'INSERT INTO subsystems (name, code, access_url, description, sort_order) VALUES (?,?,?,?,?)',
      [name, code, accessUrlFinal, description || '', sortCount + 1]
    );
    res.json({ code: 200, message: '创建成功', data: { id: result.insertId } });
  } catch (err) {
    console.error('创建子系统失败:', err);
    res.json({ code: 500, message: '创建失败', data: null });
  }
});

/**
 * PUT /api/systems/:id
 * 编辑子系统
 */
router.put('/:id', requirePermission('system_manage'), async (req, res) => {
  try {
    const { name, code, access_url, description, status, accessUrl } = req.body;
    const accessUrlFinal = accessUrl || access_url;
    const sys = await queryOne('SELECT * FROM subsystems WHERE id = ?', [req.params.id]);
    if (!sys) {
      return res.json({ code: 404, message: '系统不存在', data: null });
    }
    await execute(
      'UPDATE subsystems SET name=?, code=?, access_url=?, description=?, status=? WHERE id=?',
      [name || sys.name, code || sys.code, accessUrlFinal || sys.access_url,
        description !== undefined ? description : sys.description,
        status !== undefined ? status : sys.status, req.params.id]
    );
    res.json({ code: 200, message: '更新成功', data: null });
  } catch (err) {
    res.json({ code: 500, message: '更新失败', data: null });
  }
});

/**
 * DELETE /api/systems/:id
 * 删除子系统
 */
router.delete('/:id', requirePermission('system_manage'), async (req, res) => {
  try {
    const sys = await queryOne('SELECT * FROM subsystems WHERE id = ?', [req.params.id]);
    if (!sys) {
      return res.json({ code: 404, message: '系统不存在', data: null });
    }
    await execute('DELETE FROM role_permissions WHERE permission_code = ? AND permission_type = ?', [sys.code, 'subsystem']);
    await execute('DELETE FROM subsystems WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '删除成功', data: null });
  } catch (err) {
    res.json({ code: 500, message: '删除失败', data: null });
  }
});

module.exports = router;
