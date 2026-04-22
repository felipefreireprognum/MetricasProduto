'use client';

import { AlertCircle, User, KeyRound } from 'lucide-react';
import { useLoginForm } from '@/hooks/auth/useLoginForm';

export default function LoginScreen() {
  const { login, setLogin, senha, setSenha, handleSubmit, loading, error, isValid } = useLoginForm();

  return (
    <div className="min-h-screen bg-white flex">

      {/* Painel esquerdo — azul */}
      <div className="hidden lg:flex w-[44%] flex-col justify-between bg-[#1A5FFF] p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <span className="text-base font-black text-white">P</span>
            </div>
            <span className="text-lg font-black text-white tracking-tight">Prognum</span>
          </div>

          <div className="mt-16">
            <div className="mb-4 h-1 w-10 rounded-full bg-[#FFD93D]" />
            <h2 className="text-4xl font-black text-white leading-tight">
              Métricas e<br />análise do<br />
              <span className="text-[#FFD93D]">SCCI / FCVS</span>
            </h2>
            <p className="mt-4 text-sm text-white/60 leading-relaxed">
              Visualize indicadores em tempo real do AG31 — contratos, imóveis e originação por banco.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/30">AG31 · SCCI · FCVS</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>

      {/* Painel direito — branco */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* Header mobile */}
          <div className="mb-8 lg:hidden text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1A5FFF]">
              <span className="text-base font-black text-white">P</span>
            </div>
            <h1 className="text-2xl font-black text-[#0F172A]">Prognum</h1>
            <div className="mx-auto mt-1.5 h-0.5 w-16 rounded-full bg-gradient-to-r from-[#FFD93D] to-[#1A5FFF]" />
          </div>

          <h2 className="text-2xl font-black text-[#0F172A] mb-1">Bem-vindo</h2>
          <p className="text-sm text-[#94A3B8] mb-7">Acesse com suas credenciais SSH</p>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 p-3.5 text-sm text-red-600">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#0F172A]">Usuário (SSH)</label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="ex: felipe.freire"
                  autoComplete="username"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-10 pr-4 text-sm text-[#0F172A] placeholder-[#94A3B8] transition focus:border-[#1A5FFF] focus:outline-none focus:ring-2 focus:ring-[#1A5FFF]/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#0F172A]">Senha</label>
              <div className="relative">
                <KeyRound size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-10 pr-4 text-sm text-[#0F172A] placeholder-[#94A3B8] transition focus:border-[#1A5FFF] focus:outline-none focus:ring-2 focus:ring-[#1A5FFF]/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!isValid || loading}
              className="mt-1 w-full rounded-xl bg-[#1A5FFF] py-3.5 text-sm font-bold text-white transition hover:bg-[#0040CC] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a8 8 0 00-8 8z" />
                  </svg>
                  Conectando...
                </span>
              ) : (
                <>Entrar <span className="ml-1 text-[#FFD93D]">→</span></>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#CBD5E1]">Prognum · SCCI / FCVS</p>
        </div>
      </div>
    </div>
  );
}
