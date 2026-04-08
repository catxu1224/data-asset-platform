import { useState, useRef, useEffect } from 'react'
import LineageGraph from '../components/LineageGraph'
import FieldLineageGraph from '../components/FieldLineageGraph'
import { Tabs } from '../components/UI'

const DEFAULT_SQL = `-- 示例：多层 ETL 血缘 SQL
INSERT INTO DM.DM_CUSTOMER_ACCT
SELECT
  c.CUST_ID,
  c.CUST_NAME,
  c.CUST_NAT,
  a.ACCT_ID,
  a.ACCT_BAL,
  a.ACCT_CCY
FROM DW.CUSTOMER c
JOIN DW.ACCOUNT a ON c.CUST_ID = a.CUST_ID;`

const MAPPING = [
  { src: 'DW.CUSTOMER', srcField: 'CUST_ID',   transform: '直接映射', tgt: 'DM.DM_CUSTOMER_ACCT', tgtField: 'CUST_ID' },
  { src: 'DW.CUSTOMER', srcField: 'CUST_NAME', transform: '直接映射', tgt: 'DM.DM_CUSTOMER_ACCT', tgtField: 'CUST_NAME' },
  { src: 'DW.CUSTOMER', srcField: 'CUST_NAT',  transform: '直接映射', tgt: 'DM.DM_CUSTOMER_ACCT', tgtField: 'CUST_NAT' },
  { src: 'DW.ACCOUNT',  srcField: 'ACCT_ID',   transform: '直接映射', tgt: 'DM.DM_CUSTOMER_ACCT', tgtField: 'ACCT_ID' },
  { src: 'DW.ACCOUNT',  srcField: 'ACCT_BAL',  transform: '直接映射', tgt: 'DM.DM_CUSTOMER_ACCT', tgtField: 'ACCT_BAL' },
  { src: 'DW.ACCOUNT',  srcField: 'ACCT_CCY',  transform: '直接映射', tgt: 'DM.DM_CUSTOMER_ACCT', tgtField: 'ACCT_CCY' },
]

const LINEAGE_NODES = [
  { id: 1, name: 'DW.CUSTOMER',        label: 'DW 层', type: 'source',    x: 30,  y: 60 },
  { id: 2, name: 'DW.ACCOUNT',         label: 'DW 层', type: 'source',    x: 30,  y: 190 },
  { id: 3, name: 'JOIN',               label: '关联操作', type: 'transform', x: 240, y: 125 },
  { id: 4, name: 'DM_CUSTOMER_ACCT',   label: 'DM 层', type: 'target',    x: 450, y: 125 },
]
const LINEAGE_EDGES = [{ from: 1, to: 3 }, { from: 2, to: 3 }, { from: 3, to: 4 }]

