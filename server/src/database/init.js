/**
 * 数据库初始化 - 建表、种子数据（MySQL 版）
 */
const { pool, query, queryOne, execute } = require('./pool');
const bcrypt = require('bcryptjs');

/**
 * 等待 MySQL 就绪（最多重试 30 次，间隔 2 秒）
 */
async function waitForDB(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.execute('SELECT 1');
      console.log('✅ MySQL 连接成功');
      return true;
    } catch (err) {
      console.log(`⏳ 等待 MySQL 就绪... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('MySQL 连接超时，请检查数据库是否已启动');
}

async function initDatabase() {
  await waitForDB();

  // ==================== 建表 ====================

  // 用户表
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20),
      real_name VARCHAR(50),
      employee_id VARCHAR(50),
      user_type VARCHAR(20) DEFAULT 'platform',
      status TINYINT DEFAULT 1,
      valid_from DATETIME,
      valid_until DATETIME,
      locked TINYINT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT,
      updated_by INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 角色表
  await query(`
    CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      code VARCHAR(50) NOT NULL UNIQUE,
      description VARCHAR(255),
      status TINYINT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 子系统表
  await query(`
    CREATE TABLE IF NOT EXISTS subsystems (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      code VARCHAR(50) NOT NULL UNIQUE,
      access_url VARCHAR(255) NOT NULL,
      description VARCHAR(255),
      icon VARCHAR(100),
      sort_order INT DEFAULT 0,
      status TINYINT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 用户-角色关联表
  await query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      role_id INT NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      assigned_by INT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      UNIQUE KEY uk_user_role (user_id, role_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 角色-权限关联表
  await query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_id INT NOT NULL,
      permission_type VARCHAR(20) NOT NULL,
      permission_code VARCHAR(50) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      UNIQUE KEY uk_perm (role_id, permission_type, permission_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 操作日志表
  await query(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      operator_id INT,
      operator_name VARCHAR(50),
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(20),
      target_id INT,
      detail VARCHAR(500),
      ip VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ==================== 种子数据 ====================

  // 默认管理员账号
  const adminExists = await queryOne('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    await execute(
      'INSERT INTO users (username, password, email, real_name, employee_id, valid_from, valid_until, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      ['admin', hashedPassword, 'admin@test.com', '系统管理员', 'admin', '2024-01-01', '2099-12-31']
    );
  }

  // 种子角色
  const roleCount = await queryOne('SELECT COUNT(*) as cnt FROM roles');
  if (roleCount.cnt === 0) {
    const roles = [
      ['系统管理员', 'administrator', '拥有所有功能权限的超级管理员'],
      ['普通用户', 'normal_user', '仅可查看用户列表，无操作权限'],
      ['culdata用户', 'culdata-user', 'culdata系统用户'],
      ['culspace用户', 'culspace-user', 'culspace系统用户'],
      ['culopc用户', 'culopc-user', 'culopc系统用户'],
      ['culbiz用户', 'culbiz-user', 'culbiz系统用户'],
      ['culclaw用户', 'culclaw-user', 'culclaw系统用户'],
      ['cultoken用户', 'cultoken-user', 'cultoken系统用户'],
      ['culskill用户', 'culskill-user', 'culskill系统用户'],
      ['culhard用户', 'culhard-user', 'culhard系统用户'],
    ];
    for (const [name, code, desc] of roles) {
      await execute('INSERT INTO roles (name, code, description) VALUES (?, ?, ?)', [name, code, desc]);
    }

    // 管理员角色：全部功能权限
    const adminRole = await queryOne("SELECT id FROM roles WHERE code = 'administrator'");
    if (adminRole) {
      await execute("INSERT IGNORE INTO role_permissions (role_id, permission_type, permission_code) VALUES (?, 'function', 'user_manage')", [adminRole.id]);
      await execute("INSERT IGNORE INTO role_permissions (role_id, permission_type, permission_code) VALUES (?, 'function', 'role_manage')", [adminRole.id]);
      await execute("INSERT IGNORE INTO role_permissions (role_id, permission_type, permission_code) VALUES (?, 'function', 'system_manage')", [adminRole.id]);
      // 管理员拥有全部 8 个子系统权限
      const allSubCodes = ['culdata','culspace','culopc','culbiz','culclaw','cultoken','culskill','culhard'];
      for (const sc of allSubCodes) {
        await execute("INSERT IGNORE INTO role_permissions (role_id, permission_type, permission_code) VALUES (?, 'subsystem', ?)", [adminRole.id, sc]);
      }
    }

    // 8 个子系统角色：各自绑定子系统权限
    const subRoleCodes = ['culdata-user','culspace-user','culopc-user','culbiz-user','culclaw-user','cultoken-user','culskill-user','culhard-user'];
    const subCodes = ['culdata','culspace','culopc','culbiz','culclaw','cultoken','culskill','culhard'];
    for (let i = 0; i < subRoleCodes.length; i++) {
      const role = await queryOne("SELECT id FROM roles WHERE code = ?", [subRoleCodes[i]]);
      if (role) {
        await execute("INSERT IGNORE INTO role_permissions (role_id, permission_type, permission_code) VALUES (?, 'subsystem', ?)", [role.id, subCodes[i]]);
      }
    }

    // 给管理员分配角色
    const adminUser = await queryOne("SELECT id FROM users WHERE username = 'admin'");
    if (adminUser && adminRole) {
      await execute('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [adminUser.id, adminRole.id]);
    }

    // 创建测试用户 test_culopc
    const testUser = await queryOne("SELECT id FROM users WHERE username = 'test_culopc'");
    if (!testUser) {
      const hashedPwd = bcrypt.hashSync('123456', 10);
      const result = await execute("INSERT INTO users (username, password, real_name, status) VALUES (?,?,?,1)", ['test_culopc', hashedPwd, 'CulOPC测试用户']);
      const culopcRole = await queryOne("SELECT id FROM roles WHERE code = 'culopc-user'");
      if (culopcRole) {
        await execute('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [result.insertId, culopcRole.id]);
      }
    }
  }

  // 种子子系统
  const subCount = await queryOne('SELECT COUNT(*) as cnt FROM subsystems');
  if (subCount.cnt === 0) {
    const subsystems = [
      ['CulData', 'culdata', 'https://culdata.scstit.com', 'CulData 数据系统', 1],
      ['CulSpace', 'culspace', 'https://culspace.scstit.com', 'CulSpace 空间系统', 2],
      ['CulOPC', 'culopc', 'https://culopc.scstit.com', 'CulOPC 运营系统', 3],
      ['CulBiz', 'culbiz', 'https://culbiz.scstit.com', 'CulBiz 业务系统', 4],
      ['CulClaw', 'culclaw', 'https://cclaw.scstit.com/culclaw', 'CulClaw 文创智能体工作台', 5],
      ['CulToken', 'cultoken', 'https://cultoken.scstit.com', 'CulToken 令牌系统', 6],
      ['CulSkill', 'culskill', 'https://culskill.scstit.com', 'CulSkill 技能系统', 7],
      ['CulHard', 'culhard', 'https://culhard.scstit.com', 'CulHard 硬件系统', 8],
    ];
    for (const [name, code, url, desc, order] of subsystems) {
      await execute('INSERT INTO subsystems (name, code, access_url, description, sort_order) VALUES (?,?,?,?,?)', [name, code, url, desc, order]);
    }
  }

  console.log('✅ 数据库初始化完成');
}

module.exports = { initDatabase, pool, query, queryOne, execute };
