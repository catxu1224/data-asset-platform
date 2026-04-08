-- ============================================
-- 数据资产管理平台 - 数据库部署脚本
-- Data Asset Platform Database Deployment Script
-- ============================================
-- PostgreSQL 版本要求：>= 12
-- 执行方式：psql -U postgres -d data_asset_platform -f deploy.sql
-- ============================================

-- 创建数据库（如果不存在）
-- 注意：需要在 PostgreSQL 中先执行：CREATE DATABASE data_asset_platform;

-- ============================================
-- 第一部分：物理模型表
-- ============================================

DROP TABLE IF EXISTS standard_values CASCADE;
DROP TABLE IF EXISTS standards CASCADE;
DROP TABLE IF EXISTS glossaries CASCADE;
DROP TABLE IF EXISTS dicts CASCADE;
DROP TABLE IF EXISTS fields CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS schemas CASCADE;

-- Schema 表 - 数据模式
CREATE TABLE IF NOT EXISTS schemas (
    id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    comment TEXT,
    "desc" TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 表 - 数据表
CREATE TABLE IF NOT EXISTS tables (
    id VARCHAR(30) PRIMARY KEY,
    schema_id VARCHAR(30) REFERENCES schemas(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    comment TEXT,
    "desc" TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schema_id, name)
);

-- Field 表 - 字段
CREATE TABLE IF NOT EXISTS fields (
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
    fk_field_id VARCHAR(30) REFERENCES fields(id),
    dict_ref VARCHAR(30),
    term_ref VARCHAR(30),
    std_ref VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_id, name)
);

-- ============================================
-- 第二部分：数据字典和业务术语
-- ============================================

