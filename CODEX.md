# Metricas SCCI - Contexto para Codex

Este arquivo e o guia rapido para trabalho no repositorio. A documentacao detalhada fica em `docs/`.

## Prioridade de Leitura

Antes de mexer em calculos ou funil:

1. `docs/metodologia/GAPS_TRANSICOES.md`
2. `docs/metodologia/METODOLOGIA_EVOLUCAO_MACROFASES.md`
3. `docs/sessoes/SESSAO_2025-05-12.md`

Para contexto geral:

- `docs/produto/PRODUTO.md`
- `docs/arquitetura/ARQUITETURA.md`
- `README.md`

## Projeto

Dashboard interno de metricas de originacao de credito imobiliario no SCCI/FCVS.

Fluxo principal:

```text
Banco remoto via SSH
-> endpoints de cache
-> Parquet local em backend/CONSULTAS/
-> FastAPI processa com pandas
-> Next.js renderiza dashboards
```

## Como Rodar

Backend:

```powershell
cd backend
conda activate metrics
uvicorn api:app --reload --port 8001
```

Frontend:

```powershell
cd frontend
npm run dev -- --port 3001
```

Observacao: `api.py` fica dentro de `backend/`. Rodar `uvicorn api:app` a partir da raiz causa `Could not import module "api"`.

## Backend

Arquivos principais:

- `backend/api.py`: FastAPI, ETL/cache, dashboard, gaps, jornada.
- `backend/core/database.py`: Firebird via SSH tunnel.
- `backend/core/database_sqlserver.py`: SQL Server.
- `backend/requirements.txt`: dependencias Python.

Endpoints mais usados:

- `/dashboard`
- `/cache/refresh`
- `/cache/expand`
- `/parquet/info`
- `/parquet/dados`
- `/gaps`
- `/jornada`
- `/tabelas`, `/tabela/{nome}`, `/query`

## Frontend

Arquivos principais:

- `frontend/src/screens/DashboardScreen/DashboardScreen.tsx`
- `frontend/src/screens/FaseAnalysisScreen/FaseAnalysisScreen.tsx`
- `frontend/src/components/features/MacroPhaseBar/MacroPhaseBar.tsx`
- `frontend/src/components/features/MacroMilestones/MacroMilestones.tsx`
- `frontend/src/components/features/GapsModal/GapsModal.tsx`
- `frontend/src/services/databaseService.ts`
- `frontend/src/types/dashboard/index.ts`
- `frontend/src/contexts/FiltersContext.tsx`

## Regras de Metodologia

Use nomes precisos:

- `phase_counts`: passou por fase especifica.
- `macrofaseTotais`: funil acumulado, maior fase atingida.
- `transicoes`: fluxo reconstruido por pares consecutivos.
- `emAndamento`: ultima fase registrada.

Registro:

- Fase 600 e o marco principal de Registro do Contrato.
- Para cobranca/validacao, usar volume da fase 600.
- Fases 601, 700 e 701 sao pos-registro/acompanhamento operacional.

Evolucao mensal por macrofase:

- Deve contar operacoes unicas com registro real na macrofase dentro do mes.
- Usa `DT_INICIO_FASE`.
- Nao e funil acumulado.

Transicoes:

- `Recebeu de` e `Saiu para` sao diagnostico de fluxo.
- A soma pode nao fechar com total da fase por causa de filtro de periodo, timestamp igual, entrada direta, ajuste manual ou registro retroativo.

## Cuidados de Implementacao

- Nao alterar CSS/estrutura visual quando o pedido for apenas de logica.
- Nao reverter mudancas do usuario.
- Antes de mudar shape da API, atualizar tipos TypeScript.
- Antes de mudar calculo, atualizar/consultar docs em `docs/metodologia/`.
- Manter `backend/CONSULTAS/`, `.env`, `.next/` e caches fora do Git.
- Preferir alteracoes pequenas e verificaveis.

## Validacao

Backend:

```powershell
python -m py_compile backend\api.py
```

Frontend:

```powershell
cd frontend
.\node_modules\.bin\tsc.cmd --noEmit
```

Observacao: no ambiente atual, o TypeScript pode falhar por erros ja existentes em `RankingsScreen.tsx`; diferencie erro novo de erro preexistente.

