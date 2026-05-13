# Arquitetura Técnica — Métricas SCCI / FCVS

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, Recharts, lucide-react |
| Backend | FastAPI, Uvicorn, pandas, pyarrow |
| Banco principal | Firebird via SSH tunnel (`fdb` + `sshtunnel` + `paramiko`) |
| Banco secundário | SQL Server via SSH tunnel (`pymssql`) — previsto, desabilitado |
| Warehouse local | Parquet com compressão Snappy em `backend/CONSULTAS/` |
| Linguagem | Python 3.11+ (backend), TypeScript 5 (frontend) |

---

## Fluxo de Dados

```
[Firebird / SQL Server]
     via SSH tunnel (sshtunnel)
          │
          ▼
    [FastAPI / api.py]
     ETL: query → DataFrame pandas → dedup → salva Parquet
          │
          ▼
  [CONSULTAS/metricas_<banco>_<ambiente>.parquet]
     warehouse local — não versionado
          │
          ▼
    [FastAPI / api.py]
     lê Parquet → _build_dashboard_data() → JSON
          │
          ▼
    [Next.js frontend]
     contexts → screens → components → gráficos
```

O frontend **nunca consulta o banco diretamente** — toda leitura passa pelo Parquet via FastAPI.

---

## Backend (`backend/api.py`)

### Funções centrais

| Função | Responsabilidade |
|---|---|
| `_cache_path(banco, ambiente)` | Gera o caminho `CONSULTAS/metricas_<banco>_<ambiente>.parquet` |
| `_apply_fase_map(df, banco)` | Aplica o mapeamento `NU_FASE_OPERACAO → NO_FASE_WEB` |
| `_build_dashboard_data(df)` | Processa o DataFrame e monta o shape `DashboardData` |
| `_to_native(obj)` | Converte tipos pandas/numpy para Python nativo (JSON-serializável) |

### Mapeamento de fases (`FASE_MAP`)

`NU_FASE_OPERACAO` (inteiro) → `(NO_FASE, MACROFASE)` — escrito no Parquet com nomes brutos:
- 500–601 → Formalização
- 700–701 → Liberação
- 900–1000 → Cancelada
- etc.

**Migração em `_build_dashboard_data`**: ao ler o Parquet, converte nomes brutos para nomes de exibição:
- `Formalização` → `Emissão de Contrato`
- `Liberação` → `Registro de Contratos`

Isso garante retrocompatibilidade — Parquets antigos com nomes brutos são convertidos na leitura.

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/dashboard` | Lê Parquet → processa → retorna `DashboardData` |
| GET | `/cache/refresh` | ETL: N mais recentes do banco → merge → salva Parquet → retorna dados |
| GET | `/cache/expand` | ETL: N anteriores ao mais antigo → merge → salva Parquet → retorna `adicionados` |
| GET | `/parquet/info` | Metadados do Parquet: total, colunas, dtInicio, dtFim |
| GET | `/parquet/dados` | Linhas paginadas e ordenadas do Parquet |
| GET | `/jornada` | Dados agregados por CPF: distribuição, reincidência, tempo médio |
| GET | `/historico` | Consulta live ao `HISTORICO_OPERACAO` com filtros de data |
| GET | `/tabelas` | Lista tabelas do Firebird |
| GET | `/tabela/{nome}` | Dados paginados de uma tabela |
| GET | `/query` | SQL livre (uso administrativo) |

Parâmetros comuns: `banco=`, `ambiente=`, `login=`, `senha=`, `limit=`, `offset=`.

### ETL — Atualizar (`/cache/refresh`)

```
SELECT FIRST {limit} * FROM HISTORICO_OPERACAO ORDER BY DT_INICIO_FASE DESC
  → merge com Parquet existente
  → drop_duplicates(subset=['NU_OPERACAO', 'NU_FASE_OPERACAO'], keep='last')
  → salva Parquet
```

### ETL — Expandir (`/cache/expand`)

```
SELECT FIRST {limit} * FROM HISTORICO_OPERACAO
  WHERE DT_INICIO_FASE < '{min_date_no_parquet}'
  ORDER BY DT_INICIO_FASE DESC
  → concat com Parquet existente
  → drop_duplicates(...)
  → salva Parquet
