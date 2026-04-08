import { useState, useRef } from 'react'

export default function LineageGraph({ nodes: initNodes, edges: initEdges }) {
  const [nodes, setNodes] = useState(initNodes)
  const [edges] = useState(initEdges)
  const [active, setActive] = useState(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const dragRef = useRef(null)
  const panRef = useRef(null)
  const containerRef = useRef(null)

  const onNodeDown = (e, id) => {
    e.stopPropagation()
    e.preventDefault()
    setActive(id)
    const n = nodes.find(x => x.id === id)
    dragRef.current = { id, ox: (e.clientX - pan.x) / zoom - n.x, oy: (e.clientY - pan.y) / zoom - n.y }
  }
  const onCanvasDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey) || e.button === 2) {
      e.preventDefault()
      panRef.current = { ox: e.clientX - pan.x, oy: e.clientY - pan.y }
    }
  }
  const onMove = (e) => {
    if (dragRef.current) {
      const { id, ox, oy } = dragRef.current
      setNodes(ns => ns.map(n => n.id === id ? { ...n, x: (e.clientX - pan.x) / zoom - ox, y: (e.clientY - pan.y) / zoom - oy } : n))
    } else if (panRef.current) {
      setPan({ x: e.clientX - panRef.current.ox, y: e.clientY - panRef.current.oy })
    }
  }
  const onUp = () => { dragRef.current = null; panRef.current = null }
  const onWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(0.5, Math.min(2, zoom + delta))
    setZoom(newZoom)
  }
  const onContextMenu = (e) => {
    e.preventDefault()
  }

  const getPos = (id) => {
    const n = nodes.find(x => x.id === id)
    if (!n) return { x: 0, y: 0 }
    // 节点中心位置（考虑缩放）
    return { x: n.x + 65, y: n.y + 30 }
  }

  return (
    <div
      ref={containerRef}
      className="graph-canvas"
      style={{ height: 500, overflow: 'hidden', cursor: 'grab', position: 'relative' }}
      onMouseDown={onCanvasDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onWheel={onWheel}
      onContextMenu={onContextMenu}
    >
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
        <defs>
          <marker id="ln-arrow" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="#1D9E75"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {edges.map((e, i) => {
            const f = getPos(e.from), t = getPos(e.to)
            const mx = (f.x + t.x) / 2
            return (
              <path key={i}
                d={`M${f.x},${f.y} C${mx},${f.y} ${mx},${t.y} ${t.x},${t.y}`}
                fill="none" stroke="#1D9E75" strokeWidth="1.8"
                markerEnd="url(#ln-arrow)" opacity="0.7"
              />
            )
          })}
        </g>
      </svg>

      <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
        {nodes.map(n => (
          <div
            key={n.id}
            className={`ln-node ${n.type}${active === n.id ? ' active' : ''}`}
            style={{ left: n.x, top: n.y }}
            onMouseDown={e => onNodeDown(e, n.id)}
          >
            {n.name}
            <div className="ln-node-sub">{n.label}</div>
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

      <div className="graph-hint">拖拽节点移动 · 右键/中键/Shift+ 左键平移 · 滚轮缩放</div>
    </div>
  )
}