export default function LineagePage() {
  const [sql, setSql] = useState(DEFAULT_SQL)
  const [dialect, setDialect] = useState('自动检测')
  const [parsed, setParsed] = useState(false)
  const [tab, setTab] = useState('mapping')
  const [isAiParsing, setIsAiParsing] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [useAiResult, setUseAiResult] = useState(false)
  const fileRef = useRef(null)

  // 保存功能相关状态
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveCategoryId, setSaveCategoryId] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [categories, setCategories] = useState([])
  const [savedRecords, setSavedRecords] = useState([])
  const [showSavedList, setShowSavedList] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)

  // 加载分类列表
  useEffect(() => {
    loadCategories()
    loadSavedRecords()
  }, [])

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/lineage/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (err) {
      console.error('加载分类失败:', err)
    }
  }

  const loadSavedRecords = async (categoryId = null) => {
    setIsLoadingRecords(true)
    try {
      const url = categoryId
        ? `/api/lineage/records?category_id=${categoryId}`
        : '/api/lineage/records'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setSavedRecords(data)
      }
    } catch (err) {
      console.error('加载保存记录失败:', err)
    } finally {
      setIsLoadingRecords(false)
    }
  }

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => setSql(ev.target.result)
    reader.readAsText(f)
    e.target.value = ''
  }

  const downloadJSON = () => {
    const data = aiResult ? aiResult.mappings : MAPPING
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'lineage_mapping.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const downloadCSV = () => {
    const data = aiResult ? aiResult.mappings : MAPPING
    const header = '源表，源字段，转换逻辑，目标表，目标字段\n'
    const rows = data.map(r => {
      const src = r.src || r.sourceTable
      const srcField = r.srcField || r.sourceField
      const transform = r.transform || r.transformation
      const tgt = r.tgt || r.targetTable
      const tgtField = r.tgtField || r.targetField
      return `${src},${srcField},${transform},${tgt},${tgtField}`
    }).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'lineage_mapping.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleParse = async () => {
    // 传统解析：只使用本地 SQL 解析器，不调用 AI
    console.log('=== 传统解析 ===')
    console.log('SQL:', sql.substring(0, 100) + '...')
    console.log('Dialect:', dialect)
    setIsAiParsing(true)
    try {
      const response = await fetch('/api/ai/parse-lineage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, dialect, useAI: false })
      })
      console.log('Response status:', response.status)

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(err.error || '解析失败')
      }

      const result = await response.json()
      console.log('传统解析结果:', result)

      // 检查是否解析出结果
      if ((!result.mappings || result.mappings.length === 0) &&
          (!result.sourceTables || result.sourceTables.length === 0)) {
        // 解析不出结果，提示用户使用 AI 增强解析
        const useAI = window.confirm('传统解析未解析出任何血缘关系，是否使用 AI 增强解析？')
        if (useAI) {
          await handleAiParseInternal()
        }
        return
      }

      // 转换为前端格式
      const mappings = Array.isArray(result.mappings) ? result.mappings.map(m => ({
        src: m.sourceTable,
        srcField: m.sourceField,
        transform: m.transformation,
        tgt: m.targetTable,
        tgtField: m.targetField
      })) : []

      // 构建节点和边
      const nodeMap = new Map()
      const nodes = []
      const edges = []
      let nodeIndex = 1

      // 添加源表节点
      if (Array.isArray(result.sourceTables)) {
        result.sourceTables.forEach(tableName => {
          if (tableName && !nodeMap.has(tableName)) {
            nodeMap.set(tableName, { id: nodeIndex, name: tableName, label: '源表', type: 'source', x: 30, y: 60 + nodes.length * 60 })
            nodes.push(nodeMap.get(tableName))
            nodeIndex++
          }
        })
      }

      // 添加目标表节点
      if (Array.isArray(result.targetTables)) {
        result.targetTables.forEach(tableName => {
          if (tableName && !nodeMap.has(tableName)) {
            nodeMap.set(tableName, { id: nodeIndex, name: tableName, label: '目标表', type: 'target', x: 450, y: 60 + nodes.length * 30 })
            nodes.push(nodeMap.get(tableName))
            nodeIndex++
          }
        })
      }

      // 添加字段映射边
      if (Array.isArray(mappings)) {
        mappings.forEach(m => {
          const srcNode = nodeMap.get(m.src)
          const tgtNode = nodeMap.get(m.tgt)
          if (srcNode && tgtNode) {
            edges.push({ from: srcNode.id, to: tgtNode.id })
          }
        })
      }

      setAiResult({ mappings, nodes, edges })
      setParsed(true)
      setUseAiResult(false) // 传统解析
    } catch (err) {
      console.error('解析错误:', err)
      const useAI = window.confirm(`传统解析失败：${err.message}\n是否使用 AI 增强解析？`)
      if (useAI) {
        await handleAiParseInternal()
      }
    } finally {
      setIsAiParsing(false)
    }
  }

  // AI 增强解析内部函数
  const handleAiParseInternal = async () => {
    setIsAiParsing(true)
    try {
      const response = await fetch('/api/ai/parse-lineage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, dialect, useAI: true })
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(err.error || 'AI 解析失败')
      }

      const result = await response.json()
      console.log('AI 解析结果:', result)

      const mappings = Array.isArray(result.mappings) ? result.mappings.map(m => ({
        src: m.sourceTable,
        srcField: m.sourceField,
        transform: m.transformation,
        tgt: m.targetTable,
        tgtField: m.targetField
      })) : []

      const nodeMap = new Map()
      const nodes = []
      const edges = []
      let nodeIndex = 1

      if (Array.isArray(result.sourceTables)) {
        result.sourceTables.forEach(tableName => {
          if (tableName && !nodeMap.has(tableName)) {
            nodeMap.set(tableName, { id: nodeIndex, name: tableName, label: '源表', type: 'source', x: 30, y: 60 + nodes.length * 60 })
            nodes.push(nodeMap.get(tableName))
            nodeIndex++
          }
        })
      }

      if (Array.isArray(result.targetTables)) {
        result.targetTables.forEach(tableName => {
          if (tableName && !nodeMap.has(tableName)) {
            nodeMap.set(tableName, { id: nodeIndex, name: tableName, label: '目标表', type: 'target', x: 450, y: 60 + nodes.length * 30 })
            nodes.push(nodeMap.get(tableName))
            nodeIndex++
          }
        })
      }

      if (Array.isArray(mappings)) {
        mappings.forEach(m => {
          const srcNode = nodeMap.get(m.src)
          const tgtNode = nodeMap.get(m.tgt)
          if (srcNode && tgtNode) {
            edges.push({ from: srcNode.id, to: tgtNode.id })
          }
        })
      }

      if (nodes.length === 0 && mappings.length === 0) {
        throw new Error('AI 未解析出任何血缘关系，请检查 SQL 语句')
      }

      setAiResult({ mappings, nodes, edges })
      setParsed(true)
      setUseAiResult(true)
    } catch (err) {
      console.error('AI 解析错误:', err)
      alert(`AI 解析失败：${err.message}`)
    } finally {
      setIsAiParsing(false)
    }
  }

  const handleAiParse = handleAiParseInternal

  // 保存血缘记录
  const handleSaveLineage = async () => {
    if (!saveName.trim()) {
      alert('请输入血缘记录名称')
      return
    }

    const displayData = aiResult ? aiResult : { mappings: MAPPING, nodes: LINEAGE_NODES, edges: LINEAGE_EDGES }

    try {
      const response = await fetch('/api/lineage/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName,
          category_id: saveCategoryId ? parseInt(saveCategoryId) : null,
          sql_text: sql,
          dialect: dialect,
          source_tables: useAiResult && aiResult ? aiResult.mappings.map(m => m.src) : [],
          target_tables: useAiResult && aiResult ? aiResult.mappings.map(m => m.tgt) : [],
          mappings: displayData.mappings,
          nodes: displayData.nodes,
          edges: displayData.edges,
          description: saveDescription
        })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || '保存失败')
      }

      alert('血缘记录保存成功！')
      setShowSaveModal(false)
      setSaveName('')
      setSaveCategoryId('')
      setSaveDescription('')
      loadSavedRecords()
    } catch (err) {
      console.error('保存失败:', err)
      alert(`保存失败：${err.message}`)
    }
  }

  // 删除保存的记录
  const handleDeleteRecord = async (id) => {
    if (!window.confirm('确定要删除这条血缘记录吗？')) return

    try {
      const response = await fetch(`/api/lineage/records/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('删除失败')
      }

      loadSavedRecords(selectedCategory || null)
    } catch (err) {
      console.error('删除失败:', err)
      alert(`删除失败：${err.message}`)
    }
  }

  // 加载保存的血缘记录到编辑区
  const handleLoadRecord = async (record) => {
    setSql(record.sql_text)
    setDialect(record.dialect || '自动检测')
    setParsed(true)
    setUseAiResult(false)

    // 解析保存的 mappings
    const mappings = record.mappings ? record.mappings.map(m => ({
      src: m.sourceTable || m.src,
      srcField: m.sourceField || m.srcField,
      transform: m.transformation || m.transform,
      tgt: m.targetTable || m.tgt,
      tgtField: m.targetField || m.tgtField
    })) : []

    // 构建节点和边
    const nodeMap = new Map()
    const nodes = []
    const edges = []
    let nodeIndex = 1

    const uniqueSources = [...new Set(mappings.map(m => m.src))]
    const uniqueTargets = [...new Set(mappings.map(m => m.tgt))]

    uniqueSources.forEach(tableName => {
      if (tableName && !nodeMap.has(tableName)) {
        nodeMap.set(tableName, { id: nodeIndex, name: tableName, label: '源表', type: 'source', x: 30, y: 60 + nodes.length * 60 })
        nodes.push(nodeMap.get(tableName))
        nodeIndex++
      }
    })

    uniqueTargets.forEach(tableName => {
      if (tableName && !nodeMap.has(tableName)) {
        nodeMap.set(tableName, { id: nodeIndex, name: tableName, label: '目标表', type: 'target', x: 450, y: 60 + nodes.length * 30 })
        nodes.push(nodeMap.get(tableName))
        nodeIndex++
      }
    })

    mappings.forEach(m => {
      const srcNode = nodeMap.get(m.src)
      const tgtNode = nodeMap.get(m.tgt)
      if (srcNode && tgtNode) {
        edges.push({ from: srcNode.id, to: tgtNode.id })
      }
    })

    setAiResult({ mappings, nodes, edges })
    setShowSavedList(false)
    setTab('mapping')
  }

  const displayData = aiResult ? aiResult : { mappings: MAPPING, nodes: LINEAGE_NODES, edges: LINEAGE_EDGES }
  const [lineageTab, setLineageTab] = useState('table') // 'table' or 'field'

  return (
    <div>
      {/* SQL Input */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <span className="card-header-title">SQL 输入</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <input ref={fileRef} type="file" accept=".sql,.hql,.txt" style={{ display: 'none' }} onChange={handleFile} />
            <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
              上传 .sql 文件
            </button>
            <select className="form-input" style={{ padding: '4px 8px', fontSize: 11, height: 30, width: 'auto' }}
              value={dialect} onChange={e => setDialect(e.target.value)}>
              {['自动检测', 'Hive / SparkSQL', 'PostgreSQL', 'T-SQL', 'MySQL'].map(d => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <button className="btn btn-sm btn-primary" onClick={handleParse}>
              传统解析
            </button>
            <button className="btn btn-sm" style={{ background: '#9333EA', color: 'white' }} onClick={handleAiParse} disabled={isAiParsing}>
              {isAiParsing ? 'AI 解析中...' : '✨ AI 增强解析'}
            </button>
            {parsed && (
              <>
                <button className="btn btn-sm" style={{ background: '#10B981', color: 'white' }} onClick={() => setShowSaveModal(true)}>
                  💾 保存血缘
                </button>
                <button className="btn btn-sm" onClick={() => { setShowSavedList(!showSavedList); loadSavedRecords(selectedCategory || null); }}>
                  📋 已保存
                  {savedRecords.length > 0 && (
                    <span style={{ marginLeft: 4, background: '#6B7280', color: 'white', borderRadius: 10, padding: '2px 6px', fontSize: 10 }}>
                      {savedRecords.length}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="card-body">
          <textarea
            className="sql-editor"
            value={sql}
            onChange={e => setSql(e.target.value)}
            rows={8}
            spellCheck={false}
          />
        </div>
      </div>

      {/* 已保存血缘列表 */}
      {showSavedList && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header">
            <span className="card-header-title">已保存的血缘记录</span>
            <button className="btn btn-sm" onClick={() => setShowSavedList(false)}>✕ 关闭</button>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
              <label style={{ fontSize: 13 }}>分类筛选：</label>
              <select
                className="form-input"
                style={{ padding: '4px 8px', fontSize: 12, height: 32, width: 'auto' }}
                value={selectedCategory}
                onChange={e => {
                  setSelectedCategory(e.target.value)
                  loadSavedRecords(e.target.value || null)
                }}
              >
                <option value="">全部分类</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {isLoadingRecords && <span style={{ fontSize: 12, color: '#666' }}>加载中...</span>}
            </div>
            {savedRecords.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
                暂无保存的血缘记录
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th>分类</th>
                      <th>SQL</th>
                      <th>源表</th>
                      <th>目标表</th>
                      <th>保存时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedRecords.map(record => (
                      <tr key={record.id}>
                        <td style={{ fontWeight: 600 }}>{record.name}</td>
                        <td>
                          {record.category_name ? (
                            <span className="badge badge-purple">{record.category_name}</span>
                          ) : (
                            <span style={{ color: '#999' }}>未分类</span>
                          )}
                        </td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={record.sql_text}>
                          <code style={{ fontSize: 11 }}>{record.sql_text?.substring(0, 50) || ''}...</code>
                        </td>
                        <td>
                          {record.source_tables && record.source_tables.length > 0 ? (
                            <span style={{ fontSize: 11, color: '#666' }}>{record.source_tables.length} 个源表</span>
                          ) : '-'}
                        </td>
                        <td>
                          {record.target_tables && record.target_tables.length > 0 ? (
                            <span style={{ fontSize: 11, color: '#666' }}>{record.target_tables.length} 个目标表</span>
                          ) : '-'}
                        </td>
                        <td style={{ fontSize: 12, color: '#666' }}>
                          {new Date(record.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td>
                          <button className="btn btn-sm" style={{ marginRight: 4 }} onClick={() => handleLoadRecord(record)}>加载</button>
                          <button className="btn btn-sm" style={{ background: '#EF4444', color: 'white' }} onClick={() => handleDeleteRecord(record.id)}>删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 保存对话框 */}
      {showSaveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: 450, margin: 0 }}>
            <div className="card-header">
              <span className="card-header-title">💾 保存血缘记录</span>
              <button className="btn btn-sm" onClick={() => setShowSaveModal(false)}>✕</button>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>名称 *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="输入血缘记录名称"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 14 }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>分类</label>
                <select
                  className="form-input"
                  value={saveCategoryId}
                  onChange={e => setSaveCategoryId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 14 }}
                >
                  <option value="">未分类</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>描述</label>
                <textarea
                  className="form-input"
                  placeholder="可选描述信息"
                  value={saveDescription}
                  onChange={e => setSaveDescription(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 14, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setShowSaveModal(false)}>取消</button>
                <button className="btn btn-primary" onClick={handleSaveLineage}>保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {parsed && (
        <div className="card">
          <div className="card-header">
            <span className="card-header-title">解析结果 {useAiResult && <span style={{ fontSize: 12, color: '#9333EA' }}>(AI 增强)</span>}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {useAiResult && (
                <button className="btn btn-sm" onClick={() => { setUseAiResult(false); setAiResult(null) }}>
                  使用传统解析
                </button>
              )}
              <button className="btn btn-sm" onClick={downloadCSV}>导出 CSV</button>
              <button className="btn btn-sm" onClick={downloadJSON}>导出 JSON</button>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <Tabs
              tabs={[['mapping', 'Mapping 文档'], ['graph', '血缘图谱']]}
              active={tab} onChange={setTab}
            />
            {tab === 'mapping' && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>源表</th><th>源字段</th><th>转换逻辑</th><th>目标表</th><th>目标字段</th></tr>
                  </thead>
                  <tbody>
                    {displayData.mappings.map((r, i) => (
                      <tr key={i}>
                        <td><span className="badge badge-purple">{r.src}</span></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{r.srcField}</td>
                        <td><span className="badge badge-gray" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={r.transform}>{r.transform}</span></td>
                        <td><span className="badge badge-teal">{r.tgt}</span></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{r.tgtField}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {tab === 'graph' && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    className={`btn btn-sm ${lineageTab === 'table' ? 'btn-primary' : ''}`}
                    onClick={() => setLineageTab('table')}
                  >
                    表级血缘
                  </button>
                  <button
                    className={`btn btn-sm ${lineageTab === 'field' ? 'btn-primary' : ''}`}
                    onClick={() => setLineageTab('field')}
                  >
                    字段级血缘
                  </button>
                </div>
                {lineageTab === 'table' ? (
                  <LineageGraph nodes={displayData.nodes} edges={displayData.edges} />
                ) : (
                  <FieldLineageGraph mappings={displayData.mappings} />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
