import { Parser } from 'node-sql-parser';

const parser = new Parser();

/**
 * 递归提取表名（处理 CTE 和子查询）
 */
function extractTablesRecursive(ast) {
  const tables = new Set();
  const cteTables = new Map(); // CTE 名称 -> 表集合

  // 先处理 CTE
  if (ast.with && Array.isArray(ast.with)) {
    ast.with.forEach(cte => {
      if (cte.name && cte.stmt) {
        const cteTableList = extractTablesFromAst(cte.stmt);
        cteTables.set(cte.name, cteTableList);
      }
    });
  }

  // 提取主查询的表
  const mainTables = extractTablesFromAst(ast);

  // 合并所有表
  mainTables.forEach(t => tables.add(t));
  cteTables.forEach((tableList, cteName) => {
    tableList.forEach(t => tables.add(t));
  });

  return Array.from(tables);
}

/**
 * 从 AST 中提取表名
 */
function extractTablesFromAst(ast) {
  const tables = new Set();

  function walk(node) {
    if (!node || typeof node !== 'object') return;

    // 处理 FROM 子句
    if (node.from) {
      if (Array.isArray(node.from)) {
        node.from.forEach(fromClause => {
          if (fromClause.table) {
            const tableName = getFullTableName(fromClause);
            if (tableName) tables.add(tableName);
          }
          walk(fromClause);
        });
      } else if (node.from.table) {
        const tableName = getFullTableName(node.from);
        if (tableName) tables.add(tableName);
      }
      walk(node.from);
    }

    // 处理 JOIN
    if (node.join) {
      if (Array.isArray(node.join)) {
        node.join.forEach(join => {
          if (join.table && join.table.table) {
            const tableName = getFullTableName(join.table);
            if (tableName) tables.add(tableName);
          }
          walk(join);
        });
      }
    }

    // 处理 INSERT INTO
    if (node.into && node.into.table) {
      const tableName = getFullTableName(node.into);
      if (tableName) tables.add(tableName);
    }

    // 处理表名
    if (node.table) {
      const tableName = getFullTableName(node.table);
      if (tableName) tables.add(tableName);
    }

    // 递归遍历所有属性
    Object.values(node).forEach(value => {
      if (Array.isArray(value)) {
        value.forEach(item => walk(item));
      } else if (typeof value === 'object' && value !== null) {
        walk(value);
      }
    });
  }

  walk(ast);
  return Array.from(tables);
}

/**
 * 获取完整的表名（包括 schema）
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
 * 提取字段映射关系
 */
function extractFieldMappings(ast, sourceTables, targetTables) {
  const mappings = [];

  function walk(node, context = {}) {
    if (!node || typeof node !== 'object') return;

    // 处理 SELECT 字段
    if (node.columns && Array.isArray(node.columns)) {
      node.columns.forEach(col => {
        extractFieldMapping(col, sourceTables, context.targetTable, mappings);
      });
    }

    // 处理 AS 别名
    if (node.as && node.expr) {
      const targetField = typeof node.as === 'string' ? node.as : node.as.value;
      extractFieldMapping(node.expr, sourceTables, context.targetTable, mappings, targetField);
    }

    // 递归遍历
    Object.values(node).forEach(value => {
      if (Array.isArray(value)) {
        value.forEach(item => walk(item, context));
      } else if (typeof value === 'object' && value !== null) {
        walk(value, context);
      }
    });
  }

  walk(ast, { targetTable: targetTables[0] });
  return mappings;
}

/**
 * 提取单个字段的映射
 */
