import { useState, useEffect } from 'react'
import { physicalModelAPI } from '../api/index.js'
import ERGraph from '../components/ERGraph'
import { Modal, Toast, useToast, Tabs } from '../components/UI'
import { CONFIG } from '../config.js'
import { initTables as localData } from '../data/initialData.js'

const FIELD_TYPES = ['VARCHAR','CHAR','INT','BIGINT','DECIMAL','DATE','TIMESTAMP','BOOLEAN','TEXT','CLOB','BLOB']

function FieldForm({ form, setForm }) {
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">字段名 *</label>
          <input className="form-input" value={form.name || ''} placeholder="如 CUST_ID"
            onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">类型 *</label>
          <select className="form-input" value={form.type || 'VARCHAR'}
            onChange={e => setForm({ ...form, type: e.target.value })}>
            {FIELD_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">长度</label>
          <input className="form-input" type="number" value={form.len || ''}
            onChange={e => setForm({ ...form, len: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">精度（小数位）</label>
          <input className="form-input" type="number" value={form.precision || ''}
            onChange={e => setForm({ ...form, precision: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">约束</label>
          <div style={{ display: 'flex', gap: 14, marginTop: 5, flexWrap: 'wrap' }}>
            {[['pk', '主键 PK'], ['fk', '外键 FK'], ['nullable', '允许 NULL']].map(([k, l]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!form[k]}
                  onChange={e => setForm({ ...form, [k]: e.target.checked })} />
                {l}
              </label>
            ))}
          </div>
        </div>
      </div>
      {form.fk && (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">关联表</label>
            <input className="form-input" value={form.fkTable || ''} placeholder="如 CUSTOMER"
              onChange={e => setForm({ ...form, fkTable: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">关联字段</label>
            <input className="form-input" value={form.fkField || ''} placeholder="如 CUST_ID"
              onChange={e => setForm({ ...form, fkField: e.target.value })} />
          </div>
        </div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">字段中文 *</label>
          <input className="form-input" value={form.comment || ''} placeholder="如 账户 ID"
            onChange={e => setForm({ ...form, comment: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">字段描述</label>
          <textarea className="form-input" value={form.desc || ''} placeholder="详细描述字段的业务含义、用途等..."
            onChange={e => setForm({ ...form, desc: e.target.value })}
            style={{ minHeight: 80, resize: 'vertical' }} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">关联数据字典词条</label>
          <input className="form-input" value={form.dictRef || ''} placeholder="如 Nation"
            onChange={e => setForm({ ...form, dictRef: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">关联业务术语</label>
          <input className="form-input" value={form.termRef || ''} placeholder="如 国家或地区"
            onChange={e => setForm({ ...form, termRef: e.target.value })} />
        </div>
      </div>
    </>
  )
}

export default function PhysicalModelPage() {
  const [tables, setTables] = useState([])
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('fields')
  const [modal, setModal] = useState(null)
  const [fieldForm, setFieldForm] = useState({})
  const [tableForm, setTableForm] = useState({})
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const showToast = useToast(setToast)

  // 加载数据
  useEffect(() => {
    loadTables()
  }, [])

  const loadTables = async () => {
    try {
      if (CONFIG.USE_API) {
        const data = await physicalModelAPI.getTables()
        // 转换 API 数据格式以匹配前端
        const transformed = data.map(t => ({
          ...t,
          schema: t.schema_name || 'DW',
          fields: t.fields || []
        }))
        setTables(transformed)
        if (transformed.length > 0) setSelected(transformed[0])
      } else {
        setTables(localData)
        setSelected(localData[0])
      }
    } catch (err) {
      showToast('加载失败：' + err.message)
      setTables(localData)
      setSelected(localData[0])
    } finally {
      setLoading(false)
    }
  }

  const sync = async (updated) => {
    setTables(updated)
    setSelected(s => updated.find(t => t.id === s?.id) || updated[0])
  }

  const reloadSelected = async () => {
    if (!selected) return
    try {
      const table = await physicalModelAPI.getTable(selected.id)
      const updatedTables = tables.map(t => t.id === table.id ? {
        ...t,
        fields: table.fields || []
      } : t)
      setTables(updatedTables)
      setSelected({ ...table, schema: table.schema_name || table.schema })
    } catch (err) {
      showToast('刷新失败：' + err.message)
    }
  }

  const saveField = async () => {
    if (!fieldForm.name) return
    try {
      if (CONFIG.USE_API && fieldForm.id) {
        await physicalModelAPI.updateField(fieldForm.id, {
          name: fieldForm.name,
          type: fieldForm.type,
          len: fieldForm.len,
          precision: fieldForm.precision,
          pk: fieldForm.pk,
          fk: fieldForm.fk,
          nullable: fieldForm.nullable,
          comment: fieldForm.comment,
          desc: fieldForm.desc,
          dictRef: fieldForm.dictRef,
          termRef: fieldForm.termRef,
          stdRef: fieldForm.stdRef,
        })
      } else if (CONFIG.USE_API) {
        await physicalModelAPI.createField(selected.id, {
          name: fieldForm.name,
          type: fieldForm.type,
          len: fieldForm.len,
          precision: fieldForm.precision,
          pk: fieldForm.pk,
          fk: fieldForm.fk,
          nullable: fieldForm.nullable,
          comment: fieldForm.comment,
          desc: fieldForm.desc,
          dictRef: fieldForm.dictRef,
          termRef: fieldForm.termRef,
          stdRef: fieldForm.stdRef,
        })
      } else {
        // 本地模式
        const f = { ...fieldForm, id: fieldForm.id || Date.now() }
        sync(tables.map(t => t.id === selected.id
          ? { ...t, fields: fieldForm.id ? t.fields.map(x => x.id === f.id ? f : x) : [...t.fields, f] }
          : t))
      }
      setModal(null)
      await reloadSelected()
      showToast(fieldForm.id ? '字段已更新' : '字段已添加')
    } catch (err) {
      showToast('保存失败：' + err.message)
    }
  }

  const deleteField = async (fid) => {
    try {
      if (CONFIG.USE_API) {
        await physicalModelAPI.deleteField(fid)
      } else {
        sync(tables.map(t => t.id === selected.id ? { ...t, fields: t.fields.filter(f => f.id !== fid) } : t))
      }
      await reloadSelected()
      showToast('字段已删除')
    } catch (err) {
      showToast('删除失败：' + err.message)
    }
  }

  const saveTable = async () => {
    if (!tableForm.name) return
    try {
      if (CONFIG.USE_API && tableForm.id) {
        await physicalModelAPI.updateTable(tableForm.id, tableForm.name, tableForm.comment, tableForm.desc)
        const updated = await physicalModelAPI.getTable(tableForm.id)
        sync(tables.map(t => t.id === tableForm.id ? { ...t, ...updated } : t))
        showToast('表信息已更新')
      } else if (CONFIG.USE_API) {
        const newTable = await physicalModelAPI.createTable({
          schemaId: 1,
          id: tableForm.id || `T${Date.now()}`,
          name: tableForm.name,
          comment: tableForm.comment,
          desc: tableForm.desc,
          fields: []
        })
        const updated = [...tables, { ...newTable, schema: newTable.schema_name, fields: [] }]
        setTables(updated)
        setSelected(updated[updated.length - 1])
        showToast('表已创建')
      } else {
        const t = { ...tableForm, id: Date.now(), fields: [] }
        setTables(ts => [...ts, t])
        setSelected(t)
        showToast('表已创建')
      }
      setModal(null)
    } catch (err) {
      showToast('保存失败：' + err.message)
    }
  }

  const deleteTable = async (id) => {
    try {
      if (CONFIG.USE_API) {
        await physicalModelAPI.deleteTable(id)
      }
      const remaining = tables.filter(t => t.id !== id)
      setTables(remaining)
      setSelected(remaining[0] || null)
      showToast('表已删除')
    } catch (err) {
      showToast('删除失败：' + err.message)
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', overflow: 'hidden' }}>
      {/* Left: table list */}
      <div className="side-list">
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-header">
            <span className="card-header-title">数据表</span>
            <button className="btn btn-sm btn-primary"
              onClick={() => { setTableForm({ schema: 'DW', name: '', comment: '' }); setModal('addTable') }}>
              + 新增
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {tables.map(t => (
              <div key={t.id}
                className={`side-list-item${selected?.id === t.id ? ' active' : ''}`}
                onClick={() => setSelected(t)}>
                <div className="side-list-item-title">{t.name}</div>
                <div className="side-list-item-sub">{t.schema} · {t.fields.length} 字段</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: detail */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {selected ? (
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-purple">{selected.schema}</span>
                <span className="card-header-title">{selected.name}</span>
                <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{selected.comment}</span>
                {selected.desc && (
                  <span style={{ fontSize: 11, color: 'var(--txt2)', fontStyle: 'italic' }}>| 范围：{selected.desc}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm"
                  onClick={() => { setTableForm({ ...selected, desc: selected.desc || '' }); setModal('editTable') }}>
                  编辑表
                </button>
                <button className="btn btn-sm btn-primary"
                  onClick={() => { setFieldForm({ type: 'VARCHAR', len: 50, nullable: true }); setModal('addField') }}>
                  + 新增字段
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => deleteTable(selected.id)}>
                  删除表
                </button>
              </div>
            </div>
            <div className="card-body" style={{ paddingTop: 8 }}>
              <Tabs
                tabs={[['fields', '字段列表'], ['er', 'ER 图谱']]}
                active={tab} onChange={setTab}
              />
              {tab === 'fields' && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>字段名</th><th>类型</th><th>长度/精度</th>
                        <th>约束</th><th>字段中文</th><th>字段描述</th><th>索引关联</th><th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.fields.map(f => (
                        <tr key={f.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                            {f.pk && <span className="tag-pk">PK</span>}
                            {f.fk && <span className="tag-fk">FK</span>}
                            {f.name}
                          </td>
                          <td><span className="badge badge-gray">{f.type}</span></td>
                          <td style={{ color: 'var(--txt2)', fontFamily: 'var(--font-mono)' }}>
                            {f.len || '—'}{f.precision != null && f.precision !== '' ? `,${f.precision}` : ''}
                          </td>
                          <td>
                            {!f.nullable && <span className="badge badge-coral" style={{ marginBottom: 2 }}>NOT NULL</span>}
                            {f.fk && <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 2 }}>→ {f.fkTable}.{f.fkField}</div>}
                          </td>
                          <td style={{ color: 'var(--txt2)', maxWidth: 160 }}>{f.comment}</td>
                          <td style={{ color: 'var(--txt3)', maxWidth: 180, fontSize: 12 }}>{f.desc}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {f.dictRef && <span className="badge badge-teal">{f.dictRef}</span>}
                              {f.termRef && <span className="badge badge-coral">{f.termRef}</span>}
                              {f.stdRef  && <span className="badge badge-amber">{f.stdRef}</span>}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-sm"
                                onClick={() => { setFieldForm({ ...f }); setModal('addField') }}>
                                编辑
                              </button>
                              <button className="btn btn-sm" onClick={() => deleteField(f.id)}>删除</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {tab === 'er' && <ERGraph tables={tables} />}
            </div>
          </div>
        ) : (
          <div style={{ padding: 40, color: 'var(--txt3)', textAlign: 'center' }}>请从左侧选择或新增数据表</div>
        )}
      </div>

      {/* Modals */}
      {(modal === 'addField') && (
        <Modal
          title={fieldForm.id ? '编辑字段' : '新增字段'}
          onClose={() => setModal(null)}
          onSave={saveField}
        >
          <FieldForm form={fieldForm} setForm={setFieldForm} />
        </Modal>
      )}
      {(modal === 'addTable' || modal === 'editTable') && (
        <Modal
          title={modal === 'editTable' ? '编辑数据表' : '新增数据表'}
          onClose={() => setModal(null)}
          onSave={saveTable}
        >
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Schema</label>
              <input className="form-input" value={tableForm.schema || ''}
                onChange={e => setTableForm({ ...tableForm, schema: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">表名 *</label>
              <input className="form-input" value={tableForm.name || ''}
                onChange={e => setTableForm({ ...tableForm, name: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">中文说明</label>
              <input className="form-input" value={tableForm.comment || ''}
                onChange={e => setTableForm({ ...tableForm, comment: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">表范围描述</label>
              <textarea className="form-input" value={tableForm.desc || ''} placeholder="描述表内数据的业务含义和范围..."
                onChange={e => setTableForm({ ...tableForm, desc: e.target.value })}
                style={{ minHeight: 80, resize: 'vertical' }} />
            </div>
          </div>
        </Modal>
      )}

      <Toast msg={toast} />
    </div>
  )
}
