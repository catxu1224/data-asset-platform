import { useState } from 'react'
import { authAPI } from '../api/index.js'

export default function ForgotPasswordPage({ onBackToLogin }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [debugInfo, setDebugInfo] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setDebugInfo(null)
    setLoading(true)

    try {
      const result = await authAPI.forgotPassword(email)
      setSuccess(result.message)
      if (result.debugToken || result.debugUrl) {
        setDebugInfo({ token: result.debugToken, url: result.debugUrl })
      }
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
          <p className="auth-subtitle">忘记密码</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <div className="form-group">
            <label className="form-label">邮箱</label>
            <input
              className="form-input"
              type="email"
              placeholder="请输入注册时的邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!!success}
            />
          </div>

          <p className="auth-hint">
            我们将发送一封邮件到您的邮箱，邮件中包含重置密码的链接。
          </p>

          {!success && (
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? '发送中...' : '发送重置邮件'}
            </button>
          )}

          {success && (
            <button className="btn btn-block" type="button" onClick={onBackToLogin}>
              返回登录
            </button>
          )}
        </form>

        {debugInfo && (
          <div className="auth-debug">
            <p><strong>开发模式调试信息：</strong></p>
            <p>重置链接：<a href={debugInfo.url} target="_blank" rel="noreferrer">{debugInfo.url}</a></p>
          </div>
        )}

        <div className="auth-footer">
          记住密码了？{' '}
          <button className="link-btn" onClick={onBackToLogin}>
            返回登录
          </button>
        </div>
      </div>
    </div>
  )
}
