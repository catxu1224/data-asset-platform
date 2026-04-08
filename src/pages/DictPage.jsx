import { useState, useEffect } from 'react'
import { dictAPI } from '../api/index.js'
import { Modal, Toast, useToast, SearchBar } from '../components/UI'
import { CONFIG } from '../config.js'
import { initDict as localData } from '../data/initialData.js'

const TYPES = ['字段', '指标', '维度', '概念']
const typeVariant = { 字段: 'teal', 指标: 'amber', 维度: 'blue', 概念: 'gray' }

export default function DictPage() {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('全部')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const showToast = useToast(setToast)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      if (CONFIG.USE_API) {
        const data = await dictAPI.getDicts()
        // 转换字段名：term_type -> type, physical_ref -> physicalRef 等
        const transformed = data.map(item => ({
          ...item,
          type: item.term_type,
          physicalRef: item.physical_ref,
          termRef: item.term_ref,
          stdRef: item.std_ref
        }))
        setItems(transformed)
      } else {
        setItems(localData)
      }
    } catch (err) {
      showToast('加载失败：' + err.message)
      setItems(localData)
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    if (!form.term) return
    try {
      if (CONFIG.USE_API && form.id) {
        await dictAPI.updateDict(form.id, form)
        showToast('保存成功')
      } else if (CONFIG.USE_API) {
        await dictAPI.createDict(form)
        showToast('保存成功')
      } else {
        if (form.id) setItems(items.map(i => i.id === form.id ? form : i))
        else setItems([...items, { ...form, id: Date.now() }])
      }
      setModal(null)
      loadItems()
    } catch (err) {
      showToast('保存失败：' + err.message)
    }
  }

  const del = async (id) => {
    try {
      if (CONFIG.USE_API) {
        await dictAPI.deleteDict(id)
      } else {
        setItems(items.filter(i => i.id !== id))
      }
      showToast('已删除')
      loadItems()
    } catch (err) {
      showToast('删除失败：' + err.message)
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchBar placeholder="搜索词条名、定义..." value={search} onChange={setSearch} />
        <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
          {['全部', ...TYPES].map(c => (
            <span key={c} className={`chip${filterType === c ? ' active' : ''}`}
              onClick={() => setFilterType(c)}>{c}</span>
          ))}
        </div>
        <button className="btn btn-primary"
          onClick={() => { setForm({ type: '字段' }); setModal('edit') }}>
          + 新增词条
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>词条名</th><th>类型</th><th>业务定义</th><th>所属领域</th>
                <th>关联物理字段</th><th>关联业务术语</th><th>关联数据标准</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.filter(i => {
                const matchSearch = !search || i.term.includes(search) || i.definition?.includes(search)
                const matchType = filterType === '全部' || i.term_type === filterType || i.type === filterType
                return matchSearch && matchType
              }).map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.term}</td>
                  <td><span className={`badge badge-${typeVariant[item.term_type || item.type] || 'gray'}`}>{item.term_type || item.type}</span></td>
                  <td style={{ maxWidth: 220, color: 'var(--txt2)', fontSize: 11 }}>{item.definition}</td>
                  <td><span className="badge badge-gray">{item.domain}</span></td>
                  <td>{item.physical_ref || item.physicalRef ? <span className="badge badge-purple">{item.physical_ref || item.physicalRef}</span> : '—'}</td>
                  <td>{item.term_ref || item.termRef    ? <span className="badge badge-coral">{item.term_ref || item.termRef}</span>    : '—'}</td>
                  <td>{item.std_ref || item.stdRef     ? <span className="badge badge-amber">{item.std_ref || item.stdRef}</span>     : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm" onClick={() => { setForm({ ...item, type: item.term_type || item.type }); setModal('edit') }}>编辑</button>
                      <button className="btn btn-sm" onClick={() => del(item.id)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--txt3)', padding: 24 }}>暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'edit' && (
        <Modal title={form.id ? '编辑词条' : '新增词条'} onClose={() => setModal(null)} onSave={save}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">词条名 *</label>
              <input className="form-input" value={form.term || ''}
                onChange={e => setForm({ ...form, term: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">类型</label>
              <select className="form-input" value={form.type || '字段'}
                onChange={e => setForm({ ...form, type: e.target.value })}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">业务定义 *</label>
              <textarea className="form-input" value={form.definition || ''}
                onChange={e => setForm({ ...form, definition: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">所属领域</label>
              <input className="form-input" value={form.domain || ''}
                onChange={e => setForm({ ...form, domain: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">关联物理字段</label>
              <input className="form-input" value={form.physicalRef || ''} placeholder="如 CUST_NAT"
                onChange={e => setForm({ ...form, physicalRef: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">关联业务术语</label>
              <input className="form-input" value={form.termRef || ''} placeholder="如 国家或地区"
                onChange={e => setForm({ ...form, termRef: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">关联数据标准</label>
              <input className="form-input" value={form.stdRef || ''} placeholder="如 COUNTRY_CODE"
                onChange={e => setForm({ ...form, stdRef: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}
      <Toast msg={toast} />
    </div>
  )
}
