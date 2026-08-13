import * as SecureStore from 'expo-secure-store';

// TODO: mover para variável de ambiente (app.config.ts + EAS secrets) antes de ir pra produção
export const API_URL = 'http://192.168.250.134:8000';

const TOKEN_KEY = 'access_token';

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/**
 * Wrapper de fetch que já inclui o token de autenticação (quando existir)
 * e lança um erro legível quando a resposta não é OK.
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Erro na API (status ${response.status})`);
  }

  return response.json();
}

export default apiFetch;