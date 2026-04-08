import { useEffect } from 'react'

export function Toast({ msg }) {
  if (!msg) return null
  return <div className="toast">{msg}</div>
}

export function useToast(setToast) {
  return (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }
}

export function Modal({ title, onClose, onSave, children, saveLabel = '保存' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          {onSave && <button className="btn btn-primary" onClick={onSave}>{saveLabel}</button>}
        </div>
      </div>
    </div>
  )
}

export function SearchBar({ placeholder, value, onChange }) {
  return (
    <div className="search-bar">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      </svg>
      <input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(([key, label]) => (
        <div key={key} className={`tab${active === key ? ' active' : ''}`} onClick={() => onChange(key)}>
          {label}
        </div>
      ))}
    </div>
  )
}

export function Badge({ variant = 'gray', children, style }) {
  return <span className={`badge badge-${variant}`} style={style}>{children}</span>
}
