import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { authAPI } from '../api/index.js'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const token = searchParams.get('token')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('重置链接无效')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码至少 6 位')
      return
    }

    setLoading(true)

    try {
      await authAPI.resetPassword(token, password)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">密码已重置</h1>
            <p className="auth-subtitle">您的密码已成功重置</p>
          </div>
          <div className="auth-success" style={{ marginBottom: 20, textAlign: 'center' }}>
            ✓ 密码重置成功，您可以使用新密码登录了
          </div>
          <a href="/login" className="btn btn-primary btn-block">返回登录</a>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">数据资产管理平台</h1>
          <p className="auth-subtitle">重置密码</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">新密码</label>
            <input
              className="form-input"
              type="password"
              placeholder="至少 6 位密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">确认密码</label>
            <input
              className="form-input"
              type="password"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? '重置中...' : '重置密码'}
          </button>
        </form>

        <div className="auth-footer">
          <a href="/login" className="link-btn">返回登录</a>
        </div>
      </div>
    </div>
  )
}
