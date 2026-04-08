# 后端服务设置指南

## 前置要求

- Node.js >= 18
- PostgreSQL >= 14
- Neo4j >= 5.0

## 数据库设置

### 1. PostgreSQL 设置

```sql
-- 创建数据库
CREATE DATABASE data_asset_platform;
```

或者运行自动迁移脚本：

```bash
cd server
npm install
npm run migrate
```

### 2. Neo4j 设置

1. 启动 Neo4j
2. 首次登录修改默认密码（默认用户名/密码：neo4j/neo4j）
3. 确保 Bolt 端口 7687 可访问

## 配置

编辑 `server/.env` 文件：

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=data_asset_platform
DB_USER=postgres
DB_PASSWORD=your_password

NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

## 启动服务

### 方式一：分别启动

终端 1 - 启动后端：
```bash
cd server
npm install
npm run dev
```

终端 2 - 启动前端：
```bash
npm run dev
```

### 方式二：使用根目录脚本

```bash
# 安装所有依赖
npm run install-all

# 启动后端
npm run server

# 启动前端（另一个终端）
npm run dev
```

## API 端点

启动后端后访问：
- 健康检查：http://localhost:3000/health
- 物理模型：http://localhost:3000/api/tables
- 数据字典：http://localhost:3000/api/dicts
- 业务术语：http://localhost:3000/api/glossaries
- 数据标准：http://localhost:3000/api/standards
- 血缘分析：http://localhost:3000/api/lineage

## 初始化数据

```bash
cd server
node db/seed.js
```

## 切换数据源

如果要切换回本地模拟数据（不使用后端 API），修改 `src/config.js`：

```javascript
export const CONFIG = {
  USE_API: false,  // 改为 false 使用本地数据
};
```
