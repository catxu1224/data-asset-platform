-- 样例数据 - 所有 ID 使用 varchar(30) 格式 (字母 + 数字组合)
-- ID 格式说明：前缀 + 时间戳/序列号，如：SCH001, TBL001, FLD001

BEGIN;

-- 清理旧数据
DELETE FROM standard_values;
DELETE FROM standards;
DELETE FROM glossaries;
DELETE FROM dicts;
DELETE FROM fields;
DELETE FROM tables;
DELETE FROM schemas;

-- ========================================
-- Schema 样例数据
-- ========================================
INSERT INTO schemas (id, name, comment, "desc") VALUES
('SCH001', 'DW', '数据仓库层', 'Data Warehouse - 存储企业核心数据'),
('SCH002', 'DM', '数据集市层', 'Data Mart - 面向主题的数据集合'),
('SCH003', 'ODS', '操作数据存储', 'Operational Data Store - 原始数据存储'),
('SCH004', 'TMP', '临时层', 'Temporary - 临时数据处理层');

-- ========================================
-- Table 样例数据
-- ========================================
INSERT INTO tables (id, schema_id, name, comment, "desc") VALUES
-- DW 层表
('TBL001', 'SCH001', 'DIM_CUSTOMER', '客户维度表', '存储客户基本信息'),
('TBL002', 'SCH001', 'DIM_PRODUCT', '产品维度表', '存储产品信息'),
('TBL003', 'SCH001', 'FACT_ORDER', '订单事实表', '存储交易订单数据'),
('TBL004', 'SCH001', 'FACT_PAYMENT', '支付事实表', '存储支付流水数据'),

-- DM 层表
('TBL005', 'SCH002', 'DM_CUSTOMER_ACCT', '客户账户汇总表', '客户账户信息汇总'),
('TBL006', 'SCH002', 'DM_PRODUCT_SALES', '产品销售统计表', '产品销售数据统计'),
('TBL007', 'SCH002', 'DM_RISK_ANALYSIS', '风险分析表', '业务风险分析数据'),

-- ODS 层表
('TBL008', 'SCH003', 'ODS_ORDER_RAW', '订单原始数据表', '从源系统抽取的原始订单数据'),
('TBL009', 'SCH003', 'ODS_CUSTOMER_RAW', '客户原始数据表', '从源系统抽取的原始客户数据');

-- ========================================
-- Field 样例数据 - DW.DIM_CUSTOMER
-- ========================================
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD001', 'TBL001', 'CUST_ID', 'VARCHAR', 50, NULL, TRUE, FALSE, FALSE, '客户 ID', '客户唯一标识'),
('FLD002', 'TBL001', 'CUST_NAME', 'VARCHAR', 100, NULL, FALSE, FALSE, FALSE, '客户名称', '客户全称'),
('FLD003', 'TBL001', 'CUST_TYPE', 'VARCHAR', 20, NULL, FALSE, FALSE, FALSE, '客户类型', '对公/对私'),
('FLD004', 'TBL001', 'CUST_STATUS', 'VARCHAR', 10, NULL, FALSE, FALSE, FALSE, '客户状态', '正常/冻结/注销'),
('FLD005', 'TBL001', 'CREATE_DATE', 'DATE', NULL, NULL, FALSE, FALSE, FALSE, '创建日期', '客户信息创建时间'),
('FLD006', 'TBL001', 'UPDATE_DATE', 'TIMESTAMP', NULL, NULL, FALSE, FALSE, TRUE, '更新日期', '最后更新时间');

-- ========================================
-- Field 样例数据 - DW.DIM_PRODUCT
-- ========================================
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD007', 'TBL002', 'PROD_ID', 'VARCHAR', 50, NULL, TRUE, FALSE, FALSE, '产品 ID', '产品唯一标识'),
('FLD008', 'TBL002', 'PROD_NAME', 'VARCHAR', 200, NULL, FALSE, FALSE, FALSE, '产品名称', '产品全称'),
('FLD009', 'TBL002', 'PROD_CATEGORY', 'VARCHAR', 50, NULL, FALSE, FALSE, FALSE, '产品类别', '产品分类'),
('FLD010', 'TBL002', 'UNIT_PRICE', 'DECIMAL', 10, 2, FALSE, FALSE, FALSE, '单价', '产品标准单价'),
('FLD011', 'TBL002', 'CURRENCY', 'VARCHAR', 3, NULL, FALSE, FALSE, FALSE, '币种', '价格币种');

