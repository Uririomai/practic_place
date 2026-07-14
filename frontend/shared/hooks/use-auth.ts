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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mockReady = useMockReady();

  useEffect(() => {
    // Ждём загрузки мока перед запросами
    if (!mockReady) return;

    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
      apiClient.setToken(stored);

      // Мок-токены — возвращаем мок-пользователя
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

      // Реальный JWT — загружаем профиль через GET /users/:id/profile
      const userId = decodeTokenUserId(stored);
      const role = decodeTokenRole(stored);

      if (userId) {
        // Загружаем профиль (GET /users/:id/profile) — activeCohortId уже внутри user
        api.users.getProfile(userId)
          .then((data) => {
            // Определяем активную когорту: первая заявка со статусом APPROVED
            const approvedApp = data.applications?.find(
              (a: { status: string }) => a.status?.toLowerCase() === 'approved'
            );
            const activeCohortId = data.user.activeCohortId || approvedApp?.cohortId;
            // Находим роль из заявки
            const activeRole = approvedApp?.role;
            setUser({
              ...data.user,
              role,
              activeCohortId,
              activeRole,
              cohorts: data.cohorts,
            });
          })
          .catch(() => {
            localStorage.removeItem('token');
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            setToken(null);
            apiClient.clearToken();
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [mockReady]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.auth.login({ email, password });
    // Сохраняем и в localStorage, и в cookie (middleware проверяет cookie)
    localStorage.setItem('token', response.token);
    document.cookie = `token=${response.token}; path=/; SameSite=Lax`;
    apiClient.setToken(response.token);
    setToken(response.token);
    // Бэк не возвращает role в user — декодируем из JWT
    const role = decodeTokenRole(response.token);
    const userWithRole = { ...response.user, role };
    setUser(userWithRole);
    return { ...response, user: userWithRole };
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const response = await api.auth.register({ email, password });
    localStorage.setItem('token', response.token);
    document.cookie = `token=${response.token}; path=/; SameSite=Lax`;
    apiClient.setToken(response.token);
    setToken(response.token);
    // Бэк не возвращает role в user — декодируем из JWT
    const role = decodeTokenRole(response.token);
    const userWithRole = { ...response.user, role };
    setUser(userWithRole);
    return { ...response, user: userWithRole };
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
