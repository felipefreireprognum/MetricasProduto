# Métricas SCCI — Originação / FCVS

## Contexto do Projeto

Sistema de visualização e análise de métricas de **originação de crédito imobiliário** do **SCCI (Sistema de Controle de Crédito Imobiliário)**, relacionado ao **FCVS (Fundo de Compensação de Variações Salariais)**. Os dados vêm de múltiplos bancos (C6 Bank, Banco Inter) via banco de dados Firebird interno.

O foco é o funil de originação: propostas iniciadas por fase, conversão, abandono, tempo médio por etapa e jornada por CPF.

---

## Como Rodar

**Terminal 1 — Backend**
```bash
cd backend
uvicorn api:app --reload --port 8000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```
Acesso: `http://localhost:3000`

---

## Arquitetura de Dados (Data Warehouse Local)

Os dados **não são consultados em tempo real**. O padrão é ETL → arquivo local → dashboard:

```
[Firebird / SQL Server via SSH]
          ↓  (Atualizar ou Expandir na tela Fontes)
[backend/CONSULTAS/metricas_<banco>_<ambiente>.parquet]   ← warehouse local
          ↓  (cada requisição ao /dashboard ou /parquet/dados)
[FastAPI lê Parquet + pandas processa em memória]   ← sub-segundo
          ↓
[Next.js renderiza gráficos / tabela]
```

**Por que Parquet?**
- 5–10× mais rápido para ler do que JSON
- ~10× menor (compressão Snappy)
- Tipos preservados (datas são datas, não strings)
- Base para exportar CSV futuramente

**Localização dos arquivos:** pasta `backend/CONSULTAS/`, ignorada pelo git.
Nome gerado por `_cache_path(banco, ambiente)` → ex: `backend/CONSULTAS/metricas_c6_scci.parquet`

---

## Fluxos de Dados

### Leitura (ao abrir o app)
1. `GET /dashboard?banco=c6` — lê `.parquet`, processa com `_build_dashboard_data()`, retorna `DashboardData`
2. Frontend renderiza gráficos — sem SQL, sem dados brutos

### Atualizar (botão na tela Fontes)
Busca os **N registros mais recentes** (`ORDER BY DT_INICIO_FASE DESC`) e mescla com o Parquet existente.
- Query: `SELECT FIRST {limit} ... ORDER BY DT_INICIO_FASE DESC`
- Deduplicação: `drop_duplicates(subset=['NU_OPERACAO', 'NU_FASE_OPERACAO'], keep='last')`
- Se nada mudou no banco, o Parquet fica inalterado

### Expandir (botão na tela Fontes)
Busca os **N registros anteriores** ao mais antigo já salvo no Parquet — acumula histórico sem refazer consultas grandes.
- Query: `SELECT FIRST {limit} ... WHERE DT_INICIO_FASE < '{min_date}' ORDER BY DT_INICIO_FASE DESC`
- Mesma deduplicação do Atualizar
- Requer que o Parquet já exista (use Atualizar primeiro)
- Padrão para chegar em 1M+ de registros sem nunca fazer SELECT de 1M

---

## Endpoints da API (`backend/api.py`)

### Dashboard
- `GET /dashboard?banco=&ambiente=` — lê Parquet, processa, retorna `DashboardData`

### Cache / ETL
- `GET /cache/refresh?banco=&limit=&login=&senha=&ambiente=` — busca últimos N registros do DB → merge → salva Parquet → retorna `DashboardData`
- `GET /cache/expand?banco=&limit=&login=&senha=&ambiente=` — busca N registros anteriores ao mais antigo do Parquet → merge → salva → retorna `DashboardData` + `adicionados`

### BD de Métricas (Parquet explorer)
- `GET /parquet/info?banco=&ambiente=` — metadados do Parquet: total, colunas, dtInicio, dtFim
- `GET /parquet/dados?banco=&ambiente=&limit=&offset=&ordem=&desc=` — linhas paginadas e ordenadas do Parquet

### Histórico (consulta live)
- `GET /historico?banco=&limit=&inicio=&fim=&login=&senha=&ambiente=` — consulta live ao HISTORICO_OPERACAO com filtros de data (sem SQL no frontend)

