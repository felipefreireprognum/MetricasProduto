# Métricas AG31 — SCCI / FCVS

## Contexto do Projeto

Sistema de visualização e análise de métricas do **AG31** — relatório padrão do **SCCI (Sistema de Controle de Crédito Imobiliário)**, relacionado ao **FCVS (Fundo de Compensação de Variações Salariais)**. Os dados vêm de múltiplos bancos que operam crédito imobiliário (Sicredi, C6 Bank, Itaú) e de um banco de dados Firebird interno.

O AG31 é um relatório mensal que os bancos enviam contendo métricas de:
- **Contratos** (Base Principal e Base de Finalizados): ativos, inativos, com/sem cobertura FCVS, com/sem série, prestações emitidas, baixas processadas, etc.
- **Imóveis**: cadastrados, vagos (novos e retomados), ocupados (ativos e inativos)
- **Originação**: operações iniciadas, concluídas, após avaliação, após assinatura de contrato, tempo por fase

---

## Como Rodar

> **Stack oficial: Next.js (frontend) + FastAPI (backend).** Os arquivos `app.py` e `dashboard.py` (Streamlit) são protótipos antigos — não são mais o produto principal.

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

## Arquivos Principais

### `frontend/` — Frontend Next.js (React 19 + Tailwind + Recharts)
App oficial. Estrutura relevante:
- `src/app/(main)/` — rotas: `/dashboard`, `/ag31`, `/ag31/comparativo`, `/tabelas`
- `src/contexts/AuthContext.tsx` — login, conexão multi-banco em paralelo
- `src/constants/banks.ts` — configuração dos bancos (`BANKS[]`): id, dbType, ambiente, enabled, cores
- `src/services/api.ts` — axios com interceptor de credenciais, aponta para `localhost:8000`
- `src/services/databaseService.ts` — chamadas à API
- `src/components/features/DashboardView/` — view principal do dashboard live
- `src/components/charts/` — gráficos Recharts (TempoMedioFase, OperacoesPorFase, VolumePorData, TopUsuarios)

Bancos configurados em `banks.ts`:
- **C6 Bank** — Firebird, `enabled: true`, ambiente `/u10/c6bank/dados/scci.gdb`
- **Sicoob** — Firebird, `enabled: false`
- **CFAE** — a definir, `enabled: false`
- **Banco Inter** — SQL Server, `enabled: false`

### `api.py` — Backend FastAPI
Endpoints (todos aceitam `?login=&senha=&ambiente=`):
- `GET /tabelas` — lista tabelas do banco
- `GET /tabela/{nome}?limit=&offset=` — retorna dados de uma tabela
- `GET /query?sql=` — executa SQL livre

### `core/database.py` — Conexão Firebird
Conecta via **SSH tunnel** (`sshtunnel`) → **Firebird** (`fdb`), charset `WIN1252`.
Vars de ambiente: `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PASSWORD`, `DB_PORT`, `DB_PATH`, `DB_USER`, `DB_PASSWORD`, `DB_CHARSET`.

---

## Arquivos Legados (não usar como referência)

- `app.py` — protótipo Streamlit com parsers XML/PDF estáticos (Sicredi, C6, Itaú)
- `dashboard.py` — protótipo Streamlit do dashboard live
- `compare_banks.py` — script de comparação terminal

---

## Stack

- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4 + Recharts
- **Backend**: FastAPI + Uvicorn
- **Banco**: Firebird via `fdb`, acesso remoto via SSH tunnel (`sshtunnel`)
- **Parse PDF** (legado): PyMuPDF (`fitz`)
- **Parse XML** (legado): `xml.etree.ElementTree`
- **Dados**: pandas (backend)

---

## Convenções Visuais (frontend)

- Paleta base: azul `#1A5FFF`, fundo `#F8F9FC`, texto `#0F172A`
- Cada banco tem seu próprio objeto `colors` em `banks.ts` (bg, text, accent, badge)
- Fonte: Inter
- Componentes: `Card` com prop `accent`, `SectionTitle`, `LoadingState`, `EmptyState`

---

## Domínio (Glossário)

- **AG31**: Relatório mensal do SCCI enviado pelos bancos ao governo
- **FCVS**: Fundo de Compensação de Variações Salariais — cobertura governamental para contratos antigos
- **SCCI**: Sistema de Controle de Crédito Imobiliário
- **Fase de Operação**: etapas do processo de originação (avaliação, assinatura, etc.)
- **Base Principal / Base de Finalizados**: segmentação dos contratos no AG31
- **HISTORICO_OPERACAO**: tabela principal do Firebird com histórico das operações/fases
