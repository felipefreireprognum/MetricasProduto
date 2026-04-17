'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';
import type { Credentials } from '@/types/auth';

export function useLoginForm() {
  const { connect, loading, error } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<Credentials>({
    login: '',
    senha: '',
    ambiente: '',
  });

  function handleChange(field: keyof Credentials, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await connect(form);
      router.push(ROUTES.DASHBOARD);
    } catch {
      // error is in AuthContext
    }
  }

  const isValid = form.login.trim() !== '' && form.senha.trim() !== '' && form.ambiente.trim() !== '';

  return { form, handleChange, handleSubmit, loading, error, isValid };
}
