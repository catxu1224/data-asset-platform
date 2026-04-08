-- 血缘分类表
CREATE TABLE IF NOT EXISTS lineage_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 血缘保存记录表
CREATE TABLE IF NOT EXISTS lineage_records (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category_id INTEGER REFERENCES lineage_categories(id) ON DELETE SET NULL,
    sql_text TEXT NOT NULL,
    dialect VARCHAR(50) DEFAULT 'PostgreSQL',
    source_tables TEXT[],  -- 源表数组
    target_tables TEXT[],  -- 目标表数组
    mappings JSONB,        -- 字段映射关系
    nodes JSONB,           -- 节点信息（用于图谱展示）
    edges JSONB,           -- 边信息（用于图谱展示）
    description TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_lineage_records_category ON lineage_records(category_id);
CREATE INDEX IF NOT EXISTS idx_lineage_records_created_at ON lineage_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lineage_records_source_tables ON lineage_records USING GIN(source_tables);
CREATE INDEX IF NOT EXISTS idx_lineage_records_target_tables ON lineage_records USING GIN(target_tables);

-- 插入默认分类
INSERT INTO lineage_categories (name, description, sort_order) VALUES
('一表通血缘', '一表通相关表的血缘关系', 1),
('金数血缘', '金数工程相关表的血缘关系', 2)
ON CONFLICT (name) DO NOTHING;
