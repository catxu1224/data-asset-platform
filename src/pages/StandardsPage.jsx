import { useState, useEffect } from 'react'
import { standardAPI } from '../api/index.js'
import { CONFIG } from '../config.js'
import { initStandards as localData } from '../data/initialData.js'
import { Modal, Toast, useToast } from '../components/UI'

export default function StandardsPage() {
  const [stds, setStds] = useState([])
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(null)
  const [valForm, setValForm] = useState({})
  const [stdForm, setStdForm] = useState({})
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const showToast = useToast(setToast)

  useEffect(() => {
    loadStandards()
  }, [])

  const loadStandards = async () => {
    try {
      if (CONFIG.USE_API) {
        const data = await standardAPI.getStandards()
        setStds(data)
        if (data.length > 0) {
          // 加载第一个标准的完整数据（包含 values）
          const first = await standardAPI.getStandard(data[0].id)
          setSelected({ ...first, values: first.values || [] })
        }
      } else {
        setStds(localData)
        setSelected(localData[0])
      }
    } catch (err) {
      console.error('Load standards error:', err)
      showToast('加载失败：' + err.message)
      setStds(localData)
      setSelected(localData[0])
    } finally {
      setLoading(false)
    }
  }

  const reloadSelected = async () => {
    if (!selected) return
    try {
      const updated = await standardAPI.getStandard(selected.id)
      setSelected({ ...updated, values: updated.values || [] })
      setStds(prev => prev.map(s => s.id === selected.id ? updated : s))
    } catch (err) {
      // Silent fail for reload
    }
  }

  // 点击左侧列表时加载完整数据
  const selectStandard = async (standard) => {
    try {
      const full = await standardAPI.getStandard(standard.id)
      setSelected({ ...full, values: full.values || [] })
    } catch (err) {
      console.error('Load standard error:', err)
    }
  }

  const syncSelected = (updated) => {
    setStds(updated)
    setSelected(s => updated.find(x => x.id === s?.id) || updated[0])
  }

  const saveVal = async () => {
    if (!valForm.code) return
    try {
      if (CONFIG.USE_API && valForm._editing) {
        // API 模式需要先删除再添加（简单处理）
        await standardAPI.deleteStandardValue(valForm._editCode)
        await standardAPI.createStandardValue(selected.id, {
          code: valForm.code,
          label: valForm.label,
          labelEn: valForm.labelEn
        })
      } else if (CONFIG.USE_API) {
        await standardAPI.createStandardValue(selected.id, {
          code: valForm.code,
          label: valForm.label,
          labelEn: valForm.labelEn
        })
      } else {
        const updated = stds.map(s =>
          s.id === selected.id
            ? {
                ...s, values: valForm._editing
                  ? s.values.map(v => v.code === valForm._editCode ? { code: valForm.code, label: valForm.label, labelEn: valForm.labelEn } : v)
                  : [...s.values, { code: valForm.code, label: valForm.label, labelEn: valForm.labelEn }]
              }
            : s
        )
        syncSelected(updated)
      }
      setModal(null)
      await reloadSelected()
      showToast(valForm._editing ? '码值已更新' : '码值已添加')
    } catch (err) {
      showToast('保存失败：' + err.message)
    }
  }

  const delVal = async (code) => {
    try {
      if (CONFIG.USE_API) {
        // 找到值的 ID
        const value = selected.values.find(v => v.code === code)
        if (value && value.id) {
          await standardAPI.deleteStandardValue(value.id)
        }
      }
      syncSelected(stds.map(s =>
        s.id === selected.id ? { ...s, values: s.values.filter(v => v.code !== code) } : s
      ))
      showToast('码值已删除')
      await reloadSelected()
    } catch (err) {
      showToast('删除失败：' + err.message)
    }
  }

  const saveStd = async () => {
    if (!stdForm.name) return
    try {
      if (CONFIG.USE_API && stdForm.id) {
        await standardAPI.updateStandard(stdForm.id, stdForm.name, stdForm.description || stdForm.desc)
        showToast('码值表已更新')
      } else if (CONFIG.USE_API) {
        const newStd = await standardAPI.createStandard({
          name: stdForm.name,
          description: stdForm.description || stdForm.desc,
          values: []
        })
        setStds(ss => [...ss, newStd])
        setSelected(newStd)
        showToast('码值表已创建')
      } else {
        const s = { ...stdForm, id: Date.now(), values: [] }
        setStds(ss => [...ss, s])
        setSelected(s)
        showToast('码值表已创建')
      }
      setModal(null)
    } catch (err) {
      showToast('保存失败：' + err.message)
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', overflow: 'hidden' }}>
      {/* Left: std list */}
      <div className="side-list">
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-header">
            <span className="card-header-title">码值表</span>
            <button className="btn btn-sm btn-primary"
              onClick={() => { setStdForm({ name: '', desc: '' }); setModal('addStd') }}>
              + 新增
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {stds.map(s => (
              <div key={s.id}
                className={`side-list-item${selected?.id === s.id ? ' active' : ''}`}
                style={{ borderLeftColor: selected?.id === s.id ? '#BA7517' : 'transparent' }}
                onClick={() => {
                  // 点击时加载完整数据
                  standardAPI.getStandard(s.id).then(full => {
                    setSelected({ ...full, values: full.values || [] })
                  })
                }}>
                <div className="side-list-item-title">{s.name}</div>
                <div className="side-list-item-sub">{s.values?.length || '—'} 条码值</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: values */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {selected && (
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="card-header-title">{selected.name}</span>
                <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{selected.description}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm"
                  onClick={() => { setStdForm({ ...selected, desc: selected.description }); setModal('editStd') }}>
                  编辑
                </button>
                <button className="btn btn-sm btn-primary"
                  onClick={() => { setValForm({ code: '', label: '', labelEn: '' }); setModal('addVal') }}>
                  + 新增码值
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>代码 (Code)</th><th>中文含义</th><th>英文含义</th><th>操作</th></tr>
                </thead>
                <tbody>
                  {selected.values.map(v => (
                    <tr key={v.code}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#534AB7' }}>
                          {v.code}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{v.label}</td>
                      <td style={{ color: 'var(--txt2)' }}>{v.labelEn}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm"
                            onClick={() => {
                              setValForm({ code: v.code, label: v.label, labelEn: v.labelEn, _editing: true, _editCode: v.code })
                              setModal('addVal')
                            }}>
                            编辑
                          </button>
                          <button className="btn btn-sm" onClick={() => delVal(v.code)}>删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {selected.values.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--txt3)', padding: 24 }}>暂无码值，请点击新增</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modal === 'addVal' && (
        <Modal title={valForm._editing ? '编辑码值' : '新增码值'} onClose={() => setModal(null)} onSave={saveVal}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">代码 (Code) *</label>
              <input className="form-input" value={valForm.code || ''} placeholder="如 CHN"
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                onChange={e => setValForm({ ...valForm, code: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">中文含义</label>
              <input className="form-input" value={valForm.label || ''}
                onChange={e => setValForm({ ...valForm, label: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">英文含义</label>
              <input className="form-input" value={valForm.labelEn || ''}
                onChange={e => setValForm({ ...valForm, labelEn: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}

      {(modal === 'addStd' || modal === 'editStd') && (
        <Modal
          title={modal === 'editStd' ? '编辑码值表' : '新增码值表'}
          onClose={() => setModal(null)} onSave={saveStd}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">码值表名称 *</label>
              <input className="form-input" value={stdForm.name || ''}
                onChange={e => setStdForm({ ...stdForm, name: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">描述</label>
              <input className="form-input" value={stdForm.description || stdForm.desc || ''}
                onChange={e => setStdForm({ ...stdForm, description: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}

      <Toast msg={toast} />
    </div>
  )
}
