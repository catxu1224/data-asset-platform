-- 修改物理模型表结构
-- 1. 添加表范围描述和字段描述字段

-- 为 tables 表添加 desc 字段
ALTER TABLE tables ADD COLUMN IF NOT EXISTS "desc" TEXT;

-- 为 fields 表添加 desc 字段
ALTER TABLE fields ADD COLUMN IF NOT EXISTS "desc" TEXT;
