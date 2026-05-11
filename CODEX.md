# Métricas SCCI — Originação / FCVS

## Objetivo do Projeto

Sistema interno de visualização e análise de métricas de **originação de crédito imobiliário** no **SCCI (Sistema de Controle de Crédito Imobiliário)** relacionado ao **FCVS**. O projeto cruza dados de fases do processo, usuários, CPFs e histórico local em Parquet para gerar dashboards analíticos.

O foco atual do produto é:
- Visão geral do funil de propostas por macrofase.
- Análise por fase, tendências e rankings.
- Diagnóstico automático por indicador (severidade).
- Jornada da pessoa por CPF.
- BD de métricas local em Parquet com expansão histórica.

---

## Stack

- **Backend**: FastAPI, Uvicorn, pandas, pyarrow.
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Recharts, lucide-react.
- **Bancos**: Firebird via SSH tunnel; SQL Server previsto/desabilitado para Banco Inter.
- **Warehouse local**: arquivos Parquet em `CONSULTAS/`.

---

## Como Rodar

Backend:
```bash
cd backend
uvicorn api:app --reload --port 8000
```

Frontend:
```bash
cd frontend
npm run dev
```

Acesso local:
```text
http://localhost:3000
```

---

## Arquitetura de Dados

O dashboard não deve depender de SQL em tempo real para renderizar. O fluxo principal é:

```text
Firebird / SQL Server via SSH
  -> ETL pelos endpoints de cache
  -> backend/CONSULTAS/metricas_<banco>_<ambiente>.parquet
  -> FastAPI le Parquet com pandas
  -> Next.js renderiza graficos e tabelas
```

`backend/CONSULTAS/` é dado local/cache e deve continuar fora do Git.

---

## Backend

Arquivo principal:
- `backend/api.py`

Conexões:
- `backend/core/database.py`: Firebird via SSH tunnel.
- `backend/core/database_sqlserver.py`: SQL Server via SSH tunnel.

Endpoints importantes:
- `GET /dashboard?banco=&ambiente=`
- `GET /cache/refresh?banco=&limit=&login=&senha=&ambiente=`
- `GET /cache/expand?banco=&limit=&login=&senha=&ambiente=`
- `GET /parquet/info?banco=&ambiente=`
- `GET /parquet/dados?banco=&ambiente=&limit=&offset=&ordem=&desc=`
- `GET /historico?banco=&limit=&inicio=&fim=&login=&senha=&ambiente=`
- `GET /jornada?banco=&ambiente=`
- `GET /tabelas`, `GET /tabela/{nome}`, `GET /query`

Funções centrais:
- `_cache_path(banco, ambiente)`: define o caminho do Parquet.
- `_apply_fase_map(df, banco)`: aplica o mapeamento de fases.
- `_build_dashboard_data(df)`: monta o shape usado pelo frontend.
- `_to_native(obj)`: converte pandas/numpy para JSON serializavel.

Ao alterar métricas, mantenha compatibilidade com os tipos em `frontend/src/types/dashboard/index.ts`.

---

## Frontend

Rotas principais:
- `/dashboard`: visão geral — KPIs, evolução, funil.
- `/fases`: funil chevron com drill-down por fase.
- `/tendencias`: série temporal de iniciadas/concluídas/conversão.
- `/rankings`: rankings de fases, usuários e CPFs.
- `/diagnostico`: semáforo automático por indicador.
- `/jornada`: jornada da pessoa por CPF.
- `/explorer`: BD Métricas / Parquet explorer.
- `/dados`: Fontes / atualização e expansão do warehouse.
- `/tabelas`: consulta viva ao banco.

Arquivos importantes:
- `frontend/src/services/databaseService.ts`
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/contexts/CacheContext.tsx`
- `frontend/src/contexts/FiltersContext.tsx`
- `frontend/src/constants/banks.ts`
- `frontend/src/constants/routes.ts`
- `frontend/src/theme/phaseColors.ts`
- `frontend/src/types/dashboard/index.ts`

Componentes e telas recentes:
- `frontend/src/screens/JornadaScreen/JornadaScreen.tsx`
- `frontend/src/screens/RankingsScreen/RankingsScreen.tsx`
- `frontend/src/screens/TendenciasScreen/TendenciasScreen.tsx`
- `frontend/src/components/features/MacroPhaseBar/MacroPhaseBar.tsx`
- `frontend/src/components/features/CpfInsightsPanel/CpfInsightsPanel.tsx`

---

## Domínio

Mapeamento de macrofases:

| Macrofase (raw Parquet) | Códigos | Exibido no frontend |
|---|---|---|
| Simulação | 0, 1 | Simulação |
| Cadastro | 50, 80, 90 | Cadastro |
| Crédito | 100, 101 | Crédito |
| Negociação | 200-202 | Negociação |
| Análise de Documentos | 300, 301 | Análise de Documentos |
| Análise Técnica | 400-409 | Análise Técnica |
| Formalização | 500-505 | Emissão de Contrato* |
| Formalização | 600-601 | Registro de Contratos* |
| Liberação | 700-701 | Registro de Contratos* |
| Concluído | 800 | Concluído |
| Cancelada | 900-938, 1000 | Cancelada |

*Migração aplicada em `_build_dashboard_data` ao ler o Parquet.

Termos:
- **AG31**: relatório mensal do SCCI.
- **SCCI**: Sistema de Controle de Crédito Imobiliário.
- **FCVS**: Fundo de Compensação de Variações Salariais.
- **HISTORICO_OPERACAO**: tabela base do histórico de fases.
- **NU_OPERACAO**: identificador da operação.
- **NU_CPF**: identificador da pessoa, usado nas análises de jornada/reincidência.
- **NO_FASE / MACROFASE**: nomes calculados para apresentação.

---

## Cuidados Para Codex

- Não commitar nem imprimir credenciais, `.env`, senhas SSH ou dados sensíveis.
- Não versionar `CONSULTAS/`, caches locais, `.next/` ou arquivos gerados.
- Antes de editar, verificar `git status` porque o usuário pode ter mudanças locais.
- Não reverter alterações existentes sem pedido explícito.
- Preferir mudanças pequenas e compatíveis com os padrões já existentes.
- Se mexer no shape da API, atualizar os tipos TypeScript correspondentes.
- Se mexer em cálculo de métrica, preservar nomes e compatibilidade usados por telas existentes.
- Evitar SQL livre no frontend; consultas vivas passam pelos endpoints do backend.
- O app roda em caminho Windows montado no WSL (`/mnt/c/...`), então builds do Next podem ter problemas de permissão em `.next`.
- Se `npm run build` falhar com Turbopack em `/mnt/c`, validar com `npx next build --webpack`.
- `next/font/google` pode falhar sem rede; preferir fontes locais/sistema para build reprodutivel.
- Se `sharp` ou SWC falhar no WSL, conferir dependências opcionais Linux no `node_modules`.

---

## Validação Recomendada

Frontend:
```bash
cd frontend
npx tsc --noEmit
npx next build --webpack
```

Backend:
```bash
cd backend
uvicorn api:app --reload --port 8000
```

Sanidade Git:
```bash
git status --short --branch
git diff --stat
```

---

## Estrutura de Pastas

```
Metricas/
├── backend/
│   ├── api.py
│   ├── core/
│   │   ├── database.py
│   │   └── database_sqlserver.py
│   ├── requirements.txt
│   ├── .env
│   ├── .env.example
│   └── CONSULTAS/          ← warehouse Parquet (não versionado)
├── frontend/               ← Next.js
│   └── src/...
├── CLAUDE.md
├── CODEX.md
└── README.md
```
