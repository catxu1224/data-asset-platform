import dotenv from 'dotenv';
import { createRequire } from 'module';

dotenv.config();

// 使用 CommonJS require 加载 node-sql-parser (UMD 模块)
const require = createRequire(import.meta.url);
const { Parser } = require('node-sql-parser');

// 使用阿里云 DashScope API
const API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-sp-c7e3f69b8be94381ab72db71e9f03f3f';
const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://coding.dashscope.aliyuncs.com/v1';

// 初始化 SQL 解析器（作为 AI 解析的后备方案）
const parser = new Parser();

export const aiService = {
  /**
   * AI 增强解析 SQL 血缘
   * @param {string} sql SQL 语句
   * @param {string} dialect SQL 方言
   * @param {boolean} useAI 是否使用 AI（默认 true）
   * @returns {Promise<{sourceTables: string[], targetTables: string[], mappings: Array}>}
   */
  async parseLineage(sql, dialect, useAI = true) {
    let localError = null;

    // 首先尝试使用本地 SQL 解析器（支持大多数 SQL 语法）
    try {
      const localResult = await this.parseWithLocalParser(sql);
      if (localResult && (localResult.sourceTables.length > 0 || localResult.targetTables.length > 0)) {
        console.log('本地 SQL 解析器成功解析');
        return localResult;
      } else {
        localError = '本地解析器未解析出任何结果';
      }
    } catch (err) {
      localError = err.message;
      console.log('本地解析失败:', err.message);
    }

    // 如果不允许使用 AI，直接抛出错误
    if (!useAI) {
      throw new Error(`传统解析失败：${localError}`);
    }

    // 本地解析失败时，使用 AI 解析作为后备
    console.log('尝试 AI 解析...');
    try {
      return await this.parseWithAI(sql, dialect);
    } catch (err) {
      console.error('AI 解析也失败:', err.message);
      // 返回一个空结果而不是抛出错误
      return {
        sourceTables: [],
        targetTables: [],
        mappings: [],
        note: 'SQL 解析失败，请检查 SQL 语法或使用更简单的语句'
      };
    }
  },

  /**
   * 使用本地 SQL 解析器解析
   */
  async parseWithLocalParser(sql) {
    try {
      // 预处理 SQL：移除注释并规范化语法
      const cleanedSql = normalizeHiveSql(cleanSqlComments(sql));
      console.log('清理后的 SQL:', cleanedSql.substring(0, 200) + '...');

      // 尝试不同的数据库方言
      const databases = ['PostgreSQL', 'MySQL', 'MariaDB', 'Spark', 'Hive'];
      let ast = null;
      let lastError = null;

      for (const db of databases) {
        try {
          ast = parser.astify(cleanedSql, { database: db });
          console.log(`使用 ${db} 方言成功解析`);
          break;
        } catch (err) {
          lastError = err;
          continue;
        }
      }

      if (!ast) {
        throw lastError || new Error('无法解析 SQL');
      }

      const sourceTables = new Set();
      const targetTables = new Set();
      const mappings = [];

      // 处理 AST
      processAst(ast, sourceTables, targetTables, mappings);

      return {
        sourceTables: Array.from(sourceTables),
        targetTables: Array.from(targetTables),
        mappings: deduplicateMappings(mappings)
      };
    } catch (err) {
      console.error('本地 SQL 解析失败:', err.message);
      throw err;
    }
  },

  /**
   * 使用 AI 解析
   */
  async parseWithAI(sql, dialect) {
    const prompt = `你是一个专业的 SQL 血缘分析专家。请分析以下 SQL 语句的血缘关系，提取源表、目标表和字段映射关系。

SQL 方言：${dialect}

SQL 语句：
${sql}

分析要求：
1. 识别所有源表（FROM、JOIN 子句中的表）
2. 识别所有目标表（INSERT INTO、CREATE TABLE 后的表）
3. 对于 CTE（WITH 子句），需要追踪 CTE 内部使用的源表
4. 识别字段级别的映射关系
5. **重要**：transformation 字段必须保留原始 SQL 表达式，包括完整的函数调用、CASE WHEN 条件、运算符等，不要简化

转换逻辑（transformation）示例：
- 直接映射："直接映射"
- 函数："COALESCE(a.id, b.id)" 或 "SUM(amount)" 或 "COUNT(*)"
- CASE 表达式："CASE WHEN status = 'A' THEN 1 ELSE 0 END"
- 算术表达式："price * quantity" 或 "a + b - c"
- 多字段函数："CONCAT(first_name, ' ', last_name)"

请以 JSON 格式返回分析结果，格式如下：
{
  "sourceTables": ["源表 1", "源表 2"],
  "targetTables": ["目标表 1"],
  "mappings": [
    {
      "sourceTable": "源表名",
      "sourceField": "源字段名",
      "targetTable": "目标表名",
      "targetField": "目标字段名",
      "transformation": "完整的 SQL 表达式（如：COALESCE(a.id, b.id)、CASE WHEN status = 'A' THEN 1 ELSE 0 END 等）"
    }
  ]
}

只返回 JSON，不要其他说明`;

    try {
      // 使用阿里云 DashScope 百炼平台 API
      const response = await fetch('https://coding.dashscope.aliyuncs.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'qwen3.5-plus',
          max_tokens: 8192,
          messages: [
            { role: 'system', content: '你是一个专业的 SQL 血缘分析专家。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1
        })
      });

      console.log('API 响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 错误响应:', errorText);
        throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('AI 原始响应:', JSON.stringify(data, null, 2).substring(0, 1500));

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('AI 返回内容为空');
      }

      // 提取 JSON 内容
      let jsonContent = content;
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1];
      }
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('无法解析 AI 返回结果');
    } catch (err) {
      console.error('AI 解析失败:', err.message);
      throw new Error('AI 服务调用失败：' + err.message);
    }
  },

  /**
   * 自然语言转 SQL
   */
  async nl2sql(naturalLanguage, schemas) {
    // NL2SQL 仍然使用 AI
    const schemaInfo = buildSchemaInfo(schemas);

    const prompt = `你是一个 SQL 专家。请根据以下数据库 schema 和用户描述，生成正确的 SQL 查询语句。

数据库 Schema:
${schemaInfo}

用户需求:
${naturalLanguage}

请以 JSON 格式返回：
{
  "sql": "生成的 SQL 语句",
  "explanation": "SQL 说明"
}

只返回 JSON，不要其他说明。`;

    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'qwen3.5-plus',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 错误响应:', errorText);
        throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('AI 返回内容为空');
      }

      // 提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          sql: result.sql,
          explanation: result.explanation
        };
      }
      throw new Error('无法解析 AI 返回结果');
    } catch (err) {
      console.error('NL2SQL 失败:', err.message);
      throw new Error('AI 服务调用失败：' + err.message);
    }
  }
};

