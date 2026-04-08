export default function OverviewPage({ setPage }) {
  const stats = [
    { num: 3, label: '数据表',     badge: 'badge-purple', name: '物理模型', page: 'model' },
    { num: 3, label: '数据字典词条', badge: 'badge-teal',   name: '数据字典', page: 'dict' },
    { num: 3, label: '业务术语',   badge: 'badge-coral',  name: '术语库',   page: 'glossary' },
    { num: 2, label: '码值表',     badge: 'badge-amber',  name: '数据标准', page: 'standards' },
  ]

  return (
    <div>
      {/* Stats */}
      <div className="stats-row">
        {stats.map(s => (
          <div key={s.label} className="stat-card" onClick={() => setPage(s.page)}>
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.label}</div>
            <span className={`badge ${s.badge}`} style={{ marginTop: 8, display: 'inline-flex' }}>{s.name}</span>
          </div>
        ))}
      </div>

      {/* Index chain */}
      <div className="card">
        <div className="card-header">
          <span className="card-header-title">索引关系示例：CUST_NAT 的完整语义链路</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 0' }}>
            {[
              { label: '物理字段', val: 'DW.CUSTOMER.CUST_NAT', cls: 'badge-purple' },
              null,
              { label: '数据字典', val: 'Nation', cls: 'badge-teal' },
              null,
              { label: '业务术语', val: '国家或地区', cls: 'badge-coral' },
              null,
              { label: '数据标准', val: 'COUNTRY_CODE', cls: 'badge-amber' },
            ].map((n, i) =>
              n === null
                ? <span key={i} style={{ color: 'var(--txt3)', fontSize: 18 }}>→</span>
                : (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{n.label}</span>
                    <span className={`badge ${n.cls}`}>{n.val}</span>
                  </div>
                )
            )}
          </div>
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: 'var(--bg2)', borderRadius: 'var(--radius)',
            fontSize: 11, color: 'var(--txt2)',
          }}>
            <strong style={{ color: 'var(--txt1)' }}>码值示例：</strong>
            {' '}CHN = 中国 · USA = 美国 · GBR = 英国 · JPN = 日本 · DEU = 德国
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <div className="card-header"><span className="card-header-title">快速操作</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: '新增数据表',   page: 'model',     primary: true },
              { label: '新增字典词条', page: 'dict' },
              { label: '新增业务术语', page: 'glossary' },
              { label: '解析血缘 SQL', page: 'lineage' },
            ].map(a => (
              <button key={a.label} className={`btn${a.primary ? ' btn-primary' : ''}`}
                onClick={() => setPage(a.page)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
