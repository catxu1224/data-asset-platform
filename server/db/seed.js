import pool from './postgres.js';
import { tableRepo } from '../repository/tableRepository.js';
import { dictRepo } from '../repository/dictRepository.js';
import { glossaryRepo } from '../repository/glossaryRepository.js';
import { standardRepo } from '../repository/standardRepository.js';

async function seed() {
  console.log('🌱 Seeding database...');

  // 插入 Schema
  const schemaResult = await pool.query(
    "INSERT INTO schemas (name, comment) VALUES ('DW', '数据仓库层'), ('DM', '数据集市层') ON CONFLICT (name) DO NOTHING RETURNING *"
  );

  // 获取 Schema ID
  const schemas = await pool.query('SELECT * FROM schemas');
  const dwSchema = schemas.rows.find(s => s.name === 'DW');
  const dmSchema = schemas.rows.find(s => s.name === 'DM');

  // 插入示例数据
  if (dwSchema && dmSchema) {
    // 先清空旧数据
    await pool.query('TRUNCATE tables, fields RESTART IDENTITY CASCADE');

    // 创建表 CUSTOMER - T001
    const customerTable = await tableRepo.createWithFields(
      dwSchema.id, 'T001', 'CUSTOMER', '客户主表',
      '客户主题域的核心表，包含所有与客户相关的基础信息。',
      [
        { id: 'T001-F01', name: 'CUST_ID', type: 'VARCHAR', len: 36, precision: null, pk: true, fk: false, nullable: false, comment: '客户唯一标识', desc: '采用 UUID 格式，全局唯一的客户标识符' },
        { id: 'T001-F02', name: 'CUST_NAME', type: 'VARCHAR', len: 100, precision: null, pk: false, fk: false, nullable: false, comment: '客户名称', desc: '客户的完整法定名称' },
        { id: 'T001-F03', name: 'CUST_NAT', type: 'CHAR', len: 3, precision: null, pk: false, fk: false, nullable: true, comment: '客户所属国家', desc: 'ISO 3166-1 alpha-3 标准码', dictRef: 1, termRef: 1, stdRef: 1 },
        { id: 'T001-F04', name: 'ORG_ID', type: 'VARCHAR', len: 36, precision: null, pk: false, fk: true, nullable: true, comment: '所属机构 ID', desc: '客户归属的分支机构标识' },
      ]
    );

    // 创建表 ORGANIZATION - T002
    const orgTable = await tableRepo.createWithFields(
      dwSchema.id, 'T002', 'ORGANIZATION', '机构表',
      '机构主题域的核心表，包含公司所有分支机构的信息。',
      [
        { id: 'T002-F01', name: 'ORG_ID', type: 'VARCHAR', len: 36, precision: null, pk: true, fk: false, nullable: false, comment: '机构唯一标识', desc: '全局唯一的机构标识符' },
        { id: 'T002-F02', name: 'ORG_NAME', type: 'VARCHAR', len: 200, precision: null, pk: false, fk: false, nullable: false, comment: '机构名称', desc: '机构的完整法定名称' },
        { id: 'T002-F03', name: 'ORG_TYPE', type: 'CHAR', len: 2, precision: null, pk: false, fk: false, nullable: true, comment: '机构类型', desc: '01-总行，02-分行，03-支行，04-营业部' },
      ]
    );

    // 创建表 ACCOUNT - T003
    const accountTable = await tableRepo.createWithFields(
      dmSchema.id, 'T003', 'ACCOUNT', '账户表',
      '账户主题域的核心表，记录所有客户开立的各类账户信息。',
      [
        { id: 'T003-F01', name: 'ACCT_ID', type: 'VARCHAR', len: 36, precision: null, pk: true, fk: false, nullable: false, comment: '账户 ID', desc: '全局唯一的账户标识符' },
        { id: 'T003-F02', name: 'CUST_ID', type: 'VARCHAR', len: 36, precision: null, pk: false, fk: true, nullable: false, comment: '客户 ID', desc: '账户所属客户的标识' },
        { id: 'T003-F03', name: 'ACCT_BAL', type: 'DECIMAL', len: 18, precision: 2, pk: false, fk: false, nullable: true, comment: '账户余额', desc: '账户当前余额，精确到分' },
        { id: 'T003-F04', name: 'ACCT_CCY', type: 'CHAR', len: 3, precision: null, pk: false, fk: false, nullable: true, comment: '账户币种', desc: 'ISO 4217 三位字母代码' },
      ]
    );

    console.log('✅ Tables created');

    // 更新 FK 引用
    await pool.query(`
      UPDATE fields SET fk_table_id = (SELECT id FROM tables WHERE name = 'ORGANIZATION')
      WHERE name = 'ORG_ID' AND table_id = (SELECT id FROM tables WHERE name = 'CUSTOMER')
    `);
    await pool.query(`
      UPDATE fields SET fk_table_id = (SELECT id FROM tables WHERE name = 'CUSTOMER')
      WHERE name = 'CUST_ID' AND table_id = (SELECT id FROM tables WHERE name = 'ACCOUNT')
    `);

    // 插入数据字典
    await dictRepo.create({ term: 'Nation', type: '字段', definition: '客户所属的国家或地区，使用 ISO 3166-1 alpha-3 标准码', domain: '客户领域', physicalRef: 'CUST_NAT', termRef: '国家或地区', stdRef: 'COUNTRY_CODE' });
    await dictRepo.create({ term: 'Balance', type: '指标', definition: '账户在某一时点的资金余额，精确到分', domain: '账户领域', physicalRef: 'ACCT_BAL', termRef: '账户余额', stdRef: null });
    await dictRepo.create({ term: 'Currency', type: '字段', definition: '货币代码，遵循 ISO 4217 标准', domain: '公共领域', physicalRef: 'ACCT_CCY', termRef: '币种', stdRef: 'CURRENCY_CODE' });

    console.log('✅ Dicts created');

    // 插入业务术语
    await glossaryRepo.create({ term: '国家或地区', domain: '地理信息', owner: '数据治理团队', definition: '泛指主权国家或独立地区的地理政治单位', status: '已审批', dictRef: 1, stdRef: 'COUNTRY_CODE' });
    await glossaryRepo.create({ term: '账户余额', domain: '账户管理', owner: '账户产品线', definition: '指某一账户在特定时点持有的可用资金总额', status: '已审批', dictRef: 2, stdRef: null });
    await glossaryRepo.create({ term: '币种', domain: '货币管理', owner: '财务团队', definition: '表示货币种类的标准编码', status: '草稿', dictRef: 3, stdRef: 'CURRENCY_CODE' });

    console.log('✅ Glossaries created');

    // 插入数据标准
    await standardRepo.createWithValues('COUNTRY_CODE', '国家及地区标准码值表', [
      { code: 'CHN', label: '中国', labelEn: 'China' },
      { code: 'USA', label: '美国', labelEn: 'United States' },
      { code: 'GBR', label: '英国', labelEn: 'United Kingdom' },
      { code: 'JPN', label: '日本', labelEn: 'Japan' },
      { code: 'DEU', label: '德国', labelEn: 'Germany' },
    ]);

    await standardRepo.createWithValues('CURRENCY_CODE', '货币代码标准码值表', [
      { code: 'CNY', label: '人民币', labelEn: 'Chinese Yuan' },
      { code: 'USD', label: '美元', labelEn: 'US Dollar' },
      { code: 'EUR', label: '欧元', labelEn: 'Euro' },
      { code: 'GBP', label: '英镑', labelEn: 'British Pound' },
    ]);

    console.log('✅ Standards created');
  }

  console.log('✅ Database seeding complete');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
