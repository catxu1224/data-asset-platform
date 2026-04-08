import { useState, useEffect } from 'react'

export default function NL2SQLPage() {
  const [schemas, setSchemas] = useState([])
  const [selectedTables, setSelectedTables] = useState([])
  const [naturalLanguage, setNaturalLanguage] = useState('')
  const [generatedSql, setGeneratedSql] = useState('')
  const [explanation, setExplanation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expandedSchemas, setExpandedSchemas] = useState(new Set())

  // 加载物理模型
  useEffect(() => {
    fetch('/api/tables')
      .then(res => res.json())
      .then(data => {
        // 按 schema 分组
        const schemaMap = new Map()
        data.forEach(table => {
          if (!schemaMap.has(table.schema_id)) {
            schemaMap.set(table.schema_id, {
              id: table.schema_id,
              name: table.schema_name,
              tables: []
            })
          }
          schemaMap.get(table.schema_id).tables.push(table)
        })
        setSchemas(Array.from(schemaMap.values()))
      })
      .catch(err => console.error('加载物理模型失败:', err))
  }, [])

  const toggleSchema = (schemaId) => {
    const newExpanded = new Set(expandedSchemas)
    if (newExpanded.has(schemaId)) {
      newExpanded.delete(schemaId)
    } else {
      newExpanded.add(schemaId)
    }
    setExpandedSchemas(newExpanded)
  }

  const toggleTable = (tableId) => {
    const newSelected = [...selectedTables]
    if (newSelected.includes(tableId)) {
      newSelected.splice(newSelected.indexOf(tableId), 1)
    } else {
      newSelected.push(tableId)
    }
    setSelectedTables(newSelected)
  }

  const handleGenerate = async () => {
    if (!naturalLanguage.trim()) {
      alert('请输入自然语言描述')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/ai/nl2sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naturalLanguage })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || '生成失败')
      }

      const result = await response.json()
      setGeneratedSql(result.sql)
      setExplanation(result.explanation)
    } catch (err) {
      alert(`生成失败：${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const copySql = () => {
    navigator.clipboard.writeText(generatedSql)
    alert('SQL 已复制到剪贴板')
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 140px)' }}>
      {/* 左侧：物理模型树 */}
      <div className="card" style={{ width: 300, flexShrink: 0, overflow: 'auto' }}>
        <div className="card-header">
          <span className="card-header-title">物理模型</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {schemas.map(schema => (
            <div key={schema.id}>
              <div
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background: '#f5f5f5',
                  borderBottom: '1px solid #eee',
                  fontWeight: 500
                }}
                onClick={() => toggleSchema(schema.id)}
              >
                {expandedSchemas.has(schema.id) ? '📂' : '📁'} {schema.name}
              </div>
              {expandedSchemas.has(schema.id) && (
                <div>
                  {schema.tables.map(table => (
                    <div
                      key={table.id}
                      style={{
                        padding: '6px 12px 6px 28px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee',
                        fontSize: 13,
                        background: selectedTables.includes(table.id) ? '#e8f4ff' : 'white'
                      }}
                      onClick={() => toggleTable(table.id)}
                    >
                      {selectedTables.includes(table.id) ? '☑️' : '⬜'} {table.name}
                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                        {table.comment || ''}
                      </div>
                      {table.fields && table.fields.length > 0 && (
                        <div style={{ marginTop: 4, fontSize: 11 }}>
                          {table.fields.slice(0, 3).map(f => (
                            <div key={f.id} style={{ color: '#888' }}>
                              • {f.name} ({f.type})
                            </div>
                          ))}
                          {table.fields.length > 3 && (
                            <div style={{ color: '#888' }}>
                              ... 还有 {table.fields.length - 3} 个字段
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 中间：自然语言输入 */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <span className="card-header-title">自然语言描述</span>
        </div>
        <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <textarea
            className="sql-editor"
            value={naturalLanguage}
            onChange={e => setNaturalLanguage(e.target.value)}
            placeholder="请输入您想要查询的内容，例如：&#10;查询所有客户及其账户余额，按余额降序排列"
            rows={6}
            style={{ flex: 1, resize: 'none' }}
          />
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={isLoading}
            >
              {isLoading ? '生成中...' : '✨ 生成 SQL'}
            </button>
            {selectedTables.length > 0 && (
              <span style={{ fontSize: 13, color: '#666', alignSelf: 'center' }}>
                已选择 {selectedTables.length} 张表
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 右侧：生成的 SQL */}
      <div className="card" style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="card-header">
          <span className="card-header-title">生成的 SQL</span>
          {generatedSql && (
            <button className="btn btn-sm" onClick={copySql}>复制</button>
          )}
        </div>
        <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, background: '#1e1e1e', borderRadius: 4, padding: 12, overflow: 'auto' }}>
            {generatedSql ? (
              <pre style={{ margin: 0, color: '#d4d4d4', fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {generatedSql}
              </pre>
            ) : (
              <span style={{ color: '#666' }}>暂无生成的 SQL</span>
            )}
          </div>
          {explanation && (
            <div style={{ marginTop: 12, padding: 12, background: '#f0f9ff', borderRadius: 4, fontSize: 13 }}>
              <strong>说明：</strong>
              {explanation}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
