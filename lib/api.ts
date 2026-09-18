import * as SecureStore from 'expo-secure-store';

// EXPO_PUBLIC_ é o prefixo que o Expo exige para expor variáveis de ambiente
// dentro do código do app (runtime). Sem o prefixo, a variável não é injetada
// no bundle. Configure no .env: EXPO_PUBLIC_API_URL=http://SEU_IP:8000
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

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