### Exploração do banco vivo (tela Consulta BD)
- `GET /tabelas` — lista tabelas do Firebird
- `GET /tabela/{nome}?limit=&offset=` — dados de uma tabela
- `GET /query?sql=` — SQL livre (uso interno/admin)
- `GET /inter/tabelas`, `GET /inter/tabela/{nome}` — equivalentes para SQL Server

### Serialização numpy
`api.py` tem `_NpEncoder` e `_to_native()` para converter tipos pandas/numpy (`int64`, `float64`, `Timestamp`) para Python nativo antes do FastAPI serializar. `_build_dashboard_data()` sempre retorna `_to_native({...})`.

---

## Estrutura de Pastas

```
Metricas/
├── backend/
│   ├── api.py                   ← FastAPI principal
│   ├── core/
│   │   ├── database.py          ← Firebird via SSH
│   │   └── database_sqlserver.py ← SQL Server via SSH
│   ├── requirements.txt
│   ├── .env                     ← credenciais (não versionado)
│   ├── .env.example
│   └── CONSULTAS/               ← warehouse Parquet (não versionado)
├── frontend/                    ← Next.js
│   └── src/...
├── CLAUDE.md
├── CODEX.md
└── README.md
```

---

## Função Central: `_build_dashboard_data(df)`

Recebe um DataFrame pandas e retorna o shape `DashboardData`:
- `kpis` — totalRegistros, operacoesUnicas, fasesUnicas, topUsuario, taxaConversao, tempoMedioTotal, etc.
- `evolucaoMensal` — agrupamento por mês/ano
- `operacoesPorFase` / `distribuicaoFases` — contagem por NO_FASE_WEB
- `topUsuarios` — top 10 por volume
- `tempoMedioPorFase` — dias médios por etapa (calculado via shift por operação)
- `volumePorData` — registros por data
- `colunas`, `primeiraLinha` — metadados do DataFrame

Colunas internas usam nomes sem `_` prefixado para evitar renomeação do `itertuples()` do pandas: `FASE_NOME`, `DIAS_DIFF`, `NEXT_DT`.

---

## FASE_WEB — Mapeamento de fases

`NU_FASE_OPERACAO` (número) → `NO_FASE_WEB` (nome legível), calculado no ETL e salvo no Parquet:

| Etapa | Códigos |
|---|---|
| Simulação | 0, 1 |
| Cadastro | 50, 80, 90 |
| Crédito | 100, 101 |
| Negociação | 200–202 |
| Análise de Documentos | 300, 301 |
| Análise Técnica | 400–409 |
| Formalização | 500–506, 600, 601 |
| Liberação | 700, 701 |
| Concluído | 800 |
| Cancelada | 900–935, 1000 |

---

## Conexões com Banco de Dados

### `backend/core/database.py` — Firebird
Conecta via **SSH tunnel** (`sshtunnel`) → **Firebird** (`fdb`), charset `WIN1252`.
Tunnel reutilizado entre requisições; recriado se credenciais mudarem.
Vars: `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PASSWORD`, `DB_PORT`, `DB_PATH`, `DB_USER`, `DB_PASSWORD`, `DB_CHARSET`.

### `backend/core/database_sqlserver.py` — SQL Server
Mesmo padrão, para o Banco Inter (`enabled: false` no frontend).
Vars: `INTER_DB_HOST`, `INTER_DB_PORT`, `INTER_DB_USER`, `INTER_DB_PASSWORD`, `INTER_DB_NAME`.

---

## Frontend — Estrutura

### Rotas (`src/app/(main)/`)
| Rota | Tela | Descrição |
|---|---|---|
| `/dashboard` | DashboardScreen | Visão geral — KPIs, evolução mensal, funil |
| `/fases` | FaseAnalysisScreen | Funil chevron com drill-down por fase |
| `/tendencias` | TendenciasScreen | Série temporal de iniciadas/concluídas/conversão |
| `/rankings` | RankingsScreen | Top usuários, fases por volume/tempo/abandono |
| `/diagnostico` | DiagnosticoScreen | Semáforo automático: severidade por indicador |
| `/jornada` | JornadaScreen | Jornada por CPF — pizza + MacroPhaseBar |
| `/explorer` | ExplorerScreen | BD Métricas — tabela paginada do Parquet |
| `/dados` | DadosScreen | Fontes — Atualizar / Expandir warehouse |
| `/tabelas` | TabelasScreen | Consulta BD — acesso vivo ao Firebird |

