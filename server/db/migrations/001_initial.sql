-- 创建数据库（如果不存在）
-- 注意：需要在 PostgreSQL 中手动执行：CREATE DATABASE data_asset_platform;

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS standard_values CASCADE;
DROP TABLE IF EXISTS standards CASCADE;
DROP TABLE IF EXISTS glossaries CASCADE;
DROP TABLE IF EXISTS dicts CASCADE;
DROP TABLE IF EXISTS fields CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS schemas CASCADE;
DROP TABLE IF EXISTS lineage_mappings CASCADE;
DROP TABLE IF EXISTS lineage_sources CASCADE;

-- 物理模型相关表
CREATE TABLE IF NOT EXISTS schemas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    schema_id INTEGER REFERENCES schemas(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schema_id, name)
);

CREATE TABLE IF NOT EXISTS fields (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES tables(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    field_type VARCHAR(100) NOT NULL,
    len INTEGER,
    precision INTEGER,
    is_pk BOOLEAN DEFAULT FALSE,
    is_fk BOOLEAN DEFAULT FALSE,
    is_nullable BOOLEAN DEFAULT TRUE,
    comment TEXT,
    fk_table_id INTEGER REFERENCES tables(id),
    fk_field_id INTEGER REFERENCES fields(id),
    dict_ref INTEGER,
    term_ref INTEGER,
    std_ref INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_id, name)
);

-- 数据字典表
CREATE TABLE IF NOT EXISTS dicts (
    id SERIAL PRIMARY KEY,
    term VARCHAR(200) NOT NULL UNIQUE,
    term_type VARCHAR(50) NOT NULL,
    definition TEXT,
    domain VARCHAR(200),
    physical_ref VARCHAR(200),
    term_ref VARCHAR(200),
    std_ref VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 业务术语表
CREATE TABLE IF NOT EXISTS glossaries (
    id SERIAL PRIMARY KEY,
    term VARCHAR(200) NOT NULL UNIQUE,
    domain VARCHAR(200),
    owner VARCHAR(200),
    definition TEXT,
    status VARCHAR(50) DEFAULT '草稿',
    dict_ref INTEGER,
    std_ref VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 数据标准表
CREATE TABLE IF NOT EXISTS standards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 标准码值表
CREATE TABLE IF NOT EXISTS standard_values (
    id SERIAL PRIMARY KEY,
    standard_id INTEGER REFERENCES standards(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    label VARCHAR(200) NOT NULL,
    label_en VARCHAR(200),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(standard_id, code)
);

-- 血缘分析相关表
CREATE TABLE IF NOT EXISTS lineage_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    sql_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lineage_mappings (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES lineage_sources(id) ON DELETE CASCADE,
    source_field VARCHAR(200),
    source_table VARCHAR(200),
    target_field VARCHAR(200) NOT NULL,
    target_table VARCHAR(200) NOT NULL,
    transformation VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_fields_table ON fields(table_id);
CREATE INDEX idx_fields_fk ON fields(fk_table_id, fk_field_id);
CREATE INDEX idx_standard_values_standard ON standard_values(standard_id);
CREATE INDEX idx_lineage_mappings_source ON lineage_mappings(source_id);
