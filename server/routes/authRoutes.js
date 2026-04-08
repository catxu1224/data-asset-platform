import express from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { userRepo, resetTokenRepo } from '../repository/authRepository.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 邮件 transporter（需要配置 SMTP）
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.qq.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ===== 注册 =====
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码不能为空' });
    }

    // 检查用户是否已存在
    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    // 创建用户
    const user = await userRepo.create(email, password, name);

    // 生成 token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '注册失败：' + err.message });
  }
});

// ===== 登录 =====
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱和密码' });
    }

    // 验证用户
    const user = await userRepo.verifyPassword(email, password);
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: '账户已被禁用' });
    }

    // 生成 token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败：' + err.message });
  }
});

// ===== 获取当前用户信息 =====
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await userRepo.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(401).json({ error: 'Token 无效' });
  }
});

// ===== 请求重置密码 =====
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await userRepo.findByEmail(email);
    if (!user) {
      // 为了安全，不提示用户是否存在
      return res.json({ success: true, message: '如果邮箱已注册，您将收到重置密码邮件' });
    }

    // 删除旧的令牌
    await resetTokenRepo.deleteExpired(user.id);

    // 创建新令牌
    const { token } = await resetTokenRepo.create(user.id);

    // 发送重置密码邮件
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/reset-password?token=${token}`;

    try {
      await transporter.sendMail({
        from: `"数据资产平台" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: '重置密码 - 数据资产平台',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>重置密码</h2>
            <p>您好，${user.name || '用户'}：</p>
            <p>您请求重置密码，请点击以下链接设置新密码：</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
              重置密码
            </a>
            <p>或者直接复制以下链接到浏览器：</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              此链接将在 1 小时后过期。如果您没有请求重置密码，请忽略此邮件。
            </p>
          </div>
        `
      });
      console.log(`Reset password email sent to: ${email}`);
    } catch (emailErr) {
      console.error('Send email error:', emailErr);
      // 开发模式下，返回 token 方便测试
      if (process.env.NODE_ENV === 'development') {
        return res.json({
          success: true,
          message: '邮件发送失败（开发模式）',
          debugToken: token,
          debugUrl: resetUrl
        });
      }
    }

    res.json({ success: true, message: '如果邮箱已注册，您将收到重置密码邮件' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: '请求失败：' + err.message });
  }
});

// ===== 重置密码 =====
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token 和新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' });
    }

    // 验证令牌
    const tokenData = await resetTokenRepo.verify(token);
    if (!tokenData) {
      return res.status(400).json({ error: '重置链接已过期或无效' });
    }

    // 更新密码
    await userRepo.updatePassword(tokenData.user_id, newPassword);

    // 标记令牌已使用
    await resetTokenRepo.use(token);

    res.json({ success: true, message: '密码已重置' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: '重置失败：' + err.message });
  }
});

export default router;
