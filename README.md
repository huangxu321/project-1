# 统一用户管理系统

基于原型图开发的统一用户管理平台，支持多子系统用户管控。

## 功能清单

- **登录/注册** - 账号密码注册+登录（不支持手机号注册）
- **用户管理** - 列表展示、搜索筛选（含日期范围）、新建/编辑、角色分配、冻结/启用、修改/重置密码
- **角色管理** - 创建角色、配置功能权限、配置子系统访问链接权限
- **多子系统访问控制** - 基于角色的RBAC，支持一个用户通过多个角色访问多个子系统
- **退出登录** - 右上角账号下拉退出，重定向至登录页

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js + Express + SQLite (better-sqlite3) |
| 认证 | JWT (jsonwebtoken) |
| 前端 | Vue3 + Element Plus + Vite |
| 数据库 | SQLite (免费，无需服务器) |

## 快速开始

```bash
# 安装后端依赖并启动
cd server && npm install && npm run dev

# 新终端窗口：安装前端依赖并启动
cd frontend && npm install && npm run dev
```

- 前端地址: http://localhost:5173
- 后端API: http://localhost:3000/api
- 默认管理员: `admin` / `admin123`

## 项目结构

```
unified-user-management/
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── app.js              # 入口文件
│   │   ├── database/init.js    # 数据库初始化 & 种子数据
│   │   ├── middleware/auth.js  # JWT认证中间件
│   │   └── routes/
│   │       ├── auth.js         # 登录/注册/退出
│   │       ├── users.js        # 用户管理CRUD
│   │       ├── roles.js        # 角色管理CRUD
│   │       └── systems.js      # 子系统管理&访问验证
│   └── database/               # SQLite数据文件目录
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── router/index.js     # 路由配置(含守卫)
│   │   ├── utils/request.js    # Axios封装
│   │   ├── styles/global.css   # 全局样式
│   │   ├── layouts/MainLayout.vue  # 主布局
│   │   ├── views/
│   │   │   ├── Login.vue       # 登录页
│   │   │   ├── Register.vue    # 注册页
│   │   │   ├── UserManage.vue  # 用户管理页
│   │   │   └── RoleManage.vue  # 角色管理页
│   │   └── components/
│   │       └── UserForm.vue    # 用户表单组件
├── API_DOC.md                  # 完整API接口文档
└── README.md
```
