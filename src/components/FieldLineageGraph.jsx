import { useState, useRef, useEffect } from 'react'

export default function FieldLineageGraph({ mappings }) {
  const [tables, setTables] = useState([])
  const [edges, setEdges] = useState([])
  const [selected, setSelected] = useState(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const dragRef = useRef(null)
  const panRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    // 按表归集字段
    const tableMap = new Map()
    const es = []
    let tableIndex = 1

    // 提取所有源表和目标表
    mappings.forEach((m, idx) => {
      // 处理源表
      if (!tableMap.has(m.src)) {
        const srcTables = Array.from(tableMap.values()).filter(t => t.type === 'source')
        tableMap.set(m.src, {
          id: tableIndex++,
          name: m.src,
          fields: [],
          x: 40,
          y: 40 + srcTables.length * 150,
          type: 'source'
        })
      }
      const srcTable = tableMap.get(m.src)
      if (!srcTable.fields.find(f => f.name === m.srcField)) {
        srcTable.fields.push({ name: m.srcField, id: `src-${m.srcField}-${idx}` })
      }

      // 处理目标表
      if (!tableMap.has(m.tgt)) {
        const tgtTables = Array.from(tableMap.values()).filter(t => t.type === 'target')
        tableMap.set(m.tgt, {
          id: tableIndex++,
          name: m.tgt,
          fields: [],
          x: 500,
          y: 40 + tgtTables.length * 150,
          type: 'target'
        })
      }
      const tgtTable = tableMap.get(m.tgt)
      if (!tgtTable.fields.find(f => f.name === m.tgtField)) {
        tgtTable.fields.push({ name: m.tgtField, id: `tgt-${m.tgtField}-${idx}` })
      }

      // 创建边（字段级）
      es.push({
        fromTable: m.src,
        fromField: m.srcField,
        toTable: m.tgt,
        toField: m.tgtField,
        transformation: m.transform,
        idx
      })
    })

    setTables(Array.from(tableMap.values()))
    setEdges(es)
  }, [mappings])

  const onNodeDown = (e, tableName) => {
    e.stopPropagation()
    e.preventDefault()
    setSelected(tableName)
    const t = tables.find(x => x.name === tableName)
    dragRef.current = { name: tableName, ox: (e.clientX - pan.x) / zoom - t.x, oy: (e.clientY - pan.y) / zoom - t.y }
  }

  const onCanvasDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey) || e.button === 2) {
      e.preventDefault()
      panRef.current = { ox: e.clientX - pan.x, oy: e.clientY - pan.y }
    }
  }

  const onMove = (e) => {
    if (dragRef.current) {
      const { name, ox, oy } = dragRef.current
      setTables(ts => ts.map(t => t.name === name ? { ...t, x: (e.clientX - pan.x) / zoom - ox, y: (e.clientY - pan.y) / zoom - oy } : t))
    } else if (panRef.current) {
      setPan({ x: e.clientX - panRef.current.ox, y: e.clientY - panRef.current.oy })
    }
  }

  const onUp = () => {
    dragRef.current = null
    panRef.current = null
  }

  const onWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(0.5, Math.min(2, zoom + delta))
    setZoom(newZoom)
  }

  const onContextMenu = (e) => {
    e.preventDefault()
  }

  // 获取字段在表中的位置
  const getFieldPos = (tableName, fieldName, isSource = true) => {
    const table = tables.find(t => t.name === tableName)
    if (!table) return { x: 0, y: 0 }

    const fieldIndex = table.fields.findIndex(f => f.name === fieldName)
    const headerHeight = 32
    const fieldHeight = 24
    const baseY = table.y + headerHeight + fieldIndex * fieldHeight + fieldHeight / 2

    return {
      x: isSource ? table.x + 280 : table.x,
      y: baseY
    }
  }

  // 计算画布总高度，支持滚动
  const contentHeight = tables.length > 0
    ? Math.max(...tables.filter(t => t.type === 'target').map(t => t.y + 80 + t.fields.length * 24))
    : 600

  return (
    <div
      ref={containerRef}
      className="graph-canvas"
      style={{ minHeight: 600, maxHeight: 800, overflowY: 'auto', overflowX: 'hidden', cursor: 'grab', position: 'relative' }}
      onMouseDown={onCanvasDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onWheel={(e) => {
        // 按住 Ctrl 键时缩放，否则允许垂直滚动
        if (e.ctrlKey) {
          e.preventDefault()
          const delta = e.deltaY > 0 ? -0.1 : 0.1
          const newZoom = Math.max(0.5, Math.min(2, zoom + delta))
          setZoom(newZoom)
        }
      }}
      onContextMenu={onContextMenu}
    >
      {/* SVG edges - 固定在视口内 */}
      <svg style={{ position: 'sticky', top: 0, left: 0, width: '100%', minHeight: contentHeight, pointerEvents: 'none' }}>
        <defs>
          <marker id="field-arrow" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="#378ADD"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {edges.map((e, i) => {
            const f = getFieldPos(e.fromTable, e.fromField, true)
            const t = getFieldPos(e.toTable, e.toField, false)

            // 使用更直接的连线
            const midX = (f.x + t.x) / 2
            return (
              <g key={i}>
                <path
                  d={`M${f.x},${f.y} C${midX},${f.y} ${midX},${t.y} ${t.x},${t.y}`}
                  fill="none" stroke="#378ADD" strokeWidth="1.5"
                  strokeDasharray="5 3" markerEnd="url(#field-arrow)" opacity="0.8"
                />
                {e.transformation && e.transformation !== '直接映射' && (
                  <g>
                    <rect x={midX - 50} y={(f.y + t.y) / 2 - 10} width={100} height={18} rx="3"
                      fill="white" stroke="#A5D0E8" strokeWidth="0.5" />
                    <text x={midX} y={(f.y + t.y) / 2 + 1} textAnchor="middle" dominantBaseline="central"
                      style={{ fontSize: 8, fill: '#2980B9', fontWeight: 500 }}
                      textLength="95" lengthAdjust="spacingAndGlyphs">
                      {e.transformation.length > 25 ? e.transformation.substring(0, 22) + '...' : e.transformation}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Nodes - 按表归集，可滚动 */}
      <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', minWidth: 600, paddingBottom: 40 }}>
        {tables.map(table => (
          <div
            key={table.id}
            className={`er-node${selected === table.name ? ' selected' : ''}`}
            style={{ left: table.x, top: table.y, width: 280 }}
            onMouseDown={e => onNodeDown(e, table.name)}
          >
            <div className="er-node-header">
              <span className="er-node-title">{table.name}</span>
              <span className={`er-node-schema ${table.type === 'source' ? 'badge-purple' : 'badge-teal'}`}>
                {table.type === 'source' ? '源表' : '目标表'}
              </span>
            </div>
            {table.fields.map((f, idx) => (
              <div className="er-field" key={f.id} style={{ borderBottom: idx < table.fields.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                <span style={{ width: 18, fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                  {table.type === 'source' ? (
                    <span style={{ color: '#185FA5', fontSize: 8 }}>SRC</span>
                  ) : (
                    <span style={{ color: '#1D9E75', fontSize: 8 }}>TGT</span>
                  )}
                </span>
                <span className="er-field-name" style={{ fontSize: 12 }}>{f.name}</span>
              </div>
            ))}
            <div className="er-node-footer" style={{ fontSize: 11, color: '#888', borderTop: '1px solid #e0e0e0' }}>
              {table.fields.length} 个字段
            </div>
          </div>
        ))}
      </div>

      {/* 缩放控制 */}
      <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', gap: 4, background: 'white', padding: 4, borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.2)', zIndex: 100 }}>
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} style={{ padding: '4px 8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14 }}>-</button>
        <span style={{ padding: '4px 8px', fontSize: 12, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} style={{ padding: '4px 8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14 }}>+</button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} style={{ padding: '4px 8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', marginLeft: 4, fontSize: 12 }}>重置</button>
      </div>

      <div className="graph-hint">拖拽节点移动位置 · 右键/中键/Shift+ 左键拖拽平移 · Ctrl+ 滚轮缩放 · 滚轮上下滚动</div>
    </div>
  )
}
