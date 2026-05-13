# Metricas SCCI - Contexto para Claude

Este arquivo e um guia rapido. A documentacao detalhada fica em `docs/`.

## Projeto

Dashboard interno de metricas de originacao de credito imobiliario no SCCI/FCVS.

O sistema extrai historico de fases de bancos remotos, salva um warehouse local em Parquet e renderiza dashboards em Next.js.

## Documentacao

- Produto: `docs/produto/PRODUTO.md`
- Arquitetura: `docs/arquitetura/ARQUITETURA.md`
- Gaps de transicoes: `docs/metodologia/GAPS_TRANSICOES.md`
- Evolucao mensal por macrofase: `docs/metodologia/METODOLOGIA_EVOLUCAO_MACROFASES.md`
- Historico da investigacao do funil: `docs/sessoes/SESSAO_2025-05-12.md`

Leia os docs de metodologia antes de alterar calculos.

## Como Rodar

Fluxo usado pelo projeto local:

```powershell
cd C:\Users\Felipe.Freire\Documents\Documentos\Tarefas\Metricas\backend
conda activate metrics
uvicorn api:app --reload --port 8001
```

```powershell
cd C:\Users\Felipe.Freire\Documents\Documentos\Tarefas\Metricas\frontend
npm run dev -- --port 3001
```

O frontend usa `frontend/.env.local` para `NEXT_PUBLIC_API_URL`. Neste ambiente ele costuma apontar para `http://localhost:8001`.

Se rodar `uvicorn api:app` a partir da raiz `Metricas`, a API falha porque `api.py` esta em `backend/`.

## Estrutura Atual

```text
backend/
  api.py
  core/
    database.py
    database_sqlserver.py
frontend/
  src/
    app/
    screens/
    components/
    contexts/
    services/
    types/
docs/
  produto/
  arquitetura/
  metodologia/
  sessoes/
```

## Regras de Dominio Criticas

- Fase 600 e o marco principal de Registro do Contrato para validacao/cobranca.
- Em `/fases`, Registro de Contrato deve representar a fase 600.
- Transicoes (`Recebeu de` / `Saiu para`) sao diagnostico de caminho, nao soma contabil perfeita.
- Gaps de transicao podem acontecer por filtro de periodo, timestamps iguais, entradas diretas, ajustes administrativos e registros retroativos.
- Funil acumulado e diferente de passagem mensal por macrofase.

## Metricas

Principais conceitos:

- `phase_counts`: operacoes unicas com registro em uma fase especifica.
- `macrofaseTotais`: funil acumulado por maior fase atingida.
- `transicoes`: pares consecutivos entre fases, usados para fluxo.
- `emAndamento`: operacoes cuja ultima fase registrada e aquela fase.

Nao misture essas metricas sem explicitar a metodologia.

## Cuidados

- Nao imprimir ou versionar `.env`, senhas, credenciais SSH ou dados sensiveis.
- Nao versionar `CONSULTAS/`, `.next/`, caches ou arquivos gerados.
- Antes de alterar calculos, conferir os MDs em `docs/metodologia/`.
- Se alterar o shape do backend, atualizar `frontend/src/types/dashboard/index.ts`.
- Preserve o CSS/estrutura visual existente quando a solicitacao for apenas de logica.

