import { useState, useEffect, useCallback } from 'react';
import { User } from '@/shared/api/types';
import { api, apiClient } from '@/shared/api/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
      apiClient.setToken(stored);
      // Загружаем данные пользователя с сервера
      api.auth.me()
        .then((u) => setUser(u))
        .catch(() => {
          // Токен невалиден — очищаем
          localStorage.removeItem('token');
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          setToken(null);
          apiClient.clearToken();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.auth.login({ email, password });
    // Сохраняем и в localStorage, и в cookie (middleware проверяет cookie)
    localStorage.setItem('token', response.token);
    document.cookie = `token=${response.token}; path=/; SameSite=Lax`;
    apiClient.setToken(response.token);
    setToken(response.token);
    setUser(response.user);
    return response;
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const response = await api.auth.register({ email, password });
    localStorage.setItem('token', response.token);
    document.cookie = `token=${response.token}; path=/; SameSite=Lax`;
    apiClient.setToken(response.token);
    setToken(response.token);
    setUser(response.user);
    return response;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    apiClient.clearToken();
    setToken(null);
    setUser(null);
  }, []);

  return { user, token, loading, login, register, logout };
}
