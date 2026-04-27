# Métricas AG31 — SCCI / FCVS

## Contexto do Projeto

Sistema de visualização e análise de métricas do **AG31** — relatório padrão do **SCCI (Sistema de Controle de Crédito Imobiliário)**, relacionado ao **FCVS (Fundo de Compensação de Variações Salariais)**. Os dados vêm de múltiplos bancos que operam crédito imobiliário (C6 Bank, Banco Inter) e de um banco de dados Firebird interno.

O AG31 é um relatório mensal que os bancos enviam contendo métricas de:
- **Contratos** (Base Principal e Base de Finalizados): ativos, inativos, com/sem cobertura FCVS, com/sem série, prestações emitidas, baixas processadas, etc.
- **Imóveis**: cadastrados, vagos (novos e retomados), ocupados (ativos e inativos)
- **Originação**: operações iniciadas, concluídas, após avaliação, após assinatura de contrato, tempo por fase

---

## Como Rodar

**Terminal 1 — Backend**
```bash
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
[CONSULTAS/metricas_<banco>_<ambiente>.parquet]   ← warehouse local
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

**Localização dos arquivos:** pasta `CONSULTAS/`, ignorada pelo git.
Nome gerado por `_cache_path(banco, ambiente)` → ex: `CONSULTAS/metricas_c6_scci.parquet`

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

## Endpoints da API (`api.py`)

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

### `core/database.py` — Firebird
Conecta via **SSH tunnel** (`sshtunnel`) → **Firebird** (`fdb`), charset `WIN1252`.
Tunnel reutilizado entre requisições; recriado se credenciais mudarem.
Vars: `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PASSWORD`, `DB_PORT`, `DB_PATH`, `DB_USER`, `DB_PASSWORD`, `DB_CHARSET`.

### `core/database_sqlserver.py` — SQL Server
Mesmo padrão, para o Banco Inter (`enabled: false` no frontend).
Vars: `INTER_DB_HOST`, `INTER_DB_PORT`, `INTER_DB_USER`, `INTER_DB_PASSWORD`, `INTER_DB_NAME`.

---

## Frontend — Estrutura

### Rotas (`src/app/(main)/`)
| Rota | Tela | Descrição |
|---|---|---|
| `/dashboard` | DashboardScreen | Visão geral com gráficos |
| `/fases` | FasesScreen | Análise por fase |
| `/explorer` | ExplorerScreen | BD de Métricas — tabela do Parquet |
| `/dados` | DadosScreen | Fontes — gestão de conexões e Parquet |
| `/tabelas` | TabelasScreen | Consulta BD — acesso vivo ao Firebird |
| `/ag31` | AG31Screen | Relatório AG31 |

### Navegação (sidebar) — ordem
Visão Geral → Por Fase → BD Métricas → Fontes → Consulta BD → (em breve: Comparativo, Abandono, Tendências, Relatórios)

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
