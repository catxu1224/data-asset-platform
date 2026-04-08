-- 数据库初始化脚本
-- 使用方法：psql -U postgres -f database/init-db.sql

-- 创建数据库（如果不存在）
SELECT 'CREATE DATABASE data_asset_platform'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'data_asset_platform')\gexec

-- 连接数据库并执行部署脚本
\c data_asset_platform
\i database/deploy.sql