function extractFieldMapping(node, sourceTables, targetTable, mappings, targetField = null) {
  if (!node) return;

  // 处理列引用
  if (node.type === 'column_ref') {
    const sourceTable = node.table || (sourceTables.length === 1 ? sourceTables[0] : null);
    const sourceField = node.column;

    if (sourceField && targetField) {
      mappings.push({
        sourceTable: sourceTable || 'unknown',
        sourceField: Array.isArray(sourceField) ? sourceField.join('.') : sourceField,
        targetTable: targetTable || 'unknown',
        targetField: targetField,
        transformation: '直接映射'
      });
    }
  }

  // 处理函数调用
  if (node.type === 'function') {
    const funcName = node.name?.toUpperCase?.() || 'FUNCTION';
    if (node.args && Array.isArray(node.args)) {
      node.args.forEach(arg => {
        if (arg.type === 'column_ref') {
          const sourceTable = arg.table || (sourceTables.length === 1 ? sourceTables[0] : null);
          mappings.push({
            sourceTable: sourceTable || 'unknown',
            sourceField: arg.column,
            targetTable: targetTable || 'unknown',
            targetField: targetField || `${funcName}(...)`,
            transformation: `${funcName}(${arg.column})`
          });
        }
        walkFunctionArgs(arg, sourceTables, targetTable, mappings, targetField, funcName);
      });
    }
  }

  // 处理二元表达式
  if (node.type === 'binary_expr' && node.operator) {
    const expr = formatExpression(node);
    extractFieldsFromExpr(node, sourceTables, targetTable, mappings, targetField || expr);
  }

  // 处理 CASE 表达式
  if (node.type === 'case') {
    extractFieldsFromExpr(node, sourceTables, targetTable, mappings, targetField || 'CASE_RESULT');
  }

  // 递归处理子属性
  if (node.expr) {
    extractFieldMapping(node.expr, sourceTables, targetTable, mappings, targetField);
  }
  if (node.value) {
    extractFieldMapping(node.value, sourceTables, targetTable, mappings, targetField);
  }
}

/**
 * 遍历函数参数
 */
function walkFunctionArgs(node, sourceTables, targetTable, mappings, targetField, funcName) {
  if (!node) return;

  if (node.type === 'column_ref') {
    const sourceTable = node.table || (sourceTables.length === 1 ? sourceTables[0] : null);
    mappings.push({
      sourceTable: sourceTable || 'unknown',
      sourceField: node.column,
      targetTable: targetTable || 'unknown',
      targetField: targetField || `${funcName}(...)`,
      transformation: `${funcName}(${node.column})`
    });
  }

  if (node.args && Array.isArray(node.args)) {
    node.args.forEach(arg => walkFunctionArgs(arg, sourceTables, targetTable, mappings, targetField, funcName));
  }
  if (node.expr) {
    walkFunctionArgs(node.expr, sourceTables, targetTable, mappings, targetField, funcName);
  }
}

/**
 * 从表达式中提取字段
 */
function extractFieldsFromExpr(node, sourceTables, targetTable, mappings, targetField) {
  function walk(n) {
    if (!n) return;
    if (n.type === 'column_ref') {
      const sourceTable = n.table || (sourceTables.length === 1 ? sourceTables[0] : null);
      mappings.push({
        sourceTable: sourceTable || 'unknown',
        sourceField: n.column,
        targetTable: targetTable || 'unknown',
        targetField: targetField,
        transformation: '表达式计算'
      });
    }
    if (n.left) walk(n.left);
    if (n.right) walk(n.right);
    if (n.args && Array.isArray(n.args)) {
      n.args.forEach(walk);
    }
    Object.values(n).forEach(v => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (typeof v === 'object' && v !== null) walk(v);
    });
  }
  walk(node);
}

/**
 * 格式化表达式为字符串
 */
function formatExpression(node) {
  if (!node) return '';
  if (node.type === 'column_ref') {
    return node.table ? `${node.table}.${node.column}` : node.column;
  }
  if (node.type === 'binary_expr') {
    return `(${formatExpression(node.left)} ${node.operator} ${formatExpression(node.right)})`;
  }
  if (node.type === 'function') {
    const name = node.name || 'FUNC';
    const args = node.args ? node.args.map(formatExpression).join(', ') : '';
    return `${name}(${args})`;
  }
  return node.value?.toString() || '';
}