### Navegação (sidebar) — ordem
Visão Geral → Por Fase → Tendências → Rankings → Diagnóstico → Jornada → BD Métricas → Fontes → Consulta BD → (em breve: Comparativo, Cancelamentos, Relatórios)

### Contextos principais
- `AuthContext` — login, credenciais SSH por banco, tokens de tema
- `CacheContext` — estado por banco: `data`, `lastUpdated`, `refreshing`, `limite`, `error`; expõe `fetchBanco()` (Atualizar) e `expandBanco()` (Expandir)
- `FiltersContext` — período, bancos visíveis, consolidação

### Services (`src/services/databaseService.ts`)
- `getDashboard(banco, ambiente?)` — lê `/dashboard`
- `atualizarCache(banco, limit, ambiente?)` — chama `/cache/refresh`
- `expandirCache(banco, limit, ambiente?)` — chama `/cache/expand`, retorna `adicionados`
- `parquetInfo(banco, ambiente?)` — metadados do Parquet
- `parquetDados(banco, ambiente?, limit, offset, ordem, desc)` — linhas paginadas
- `listarTabelas()`, `buscarTabela()`, `executarQuery()` — exploração do banco vivo
- `inter.*` — equivalentes para SQL Server

### Tela Fontes (`/dados`) — DadosScreen
Card por banco com:
- Status badge (buscando / erro / cache / atualizado)
- Contadores: Registros e Operações
- Seletor de limite: segmented control `[20k] [50k] [100k] [200k]`
- **Atualizar** — busca os N mais recentes, mescla sem duplicar
- **Expandir** — adiciona N registros anteriores ao mais antigo, acumula sem duplicar
- Explicação inline de cada botão

### Tela BD de Métricas (`/explorer`) — ExplorerScreen
- Tabela paginada do Parquet com colunas clicáveis para ordenar
- Badges coloridos por etapa (NO_FASE_WEB)
- Seletor de linhas por página: `[50] [100] [200]`
- Paginação com números de página
- Loading overlay suave ao trocar página
- Colunas exibidas: Operação, Cód. Fase, Etapa, Data início, Usuário

### Bancos configurados (`src/constants/banks.ts`)
- **C6 Bank** — Firebird, `enabled: true`, ambiente `/u10/c6bank/dados/scci.gdb`
- **Banco Inter** — SQL Server, `enabled: false`

### Tipos centrais (`src/types/dashboard/index.ts`)
- `DashboardData` — shape retornado pelo backend
- `BancoCache` — estado por banco no CacheContext

---

## Stack

- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4 + Recharts
- **Backend**: FastAPI + Uvicorn + pandas + pyarrow
- **Banco Firebird**: `fdb` via SSH tunnel (`sshtunnel`, `paramiko`)
- **Banco SQL Server**: `pymssql` via SSH tunnel
- **Warehouse local**: Parquet (compressão Snappy) em `CONSULTAS/`

---

## Convenções Visuais

- Paleta base: azul `#1A5FFF`, fundo `#F8F9FC`, texto `#0F172A`
- Cada banco tem seu próprio objeto `colors` em `banks.ts`
- Seletores de opções: segmented control (estilo pill), não `<select>` nativo
- Fonte: Inter

---

## Domínio (Glossário)

- **AG31**: Relatório mensal do SCCI enviado pelos bancos ao governo
- **FCVS**: Fundo de Compensação de Variações Salariais — cobertura governamental para contratos antigos
- **SCCI**: Sistema de Controle de Crédito Imobiliário
- **Fase de Operação**: etapas do processo de originação (avaliação, assinatura, etc.)
- **Base Principal / Base de Finalizados**: segmentação dos contratos no AG31
- **HISTORICO_OPERACAO**: tabela principal do Firebird com histórico das operações/fases
- **NO_FASE_WEB**: coluna calculada no ETL mapeando `NU_FASE_OPERACAO` → nome legível
