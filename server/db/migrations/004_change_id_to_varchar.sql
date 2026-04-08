-- 修改 tables 和 fields 表的 id 字段从 integer 改为 varchar(30)
-- 由于外键依赖复杂，需要重建表

BEGIN;

-- 1. 删除依赖的视图或外键
ALTER TABLE fields DROP CONSTRAINT IF EXISTS fields_table_id_fkey;
ALTER TABLE fields DROP CONSTRAINT IF EXISTS fields_fk_table_id_fkey;
ALTER TABLE fields DROP CONSTRAINT IF EXISTS fields_fk_field_id_fkey;

-- 2. 创建新的 tables 表
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

-- 3. 复制数据到新表
INSERT INTO tables_new (id, schema_id, name, comment, "desc", created_at, updated_at)
SELECT id::VARCHAR(30), schema_id, name, comment, "desc", created_at, updated_at FROM tables;

-- 4. 创建新的 fields 表
CREATE TABLE fields_new (
    id VARCHAR(30) PRIMARY KEY,
    table_id VARCHAR(30) REFERENCES tables_new(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    field_type VARCHAR(100) NOT NULL,
    len INTEGER,
    precision INTEGER,
    is_pk BOOLEAN DEFAULT FALSE,
    is_fk BOOLEAN DEFAULT FALSE,
    is_nullable BOOLEAN DEFAULT TRUE,
    comment TEXT,
    "desc" TEXT,
    fk_table_id VARCHAR(30) REFERENCES tables_new(id),
    fk_field_id VARCHAR(30) REFERENCES fields_new(id),
    dict_ref INTEGER,
    term_ref INTEGER,
    std_ref INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_id, name)
);

-- 5. 复制数据到新 fields 表
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
    "desc",
    fk_table_id::VARCHAR(30),
    fk_field_id::VARCHAR(30),
    dict_ref,
    term_ref,
    std_ref,
    created_at,
    updated_at
FROM fields;

-- 6. 删除旧表
DROP TABLE fields;
DROP TABLE tables;

-- 7. 重命名新表
ALTER TABLE tables_new RENAME TO tables;
ALTER TABLE fields_new RENAME TO fields;

-- 8. 重新添加外键约束
ALTER TABLE fields ADD CONSTRAINT fields_table_id_fkey
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE;
ALTER TABLE fields ADD CONSTRAINT fields_fk_table_id_fkey
    FOREIGN KEY (fk_table_id) REFERENCES tables(id);
ALTER TABLE fields ADD CONSTRAINT fields_fk_field_id_fkey
    FOREIGN KEY (fk_field_id) REFERENCES fields(id);

-- 9. 删除旧序列
DROP SEQUENCE IF EXISTS tables_id_seq CASCADE;
DROP SEQUENCE IF EXISTS fields_id_seq CASCADE;

COMMIT;
