'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { setCredentials } from '@/services/api';
import { databaseService } from '@/services/databaseService';
import { BANKS, type BankConfig } from '@/constants/banks';
import { bankTokens, type BankTokens } from '@/theme/tokens';
import type { Credentials, AuthState } from '@/types/auth';

export interface BancoStatus {
  banco: BankConfig;
  conectado: boolean;
}

interface AuthContextValue extends AuthState {
  connect: (creds: Omit<Credentials, 'ambiente'>) => Promise<void>;
  disconnect: () => void;
  error: string | null;
  loading: boolean;
  bancosStatus: BancoStatus[];
  bancosConectados: BankConfig[];
  tokens: BankTokens;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredsState] = useState<Credentials | null>(null);
  const [bancosStatus, setBancosStatus] = useState<BancoStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const bancosConectados = bancosStatus.filter((b) => b.conectado).map((b) => b.banco);
  const tokens = bankTokens.default;

  const connect = useCallback(async (creds: Omit<Credentials, 'ambiente'>) => {
    setLoading(true);
    setError(null);

    const bancosHabilitados = BANKS.filter((b) => b.enabled && (b.ambiente || b.apiPrefix));

    if (!bancosHabilitados.length) {
      setError('Nenhum ambiente configurado.');
      setLoading(false);
      return;
    }

    // Tenta conectar a todos os bancos habilitados em paralelo
    const results = await Promise.allSettled(
      bancosHabilitados.map(async (banco) => {
        const fullCreds: Credentials = { ...creds, ambiente: banco.ambiente };
        setCredentials(fullCreds);
        if (banco.apiPrefix) {
          await databaseService.inter.listarTabelas();
        } else {
          await databaseService.listarTabelas();
        }
        return banco;
      })
    );

    const status: BancoStatus[] = bancosHabilitados.map((banco, i) => ({
      banco,
      conectado: results[i].status === 'fulfilled',
    }));

    const algumConectou = status.some((s) => s.conectado);

    if (!algumConectou) {
      setCredentials(null);
      setError('Não foi possível conectar a nenhum ambiente. Verifique suas credenciais.');
      setLoading(false);
      throw new Error('Nenhum ambiente conectado');
    }

    // Mantém credenciais do primeiro banco que conectou
    const primeiroBanco = status.find((s) => s.conectado)!.banco;
    setCredentials({ ...creds, ambiente: primeiroBanco.ambiente });
    setCredsState({ ...creds, ambiente: primeiroBanco.ambiente });
    setBancosStatus(status);
    setLoading(false);
  }, []);

  const disconnect = useCallback(() => {
    setCredentials(null);
    setCredsState(null);
    setBancosStatus([]);
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
        bancosStatus,
        bancosConectados,
        tokens,
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
