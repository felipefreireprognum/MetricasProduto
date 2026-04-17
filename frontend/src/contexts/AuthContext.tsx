'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { setCredentials } from '@/services/api';
import { databaseService } from '@/services/databaseService';
import type { Credentials, AuthState } from '@/types/auth';

interface AuthContextValue extends AuthState {
  connect: (creds: Credentials) => Promise<void>;
  disconnect: () => void;
  error: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredsState] = useState<Credentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const connect = useCallback(async (creds: Credentials) => {
    setLoading(true);
    setError(null);
    setCredentials(creds);
    try {
      await databaseService.listarTabelas();
      setCredsState(creds);
    } catch (err) {
      setCredentials(null);
      setError(err instanceof Error ? err.message : 'Erro de conexão');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setCredentials(null);
    setCredsState(null);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        credentials,
        isAuthenticated: !!credentials,
        connect,
        disconnect,
        error,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
