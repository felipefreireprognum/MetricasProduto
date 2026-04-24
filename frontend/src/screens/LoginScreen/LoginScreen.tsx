'use client';

import { AlertCircle, User, KeyRound, BarChart3, Database, TrendingUp, Building2 } from 'lucide-react';
import { useLoginForm } from '@/hooks/auth/useLoginForm';

// ── Feature list shown on the left panel ──────────────────────────────────────

const FEATURES = [
  { icon: BarChart3,  text: 'Dashboard em tempo real com dados dos bancos' },
  { icon: Database,   text: 'Conexão multi-banco: C6 Bank, Banco Inter' },
  { icon: TrendingUp, text: 'Métricas AG31 — SCCI / FCVS consolidadas' },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { login, setLogin, senha, setSenha, handleSubmit, loading, error, isValid } = useLoginForm();

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F8F9FC' }}>

      {/* ── Left panel ──────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex w-[46%] shrink-0 flex-col justify-between overflow-hidden relative"
        style={{ background: 'linear-gradient(145deg, #0A0F1E 0%, #0D1F5C 55%, #0B2A8A 100%)' }}
      >
        {/* Dot-grid background */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        {/* Top-right glow */}
        <div
          className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #1A5FFF 0%, transparent 70%)' }}
        />

        {/* Bottom-left glow */}
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #FFD93D 0%, transparent 70%)' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #1A5FFF 0%, #0040CC 100%)', boxShadow: '0 0 0 1px rgba(255,255,255,0.12) inset' }}
            >
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <span className="text-base font-black text-white tracking-tight">Prognum</span>
              <span
                className="ml-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                style={{ backgroundColor: 'rgba(255,217,61,0.15)', color: '#FFD93D', border: '1px solid rgba(255,217,61,0.25)' }}
              >
                AG31
              </span>
            </div>
          </div>

          {/* Headline */}
          <div>
            <div className="mb-5 h-0.5 w-12 rounded-full" style={{ backgroundColor: '#FFD93D' }} />
            <h2 className="text-[2.4rem] font-black leading-[1.1] text-white tracking-tight">
              Métricas<br />
              <span style={{ color: '#FFD93D' }}>SCCI</span> /{' '}
              <span style={{ color: '#7CB9FF' }}>FCVS</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Visualize indicadores em tempo real do relatório AG31 — contratos, imóveis e originação por banco.
            </p>

            {/* Feature list */}
            <div className="mt-8 flex flex-col gap-3">
              {FEATURES.map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'rgba(26,95,255,0.25)', border: '1px solid rgba(26,95,255,0.3)' }}
                  >
                    <Icon size={13} style={{ color: '#7CB9FF' }} />
                  </div>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <span className="text-[10px] tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
              AG31 · SCCI · FCVS
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
          </div>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="mb-8 lg:hidden text-center">
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #1A5FFF 0%, #0040CC 100%)' }}
            >
              <Building2 size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-black" style={{ color: '#0F172A' }}>Prognum</h1>
            <div className="mx-auto mt-2 h-0.5 w-12 rounded-full" style={{ backgroundColor: '#FFD93D' }} />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#1A5FFF' }}>
              Acesso ao sistema
            </p>
            <h2 className="text-2xl font-black" style={{ color: '#0F172A' }}>Bem-vindo</h2>
            <p className="mt-1 text-sm" style={{ color: '#94A3B8' }}>
              Insira suas credenciais SSH para conectar
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-5 flex items-start gap-2.5 rounded-xl p-3.5 text-sm"
              style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold" style={{ color: '#0F172A' }}>
                Usuário (SSH)
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="ex: felipe.freire"
                  autoComplete="username"
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm transition focus:outline-none"
                  style={{
                    border: '1.5px solid #E2E8F0',
                    backgroundColor: '#F8F9FC',
                    color: '#0F172A',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1A5FFF'; e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,95,255,0.08)'; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.backgroundColor = '#F8F9FC'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold" style={{ color: '#0F172A' }}>
                Senha
              </label>
              <div className="relative">
                <KeyRound size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm transition focus:outline-none"
                  style={{
                    border: '1.5px solid #E2E8F0',
                    backgroundColor: '#F8F9FC',
                    color: '#0F172A',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1A5FFF'; e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,95,255,0.08)'; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.backgroundColor = '#F8F9FC'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!isValid || loading}
              className="mt-2 w-full rounded-xl py-3.5 text-sm font-bold text-white transition"
              style={{
                background: (!isValid || loading) ? '#94A3B8' : 'linear-gradient(135deg, #1A5FFF 0%, #0040CC 100%)',
                cursor: (!isValid || loading) ? 'not-allowed' : 'pointer',
                boxShadow: (!isValid || loading) ? 'none' : '0 4px 14px rgba(26,95,255,0.35)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="block h-1.5 w-1.5 rounded-full bg-white"
                        style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                      />
                    ))}
                  </span>
                  Conectando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Entrar
                  <span style={{ color: '#FFD93D' }}>→</span>
                </span>
              )}
            </button>
          </form>

          {/* Bank indicators */}
          <div className="mt-8 flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-center" style={{ color: '#CBD5E1' }}>
              Ambientes disponíveis
            </p>
            <div className="flex justify-center gap-3">
              {[
                { name: 'C6 Bank',     type: 'Firebird',    color: '#111827' },
                { name: 'Banco Inter', type: 'SQL Server',  color: '#FF8700' },
              ].map((b) => (
                <div
                  key={b.name}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                  style={{ border: '1px solid #E2E8F0', backgroundColor: '#F8F9FC' }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: b.color }}
                  />
                  <span className="text-xs font-medium" style={{ color: '#475569' }}>{b.name}</span>
                  <span className="text-[10px]" style={{ color: '#94A3B8' }}>{b.type}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs" style={{ color: '#CBD5E1' }}>
            Prognum · SCCI / FCVS
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1);   }
        }
      `}</style>
    </div>
  );
}
