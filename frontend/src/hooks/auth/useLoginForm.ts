'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';

export function useLoginForm() {
  const { connect, loading, error } = useAuth();
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await connect({ login: login.trim(), senha });
      router.push(ROUTES.DASHBOARD);
    } catch {
      // error is in AuthContext
    }
  }

  const isValid = login.trim() !== '' && senha.trim() !== '';
  return { login, setLogin, senha, setSenha, handleSubmit, loading, error, isValid };
}
