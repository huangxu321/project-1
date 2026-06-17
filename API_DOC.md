# 统一用户管理系统 - API 接口文档

> **版本**: v1.1 | **基础URL**: `http://localhost:5173/api`（Vite 代理 → 后端 `http://localhost:3890`）  
> **认证方式**: JWT Bearer Token（除登录注册外，所有接口需携带 `Authorization: Bearer <token>`）  
> **数据库**: SQLite (sql.js，纯 JS 实现，免费、无需安装)  
> **默认管理员账号**: `admin` / `admin123`
> **测试用户账号**: `test_culopc` / `123456`

---

## 目录

- [一、认证模块](#一认证模块)
- [二、用户管理模块](#二用户管理模块)
- [三、角色管理模块](#三角色管理模块)
- [四、子系统访问控制模块](#四子系统访问控制模块)
- [五、数据模型说明](#五数据模型说明)
- [六、多子系统权限设计说明](#六多子系统权限设计说明)

---

## 一、认证模块

### 1.1 用户登录（含子系统权限校验）

**POST** `/api/auth/login`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |
| systemCode | string | 否 | 子系统编码。传入时额外校验角色+子系统权限（外部子系统接入），不传则仅验证账号密码（平台后台登录） |

**响应示例 (200)**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "userInfo": {
      "id": 1,
      "username": "admin",
      "realName": "系统管理员",
      "email": "admin@test.com",
      "phone": null,
      "userType": "platform",
      "roles": [
        { "id": 1, "name": "系统管理员", "code": "administrator" }
      ],
      "permissions": ["user_manage", "role_manage", "system_manage"]
    },
    "accessibleSystems": [
      { "id": 1, "name": "CulData", "code": "culdata", "access_url": "https://culdata.scstit.com" }
    ]
  }
}
```

**传入 systemCode 时的响应额外字段**:
```json
{
  "accessCheck": {
    "systemCode": "culdata",
    "systemName": "CulData",
    "systemUrl": "https://culdata.scstit.com",
    "hasAccess": true
  }
}
```
```

---

### 1.2 用户注册

**POST** `/api/auth/register`

> 支持两种角色分配方式：传入 roleIds 直接指定角色，或传入 systemCode 自动查找拥有该系统权限的角色并分配

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 (2-20位) |
| password | string | 是 | 密码 (至少6位) |
| email | string | 否 | 邮箱 |
| phone | string | 否 | 手机号 |
| realName | string | 否 | 真实姓名 |
| systemCode | string | 否 | 子系统编码（自动分配对应角色） |
| roleIds | number[] | 否 | 直接指定角色ID列表 |

**响应示例 (200)**:
```json
{ "code": 200, "message": "注册成功", "data": { "userId": 2 } }
```

---

### 1.3 获取当前用户信息

**GET** `/api/auth/me`

**Header**: `Authorization: Bearer <token>`

**响应示例 (200)**:
```json
{
  "code": 200,
  "data": {
    "id": 1, "username": "admin", "realName": "系统管理员", "email": "admin@test.com",
    "roles": [{ "id": 1, "name": "系统管理员", "code": "administrator" }],
    "accessibleSystems": [
      { "id": 1, "name": "CulData", "code": "culdata", "access_url": "https://culdata.scstit.com" },
      { "id": 2, "name": "CulSpace", "code": "culspace", "access_url": "https://culspace.scstit.com" }
    ]
  }
}
```

---

### 1.4 退出登录

**POST** `/api/auth/logout`

**Header**: `Authorization: Bearer <token>`

**响应示例 (200)**:
```json
{ "code": 200, "message": "已退出登录", "data": null }
```

---

## 二、用户管理模块

### 2.1 用户列表（搜索 + 筛选）

**GET** `/api/users`

| Query参数 | 类型 | 必填 | 说明 |
|-----------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页条数，默认10 |
| keyword | string | 否 | 搜索关键词(匹配账号/名称/手机号/邮箱/工号) |
| roleId | number | 否 | 按角色ID筛选 |
| status | number | 否 | 状态筛选 (1=正常, 0=禁用) |
| frozen | string | 否 | 冻结筛选 ("1"=冻结, "0"=正常) |
| validFrom | date | 否 | 有效期起始筛选 |
| validUntil | date | 否 | 有效期截止筛选 |

**响应示例 (200)**:
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1, "username": "admin", "real_name": "系统管理员", "email": "admin@test.com",
        "phone": null, "status": 1, "locked": 0, "valid_until": "2099-12-31",
        "roleNames": ["系统管理员"], "roleCodes": ["administrator"],
        "statusText": "正常", "frozenText": "正常"
      }
    ],
    "total": 5, "page": 1, "pageSize": 10
  }
}
```

---

### 2.2 新建用户

**POST** `/api/users`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 账号 |
| password | string | 是 | 初始密码 (>=6位) |
| email | string | 否 | 邮箱 |
| phone | string | 否 | 手机号 |
| realName | string | 否 | 姓名 |
| employeeId | string | 否 | 工号 |
| userType | string | 否 | 用户类型 platform/subsystem，默认platform |
| validFrom | date | 否 | 有效期开始 |
| validUntil | date | 否 | 有效期结束 |
| locked | boolean | 否 | 是否冻结 |
| roleIds | number[] | 否 | 分配的角色ID数组 |

**响应示例 (200)**:
```json
{ "code": 200, "message": "创建成功", "data": { "userId": 6 } }
```

---

### 2.3 获取用户详情

**GET** `/api/users/:id`

**路径参数**: `id` - 用户ID

**响应示例 (200)**:
```json
{
  "code": 200,
  "data": {
    "id": 6, "username": "testuser", "email": "test@test.com", "phone": "13800138000",
    "real_name": "测试用户", "employee_id": "", "valid_from": null, "valid_until": null,
    "status": 1, "locked": 0,
    "roles": [
      { "id": 2, "name": "culdata用户", "code": "culdata-user" },
      { "id": 3, "name": "culspace用户", "code": "culspace-user" }
    ]
  }
}
```

---

### 2.4 编辑用户信息

**PUT** `/api/users/:id`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 否 | 邮箱 |
| phone | string | 否 | 手机号 |
| realName | string | 否 | 姓名 |
| employeeId | string | 否 | 工号 |
| validFrom | date | 否 | 有效期开始 |
| validUntil | date | 否 | 有效期结束 |
| locked | boolean | 否 | 是否冻结（true=冻结, false=正常） |
| roleIds | number[] | 否 | 角色ID数组（全量替换） |

**响应示例 (200)**: `{ "code": 200, "message": "更新成功", "data": null }`

---

### 2.5 修改密码

**PUT** `/api/users/:id/password`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| newPassword | string | 是 | 新密码 (>=6位) |

**响应示例 (200)**: `{ "code": 200, "message": "密码修改成功", "data": null }`

---

### 2.6 重置密码

**POST** `/api/users/:id/reset-password`

将用户密码重置为默认值 **123456**

**响应示例 (200)**: `{ "code": 200, "message": "密码已重置为默认密码 123456", "data": null }`

---

### 2.7 冻结/解冻用户

**PUT** `/api/users/:id/freeze`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| freeze | boolean | 是 | true=冻结, false=解冻 |

**响应示例 (200)**: `{ "code": 200, "message": "账号已冻结", "data": null }`

---

### 2.8 删除用户

**DELETE** `/api/users/:id`

> 不能删除自己

**响应示例 (200)**: `{ "code": 200, "message": "删除成功", "data": null }`

---

## 三、角色管理模块

### 3.1 角色列表

**GET** `/api/roles`

**响应示例 (200)**:
```json
{
  "code": 200,
  "data": [
    { "id": 1, "name": "系统管理员", "code": "administrator", "description": "超级管理员", "status": 1, "user_count": 1 },
    { "id": 2, "name": "culdata用户", "code": "culdata-user", "description": "", "status": 1, "user_count": 3 }
  ]
}
```

---

### 3.2 创建角色

**POST** `/api/roles`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 角色名称 |
| code | string | 是 | 角色编码 (唯一) |
| description | string | 否 | 描述 |
| permissions | object[] | 否 | 权限配置，格式见下方 |

permissions 数组元素结构：
```json
{ "type": "function|subsystem", "code": "permission_code" }
```

可用的功能权限 code：`user_manage`, `role_manage`, `system_manage`
可用的子系统权限 code：见子系统列表的 `code` 字段

---

### 3.3 获取角色详情（含权限配置）

**GET** `/api/roles/:id`

**响应示例 (200)**:
```json
{
  "code": 200,
  "data": {
    "id": 1, "name": "系统管理员", "code": "administrator", "description": "",
    "permissions": {
      "functions": ["user_manage", "role_manage", "system_manage"],
      "subsystems": ["culdata", "culspace"]
    },
    "availableSubsystems": [
      { "id": 1, "name": "CulData", "code": "culdata", "access_url": "https://culdata.scstit.com", "status": 1 },
      { "id": 2, "name": "CulSpace", "code": "culspace", "access_url": "https://culspace.scstit.com", "status": 1 }
    ],
    "availableFunctions": [
      { "code": "user_manage", "name": "用户管理", "module": "管理中心" },
      { "code": "role_manage", "name": "角色管理", "module": "管理中心" },
      { "code": "system_manage", "name": "系统配置", "module": "管理中心" }
    ]
  }
}
```

---

### 3.4 编辑角色（含权限更新）

**PUT** `/api/roles/:id`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 角色名称 |
| code | string | 是 | 角色编码 |
| description | string | 否 | 描述 |
| status | number | 否 | 状态 1启用 0禁用 |
| permissions | object[] | 否 | 权限配置（全量替换），同创建 |

---

### 3.5 删除角色

**DELETE** `/api/roles/:id`

> 如果角色下有关联用户则无法删除

**响应示例 (200)**: `{ "code": 200, "message": "删除成功", "data": null }`

---

## 四、子系统访问控制模块

### 4.1 子系统列表

**GET** `/api/systems`

**响应示例 (200)**:
```json
{
  "code": 200,
  "data": [
    { "id": 1, "name": "CulData", "code": "culdata", "access_url": "https://culdata.scstit.com", "description": "CulData 数据系统", "sort_order": 1, "status": 1 },
    { "id": 2, "name": "CulSpace", "code": "culspace", "access_url": "https://culspace.scstit.com", "description": "CulSpace 空间系统", "sort_order": 2, "status": 1 },
    { "id": 3, "name": "CulOPC", "code": "culopc", "access_url": "https://culopc.scstit.com", "description": "CulOPC 运营系统", "sort_order": 3, "status": 1 },
    { "id": 4, "name": "CulBiz", "code": "culbiz", "access_url": "https://culbiz.scstit.com", "description": "CulBiz 业务系统", "sort_order": 4, "status": 1 },
    { "id": 5, "name": "CulClaw", "code": "culclaw", "access_url": "https://cclaw.scstit.com/culclaw", "description": "CulClaw 文创智能体工作台", "sort_order": 5, "status": 1 },
    { "id": 6, "name": "CulToken", "code": "cultoken", "access_url": "https://cultoken.scstit.com", "description": "CulToken 令牌系统", "sort_order": 6, "status": 1 },
    { "id": 7, "name": "CulSkill", "code": "culskill", "access_url": "https://culskill.scstit.com", "description": "CulSkill 技能系统", "sort_order": 7, "status": 1 },
    { "id": 8, "name": "CulHard", "code": "culhard", "access_url": "https://culhard.scstit.com", "description": "CulHard 硬件系统", "sort_order": 8, "status": 1 }
  ]
}
```

---

### 4.2 获取当前用户可访问的子系统列表

**GET** `/api/systems/accessible`

> 核心接口！基于用户的角色 → 角色-子系统权限映射，返回该用户可以访问的所有子系统

**响应示例 (200)**:
```json
{
  "code": 200,
  "data": {
    "userId": 1, "username": "admin",
    "systems": [
      {
        "id": 1, "name": "CulData", "code": "culdata", "access_url": "https://culdata.scstit.com",
        "viaRoles": ["系统管理员"]
      },
      {
        "id": 2, "name": "CulSpace", "code": "culspace", "access_url": "https://culspace.scstit.com",
        "viaRoles": ["系统管理员"]
      }
    ]
  }
}
```

---

### 4.3 检查用户是否可访问指定子系统

**GET** `/api/systems/check/:systemCode`

> 子系统接入时调用此接口验证用户身份和权限。例如 a 系统调用 `/api/systems/check/culdata` 来判断当前用户是否有权进入。

**路径参数**: `systemCode` - 子系统编码（如 `culdata`）

**有权访问时响应 (200)**:
```json
{
  "code": 200,
  "message": "有权访问",
  "data": {
    "hasAccess": true,
    "systemName": "CulData",
    "systemUrl": "https://culdata.scstit.com",
    "grantedVia": [{ "roleName": "culdata用户", "roleCode": "culdata-user" }],
    "userInfo": { "id": 3, "username": "zhangsan", "realName": "张三" }
  }
}
```

**无权访问时响应 (403)**:
```json
{ "code": 403, "message": "您没有权限访问此子系统", "data": { "hasAccess": false } }
```

---

### 4.4 创建子系统

**POST** `/api/systems`

> 需要 `system_manage` 权限

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 系统名称 |
| code | string | 是 | 系统编码（唯一，以字母开头） |
| accessUrl | string | 是 | 访问地址 URL |
| description | string | 否 | 系统描述 |
| sortOrder | number | 否 | 排序号（默认自动递增） |

**响应示例 (200)**:
```json
{ "code": 200, "message": "创建成功", "data": { "id": 9 } }
```

---

### 4.5 编辑子系统

**PUT** `/api/systems/:id`

> 需要 `system_manage` 权限

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 系统名称 |
| code | string | 否 | 系统编码 |
| accessUrl | string | 否 | 访问地址 URL |
| description | string | 否 | 系统描述 |
| status | number | 否 | 状态 (1=启用, 0=停用) |

**响应示例 (200)**:
```json
{ "code": 200, "message": "更新成功", "data": null }
```

---

### 4.6 删除子系统

**DELETE** `/api/systems/:id`

> 需要 `system_manage` 权限

**响应示例 (200)**:
```json
{ "code": 200, "message": "删除成功", "data": null }
```

---

## 五、数据模型说明

### ER 关系图

```
┌──────────┐     ┌──────────────┐     ┌────────────┐
│  users   │◄───►│ user_roles   │◄───►│   roles    │
└──────────┘     └──────────────┘     └────────────┘
                                           │
                                    ┌──────┴──────────┐
                                    │role_permissions │
                                    └──────┬──────────┘
                                           │
                              ┌────────────┼────────────┐
                              ▼            ▼             ▼
                        功能权限       ┌──────────┐  子系统权限
                   (user_manage,      │subsystems│  (culdata,
                    role_manage)      └──────────┘   culspace...)