```

Exige que o Parquet já exista. Acumula histórico sem refazer consultas grandes.

### Conexões (`core/`)

- **`database.py`** — Firebird: SSH tunnel → porta local → `fdb.connect()`, charset `WIN1252`. Tunnel reutilizado entre requisições.
- **`database_sqlserver.py`** — SQL Server: mesmo padrão com `pymssql`.

---

## Frontend (`frontend/src/`)

### App Router — Estrutura de pastas

```
src/app/
├── layout.tsx              ← RootLayout: AuthProvider, metadados
├── globals.css
├── (auth)/
│   └── page.tsx            ← / (login)
└── (main)/
    ├── layout.tsx          ← MainLayout: Sidebar + proteção de rota
    ├── dashboard/page.tsx
    ├── fases/page.tsx
    ├── tendencias/page.tsx
    ├── rankings/page.tsx
    ├── diagnostico/page.tsx
    ├── jornada/page.tsx
    ├── explorer/page.tsx
    ├── dados/page.tsx
    └── tabelas/page.tsx
```

Cada `page.tsx` importa a tela correspondente de `src/screens/`.

### Screens

| Tela | Arquivo | Rota |
|---|---|---|
| Login | `LoginScreen/LoginScreen.tsx` | `/` |
| Visão Geral | `DashboardScreen/` | `/dashboard` |
| Por Fase | `FaseAnalysisScreen/` | `/fases` |
| Tendências | `TendenciasScreen/` | `/tendencias` |
| Rankings | `RankingsScreen/` | `/rankings` |
| Diagnóstico | `DiagnosticoScreen/` | `/diagnostico` |
| Jornada | `JornadaScreen/` | `/jornada` |
| BD Métricas | `ExplorerScreen/` | `/explorer` |
| Fontes | `DadosScreen/` | `/dados` |
| Consulta BD | `TabelasScreen/` | `/tabelas` |

### Componentes principais (`src/components/features/`)

| Componente | Uso |
|---|---|
| `MacroMilestones/` | Funil de macrofases — modos: `funnel`, `detail`, `expand`, `chevron` |
| `MacroPhaseBar/` | Barra de progresso horizontal por macrofase (excl. pós-emissão) |
| `PhaseBreakdown/` | Drill-down de fases dentro de uma macrofase |
| `EvolutionChart/` | Gráfico de evolução mensal (barras + linha de conversão) |
| `CpfInsightsPanel/` | KPIs de CPF: únicos, reincidentes, tempo médio |
| `CompanyPerformance/` | Comparativo de desempenho por banco |
| `KpiCard/` | Card de indicador único |
| `FunnelChart/` | Gráfico de funil |

#### MacroMilestones — modos

- `funnel` — cards compactos em grade (tela Visão Geral)
- `detail` — tabela com tempo médio e abandono (tela Por Fase)
- `expand` — versão expandida com métricas detalhadas
- `chevron` — chevrons clicáveis para drill-down (tela Por Fase)

O componente separa internamente `funnelRows` (macrofases principais) de `posEmissaoRows` (Registro de Contratos) e renderiza a seção "Pós-emissão" fora do funil.

### Contextos (`src/contexts/`)

| Contexto | Responsabilidade |
|---|---|
| `AuthContext` | Login, credenciais SSH por banco, estado de autenticação |
| `CacheContext` | Estado do cache por banco (`data`, `lastUpdated`, `refreshing`, `error`); expõe `fetchBanco()` e `expandBanco()` |
| `FiltersContext` | Período selecionado, bancos visíveis, modo de consolidação |

### Services (`src/services/databaseService.ts`)

Camada de abstração sobre os endpoints FastAPI:

```typescript
getDashboard(banco, ambiente?)           → DashboardData
atualizarCache(banco, limit, ambiente?)  → DashboardData
expandirCache(banco, limit, ambiente?)   → { adicionados: number }
parquetInfo(banco, ambiente?)            → ParquetInfo
parquetDados(banco, ambiente?, ...)      → { dados[], total }
listarTabelas()                          → string[]
buscarTabela(nome, limit, offset)        → { colunas[], linhas[] }
executarQuery(sql)                       → any
```

### Constantes e Tema

| Arquivo | Conteúdo |
|---|---|
| `constants/banks.ts` | Configuração dos bancos: nome, cor, tipo de BD, `enabled` |
| `constants/routes.ts` | Mapa de rotas (`ROUTES.DASHBOARD`, etc.) |
| `theme/tokens.ts` | Tokens de cor por banco (`BankTokens`): primary, text, border, bg |
| `theme/phaseColors.ts` | `MACROFASE_COLOR`, `MACROFASE_BADGE`, `PIPELINE_STAGES` |

#### `PIPELINE_STAGES` (em `phaseColors.ts`)

Array ordenado com todas as etapas do funil — usado pelo `ExplorerScreen` para renderizar a mini-barra de progresso por registro. Inclui Registro de Contratos para cobertura completa do histórico.

### Tipos TypeScript (`src/types/dashboard/index.ts`)

```typescript
interface DashboardData {
  kpis: {
    totalRegistros: number;
    operacoesUnicas: number;
    taxaConversao: number;
    tempoMedioTotal: number;
    topUsuario: string;
    // ...
  };
  evolucaoMensal: EvolucaoMensal[];
  macrofases: MacrofaseTotal[];
  topUsuarios: TopUsuario[];
  tempoMedioPorFase: TempoMedioPorFase[];
  distribuicaoFases: DistribuicaoFase[];
  // ...
}

