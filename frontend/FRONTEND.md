# Frontend — Métricas AG31

Stack: **Next.js 16 (App Router) + TypeScript + Tailwind CSS + Recharts**

---

## Princípios

```
lógica   → hooks/       toda regra de negócio, fetch, validação
render   → componentes  só JSX, sem fetch, sem useState de dados
api      → services/    toda comunicação HTTP em um lugar
texto    → strings.ts   todo texto visível ao usuário
visual   → theme/       todas as cores como constante nomeada
contrato → types/       todos os tipos de domínio
```

---

## Estrutura de Pastas

```
frontend/
├── src/
│   ├── app/                        # Next.js App Router — só wrappers finos
│   │   ├── layout.tsx              # Root layout com AuthProvider global
│   │   ├── page.tsx                # / → <LoginScreen />
│   │   ├── globals.css             # Reset e variável de fonte
│   │   └── (main)/                 # Route group — requer autenticação
│   │       ├── layout.tsx          # Guard de auth + Sidebar
│   │       ├── dashboard/
│   │       │   └── page.tsx        # /dashboard → <DashboardScreen />
│   │       └── ag31/
│   │           ├── page.tsx        # /ag31 → <Ag31Screen />
│   │           └── comparativo/
│   │               └── page.tsx    # /ag31/comparativo → <ComparativoScreen />
│   │
│   ├── screens/                    # Camada 2: busca dados, trata loading/error
│   │   ├── LoginScreen/
│   │   ├── DashboardScreen/
│   │   ├── Ag31Screen/
│   │   └── ComparativoScreen/
│   │
│   ├── components/
│   │   ├── ui/                     # Primitivos sem domínio
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Card/
│   │   │   └── Spinner/
│   │   ├── charts/                 # Gráficos Recharts por tipo
│   │   │   ├── OperacoesPorFaseChart.tsx
│   │   │   ├── VolumePorDataChart.tsx
│   │   │   ├── TempoMedioFaseChart.tsx
│   │   │   ├── TopUsuariosChart.tsx
│   │   │   └── DistribuicaoFasesChart.tsx
│   │   ├── features/
│   │   │   └── DashboardView/      # Layout 1×2×2 dos 5 gráficos
│   │   ├── shared/                 # EmptyState, LoadingState, SectionTitle
│   │   └── layout/
│   │       └── Sidebar/            # Navegação lateral com guard de logout
│   │
│   ├── hooks/                      # Todo estado e lógica React
│   │   ├── auth/
│   │   │   └── useLoginForm.ts     # Estado do form, validação, submit
│   │   └── dashboard/
│   │       └── useDashboardScreen.ts  # Tabelas, limite, SQL customizado
│   │
│   ├── services/                   # Abstração HTTP
│   │   ├── api.ts                  # Instância axios + interceptor de credenciais
│   │   └── databaseService.ts      # listarTabelas, buscarTabela, executarQuery
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx         # Estado global de autenticação
│   │
│   ├── types/                      # Contratos TypeScript por domínio
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── ag31/
│   │   └── shared/
│   │
│   ├── constants/
│   │   ├── strings.ts              # Todo texto de UI em um lugar
│   │   ├── routes.ts               # Todas as rotas como constante
│   │   └── icons.ts                # Re-exports centralizados do lucide-react
│   │
│   ├── theme/
│   │   └── colors.ts               # Paleta: primary #1A5FFF, accent #FFD93D
│   │
│   └── utils/
│       └── mappers/
│           └── dashboardMapper.ts  # TabelaRow[] → DashboardData (5 datasets)
│
└── .env.local                      # NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## As 3 Camadas de uma Tela

Cada rota tem exatamente três camadas com responsabilidades isoladas.

```
app/(main)/dashboard/page.tsx   → wrapper de 3 linhas, zero lógica
screens/DashboardScreen/        → chama hook, trata loading/error, passa dados
components/features/DashboardView/ → só JSX, recebe props, zero fetch
```

```tsx
// CAMADA 1 — app/(main)/dashboard/page.tsx
export default function DashboardPage() {
  return <DashboardScreen />;
}

