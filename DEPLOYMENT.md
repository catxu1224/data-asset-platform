# 数据资产管理平台部署说明

## 快速部署指南

### 一、环境要求

| 组件 | 版本要求 |
|------|----------|
| Node.js | >= 18 |
| npm | >= 9 |
| PostgreSQL | >= 12 |

### 二、数据库部署

1. **创建数据库**

```bash
# 登录 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE data_asset_platform;
\q
```

2. **执行部署脚本**

```bash
# 进入项目目录
cd data-asset-platform

# 执行数据库部署脚本
psql -U postgres -d data_asset_platform -f database/deploy.sql
```

部署脚本会自动创建：
- 所有表结构（schemas, tables, fields, dicts, glossaries, standards, users 等）
- 索引和外键约束
- 样例数据（4 个 schema、9 张表、42 个字段）
- 默认管理员用户（admin@example.com / admin123）

### 三、后端部署

1. **安装依赖**

```bash
cd server
npm install
```

2. **配置环境变量**

复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 服务器端口
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# PostgreSQL 配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=data_asset_platform
DB_USER=postgres
DB_PASSWORD=your-password

# Neo4j 配置（可选）
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j

# 前端 URL
FRONTEND_URL=http://localhost:5173
```

3. **启动后端服务**

```bash
# 开发环境
npm run dev

# 生产环境
npm start
```

后端服务运行在：http://localhost:3000

### 四、前端部署

1. **安装依赖**

```bash
cd ..  # 返回项目根目录
npm install
```

2. **配置后端 API 地址**

编辑 `vite.config.js`（如有需要）：

```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
```

3. **启动前端服务**

```bash
# 开发环境
npm run dev

# 生产构建
npm run build
npm run preview
```

前端服务运行在：http://localhost:5173

### 五、验证部署

1. 访问 http://localhost:5173
2. 使用默认账号登录：
   - 邮箱：`admin@example.com`
   - 密码：`admin123`

### 六、目录结构

```
data-asset-platform/
├── database/
│   └── deploy.sql          # 数据库部署脚本
├── server/
│   ├── .env                # 后端环境变量（需手动创建）
│   ├── .env.example        # 环境变量模板
│   ├── package.json
│   ├── server.js
│   ├── db/
│   │   ├── postgres.js     # 数据库连接
│   │   └── migrations/     # 迁移脚本
│   └── routes/             # API 路由
├── src/                    # 前端源码
├── package.json
├── vite.config.js
├── .gitignore              # Git 忽略文件
└── DEPLOYMENT.md           # 本文件
```

### 七、常见问题

**Q: 无法连接数据库？**
- 检查 PostgreSQL 服务是否启动
- 确认 `.env` 中的数据库配置正确
- 确认数据库 `data_asset_platform` 已创建

**Q: 端口被占用？**
- 修改 `PORT=3000` 为其他端口
- 修改前端 `vite.config.js` 中的端口

**Q: 忘记密码？**
- 直接在数据库中更新：
```sql
UPDATE users SET password_hash = '$2b$10$rH0zG0s0H0s0H0s0H0s0Ou.rZlY5qN8nJz0L0s0H0s0H0s0H0s0H' WHERE email = 'admin@example.com';
```

### 八、生产环境建议

1. **修改默认密码**
2. **配置 HTTPS**
3. **设置强 JWT_SECRET**
4. **配置日志轮转**
5. **启用数据库连接池监控**
6. **定期备份数据库**
