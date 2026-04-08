import { useState } from 'react'
import { authAPI } from '../api/index.js'

export default function RegisterPage({ onRegister, onSwitchToLogin }) {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (form.password.length < 6) {
      setError('密码至少 6 位')
      return
    }

    setLoading(true)

    try {
      const { confirmPassword, ...registerData } = form
      const result = await authAPI.register(registerData)
      // 保存 token 到 localStorage
      localStorage.setItem('token', result.token)
      localStorage.setItem('user', JSON.stringify(result.user))
      onRegister(result.user)
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
          <p className="auth-subtitle">用户注册</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">昵称</label>
            <input
              className="form-input"
              type="text"
              placeholder="请输入昵称（可选）"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

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
              placeholder="至少 6 位密码"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">确认密码</label>
            <input
              className="form-input"
              type="password"
              placeholder="再次输入密码"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <div className="auth-footer">
          已有账号？{' '}
          <button className="link-btn" onClick={onSwitchToLogin}>
            立即登录
          </button>
        </div>
      </div>
    </div>
  )
}