/**
 * 处理 AST，提取表名和字段映射
 */
function processAst(ast, sourceTables, targetTables, mappings) {
  if (!ast) return;

  // 处理数组情况（node-sql-parser 有时返回数组）
  if (Array.isArray(ast)) {
    ast.forEach(item => processAst(item, sourceTables, targetTables, mappings));
    return;
  }

  const type = ast.type?.toUpperCase?.();
  console.log('AST type:', type, 'ast.keys:', Object.keys(ast || {}));

  // 处理 INSERT INTO ... SELECT
  if (type === 'INSERT') {
    // 提取目标表
    if (ast.table && Array.isArray(ast.table)) {
      ast.table.forEach(t => {
        const targetTable = getFullTableName(t);
        if (targetTable) targetTables.add(targetTable);
      });
    }
    // 处理 VALUES 或 SELECT
    console.log('ast.values:', ast.values ? 'exists, type=' + ast.values.type : 'null');
    console.log('ast.select:', ast.select ? 'exists' : 'null');
    if (ast.values?.type === 'select') {
      processSelect(ast.values, sourceTables, targetTables, mappings);
    }
    if (ast.select) {
      processSelect(ast.select, sourceTables, targetTables, mappings);
    }
    return;
  }

  // 处理 CREATE TABLE
  if (type === 'CREATE' && ast.table) {
    const targetTable = getFullTableName(ast.table);
    if (targetTable) targetTables.add(targetTable);
  }

  // 处理 SELECT
  if (type === 'SELECT') {
    processSelect(ast, sourceTables, targetTables, mappings);
    return;
  }

  // 处理 CTE
  if (ast.with && Array.isArray(ast.with)) {
    ast.with.forEach(cte => {
      if (cte.stmt) {
        processAst(cte.stmt, sourceTables, targetTables, mappings);
      }
    });
  }
}