-- ========================================
-- Field 样例数据 - DW.FACT_ORDER
-- ========================================
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD012', 'TBL003', 'ORDER_ID', 'VARCHAR', 50, NULL, TRUE, FALSE, FALSE, '订单 ID', '订单唯一标识'),
('FLD013', 'TBL003', 'CUST_ID', 'VARCHAR', 50, NULL, FALSE, TRUE, FALSE, '客户 ID', '外键关联 DIM_CUSTOMER'),
('FLD014', 'TBL003', 'PROD_ID', 'VARCHAR', 50, NULL, FALSE, TRUE, FALSE, '产品 ID', '外键关联 DIM_PRODUCT'),
('FLD015', 'TBL003', 'ORDER_DATE', 'DATE', NULL, NULL, FALSE, FALSE, FALSE, '订单日期', '下单时间'),
('FLD016', 'TBL003', 'ORDER_AMT', 'DECIMAL', 12, 2, FALSE, FALSE, FALSE, '订单金额', '订单总金额'),
('FLD017', 'TBL003', 'QTY', 'INTEGER', NULL, NULL, FALSE, FALSE, FALSE, '数量', '购买数量'),
('FLD018', 'TBL003', 'CHANNEL', 'VARCHAR', 20, NULL, FALSE, FALSE, FALSE, '渠道', '销售渠道');

-- ========================================
-- Field 样例数据 - DW.FACT_PAYMENT
-- ========================================
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD019', 'TBL004', 'PAY_ID', 'VARCHAR', 50, NULL, TRUE, FALSE, FALSE, '支付 ID', '支付流水唯一标识'),
('FLD020', 'TBL004', 'ORDER_ID', 'VARCHAR', 50, NULL, FALSE, TRUE, FALSE, '订单 ID', '外键关联 FACT_ORDER'),
('FLD021', 'TBL004', 'PAY_DATE', 'TIMESTAMP', NULL, NULL, FALSE, FALSE, FALSE, '支付时间', '支付完成时间'),
('FLD022', 'TBL004', 'PAY_AMT', 'DECIMAL', 12, 2, FALSE, FALSE, FALSE, '支付金额', '实际支付金额'),
('FLD023', 'TBL004', 'PAY_METHOD', 'VARCHAR', 20, NULL, FALSE, FALSE, FALSE, '支付方式', '支付渠道方式'),
('FLD024', 'TBL004', 'PAY_STATUS', 'VARCHAR', 10, NULL, FALSE, FALSE, FALSE, '支付状态', '成功/失败/处理中');

-- ========================================
-- Field 样例数据 - DM.DM_CUSTOMER_ACCT
-- ========================================
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD025', 'TBL005', 'CUST_ID', 'VARCHAR', 50, NULL, TRUE, FALSE, FALSE, '客户 ID', '客户唯一标识'),
('FLD026', 'TBL005', 'CUST_NAME', 'VARCHAR', 100, NULL, FALSE, FALSE, FALSE, '客户名称', '客户全称'),
('FLD027', 'TBL005', 'TOTAL_ASSET', 'DECIMAL', 15, 2, FALSE, FALSE, FALSE, '总资产', '客户总资产余额'),
('FLD028', 'TBL005', 'TOTAL_LIAB', 'DECIMAL', 15, 2, FALSE, FALSE, FALSE, '总负债', '客户总负债余额'),
('FLD029', 'TBL005', 'ACCT_STATUS', 'VARCHAR', 10, NULL, FALSE, FALSE, FALSE, '账户状态', '账户状态汇总'),
('FLD030', 'TBL005', 'STAT_DATE', 'DATE', NULL, NULL, FALSE, FALSE, FALSE, '统计日期', '数据统计时点');

