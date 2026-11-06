import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY } from '../services/api';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authService.me();
        if (active) {
          setUser(data.data.user);
          setToken(storedToken);
        }
      } catch {
        if (active) clearSession();
      } finally {
        if (active) setLoading(false);
      }
    };

    bootstrap();

    const handleUnauthorized = () => {
      clearSession();
    };
    window.addEventListener('medicare:unauthorized', handleUnauthorized);

    return () => {
      active = false;
      window.removeEventListener('medicare:unauthorized', handleUnauthorized);
    };
  }, [clearSession]);

  const finishAuth = useCallback((payload) => {
    localStorage.setItem(TOKEN_KEY, payload.token);
    setToken(payload.token);
    setUser(payload.user);
    return payload.user;
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { data } = await authService.login({ email, password });
      return finishAuth(data.data);
    },
    [finishAuth]
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await authService.register(payload);
      return finishAuth(data.data);
    },
    [finishAuth]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // The local session must be cleared even if the network request fails.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const { data } = await authService.me();
    setUser(data.data.user);
    return data.data.user;
  }, []);

  const updateUser = useCallback((nextUser) => {
    setUser((current) => ({ ...current, ...nextUser }));
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
      updateUser,
    }),
    [user, token, loading, login, register, logout, refreshUser, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