/**
 * 处理 SELECT 语句
 */
function processSelect(select, sourceTables, targetTables, mappings) {
  if (!select) return;

  // 构建表别名映射
  const aliasMap = new Map();

  // 提取 FROM 表
  if (select.from) {
    extractTablesFromFromClause(select.from, sourceTables, aliasMap);
  }

  // 提取 JOIN 表
  if (select.join) {
    if (Array.isArray(select.join)) {
      select.join.forEach(join => {
        if (join.table) {
          const tableName = getFullTableName(join.table);
          if (tableName) {
            sourceTables.add(tableName);
            // 记录 JOIN 表的别名
            if (join.as) {
              const alias = typeof join.as === 'string' ? join.as : join.as.value;
              if (alias) aliasMap.set(alias, tableName);
            }
          }
        }
      });
    }
  }

  // 处理 SELECT 列
  if (select.columns && Array.isArray(select.columns)) {
    const sourceTablesArr = Array.from(sourceTables);
    const targetTable = Array.from(targetTables)[0] || 'result';
    select.columns.forEach(col => {
      extractColumnMappings(col, sourceTablesArr, targetTable, mappings, aliasMap);
    });
  }
}

/**
 * 从 FROM 子句提取表名（带别名处理）
 */
function extractTablesFromFromClause(fromClause, tables, tableAliases = new Map()) {
  if (!fromClause) return;

  if (Array.isArray(fromClause)) {
    fromClause.forEach(fc => extractTablesFromFromClause(fc, tables, tableAliases));
    return;
  }

  if (fromClause.table) {
    const name = getFullTableName(fromClause);
    if (name) {
      tables.add(name);
      // 记录别名映射
      if (fromClause.as) {
        const alias = typeof fromClause.as === 'string' ? fromClause.as : fromClause.as.value;
        if (alias) tableAliases.set(alias, name);
      }
      // 记录不带 schema 的表名到完整名的映射
      if (!tableAliases.has(fromClause.table)) {
        tableAliases.set(fromClause.table, name);
      }
    }
  }

  // 子查询
  if (fromClause.stmt) {
    const subTables = new Set();
    processAst(fromClause.stmt, subTables, new Set(), []);
    subTables.forEach(t => tables.add(t));
  }
}

/**
 * 获取完整的表名（支持别名解析）
 */
function getFullTableName(node) {
  if (!node) return null;
  if (typeof node === 'string') return node;

  const db = node.db || null;
  const schema = node.schema || null;
  const table = node.table || null;

  if (!table) return null;

  const parts = [];
  if (db) parts.push(db);
  if (schema) parts.push(schema);
  parts.push(table);

  return parts.join('.');
}

/**
 * 解析表别名映射（未使用，已集成到 processSelect 中）
 */
// function buildAliasMap(ast) { ... }

/**
 * 提取列的映射关系
 */
