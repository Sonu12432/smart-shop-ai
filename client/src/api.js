let token = localStorage.getItem('ss_token') || '';
export const getToken = () => token;
export const setToken = (t) => {
  token = t || '';
  t ? localStorage.setItem('ss_token', t) : localStorage.removeItem('ss_token');
};

async function request(method, url, body) {
  const res = await fetch('/api' + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (u) => request('GET', u),
  post: (u, b) => request('POST', u, b || {}),
  put: (u, b) => request('PUT', u, b),
};

export const money = (n) => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
