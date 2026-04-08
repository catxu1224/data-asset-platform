-- 修改所有物理模型表的 id 字段为 varchar(30)
-- 包含：schemas, tables, fields, dicts, glossaries, standards, standard_values

BEGIN;

-- ========================================
-- 第一步：处理 schemas 表
-- ========================================

-- 先添加 desc 字段（如果不存在）
ALTER TABLE schemas ADD COLUMN IF NOT EXISTS "desc" TEXT;

-- 创建新的 schemas 表
CREATE TABLE schemas_new (
    id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    comment TEXT,
    "desc" TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 复制数据（将原 integer id 转为 varchar）
INSERT INTO schemas_new (id, name, comment, "desc", created_at, updated_at)
SELECT id::VARCHAR(30), name, comment, "desc", created_at, updated_at FROM schemas;

-- 删除旧表（使用 CASCADE 删除依赖对象）
DROP TABLE schemas CASCADE;
ALTER TABLE schemas_new RENAME TO schemas;

-- ========================================
-- 第二步：处理 tables 表（已存在 tables_new 则跳过）
-- ========================================

-- 如果 tables 表已经是 varchar 类型，则更新 schema_id 为 varchar
DO $$
BEGIN
    -- 检查 tables 表的 id 类型
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tables' AND column_name = 'id' AND data_type = 'character varying'
    ) THEN
        -- id 已经是 varchar，只需要更新 schema_id
        ALTER TABLE tables ALTER COLUMN schema_id TYPE VARCHAR(30);
    ELSE
        -- id 还是 integer，需要重建表
        DROP TABLE IF EXISTS tables_new;
        CREATE TABLE tables_new (
            id VARCHAR(30) PRIMARY KEY,
            schema_id INTEGER REFERENCES schemas(id) ON DELETE CASCADE,
            name VARCHAR(200) NOT NULL,
            comment TEXT,
            "desc" TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(schema_id, name)
        );

        -- 复制数据
        INSERT INTO tables_new (id, schema_id, name, comment, "desc", created_at, updated_at)
        SELECT id::VARCHAR(30), schema_id, name, comment, COALESCE("desc", ''), created_at, updated_at FROM tables;

        DROP TABLE tables CASCADE;
        ALTER TABLE tables_new RENAME TO tables;

        -- 更新 schema_id 为 varchar
        ALTER TABLE tables ALTER COLUMN schema_id TYPE VARCHAR(30);
    END IF;
END $$;

-- ========================================
-- 第三步：处理 fields 表
-- ========================================

-- 先添加 desc 字段（如果不存在）
ALTER TABLE fields ADD COLUMN IF NOT EXISTS "desc" TEXT;

DROP TABLE IF EXISTS fields_new;
CREATE TABLE fields_new (
    id VARCHAR(30) PRIMARY KEY,
    table_id VARCHAR(30) REFERENCES tables(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    field_type VARCHAR(100) NOT NULL,
    len INTEGER,
    precision INTEGER,
    is_pk BOOLEAN DEFAULT FALSE,
    is_fk BOOLEAN DEFAULT FALSE,
    is_nullable BOOLEAN DEFAULT TRUE,
    comment TEXT,
    "desc" TEXT,
    fk_table_id VARCHAR(30) REFERENCES tables(id),
    fk_field_id VARCHAR(30),
    dict_ref VARCHAR(30),
    term_ref VARCHAR(30),
    std_ref VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_id, name)
);

