export const initTables = [
  {
    id: 1, schema: 'DW', name: 'CUSTOMER', comment: '客户主表',
    fields: [
      { id: 1, name: 'CUST_ID',   type: 'VARCHAR', len: 36,  precision: null, pk: true,  fk: false, nullable: false, comment: '客户唯一标识' },
      { id: 2, name: 'CUST_NAME', type: 'VARCHAR', len: 100, precision: null, pk: false, fk: false, nullable: false, comment: '客户名称' },
      { id: 3, name: 'CUST_NAT',  type: 'CHAR',    len: 3,   precision: null, pk: false, fk: false, nullable: true,  comment: '客户所属国家', dictRef: 'Nation', termRef: '国家或地区', stdRef: 'COUNTRY_CODE' },
      { id: 4, name: 'ORG_ID',    type: 'VARCHAR', len: 36,  precision: null, pk: false, fk: true,  nullable: true,  comment: '所属机构ID', fkTable: 'ORGANIZATION', fkField: 'ORG_ID' },
    ],
  },
  {
    id: 2, schema: 'DW', name: 'ORGANIZATION', comment: '机构表',
    fields: [
      { id: 1, name: 'ORG_ID',   type: 'VARCHAR', len: 36,  precision: null, pk: true,  fk: false, nullable: false, comment: '机构唯一标识' },
      { id: 2, name: 'ORG_NAME', type: 'VARCHAR', len: 200, precision: null, pk: false, fk: false, nullable: false, comment: '机构名称' },
      { id: 3, name: 'ORG_TYPE', type: 'CHAR',    len: 2,   precision: null, pk: false, fk: false, nullable: true,  comment: '机构类型' },
    ],
  },
  {
    id: 3, schema: 'DM', name: 'ACCOUNT', comment: '账户表',
    fields: [
      { id: 1, name: 'ACCT_ID',  type: 'VARCHAR', len: 36, precision: null, pk: true,  fk: false, nullable: false, comment: '账户ID' },
      { id: 2, name: 'CUST_ID',  type: 'VARCHAR', len: 36, precision: null, pk: false, fk: true,  nullable: false, comment: '客户ID', fkTable: 'CUSTOMER', fkField: 'CUST_ID' },
      { id: 3, name: 'ACCT_BAL', type: 'DECIMAL', len: 18, precision: 2,    pk: false, fk: false, nullable: true,  comment: '账户余额' },
      { id: 4, name: 'ACCT_CCY', type: 'CHAR',    len: 3,  precision: null, pk: false, fk: false, nullable: true,  comment: '账户币种' },
    ],
  },
]

export const initDict = [
  { id: 1, term: 'Nation',   type: '字段', definition: '客户所属的国家或地区，使用ISO 3166-1 alpha-3标准码', domain: '客户领域', physicalRef: 'CUST_NAT', termRef: '国家或地区', stdRef: 'COUNTRY_CODE' },
  { id: 2, term: 'Balance',  type: '指标', definition: '账户在某一时点的资金余额，精确到分',                   domain: '账户领域', physicalRef: 'ACCT_BAL',  termRef: '账户余额',   stdRef: null },
  { id: 3, term: 'Currency', type: '字段', definition: '货币代码，遵循ISO 4217标准',                           domain: '公共领域', physicalRef: 'ACCT_CCY',  termRef: '币种',       stdRef: 'CURRENCY_CODE' },
]

export const initGlossary = [
  { id: 1, term: '国家或地区', domain: '地理信息', owner: '数据治理团队', definition: '泛指主权国家或独立地区的地理政治单位，用于标识客户注册地、业务发生地等', status: '已审批', dictRef: 'Nation',   stdRef: 'COUNTRY_CODE' },
  { id: 2, term: '账户余额',   domain: '账户管理', owner: '账户产品线',   definition: '指某一账户在特定时点持有的可用资金总额，包含本金和应计利息',             status: '已审批', dictRef: 'Balance',  stdRef: null },
  { id: 3, term: '币种',       domain: '货币管理', owner: '财务团队',     definition: '表示货币种类的标准编码，如人民币(CNY)、美元(USD)',                         status: '草稿',   dictRef: 'Currency', stdRef: 'CURRENCY_CODE' },
]

export const initStandards = [
  {
    id: 1, name: 'COUNTRY_CODE', desc: '国家及地区标准码值表',
    values: [
      { code: 'CHN', label: '中国', labelEn: 'China' },
      { code: 'USA', label: '美国', labelEn: 'United States' },
      { code: 'GBR', label: '英国', labelEn: 'United Kingdom' },
      { code: 'JPN', label: '日本', labelEn: 'Japan' },
      { code: 'DEU', label: '德国', labelEn: 'Germany' },
    ],
  },
  {
    id: 2, name: 'CURRENCY_CODE', desc: '货币代码标准码值表',
    values: [
      { code: 'CNY', label: '人民币', labelEn: 'Chinese Yuan' },
      { code: 'USD', label: '美元',   labelEn: 'US Dollar' },
      { code: 'EUR', label: '欧元',   labelEn: 'Euro' },
      { code: 'GBP', label: '英镑',   labelEn: 'British Pound' },
    ],
  },
]
