// 数据模式配置
export const CONFIG = {
  // 设置为 true 使用后端 API，false 使用本地模拟数据
  USE_API: true,
};

// API 基础 URL
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