interface MacrofaseTotal {
  id: string;           // ex: 'Emissão de Contrato'
  label: string;
  count: number;
  reprovados?: number;  // apenas macrofase Crédito
  abandonos: number;
  emAndamento: number;
  tempoMedio: number;
}
```

---

## Convenções Visuais

- Paleta base: azul `#1A5FFF`, fundo `#F8F9FC`, texto `#0F172A`
- Seletores: segmented control (pill), não `<select>` nativo
- Fonte: Inter (sistema)
- Tokens por banco em `tokens.ts` — evita hardcode de cores por banco nos componentes

---

## Cuidados de Build (WSL / Windows)

- App roda em caminho Windows montado no WSL (`/mnt/c/...`)
- Se `npm run build` falhar com Turbopack: `npx next build --webpack`
- `next/font/google` pode falhar sem rede — preferir fontes locais
- `sharp` ou SWC nativos podem precisar de rebuild no WSL: `npm rebuild`
- `.next/` não é versionado — deletar para limpar cache de tipos TypeScript

---

## Estrutura de Pastas

```
Metricas/
├── backend/
│   ├── api.py                  ← FastAPI principal
│   ├── core/
│   │   ├── database.py         ← Firebird via SSH tunnel
│   │   └── database_sqlserver.py
│   ├── requirements.txt
│   ├── .env                    ← não versionado
│   ├── .env.example
│   └── CONSULTAS/              ← Parquet warehouse (não versionado)
│       └── metricas_<banco>_<ambiente>.parquet
├── frontend/
│   ├── src/
│   │   ├── app/                ← App Router Next.js
│   │   │   ├── layout.tsx
│   │   │   ├── (auth)/
│   │   │   └── (main)/
│   │   ├── screens/            ← uma pasta por tela
│   │   ├── components/
│   │   │   ├── features/       ← componentes de domínio
│   │   │   ├── layout/         ← Sidebar, Header
│   │   │   └── ui/             ← componentes genéricos
│   │   ├── contexts/           ← AuthContext, CacheContext, FiltersContext
│   │   ├── services/           ← databaseService.ts
│   │   ├── hooks/              ← useLoginForm, useFilters, etc.
│   │   ├── constants/          ← banks.ts, routes.ts
│   │   ├── theme/              ← tokens.ts, phaseColors.ts
│   │   ├── types/              ← dashboard/index.ts, etc.
│   │   └── assets/             ← imagens estáticas (logo)
│   ├── package.json
│   └── next.config.ts
├── CLAUDE.md                   ← instruções para o Claude Code
├── CODEX.md                    ← referência técnica compacta
├── PRODUTO.md                  ← visão conceitual do produto
└── ARQUITETURA.md              ← este arquivo
```