-- ========================================
-- Field 样例数据 - DM.DM_PRODUCT_SALES
-- ========================================
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD031', 'TBL006', 'PROD_ID', 'VARCHAR', 50, NULL, TRUE, FALSE, FALSE, '产品 ID', '产品唯一标识'),
('FLD032', 'TBL006', 'PROD_NAME', 'VARCHAR', 200, NULL, FALSE, FALSE, FALSE, '产品名称', '产品全称'),
('FLD033', 'TBL006', 'SALES_QTY', 'DECIMAL', 15, 2, FALSE, FALSE, FALSE, '销售数量', '累计销售数量'),
('FLD034', 'TBL006', 'SALES_AMT', 'DECIMAL', 18, 2, FALSE, FALSE, FALSE, '销售金额', '累计销售金额'),
('FLD035', 'TBL006', 'STAT_MONTH', 'VARCHAR', 7, NULL, FALSE, FALSE, FALSE, '统计月份', '统计月份 YYYY-MM');

-- ========================================
-- Field 样例数据 - ODS.ODS_ORDER_RAW
-- ========================================
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD036', 'TBL008', 'SRC_ORDER_ID', 'VARCHAR', 100, NULL, FALSE, FALSE, FALSE, '源订单 ID', '源系统订单 ID'),
('FLD037', 'TBL008', 'SRC_CUST_ID', 'VARCHAR', 100, NULL, FALSE, FALSE, FALSE, '源客户 ID', '源系统客户 ID'),
('FLD038', 'TBL008', 'RAW_DATA', 'TEXT', NULL, NULL, FALSE, FALSE, TRUE, '原始数据', '原始 JSON 数据'),
('FLD039', 'TBL008', 'ETL_DATE', 'DATE', NULL, NULL, FALSE, FALSE, FALSE, 'ETL 日期', '数据抽取日期');

-- ========================================
-- Field 样例数据 - ODS.ODS_CUSTOMER_RAW
-- ========================================
INSERT INTO fields (id, table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc") VALUES
('FLD040', 'TBL009', 'SRC_CUST_ID', 'VARCHAR', 100, NULL, FALSE, FALSE, FALSE, '源客户 ID', '源系统客户 ID'),
('FLD041', 'TBL009', 'RAW_CUST_DATA', 'TEXT', NULL, NULL, FALSE, FALSE, TRUE, '原始客户数据', '原始 JSON 数据'),
('FLD042', 'TBL009', 'ETL_DATE', 'DATE', NULL, NULL, FALSE, FALSE, FALSE, 'ETL 日期', '数据抽取日期');

-- ========================================
-- 字典数据
-- ========================================
INSERT INTO dicts (id, term, term_type, definition, domain, physical_ref, term_ref, std_ref) VALUES
('DICT001', '客户类型', '业务术语', '客户的分类标识', '金融', 'DW.DIM_CUSTOMER.CUST_TYPE', NULL, NULL),
('DICT002', '支付状态', '业务术语', '支付业务的状态', '金融', 'DW.FACT_PAYMENT.PAY_STATUS', NULL, NULL),
('DICT003', '币种', '基础数据', '货币类型代码', '金融', NULL, NULL, 'GB/T 12406');

-- ========================================
-- 数据标准
-- ========================================
INSERT INTO standards (id, name, description) VALUES
('STD001', '客户信息数据标准', '规范客户信息的定义、格式和管理要求'),
('STD002', '支付业务数据标准', '规范支付业务数据的格式和交换标准');

-- ========================================
-- 标准码值
-- ========================================
INSERT INTO standard_values (id, standard_id, code, label, label_en, sort_order) VALUES
('STDV001', 'STD001', '01', '个人客户', 'Individual Customer', 1),
('STDV002', 'STD001', '02', '对公客户', 'Corporate Customer', 2),
('STDV003', 'STD001', '03', '同业客户', 'Financial Institution Customer', 3),
('STDV004', 'STD002', 'SUCCESS', '支付成功', 'Payment Successful', 1),
('STDV005', 'STD002', 'FAILED', '支付失败', 'Payment Failed', 2),
('STDV006', 'STD002', 'PENDING', '处理中', 'Processing', 3);

-- ========================================
-- 业务术语表
-- ========================================
INSERT INTO glossaries (id, term, domain, owner, definition, status, dict_ref, std_ref) VALUES
('GLOSS001', '客户', '金融', '数据管理部', '在本机构开立账户的个人或机构', '已发布', 'DICT001', 'STD001'),
('GLOSS002', '账户', '金融', '数据管理部', '为客户开立的记录资金变动的簿记单元', '已发布', NULL, 'STD001'),
('GLOSS003', '支付', '金融', '支付结算部', '付款人向收款人转移资金的行为', '已发布', 'DICT002', 'STD002');

COMMIT;
