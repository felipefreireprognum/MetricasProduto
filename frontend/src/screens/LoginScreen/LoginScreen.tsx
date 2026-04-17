'use client';

import { User, Lock, Database, AlertCircle } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { STRINGS } from '@/constants/strings';
import { useLoginForm } from '@/hooks/auth/useLoginForm';

export default function LoginScreen() {
  const { form, handleChange, handleSubmit, loading, error, isValid } = useLoginForm();

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A5FFF]">
            <span className="text-xl font-bold text-white">AG</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">{STRINGS.login.title}</h1>
          <p className="mt-1 text-sm text-[#475569]">{STRINGS.login.subtitle}</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg bg-[#FEE2E2] p-3 text-sm text-[#EF4444]">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={STRINGS.login.loginLabel}
              placeholder={STRINGS.login.loginPlaceholder}
              value={form.login}
              onChange={(e) => handleChange('login', e.target.value)}
              leftIcon={<User size={14} />}
              autoComplete="username"
            />
            <Input
              label={STRINGS.login.senhaLabel}
              type="password"
              placeholder={STRINGS.login.senhaPlaceholder}
              value={form.senha}
              onChange={(e) => handleChange('senha', e.target.value)}
              leftIcon={<Lock size={14} />}
              autoComplete="current-password"
            />
            <Input
              label={STRINGS.login.ambienteLabel}
              placeholder={STRINGS.login.ambientePlaceholder}
              value={form.ambiente}
              onChange={(e) => handleChange('ambiente', e.target.value)}
              leftIcon={<Database size={14} />}
            />
            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={!isValid}
              size="lg"
              className="mt-2"
            >
              {loading ? STRINGS.login.connecting : STRINGS.login.submit}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