function extractColumnMappings(col, sourceTables, targetTable, mappings, aliasMap = new Map()) {
  if (!col) return;

  // 处理 type: expr 包裹的情况（INSERT INTO ... SELECT 中的列）
  if (col.type === 'expr' && col.expr) {
    // 保存外层 AS 别名
    const outerAlias = col.as?.value || col.as;
    const beforeCount = mappings.length;
    // 递归处理内部表达式
    extractColumnMappings(col.expr, sourceTables, targetTable, mappings, aliasMap);
    // 如果有外层 AS 别名，更新最后一条映射的 targetField
    if (outerAlias && mappings.length > beforeCount) {
      // 只更新在递归调用中添加的映射
      for (let i = beforeCount; i < mappings.length; i++) {
        mappings[i].targetField = outerAlias;
      }
    }
    return;
  }

  // 处理列引用
  if (col.type === 'column_ref') {
    let sourceTable = col.table || (sourceTables.length === 1 ? sourceTables[0] : 'unknown');
    // 解析别名到实际表名
    if (aliasMap.has(sourceTable)) {
      sourceTable = aliasMap.get(sourceTable);
    }
    // 处理字段名（可能是对象或字符串）
    let sourceField = 'unknown';
    if (typeof col.column === 'string') {
      sourceField = col.column;
    } else if (col.column?.expr) {
      sourceField = col.column.expr.value || 'unknown';
    } else if (col.column?.value) {
      sourceField = col.column.value;
    }
    // 目标字段优先使用 AS 别名，否则使用源字段名
    const targetField = col.as?.value || col.as || sourceField;
    mappings.push({
      sourceTable,
      sourceField,
      targetTable,
      targetField: typeof targetField === 'string' ? targetField : 'unknown',
      transformation: '直接映射'
    });
    return;
  }

  // 处理函数（如 SUM, COUNT 等）
  if (col.type === 'function' || col.type === 'aggr_func') {
    const funcName = col.name?.toUpperCase?.() || 'FUNC';
    // 注意：这里的 as 别名会在外层 expr 处理，所以不使用
    // 使用函数名作为临时的 targetField
    extractFieldsFromNode(col, sourceTables, targetTable, mappings, `${funcName}(...)`, aliasMap);
    return;
  }

  // 处理表达式（如 a + b）
  if (col.type === 'binary_expr') {
    const targetField = col.as?.value || col.as || 'expression';
    extractFieldsFromNode(col, sourceTables, targetTable, mappings, targetField, aliasMap);
    return;
  }

  // 处理 CASE 表达式
  if (col.type === 'case') {
    const targetField = col.as?.value || col.as || 'CASE_RESULT';
    extractFieldsFromNode(col, sourceTables, targetTable, mappings, targetField, aliasMap);
    return;
  }

  // 递归处理嵌套表达式
  if (col.expr) {
    extractColumnMappings(col.expr, sourceTables, targetTable, mappings, aliasMap);
  }
}

/**
 * 从节点中提取字段
 */
function extractFieldsFromNode(node, sourceTables, targetTable, mappings, targetField, aliasMap = new Map()) {
  if (!node) return;

  // 构建转换逻辑描述（原始 SQL 表达式）
  const transformation = buildTransformation(node, targetField);

  function walk(n) {
    if (!n) return;

    if (n.type === 'column_ref') {
      let sourceTable = n.table || (sourceTables.length === 1 ? sourceTables[0] : 'unknown');
      // 解析别名到实际表名
      if (aliasMap.has(sourceTable)) {
        sourceTable = aliasMap.get(sourceTable);
      }
      // 处理字段名（可能是对象或字符串）
      let sourceField = 'unknown';
      if (typeof n.column === 'string') {
        sourceField = n.column;
      } else if (n.column?.expr) {
        sourceField = n.column.expr.value || 'unknown';
      } else if (n.column?.value) {
        sourceField = n.column.value;
      }
      mappings.push({
        sourceTable,
        sourceField,
        targetTable,
        targetField: targetField || 'unknown',
        transformation: transformation  // 使用原始 SQL 表达式
      });
    }

    if (n.left) walk(n.left);
    if (n.right) walk(n.right);
    if (n.args && Array.isArray(n.args)) {
      n.args.forEach(walk);
    }
    if (n.expr) walk(n.expr);

    Object.values(n).forEach(v => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (typeof v === 'object' && v !== null) walk(v);
    });
  }

  walk(node);
}

