# Backend

API FastAPI responsavel por ler os Parquets em `CONSULTAS/`, consultar bancos quando necessario e entregar os dados usados pelo frontend.

## Entrada

- `api.py`: compatibilidade para o comando atual do Uvicorn.
- `app/main.py`: cria a aplicacao FastAPI, configura CORS e registra os routers.

Comando local:

```powershell
cd backend
uvicorn api:app --reload --port 8001
```

## Organizacao

- `app/main.py`: cria a API, configura CORS e registra os routers.
- `app/routers/metrics.py`: endpoints HTTP atuais.
- `app/core/config.py`: configuracoes tecnicas, incluindo a pasta oficial `CONSULTAS`.
- `app/core/serialization.py`: conversao de objetos pandas/numpy para JSON.
- `app/domain/fases.py`: mapa de fases e macrofases.
- `app/services/parquet_store.py`: leitura/listagem de Parquets.
- `app/services/dashboard_metrics.py`: calculo principal do dashboard.
- `app/services/macro_evolution.py`: comparativo mensal por macrofase.
- `app/db/firebird.py`: conexao Firebird/C6.
- `app/db/sqlserver.py`: conexao SQL Server/Inter.
- `requirements.txt`: dependencias Python.

## Proximos passos seguros

O proximo refactor ideal e dividir `app/routers/metrics.py` em routers menores:

- `app/services/cache.py`
- `app/services/gaps_analysis.py`
- `app/services/jornada_analysis.py`
- `app/routers/dashboard.py`
- `app/routers/parquet.py`
- `app/routers/database.py`
- `app/routers/fases.py`

Isso deve ser feito em etapas pequenas, com validacao apos cada bloco, porque `metrics.py` ainda concentra rotas sensiveis de funil, gaps, cache e filtros.
