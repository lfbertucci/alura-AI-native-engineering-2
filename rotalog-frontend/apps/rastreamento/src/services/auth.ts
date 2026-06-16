const API_URL = 'http://localhost:3000';
const TOKEN_KEY = 'rotalog_token';

let token: string | null = localStorage.getItem(TOKEN_KEY);

async function login(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    if (!res.ok) return null;
    const { token: newToken } = await res.json();
    token = newToken;
    localStorage.setItem(TOKEN_KEY, newToken);
    return newToken;
  } catch {
    return null;
  }
}

export async function getToken(): Promise<string | null> {
  if (token) return token;
  return login();
}

export function clearToken(): void {
  token = null;
  localStorage.removeItem(TOKEN_KEY);
}

export async function fetchAutenticado(url: string, options: RequestInit = {}): Promise<Response> {
  const t = await getToken();
  const headers = {
    ...(options.headers || {}),
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    const novoToken = await login();
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(novoToken ? { Authorization: `Bearer ${novoToken}` } : {}),
      },
    });
  }
  return res;
}
