const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Auth APIs
export const authAPI = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, newPassword) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
  getMe: (token) => request('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
};

// Physical Model APIs
export const physicalModelAPI = {
  // Schemas
  getSchemas: () => request('/schemas'),
  createSchema: (data) => request('/schemas', { method: 'POST', body: JSON.stringify(data) }),
  updateSchema: (id, data) => request(`/schemas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchema: (id) => request(`/schemas/${id}`, { method: 'DELETE' }),

  // Tables
  getTables: () => request('/tables'),
  getTable: (id) => request(`/tables/${id}`),
  getTablesBySchema: (schemaId) => request(`/schemas/${schemaId}/tables`),
  createTable: (data) => request('/tables', { method: 'POST', body: JSON.stringify(data) }),
  updateTable: (id, data) => request(`/tables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTable: (id) => request(`/tables/${id}`, { method: 'DELETE' }),

  // Fields
  createField: (tableId, data) => request(`/tables/${tableId}/fields`, { method: 'POST', body: JSON.stringify(data) }),
  updateField: (id, data) => request(`/fields/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteField: (id) => request(`/fields/${id}`, { method: 'DELETE' }),
};

// Data Dictionary APIs
export const dictAPI = {
  getDicts: () => request('/dicts'),
  getDict: (id) => request(`/dicts/${id}`),
  createDict: (data) => request('/dicts', { method: 'POST', body: JSON.stringify(data) }),
  updateDict: (id, data) => request(`/dicts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDict: (id) => request(`/dicts/${id}`, { method: 'DELETE' }),
};

// Glossary APIs
export const glossaryAPI = {
  getGlossaries: () => request('/glossaries'),
  getGlossary: (id) => request(`/glossaries/${id}`),
  createGlossary: (data) => request('/glossaries', { method: 'POST', body: JSON.stringify(data) }),
  updateGlossary: (id, data) => request(`/glossaries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGlossary: (id) => request(`/glossaries/${id}`, { method: 'DELETE' }),
};

// Standards APIs
export const standardAPI = {
  getStandards: () => request('/standards'),
  getStandard: (id) => request(`/standards/${id}`),
  createStandard: (data) => request('/standards', { method: 'POST', body: JSON.stringify(data) }),
  updateStandard: (id, data) => request(`/standards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStandard: (id) => request(`/standards/${id}`, { method: 'DELETE' }),
  createStandardValue: (standardId, data) => request(`/standards/${standardId}/values`, { method: 'POST', body: JSON.stringify(data) }),
  deleteStandardValue: (id) => request(`/standard-values/${id}`, { method: 'DELETE' }),
};

// Lineage APIs
export const lineageAPI = {
  getLineageSources: () => request('/lineage/sources'),
  getLineageSource: (id) => request(`/lineage/sources/${id}`),
  createLineageSource: (data) => request('/lineage/sources', { method: 'POST', body: JSON.stringify(data) }),
  deleteLineageSource: (id) => request(`/lineage/sources/${id}`, { method: 'DELETE' }),
  getLineageGraph: () => request('/lineage/graph'),
};
