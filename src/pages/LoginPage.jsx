import { useState } from 'react'
import { authAPI } from '../api/index.js'

export default function LoginPage({ onLogin, onSwitchToRegister, onSwitchToForgot }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await authAPI.login(form)
      // 保存 token 到 localStorage
      localStorage.setItem('token', result.token)
      localStorage.setItem('user', JSON.stringify(result.user))
      onLogin(result.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">数据资产管理平台</h1>
          <p className="auth-subtitle">用户登录</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">邮箱</label>
            <input
              className="form-input"
              type="email"
              placeholder="请输入邮箱"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              className="form-input"
              type="password"
              placeholder="请输入密码"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <button type="button" className="link-btn" onClick={onSwitchToForgot}>
              忘记密码？
            </button>
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="auth-footer">
          还没有账号？{' '}
          <button className="link-btn" onClick={onSwitchToRegister}>
            立即注册
          </button>
        </div>
      </div>
    </div>
  )
}
