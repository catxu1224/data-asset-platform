import { useState, useRef, useEffect } from 'react'

export default function ERGraph({ tables }) {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [selected, setSelected] = useState(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null)
  const panRef = useRef(null)

  useEffect(() => {
    const positions = [
      { x: 40, y: 40 }, { x: 340, y: 50 }, { x: 180, y: 300 },
      { x: 480, y: 280 }, { x: 60, y: 340 },
    ]
    setNodes(tables.map((t, i) => ({
      ...t,
      x: positions[i]?.x ?? i * 260 + 40,
      y: positions[i]?.y ?? 40,
    })))
    const es = []
    tables.forEach(t =>
      t.fields.forEach(f => {
        if (f.fk && f.fkTable)
          es.push({ from: t.name, to: f.fkTable, label: `${f.name} → ${f.fkField}`, rel: 'N:1' })
      })
    )
    setEdges(es)
  }, [tables])

  const onNodeDown = (e, id) => {
    e.stopPropagation()
    setSelected(id)
    const n = nodes.find(x => x.id === id)
    dragRef.current = { id, ox: e.clientX - n.x, oy: e.clientY - n.y }
  }
  const onCanvasDown = (e) => {
    panRef.current = { ox: e.clientX - pan.x, oy: e.clientY - pan.y }
  }
  const onMove = (e) => {
    if (dragRef.current) {
      const { id, ox, oy } = dragRef.current
      setNodes(ns => ns.map(n => n.id === id ? { ...n, x: e.clientX - ox, y: e.clientY - oy } : n))
    } else if (panRef.current) {
      setPan({ x: e.clientX - panRef.current.ox, y: e.clientY - panRef.current.oy })
    }
  }
  const onUp = () => { dragRef.current = null; panRef.current = null }

  const center = (name) => {
    const n = nodes.find(x => x.name === name)
    return n ? { x: n.x + 94, y: n.y + 26 } : { x: 0, y: 0 }
  }

  return (
    <div
      className="graph-canvas"
      style={{ height: 440 }}
      onMouseDown={onCanvasDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
    >
      {/* SVG edges */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <marker id="er-arrow" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="#7F77DD"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        <g transform={`translate(${pan.x},${pan.y})`}>
          {edges.map((e, i) => {
            const f = center(e.from), t = center(e.to)
            const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2
            return (
              <g key={i}>
                <path
                  d={`M${f.x},${f.y} C${mx},${f.y} ${mx},${t.y} ${t.x},${t.y}`}
                  fill="none" stroke="#7F77DD" strokeWidth="1.5"
                  strokeDasharray="6 3" markerEnd="url(#er-arrow)" opacity="0.7"
                />
                <rect x={mx - 18} y={my - 10} width={36} height={18} rx="5"
                  fill="white" stroke="#AFA9EC" strokeWidth="0.5" />
                <text x={mx} y={my + 1} textAnchor="middle" dominantBaseline="central"
                  style={{ fontSize: 10, fill: '#534AB7', fontWeight: 600 }}>
                  {e.rel}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {/* Nodes */}
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${pan.x}px,${pan.y}px)` }}>
        {nodes.map(node => (
          <div
            key={node.id}
            className={`er-node${selected === node.id ? ' selected' : ''}`}
            style={{ left: node.x, top: node.y }}
            onMouseDown={e => onNodeDown(e, node.id)}
          >
            <div className="er-node-header">
              <span className="er-node-title">{node.name}</span>
              <span className="er-node-schema">{node.schema}</span>
            </div>
            {node.fields.map(f => (
              <div className="er-field" key={f.id}>
                <span style={{ width: 18, fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                  {f.pk ? <span style={{ color: '#BA7517' }}>PK</span>
                    : f.fk ? <span style={{ color: '#185FA5' }}>FK</span>
                      : null}
                </span>
                <span className="er-field-name">{f.name}</span>
                <span className="er-field-type">
                  {f.type}{f.len ? `(${f.len}${f.precision ? `,${f.precision}` : ''})` : ''}
                  {!f.nullable && <span style={{ color: '#E24B4A', marginLeft: 3 }}>NN</span>}
                </span>
              </div>
            ))}
            <div className="er-node-footer">{node.comment}</div>
          </div>
        ))}
      </div>

      <div className="graph-hint">拖拽节点移动位置 · 拖拽背景平移画布</div>
    </div>
  )
}