export const sqlParser = {
  /**
   * 解析 SQL 血缘
   * @param {string} sql SQL 语句
   * @returns {Promise<{sourceTables: string[], targetTables: string[], mappings: Array}>}
   */
  async parse(sql) {
    try {
      // 解析 SQL
      const ast = parser.astify(sql, {
        database: 'PostgreSQL'
      });

      console.log('SQL AST:', JSON.stringify(ast, null, 2).substring(0, 2000));

      const sourceTables = [];
      const targetTables = [];
      const mappings = [];

      // 处理不同类型的 SQL 语句
      if (Array.isArray(ast)) {
        // 多条语句
        for (const stmt of ast) {
          const result = processStatement(stmt);
          sourceTables.push(...result.sourceTables);
          targetTables.push(...result.targetTables);
          mappings.push(...result.mappings);
        }
      } else {
        // 单条语句
        const result = processStatement(ast);
        sourceTables.push(...result.sourceTables);
        targetTables.push(...result.targetTables);
        mappings.push(...result.mappings);
      }

      // 去重
      const uniqueSourceTables = [...new Set(sourceTables)];
      const uniqueTargetTables = [...new Set(targetTables)];

      return {
        sourceTables: uniqueSourceTables,
        targetTables: uniqueTargetTables,
        mappings: deduplicateMappings(mappings)
      };
    } catch (err) {
      console.error('SQL 解析失败:', err.message);
      throw new Error(`SQL 解析失败：${err.message}`);
    }
  }
};

/**
 * 处理单条 SQL 语句
 */
function processStatement(ast) {
  const sourceTables = new Set();
  const targetTables = new Set();
  const mappings = [];

  const type = ast.type?.toUpperCase?.();

  // 提取目标表
  if (type === 'INSERT' && ast.into) {
    const targetTable = getFullTableName(ast.into);
    if (targetTable) targetTables.add(targetTable);
  } else if (type === 'CREATE' && ast.table) {
    const targetTable = getFullTableName(ast.table);
    if (targetTable) targetTables.add(targetTable);
  }

  // 提取源表
  const allTables = extractAllTables(ast);
  allTables.forEach(t => {
    if (!targetTables.has(t)) {
      sourceTables.add(t);
    }
  });

  // 提取字段映射
  const sourceTableArray = Array.from(sourceTables);
  const targetTableArray = Array.from(targetTables);

  if (targetTableArray.length > 0) {
    const fieldMappings = extractFieldMappings(ast, sourceTableArray, targetTableArray);
    mappings.push(...fieldMappings);
  }

  return {
    sourceTables: Array.from(sourceTables),
    targetTables: Array.from(targetTables),
    mappings
  };
}

/**
 * 提取 AST 中所有的表名
 */
function extractAllTables(ast) {
  const tables = new Set();

  function walk(node) {
    if (!node || typeof node !== 'object') return;

    // FROM 子句
    if (node.from) {
      extractTablesFromClause(node.from, tables);
    }

    // JOIN 子句
    if (node.join) {
      if (Array.isArray(node.join)) {
        node.join.forEach(j => {
          if (j.table) {
            const name = getFullTableName(j.table);
            if (name) tables.add(name);
          }
          walk(j);
        });
      }
    }

    // INTO 子句
    if (node.into && node.into.table) {
      const name = getFullTableName(node.into);
      if (name) tables.add(name);
    }

    // 子查询
    if (node.with && Array.isArray(node.with)) {
      node.with.forEach(cte => {
        if (cte.stmt) walk(cte.stmt);
      });
    }

    if (node.from && node.from.stmt) {
      walk(node.from.stmt);
    }

    // 递归
    Object.values(node).forEach(value => {
      if (Array.isArray(value)) {
        value.forEach(v => {
          if (typeof v === 'object' && v !== null) walk(v);
        });
      } else if (typeof value === 'object' && value !== null) {
        walk(value);
      }
    });
  }

  walk(ast);
  return Array.from(tables);
}

/**
 * 从 FROM 子句提取表名
 */
function extractTablesFromClause(fromClause, tables) {
  if (!fromClause) return;

  if (Array.isArray(fromClause)) {
    fromClause.forEach(fc => extractTablesFromClause(fc, tables));
    return;
  }

  if (fromClause.table) {
    const name = getFullTableName(fromClause);
    if (name) tables.add(name);
  }

  // 子查询
  if (fromClause.stmt) {
    const subTables = extractAllTables(fromClause.stmt);
    subTables.forEach(t => tables.add(t));
  }
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
