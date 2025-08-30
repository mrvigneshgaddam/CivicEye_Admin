const API_BASE = (typeof window !== 'undefined' && window.API_BASE)

  ? window.API_BASE

  : 'http://localhost:5000';



function url(p) {

  if (!p.startsWith('/')) p = '/' + p;

  return API_BASE + p;

}



export async function api(path, { method = 'GET', body, headers } = {}) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
  };

  try {
    const token = typeof window !== 'undefined' && window.localStorage.getItem('authToken');
    if (token) opts.headers.Authorization = `Bearer ${token}`;
  }
    catch (e) { /* ignore */ }

  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url(path), opts);

  let data = null;

  try { data = await res.json(); } catch (_) {}

  return { ok: res.ok, status: res.status, data };

}



export const getMe  = () => api('/api/auth/me');

export const login  = (email, password) => api('/api/auth/login', { method:'POST', body:{ email, password }});

export const logout = () => api('/api/auth/logout', { method:'POST' });