```

### 表结构

#### users（用户表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| username | TEXT UNIQUE | 登录账号 |
| password | TEXT | 加密后的密码(bcrypt) |
| email | TEXT | 邮箱 |
| phone | TEXT | 手机号 |
| real_name | TEXT | 真实姓名 |
| employee_id | TEXT | 工号 |
| user_type | TEXT | 用户类型 platform/subsystem |
| status | INTEGER | 状态 1正常 0禁用 |
| valid_from | TEXT | 有效期开始 |
| valid_until | TEXT | 有效期结束 |
| locked | INTEGER | 冻结状态 0正常 1冻结 |

#### roles（角色表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| name | TEXT | 角色名称 |
| code | TEXT UNIQUE | 角色编码 |
| description | TEXT | 描述 |
| status | INTEGER | 启用/停用 |

#### subsystems（子系统表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| name | TEXT | 子系统名称 |
| code | TEXT UNIQUE | 子系统编码 |
| access_url | TEXT NOT NULL | 访问地址(URL) |
| sort_order | INTEGER | 排序 |
| status | INTEGER | 启用/停用 |

#### user_roles（用户-角色关联）
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | INTEGER FK→users.id | 用户ID |
| role_id | INTEGER FK→roles.id | 角色ID |

#### role_permissions（角色-权限关联）
| 字段 | 类型 | 说明 |
|------|------|------|
| role_id | INTEGER FK→roles.id | 角色ID |
| permission_type | TEXT | function / subsystem |
| permission_code | TEXT | 权限编码 |

---

## 六、多子系统权限设计说明

### 设计方案：基于角色的子系统访问控制（RBAC + 可访问链接配置）

你的需求是：**分配了A角色的用户能访问a系统但不能访问b系统；同时分配B角色后可以同时访问a和b系统。**

**结论：使用「角色-子系统关联」方案完全可以实现此需求，无需额外改造。**

### 工作原理

```
                    ┌─────────────────────────────────────┐
                    │          统一用户管理中心              │
                    │                                      │
  ┌───────────┐    │  角色: culdata用户                       │
  │           │    │  └─ 权限配置: subsystem = culdata        │
  │  用户张三  ├───►│  └─ 访问链接: https://culdata.scstit.com │
  │           │    │                                      │
  │  角色:     │    │  角色: culspace用户                     │
  │  culdata   │    │  └─ 权限配置: subsystem = culspace     │
  │  culspace  │    │  └─ 访问链接: https://culspace.scstit.com│
  └───────────┘    └─────────────────────────────────────┘
         │
         ▼
  ┌──────────────┐  ┌────────────────┐
  │ culdata系统     │  │ culspace系统      │
  │ ✓ 可以访问    │  │ ✓ 可以访问        │
  └──────────────┘  └────────────────┘