DROP TABLE IF EXISTS dicts CASCADE;
CREATE TABLE IF NOT EXISTS dicts (
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

DROP TABLE IF EXISTS glossaries CASCADE;
CREATE TABLE IF NOT EXISTS glossaries (
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

-- ============================================
-- 第三部分：数据标准
-- ============================================

DROP TABLE IF EXISTS standards CASCADE;
CREATE TABLE IF NOT EXISTS standards (
    id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS standard_values CASCADE;
CREATE TABLE IF NOT EXISTS standard_values (
    id VARCHAR(30) PRIMARY KEY,
    standard_id VARCHAR(30) REFERENCES standards(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    label VARCHAR(200) NOT NULL,
    label_en VARCHAR(200),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(standard_id, code)
);

-- ============================================
-- 第四部分：血缘分析
-- ============================================

DROP TABLE IF EXISTS lineage_mappings CASCADE;
DROP TABLE IF EXISTS lineage_sources CASCADE;

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

-- ============================================
-- 第五部分：血缘记录和分类（新增功能）
-- ============================================

DROP TABLE IF EXISTS lineage_records CASCADE;
DROP TABLE IF EXISTS lineage_categories CASCADE;

CREATE TABLE IF NOT EXISTS lineage_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lineage_records (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category_id INTEGER REFERENCES lineage_categories(id) ON DELETE SET NULL,
    sql_text TEXT NOT NULL,
    dialect VARCHAR(50) DEFAULT 'PostgreSQL',
    source_tables TEXT[],
    target_tables TEXT[],
    mappings JSONB,
    nodes JSONB,
    edges JSONB,
    description TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 第六部分：用户认证
-- ============================================

DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 第七部分：索引
-- ============================================

CREATE INDEX idx_tables_schema ON tables(schema_id);
CREATE INDEX idx_fields_table ON fields(table_id);
CREATE INDEX idx_fields_fk ON fields(fk_table_id, fk_field_id);
CREATE INDEX idx_standard_values_standard ON standard_values(standard_id);
CREATE INDEX idx_lineage_mappings_source ON lineage_mappings(source_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_reset_tokens ON password_reset_tokens(token);
CREATE INDEX idx_reset_tokens_user ON password_reset_tokens(user_id);

-- ============================================
-- 第八部分：样例数据
-- ============================================

-- Schema 样例
INSERT INTO schemas (id, name, comment, "desc") VALUES
('SCH001', 'DW', '数据仓库层', 'Data Warehouse - 存储企业核心数据'),
('SCH002', 'DM', '数据集市层', 'Data Mart - 面向主题的数据集合'),
('SCH003', 'ODS', '操作数据存储', 'Operational Data Store - 原始数据存储'),
('SCH004', 'TMP', '临时层', 'Temporary - 临时数据处理层');

-- Table 样例
INSERT INTO tables (id, schema_id, name, comment, "desc") VALUES
('TBL001', 'SCH001', 'DIM_CUSTOMER', '客户维度表', '存储客户基本信息'),
('TBL002', 'SCH001', 'DIM_PRODUCT', '产品维度表', '存储产品信息'),
('TBL003', 'SCH001', 'FACT_ORDER', '订单事实表', '存储交易订单数据'),
('TBL004', 'SCH001', 'FACT_PAYMENT', '支付事实表', '存储支付流水数据'),
('TBL005', 'SCH002', 'DM_CUSTOMER_ACCT', '客户账户汇总表', '客户账户信息汇总'),
('TBL006', 'SCH002', 'DM_PRODUCT_SALES', '产品销售统计表', '产品销售数据统计'),
('TBL007', 'SCH002', 'DM_RISK_ANALYSIS', '风险分析表', '业务风险分析数据'),
('TBL008', 'SCH003', 'ODS_ORDER_RAW', '订单原始数据表', '从源系统抽取的原始订单数据'),
('TBL009', 'SCH003', 'ODS_CUSTOMER_RAW', '客户原始数据表', '从源系统抽取的原始客户数据');

-- Field 样例 - DW.DIM_CUSTOMER
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD001', 'TBL001', 'CUST_ID', 'VARCHAR', 50, NULL, TRUE, FALSE, FALSE, '客户 ID', '客户唯一标识'),
('FLD002', 'TBL001', 'CUST_NAME', 'VARCHAR', 100, NULL, FALSE, FALSE, FALSE, '客户名称', '客户全称'),
('FLD003', 'TBL001', 'CUST_TYPE', 'VARCHAR', 20, NULL, FALSE, FALSE, FALSE, '客户类型', '对公/对私'),
('FLD004', 'TBL001', 'CUST_STATUS', 'VARCHAR', 10, NULL, FALSE, FALSE, FALSE, '客户状态', '正常/冻结/注销'),
('FLD005', 'TBL001', 'CREATE_DATE', 'DATE', NULL, NULL, FALSE, FALSE, FALSE, '创建日期', '客户信息创建时间'),
('FLD006', 'TBL001', 'UPDATE_DATE', 'TIMESTAMP', NULL, NULL, FALSE, FALSE, TRUE, '更新日期', '最后更新时间');

-- Field 样例 - DW.DIM_PRODUCT
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD007', 'TBL002', 'PROD_ID', 'VARCHAR', 50, NULL, TRUE, FALSE, FALSE, '产品 ID', '产品唯一标识'),
('FLD008', 'TBL002', 'PROD_NAME', 'VARCHAR', 200, NULL, FALSE, FALSE, FALSE, '产品名称', '产品全称'),
('FLD009', 'TBL002', 'PROD_CATEGORY', 'VARCHAR', 50, NULL, FALSE, FALSE, FALSE, '产品类别', '产品分类'),
('FLD010', 'TBL002', 'UNIT_PRICE', 'DECIMAL', 10, 2, FALSE, FALSE, FALSE, '单价', '产品标准单价'),
('FLD011', 'TBL002', 'CURRENCY', 'VARCHAR', 3, NULL, FALSE, FALSE, FALSE, '币种', '价格币种');

-- Field 样例 - DW.FACT_ORDER
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD012', 'TBL003', 'ORDER_ID', 'VARCHAR', 50, NULL, TRUE, FALSE, FALSE, '订单 ID', '订单唯一标识'),
('FLD013', 'TBL003', 'CUST_ID', 'VARCHAR', 50, NULL, FALSE, TRUE, FALSE, '客户 ID', '外键关联 DIM_CUSTOMER'),
('FLD014', 'TBL003', 'PROD_ID', 'VARCHAR', 50, NULL, FALSE, TRUE, FALSE, '产品 ID', '外键关联 DIM_PRODUCT'),
('FLD015', 'TBL003', 'ORDER_DATE', 'DATE', NULL, NULL, FALSE, FALSE, FALSE, '订单日期', '下单时间'),
('FLD016', 'TBL003', 'ORDER_AMT', 'DECIMAL', 12, 2, FALSE, FALSE, FALSE, '订单金额', '订单总金额'),
('FLD017', 'TBL003', 'QTY', 'INTEGER', NULL, NULL, FALSE, FALSE, FALSE, '数量', '购买数量'),
('FLD018', 'TBL003', 'CHANNEL', 'VARCHAR', 20, NULL, FALSE, FALSE, FALSE, '渠道', '销售渠道');

-- Field 样例 - DW.FACT_PAYMENT
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD019', 'TBL004', 'PAY_ID', 'VARCHAR', 50, NULL, TRUE, FALSE, FALSE, '支付 ID', '支付流水唯一标识'),
('FLD020', 'TBL004', 'ORDER_ID', 'VARCHAR', 50, NULL, FALSE, TRUE, FALSE, '订单 ID', '外键关联 FACT_ORDER'),
('FLD021', 'TBL004', 'PAY_DATE', 'TIMESTAMP', NULL, NULL, FALSE, FALSE, FALSE, '支付时间', '支付完成时间'),
('FLD022', 'TBL004', 'PAY_AMT', 'DECIMAL', 12, 2, FALSE, FALSE, FALSE, '支付金额', '实际支付金额'),
('FLD023', 'TBL004', 'PAY_METHOD', 'VARCHAR', 20, NULL, FALSE, FALSE, FALSE, '支付方式', '支付渠道方式'),
('FLD024', 'TBL004', 'PAY_STATUS', 'VARCHAR', 10, NULL, FALSE, FALSE, FALSE, '支付状态', '成功/失败/处理中');

-- Field 样例 - DM.DM_CUSTOMER_ACCT
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD025', 'TBL005', 'CUST_ID', 'VARCHAR', 50, NULL, TRUE, FALSE, FALSE, '客户 ID', '客户唯一标识'),
('FLD026', 'TBL005', 'CUST_NAME', 'VARCHAR', 100, NULL, FALSE, FALSE, FALSE, '客户名称', '客户全称'),
('FLD027', 'TBL005', 'TOTAL_ASSET', 'DECIMAL', 15, 2, FALSE, FALSE, FALSE, '总资产', '客户总资产余额'),
('FLD028', 'TBL005', 'TOTAL_LIAB', 'DECIMAL', 15, 2, FALSE, FALSE, FALSE, '总负债', '客户总负债余额'),
('FLD029', 'TBL005', 'ACCT_STATUS', 'VARCHAR', 10, NULL, FALSE, FALSE, FALSE, '账户状态', '账户状态汇总'),
('FLD030', 'TBL005', 'STAT_DATE', 'DATE', NULL, NULL, FALSE, FALSE, FALSE, '统计日期', '数据统计时点');

-- Field 样例 - DM.DM_PRODUCT_SALES
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD031', 'TBL006', 'PROD_ID', 'VARCHAR', 50, NULL, TRUE, FALSE, FALSE, '产品 ID', '产品唯一标识'),
('FLD032', 'TBL006', 'PROD_NAME', 'VARCHAR', 200, NULL, FALSE, FALSE, FALSE, '产品名称', '产品全称'),
('FLD033', 'TBL006', 'SALES_QTY', 'DECIMAL', 15, 2, FALSE, FALSE, FALSE, '销售数量', '累计销售数量'),
('FLD034', 'TBL006', 'SALES_AMT', 'DECIMAL', 18, 2, FALSE, FALSE, FALSE, '销售金额', '累计销售金额'),
('FLD035', 'TBL006', 'STAT_MONTH', 'VARCHAR', 7, NULL, FALSE, FALSE, FALSE, '统计月份', '统计月份 YYYY-MM');

-- Field 样例 - ODS.ODS_ORDER_RAW
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD036', 'TBL008', 'SRC_ORDER_ID', 'VARCHAR', 100, NULL, FALSE, FALSE, FALSE, '源订单 ID', '源系统订单 ID'),
('FLD037', 'TBL008', 'SRC_CUST_ID', 'VARCHAR', 100, NULL, FALSE, FALSE, FALSE, '源客户 ID', '源系统客户 ID'),
('FLD038', 'TBL008', 'RAW_DATA', 'TEXT', NULL, NULL, FALSE, FALSE, TRUE, '原始数据', '原始 JSON 数据'),
('FLD039', 'TBL008', 'ETL_DATE', 'DATE', NULL, NULL, FALSE, FALSE, FALSE, 'ETL 日期', '数据抽取日期');

-- Field 样例 - ODS.ODS_CUSTOMER_RAW
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD040', 'TBL009', 'SRC_CUST_ID', 'VARCHAR', 100, NULL, FALSE, FALSE, FALSE, '源客户 ID', '源系统客户 ID'),
('FLD041', 'TBL009', 'RAW_CUST_DATA', 'TEXT', NULL, NULL, FALSE, FALSE, TRUE, '原始客户数据', '原始 JSON 数据'),
('FLD042', 'TBL009', 'ETL_DATE', 'DATE', NULL, NULL, FALSE, FALSE, FALSE, 'ETL 日期', '数据抽取日期');

-- 字典数据
INSERT INTO dicts (id, term, term_type, definition, domain, physical_ref, term_ref, std_ref) VALUES
('DICT001', '客户类型', '业务术语', '客户的分类标识', '金融', 'DW.DIM_CUSTOMER.CUST_TYPE', NULL, NULL),
('DICT002', '支付状态', '业务术语', '支付业务的状态', '金融', 'DW.FACT_PAYMENT.PAY_STATUS', NULL, NULL),
('DICT003', '币种', '基础数据', '货币类型代码', '金融', NULL, NULL, 'GB/T 12406');

-- 数据标准
INSERT INTO standards (id, name, description) VALUES
('STD001', '客户信息数据标准', '规范客户信息的定义、格式和管理要求'),
('STD002', '支付业务数据标准', '规范支付业务数据的格式和交换标准');

-- 标准码值
INSERT INTO standard_values (id, standard_id, code, label, label_en, sort_order) VALUES
('STDV001', 'STD001', '01', '个人客户', 'Individual Customer', 1),
('STDV002', 'STD001', '02', '对公客户', 'Corporate Customer', 2),
('STDV003', 'STD001', '03', '同业客户', 'Financial Institution Customer', 3),
('STDV004', 'STD002', 'SUCCESS', '支付成功', 'Payment Successful', 1),
('STDV005', 'STD002', 'FAILED', '支付失败', 'Payment Failed', 2),
('STDV006', 'STD002', 'PENDING', '处理中', 'Processing', 3);

-- 业务术语
INSERT INTO glossaries (id, term, domain, owner, definition, status, dict_ref, std_ref) VALUES
('GLOSS001', '客户', '金融', '数据管理部', '在本机构开立账户的个人或机构', '已发布', 'DICT001', 'STD001'),
('GLOSS002', '账户', '金融', '数据管理部', '为客户开立的记录资金变动的簿记单元', '已发布', NULL, 'STD001'),
('GLOSS003', '支付', '金融', '支付结算部', '付款人向收款人转移资金的行为', '已发布', 'DICT002', 'STD002');

-- 血缘分类
INSERT INTO lineage_categories (name, description, sort_order) VALUES
('一表通血缘', '一表通相关表的血缘关系', 1),
('金数血缘', '金数工程相关表的血缘关系', 2);

-- 默认管理员用户
-- 邮箱：admin@example.com
-- 密码：admin123
-- bcrypt 哈希 (cost=10)
INSERT INTO users (email, password_hash, name, role, is_active) VALUES
('admin@example.com', '$2b$10$rH0zG0s0H0s0H0s0H0s0Ou.rZlY5qN8nJz0L0s0H0s0H0s0H0s0H', '管理员', 'admin', TRUE);

-- ============================================
-- 部署完成
-- ============================================
