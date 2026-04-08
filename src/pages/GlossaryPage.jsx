import { useState, useEffect } from 'react'
import { glossaryAPI } from '../api/index.js'
import { CONFIG } from '../config.js'
import { initGlossary as localData } from '../data/initialData.js'
import { Modal, Toast, useToast, SearchBar } from '../components/UI'

export default function GlossaryPage() {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('全部')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const showToast = useToast(setToast)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      if (CONFIG.USE_API) {
        const data = await glossaryAPI.getGlossaries()
        // 转换字段名：dict_ref -> dictRef, std_ref -> stdRef
        const transformed = data.map(item => ({
          ...item,
          dictRef: item.dict_ref,
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
        await glossaryAPI.updateGlossary(form.id, form)
      } else if (CONFIG.USE_API) {
        await glossaryAPI.createGlossary({ ...form, status: '草稿' })
      } else {
        if (form.id) setItems(items.map(i => i.id === form.id ? form : i))
        else setItems([...items, { ...form, id: Date.now(), status: '草稿' }])
      }
      setModal(null)
      loadItems()
      showToast('保存成功')
    } catch (err) {
      showToast('保存失败：' + err.message)
    }
  }

  const del = async (id) => {
    try {
      if (CONFIG.USE_API) {
        await glossaryAPI.deleteGlossary(id)
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
        <SearchBar placeholder="搜索术语名、定义..." value={search} onChange={setSearch} />
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {['全部', '已审批', '草稿'].map(s => (
            <span key={s} className={`chip${filterStatus === s ? ' active' : ''}`}
              onClick={() => setFilterStatus(s)}>{s}</span>
          ))}
        </div>
        <button className="btn btn-primary"
          onClick={() => { setForm({ status: '草稿' }); setModal('edit') }}>
          + 新增术语
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>业务术语</th><th>所属领域</th><th>业务定义</th><th>负责人</th>
                <th>状态</th><th>关联数据字典</th><th>关联数据标准</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.filter(i => {
                const matchSearch = !search || i.term.includes(search) || i.definition?.includes(search)
                const matchStatus = filterStatus === '全部' || i.status === filterStatus
                return matchSearch && matchStatus
              }).map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.term}</td>
                  <td><span className="badge badge-blue">{item.domain}</span></td>
                  <td style={{ maxWidth: 220, color: 'var(--txt2)', fontSize: 11 }}>{item.definition}</td>
                  <td style={{ color: 'var(--txt2)' }}>{item.owner}</td>
                  <td>
                    <span className={`badge ${item.status === '已审批' ? 'badge-green' : 'badge-gray'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{item.dict_ref || item.dictRef ? <span className="badge badge-teal">{item.dict_ref || item.dictRef}</span> : '—'}</td>
                  <td>{item.std_ref || item.stdRef  ? <span className="badge badge-amber">{item.std_ref || item.stdRef}</span>  : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm" onClick={() => { setForm({ ...item }); setModal('edit') }}>编辑</button>
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
        <Modal title={form.id ? '编辑术语' : '新增术语'} onClose={() => setModal(null)} onSave={save}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">术语名称 *</label>
              <input className="form-input" value={form.term || ''}
                onChange={e => setForm({ ...form, term: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">所属领域</label>
              <input className="form-input" value={form.domain || ''}
                onChange={e => setForm({ ...form, domain: e.target.value })} />
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
              <label className="form-label">负责人</label>
              <input className="form-input" value={form.owner || ''}
                onChange={e => setForm({ ...form, owner: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">审批状态</label>
              <select className="form-input" value={form.status || '草稿'}
                onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>草稿</option>
                <option>已审批</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">关联数据字典词条</label>
              <input className="form-input" value={form.dictRef || ''} placeholder="如 Nation"
                onChange={e => setForm({ ...form, dictRef: e.target.value })} />
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