/**
 * 获取节点的原始 SQL 文本
 */
function getNodeSqlText(node) {
  if (!node) return '';

  if (node.type === 'column_ref') {
    const table = node.table ? node.table + '.' : '';
    const column = typeof node.column === 'string' ? node.column :
                   node.column?.expr?.value || node.column?.value || '';
    return table + column;
  }

  if (node.type === 'function' || node.type === 'aggr_func') {
    const funcName = node.name?.toUpperCase?.() || 'FUNC';
    let args = '';
    if (node.args) {
      if (node.args.expr) {
        args = getNodeSqlText(node.args.expr);
      } else if (Array.isArray(node.args.value)) {
        args = node.args.value.map(getNodeSqlText).join(', ');
      }
    }
    return `${funcName}(${args})`;
  }

  if (node.type === 'case') {
    let result = 'CASE';
    if (node.args && Array.isArray(node.args)) {
      node.args.forEach(arg => {
        result += ' ' + getNodeSqlText(arg);
      });
    }
    if (node.else) {
      result += ' ELSE ' + getNodeSqlText(node.else);
    }
    result += ' END';
    return result;
  }

  if (node.type === 'binary_expr') {
    const left = getNodeSqlText(node.left);
    const right = getNodeSqlText(node.right);
    const op = node.operator || node.type;
    return `${left} ${op} ${right}`;
  }

  if (node.value !== undefined) {
    return String(node.value);
  }

  return '';
}

/**
 * 构建转换逻辑描述（原始 SQL 表达式）
 */
function buildTransformation(node, targetField) {
  const sqlText = getNodeSqlText(node);
  return sqlText || targetField || 'unknown';
}

/**
 * 清理 SQL 注释
 */
function cleanSqlComments(sql) {
  if (!sql) return '';

  // 1. 移除单行注释 -- ...
  let cleaned = sql.replace(/--[^\n]*/g, '');

  // 2. 移除多行注释 /* ... */
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // 3. 移除中间注释 --...-- (某些 SQL 变体)
  cleaned = cleaned.replace(/--[\s\S]*?--/g, '');

  return cleaned.trim();
}

/**
 * 规范化 Hive/SparkSQL 语法为标准 SQL
 */
function normalizeHiveSql(sql) {
  if (!sql) return sql;

  let normalized = sql;

  // 1. INSERT OVERWRITE TABLE -> INSERT INTO
  normalized = normalized.replace(/INSERT\s+OVERWRITE\s+TABLE/gi, 'INSERT INTO');

  // 2. 移除 PARTITION 子句（解析器不支持）
  normalized = normalized.replace(/PARTITION\s*\([^)]*\)/gi, '');

  // 3. 规范化表别名
  normalized = normalized.replace(/\s+AS\s+/gi, ' ');

  return normalized;
}

/**
 * 构建 Schema 信息
 */
function buildSchemaInfo(schemas) {
  return schemas.map(s => {
    const tables = s.tables ? s.tables.map(t => {
      const fields = t.fields ? t.fields.map(f => {
        let fieldStr = f.name + ' (' + f.type;
        if (f.len) {
          fieldStr += '(' + f.len;
          if (f.precision) fieldStr += ',' + f.precision;
          fieldStr += ')';
        }
        fieldStr += ') - ' + (f.comment || '');
        return fieldStr;
      }).join(', ') : '';
      return '  - ' + t.name + ': ' + (t.comment || '') + ' [' + fields + ']';
    }).join('\n') : '';
    return s.name + ':\n' + tables;
  }).join('\n\n');
}

/**
 * 去重映射关系
 */
function deduplicateMappings(mappings) {
  const seen = new Set();
  return mappings.filter(m => {
    const key = `${m.sourceTable}.${m.sourceField} -> ${m.targetTable}.${m.targetField}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