// CAMADA 2 — screens/DashboardScreen/DashboardScreen.tsx
export default function DashboardScreen() {
  const { rows, dashboardData, loading, error, ... } = useDashboardScreen();

  if (loading) return <LoadingState />;
  if (error) return <ErrorBanner message={error} />;

  return <DashboardView rows={rows} dashboardData={dashboardData} ... />;
}

// CAMADA 3 — components/features/DashboardView/DashboardView.tsx
export default function DashboardView({ dashboardData, rows }: Props) {
  // ZERO fetch. ZERO router. ZERO useState de dados.
  return (
    <div>
      <VolumePorDataChart data={dashboardData.volumePorData} />
      ...
    </div>
  );
}
```

---

## Autenticação

O sistema usa **credenciais SSH** (login + senha + caminho do banco) passadas como query params para a API FastAPI. Não há JWT nem sessão persistida — as credenciais vivem no `AuthContext` em memória.

**Fluxo:**

```
LoginScreen → useLoginForm → AuthContext.connect()
  → setCredentials(creds)        ← guarda no interceptor axios
  → databaseService.listarTabelas() ← testa a conexão real
  → se OK: router.push('/dashboard')
  → se erro: mostra mensagem do backend
```

**Guard de rota:** o layout `(main)/layout.tsx` checa `isAuthenticated`. Se falso, redireciona para `/` antes de renderizar qualquer página interna.

**Interceptor axios** (`services/api.ts`): injeta automaticamente `login`, `senha` e `ambiente` como query params em todas as requisições — os componentes não precisam saber que as credenciais existem.

---

## Gráficos — HISTORICO_OPERACAO

Quando a tabela selecionada é `HISTORICO_OPERACAO`, o hook chama `buildDashboardData()` que transforma os registros brutos em 5 datasets:

| Gráfico | Tipo | Dado |
|---------|------|------|
| Volume por Data | AreaChart | registros por dia (últimos 30 dias) |
| Operações por Fase | BarChart | contagem por `NUFASEOPERACAO` |
| Distribuição de Fases | PieChart | proporção de cada fase |
| Tempo Médio por Fase | BarChart horizontal | média de dias entre fases consecutivas |
| Top Usuários | BarChart horizontal | top 10 por `COUSUARIOFASE` |

Layout: **1 × 2 × 2** (volume full width, depois dois pares de colunas).

Para qualquer outra tabela, exibe uma tabela HTML paginada (200 linhas).

---

## Componentes UI

Todo componente segue a mesma estrutura:

```
ComponentName/
├── ComponentName.tsx     # componente
└── index.ts              # barrel export
```

**Button** — variantes: `primary`, `secondary`, `ghost`, `danger`. Prop `loading` exibe spinner e bloqueia cliques.

**Input** — suporta `label`, `error`, `leftIcon`. Estilo de foco com ring azul.

**Card** — prop `accent` adiciona borda superior colorida (usada nos cards do AG31).

**Spinner** — `<Loader2>` do lucide com `animate-spin`.

---

## Convenções

**Imports** — ordem obrigatória em todo arquivo:
1. React
2. Bibliotecas externas (next/navigation, axios, recharts...)
3. Componentes internos (`@/components/...`)
4. Contexts (`@/contexts/...`)
5. Hooks (`@/hooks/...`)
6. `import type` de types
7. Arquivos locais (styles, utils)

**Barrel exports** — todo componente e screen exporta via `index.ts`. Imports externos sempre apontam para a pasta, não para o arquivo.

**Strings** — nenhum texto literal em JSX. Tudo vem de `constants/strings.ts`.

**Cores** — nenhuma cor hardcoded em componentes (exceto classes Tailwind com os valores do tema). Cores dinâmicas vêm de `theme/colors.ts`.

---

## Como Rodar

```bash
# Backend (FastAPI) — no diretório raiz
uvicorn api:app --reload

# Frontend — na pasta frontend/
npm run dev
```

Acesse **http://localhost:3000** e faça login com:
- **Usuário**: login SSH (ex: `felipe.freire`)
- **Senha**: senha SSH
- **Ambiente**: caminho do banco Firebird (ex: `/u10/c6bank/dados/scci.gdb`)

A API FastAPI deve estar rodando em `http://localhost:8000` (configurável via `NEXT_PUBLIC_API_URL` no `.env.local`).
