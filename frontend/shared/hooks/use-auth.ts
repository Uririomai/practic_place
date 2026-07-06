import { useState, useEffect } from 'react';
import { api, apiClient } from '@/shared/api/client';
import { User } from '@/shared/api/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
      apiClient.setToken(stored);
      api.auth.me()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.auth.login({ email, password });
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.user);
    apiClient.setToken(response.token);
  };

  const register = async (email: string, password: string) => {
    const response = await api.auth.register({ email, password });
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.user);
    apiClient.setToken(response.token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    apiClient.clearToken();
  };

  return { user, token, loading, login, register, logout };
}