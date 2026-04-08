import { useState, useEffect } from 'react'
import { authAPI } from './api/index.js'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import './styles/auth.css'

import OverviewPage       from './pages/OverviewPage'
import PhysicalModelPage  from './pages/PhysicalModelPage'
import DictPage           from './pages/DictPage'
import GlossaryPage       from './pages/GlossaryPage'
import StandardsPage      from './pages/StandardsPage'
import LineagePage        from './pages/LineagePage'
import NL2SQLPage         from './pages/NL2SQLPage'

const NAV = [
  { key: 'overview',   label: '概览',      dot: '#888780', group: '平台' },
  { key: 'model',      label: '物理模型',   dot: '#7F77DD', group: '数据资产' },
  { key: 'dict',       label: '数据字典',   dot: '#1D9E75', group: '数据资产' },
  { key: 'glossary',   label: '业务术语库', dot: '#D85A30', group: '数据资产' },
  { key: 'standards',  label: '数据标准',   dot: '#BA7517', group: '数据资产' },
  { key: 'lineage',    label: '血缘分析',   dot: '#378ADD', group: 'AI 应用' },
  { key: 'nl2sql',     label: 'NL2SQL',     dot: '#9333EA', group: 'AI 应用' },
]

const TITLES = {
  overview:  '平台概览',
  model:     '物理模型管理',
  dict:      '数据字典',
  glossary:  '业务术语库',
  standards: '数据标准',
  lineage:   '血缘分析',
  nl2sql:    '自然语言转 SQL',
}

const PAGES = {
  overview:  OverviewPage,
  model:     PhysicalModelPage,
  dict:      DictPage,
  glossary:  GlossaryPage,
  standards: StandardsPage,
  lineage:   LineagePage,
  nl2sql:    NL2SQLPage,
}

const groups = [...new Set(NAV.map(p => p.group))]

export default function App() {
  const [page, setPage] = useState('overview')
  const [user, setUser] = useState(null)
  const [authView, setAuthView] = useState('login') // login, register, forgot
  const [loading, setLoading] = useState(true)

  // 检查登录状态
  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (token && savedUser) {
      // 验证 token 是否有效
      authAPI.getMe(token)
        .then(res => {
          setUser(res.user)
          setLoading(false)
        })
        .catch(() => {
          // Token 无效，清除本地存储
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  // 渲染认证页面
  if (!loading && !user) {
    if (authView === 'register') {
      return <RegisterPage onRegister={handleLogin} onSwitchToLogin={() => setAuthView('login')} />
    }
    if (authView === 'forgot') {
      return <ForgotPasswordPage onBackToLogin={() => setAuthView('login')} />
    }
    return <LoginPage onLogin={handleLogin} onSwitchToRegister={() => setAuthView('register')} onSwitchToForgot={() => setAuthView('forgot')} />
  }

  // 渲染主应用
  const PageComponent = PAGES[page]

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>加载中...</div>
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-title">数据资产平台</div>
          <div className="logo-sub">Data Asset Manager</div>
        </div>
        <div className="sidebar-nav">
          {groups.map(g => (
            <div className="nav-group" key={g}>
              <div className="nav-group-label">{g}</div>
              {NAV.filter(p => p.group === g).map(p => (
                <div key={p.key}
                  className={`nav-item${page === p.key ? ' active' : ''}`}
                  onClick={() => setPage(p.key)}>
                  <span className="nav-dot" style={{ background: p.dot }} />
                  {p.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="main">
        <div className="topbar">
          <span className="topbar-title">{TITLES[page]}</span>
          <div className="search-bar" style={{ maxWidth: 240 }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            </svg>
            <input placeholder="全局搜索..." />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#666' }}>{user?.name || user?.email}</span>
            <button className="btn btn-sm" onClick={handleLogout}>退出</button>
          </div>
        </div>
        <div className="content">
          <PageComponent setPage={setPage} />
        </div>
      </div>
    </div>
  )
}