-- 复制数据
INSERT INTO fields_new (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc", fk_table_id, fk_field_id, dict_ref, term_ref, std_ref, created_at, updated_at)
SELECT
    id::VARCHAR(30),
    table_id::VARCHAR(30),
    name,
    field_type,
    len,
    precision,
    is_pk,
    is_fk,
    is_nullable,
    comment,
    COALESCE("desc", ''),
    fk_table_id::VARCHAR(30),
    fk_field_id::VARCHAR(30),
    dict_ref::VARCHAR(30),
    term_ref::VARCHAR(30),
    std_ref::VARCHAR(30),
    created_at,
    updated_at
FROM fields;

DROP TABLE fields CASCADE;
ALTER TABLE fields_new RENAME TO fields;

-- 重新添加外键约束
ALTER TABLE fields ADD CONSTRAINT fields_table_id_fkey
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE;
ALTER TABLE fields ADD CONSTRAINT fields_fk_table_id_fkey
    FOREIGN KEY (fk_table_id) REFERENCES tables(id);
ALTER TABLE fields ADD CONSTRAINT fields_fk_field_id_fkey
    FOREIGN KEY (fk_field_id) REFERENCES fields(id);

-- ========================================
-- 第四步：处理 dicts 表
-- ========================================

DROP TABLE IF EXISTS dicts_new;
CREATE TABLE dicts_new (
    id VARCHAR(30) PRIMARY KEY,
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

INSERT INTO dicts_new (id, term, term_type, definition, domain, physical_ref, term_ref, std_ref, created_at, updated_at)
SELECT
    id::VARCHAR(30), term, term_type, definition, domain, physical_ref, term_ref, std_ref,
    created_at, updated_at
FROM dicts;

DROP TABLE dicts CASCADE;
ALTER TABLE dicts_new RENAME TO dicts;

-- ========================================
-- 第五步：处理 glossaries 表
-- ========================================

DROP TABLE IF EXISTS glossaries_new;
CREATE TABLE glossaries_new (
    id VARCHAR(30) PRIMARY KEY,
    term VARCHAR(200) NOT NULL UNIQUE,
    domain VARCHAR(200),
    owner VARCHAR(200),
    definition TEXT,
    status VARCHAR(50) DEFAULT '草稿',
    dict_ref VARCHAR(30) REFERENCES dicts(id),
    std_ref VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO glossaries_new (id, term, domain, owner, definition, status, dict_ref, std_ref, created_at, updated_at)
SELECT
    id::VARCHAR(30), term, domain, owner, definition, status,
    dict_ref::VARCHAR(30), std_ref, created_at, updated_at
FROM glossaries;

DROP TABLE glossaries CASCADE;
ALTER TABLE glossaries_new RENAME TO glossaries;

-- ========================================
-- 第六步：处理 standards 表
-- ========================================

DROP TABLE IF EXISTS standards_new;
CREATE TABLE standards_new (
    id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO standards_new (id, name, description, created_at, updated_at)
SELECT id::VARCHAR(30), name, description, created_at, updated_at FROM standards;

DROP TABLE standards CASCADE;
ALTER TABLE standards_new RENAME TO standards;

-- ========================================
-- 第七步：处理 standard_values 表
-- ========================================

DROP TABLE IF EXISTS standard_values_new;
CREATE TABLE standard_values_new (
    id VARCHAR(30) PRIMARY KEY,
    standard_id VARCHAR(30) REFERENCES standards(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    label VARCHAR(200) NOT NULL,
    label_en VARCHAR(200),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(standard_id, code)
);

INSERT INTO standard_values_new (id, standard_id, code, label, label_en, sort_order, created_at)
SELECT id::VARCHAR(30), standard_id::VARCHAR(30), code, label, label_en, sort_order, created_at
FROM standard_values;

DROP TABLE standard_values CASCADE;
ALTER TABLE standard_values_new RENAME TO standard_values;

-- ========================================
-- 第八步：更新 lineage_sources 表的引用字段
-- ========================================

ALTER TABLE lineage_sources ALTER COLUMN source_type TYPE VARCHAR(50);

-- ========================================
-- 清理序列
-- ========================================

DROP SEQUENCE IF EXISTS schemas_id_seq CASCADE;
DROP SEQUENCE IF EXISTS tables_id_seq CASCADE;
DROP SEQUENCE IF EXISTS fields_id_seq CASCADE;
DROP SEQUENCE IF EXISTS dicts_id_seq CASCADE;
DROP SEQUENCE IF EXISTS glossaries_id_seq CASCADE;
DROP SEQUENCE IF EXISTS standards_id_seq CASCADE;
DROP SEQUENCE IF EXISTS standard_values_id_seq CASCADE;

COMMIT;