```

### 子系统集成方式

每个子系统在需要鉴权时，通过以下两种方式之一与统一用户管理平台对接：

**方式 A：前端 SSO 跳转**
1. 用户在统一平台登录获取 Token
2. 前端根据用户可访问的子系统列表展示入口
3. 点击子系统入口 → 携带 Token 跳转到子系统 URL
4. 子系统后端调用 `GET /api/systems/check/{code}` 校验 Token 和权限

**方式 B：后端 API 鉴权（推荐）**
1. 子系统前端携带统一平台的 Token 发起请求
2. 子系统网关/中间件调用 `GET /api/systems/check/{code}` 验证权限
3. 通过后放行请求到业务逻辑

### 错误码规范

| HTTP Status | 业务 Code | 含义 |
|-------------|----------|------|
| 200 | 200 | 成功 |
| 400 | 400 | 请求参数错误 |
| 401 | 401 | 未登录 / 登录过期 |
| 403 | 403 | 无权限 / 账号被禁用/冻结 |
| 404 | 404 | 资源不存在 |
| 500 | 500 | 服务器内部错误 |

---

## 七、部署指南

### 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 后端框架 | Express.js | ^4.18 | Node.js Web框架 |
| 数据库 | sql.js | ^1.10 | SQLite 驱动（纯 JS，免费、无需安装） |
| 认证 | jsonwebtoken | ^9.0 | JWT令牌 |
| 密码加密 | bcryptjs | ^2.4 | 密码哈希 |
| 前端框架 | Vue.js | ^3.4 | 渐进式JS框架 |
| UI组件 | Element Plus | ^2.14 | Vue3组件库 |
| 构建工具 | Vite | ^5.1 | 开发构建工具 |

### 数据库说明

**使用 SQLite 作为数据库，完全免费，不需要任何服务器或云服务。**

- 数据文件自动生成于 `server/database/unified-user.db`
- 支持完整的 SQL 能力，适合中小规模应用（百万级以下数据无压力）
- 如需升级，可迁移至 MySQL / PostgreSQL（只需更换驱动，代码改动极小）

### 本地运行步骤

```bash
# 1. 后端
cd server
npm install
npm run dev

# 2. 前端（新终端窗口）
cd frontend
npm install
npm run dev
```

然后打开 http://localhost:5173 ，默认管理员账号: `admin` / `admin123`

### 是否需要服务器？

**开发/测试阶段：不需要服务器** — 在本机运行即可，SQLite 数据存储在本机文件中。

**生产环境建议：**
- 如果是内网使用：一台云服务器即可（腾讯云/阿里云轻量服务器，约50-100元/月）
- 如果对外提供服务：建议使用腾讯云 Lighthouse 或 CloudBase 进行部署
- 数据库方面：SQLite 单机够用；如需多节点部署可换 PostgreSQL（免费层 Supabase 提供）
