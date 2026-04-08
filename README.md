# 数据资产管理平台 · Data Asset Manager

基于 **Vite + React 18** 构建的数据资产管理前端平台，后端采用 **Node.js + Express**，数据库使用 **PostgreSQL**。

## 功能模块

| 模块 | 功能 |
|------|------|
| 物理模型管理 | 数据库/Schema/表/字段的增删改查，支持 PK/FK/类型/长度/精度管理，ER 图谱可拖拽 |
| 数据字典 | 字段语义词条管理，与物理字段、业务术语、数据标准形成索引关联 |
| 业务术语库 | 面向业务侧的术语定义，支持审批状态管理 |
| 数据标准 | Reference Data 码值表管理，支持多语言描述 |
| 血缘分析 | SQL 输入/上传解析，输出 Mapping 文档（可导出 CSV/JSON）和可拖拽血缘图谱 |
| 用户认证 | JWT  Token 认证，支持密码重置 |

## 快速启动

### 前置要求
- Node.js >= 18
- npm >= 9
- PostgreSQL >= 12

### 1. 克隆项目

```bash
git clone https://github.com/your-username/data-asset-platform.git
cd data-asset-platform
```

### 2. 部署数据库

```bash
# 创建数据库并执行部署脚本
psql -U postgres -f database/init-db.sql
```

或手动执行：

```bash
# 创建数据库
psql -U postgres -c "CREATE DATABASE data_asset_platform;"

# 执行部署脚本
psql -U postgres -d data_asset_platform -f database/deploy.sql
```

### 3. 启动后端

```bash
cd server
npm install
cp .env.example .env  # 编辑 .env 配置数据库连接
npm run dev
```

后端服务运行在：http://localhost:3000

### 4. 启动前端

```bash
cd ..
npm install
npm run dev
```

前端服务运行在：http://localhost:5173

### 5. 登录系统

默认管理员账号：
- 邮箱：`admin@example.com`
- 密码：`admin123`

## 项目结构

```
data-asset-platform/
├── database/
│   ├── deploy.sql          # 数据库部署脚本（含表结构和样例数据）
│   └── init-db.sql         # 数据库初始化脚本
├── server/
│   ├── .env.example        # 环境变量模板
│   ├── server.js           # 后端入口
│   ├── db/                 # 数据库配置
│   ├── routes/             # API 路由
│   ├── services/           # 业务服务
│   └── repository/         # 数据访问层
├── src/
│   ├── main.jsx            # 应用入口
│   ├── App.jsx             # 主布局 + 路由
│   ├── components/         # 组件
│   └── pages/              # 页面
├── .gitignore
├── DEPLOYMENT.md           # 详细部署文档
└── README.md
```

## GitHub 提交说明

项目已配置好 Git 忽略文件，直接提交即可：

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/data-asset-platform.git
git push -u origin main
```

**注意**：`.env` 文件已被忽略，请勿将敏感信息提交到 GitHub。

## 详细部署文档

查看 [DEPLOYMENT.md](DEPLOYMENT.md) 了解更多部署选项和生产环境配置。
