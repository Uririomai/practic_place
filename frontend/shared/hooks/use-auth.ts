import { useState, useEffect, useCallback } from 'react';
import { User } from '@/shared/api/types';
import { api, apiClient, decodeTokenRole } from '@/shared/api/client';
import { useMockReady } from '@/components/MswProvider';

/** Декодировать JWT и извлечь userId (sub) */
function decodeTokenUserId(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

/** Загрузить полные данные пользователя: activeCohortId из /me, профиль из /users/:id/profile */
async function loadFullUser(token: string): Promise<User | null> {
  const userId = decodeTokenUserId(token);
  const role = decodeTokenRole(token);
  if (!userId) return null;

  // activeCohortId — из GET /me
  const me = await api.users.getMe();
  const activeCohortId = me.activeCohortId;

  // Профиль, заявки, когорты — из GET /users/:id/profile
  const data = await api.users.getProfile(userId);
  const approvedApp = data.applications?.find(
    (a: { status: string }) => a.status?.toLowerCase() === 'approved'
  );
  const activeRole = approvedApp?.role;

  return {
    ...data.user,
    role,
    activeCohortId,
    activeRole,
    cohorts: data.cohorts,
  } as User;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mockReady = useMockReady();

  useEffect(() => {
    if (!mockReady) return;

    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
      apiClient.setToken(stored);

      // Мок-токены
      if (stored === 'mock-jwt-token-admin') {
        setUser({ id: 'admin-1', email: 'admin@example.com', fio: 'Петров Пётр Петрович', role: 'admin', createdAt: '2024-01-01' });
        setLoading(false);
        return;
      }
      if (stored === 'mock-jwt-token-student') {
        setUser({ id: 'user-1', email: 'student@example.com', fio: 'Иванов Иван Иванович', role: 'student', createdAt: '2024-01-01' });
        setLoading(false);
        return;
      }

      // Реальный JWT
      loadFullUser(stored)
        .then((fullUser) => {
          if (fullUser) setUser(fullUser);
        })
        .catch((err) => {
          console.error('[useAuth] Ошибка загрузки профиля:', err);
          localStorage.removeItem('token');
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          setToken(null);
          apiClient.clearToken();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [mockReady]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.auth.login({ email, password });
    localStorage.setItem('token', response.token);
    document.cookie = `token=${response.token}; path=/; SameSite=Lax`;
    apiClient.setToken(response.token);
    setToken(response.token);

    try {
      const fullUser = await loadFullUser(response.token);
      if (fullUser) setUser(fullUser);
      return { token: response.token, user: fullUser };
    } catch {
      const role = decodeTokenRole(response.token);
      const fallback = { ...response.user, role } as User;
      setUser(fallback);
      return { token: response.token, user: fallback };
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const response = await api.auth.register({ email, password });
    localStorage.setItem('token', response.token);
    document.cookie = `token=${response.token}; path=/; SameSite=Lax`;
    apiClient.setToken(response.token);
    setToken(response.token);

    try {
      const fullUser = await loadFullUser(response.token);
      if (fullUser) setUser(fullUser);
      return { token: response.token, user: fullUser };
    } catch {
      const role = decodeTokenRole(response.token);
      const fallback = { ...response.user, role } as User;
      setUser(fallback);
      return { token: response.token, user: fallback };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    apiClient.clearToken();
    setToken(null);
    setUser(null);
    window.location.href = '/';
  }, []);

  return { user, token, loading, login, register, logout, setUser };
}
