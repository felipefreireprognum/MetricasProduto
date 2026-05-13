# Metricas SCCI - Contexto para Claude

Este arquivo e um guia rapido. A arquitetura detalhada por camada fica nos READMEs locais:

- Backend: `backend/README.md`
- Frontend: `frontend/README.md`
- Documentacao geral: `docs/README.md`
- Arquitetura geral/historica: `docs/arquitetura/ARQUITETURA.md`

Leia `backend/README.md` antes de mexer no backend e `frontend/README.md` antes de mexer no frontend.

## Projeto

Dashboard interno de metricas de originacao de credito imobiliario no SCCI/FCVS.

O sistema extrai historico de fases de bancos remotos, salva um warehouse local em Parquet e renderiza dashboards em Next.js.

## Documentacao

- Produto: `docs/produto/PRODUTO.md`
- Backend: `backend/README.md`
- Frontend: `frontend/README.md`
- Mapa de telas: `docs/arquitetura/MAPA_TELAS.md`
- Arquitetura geral: `docs/arquitetura/ARQUITETURA.md`
- Gaps de transicoes: `docs/metodologia/GAPS_TRANSICOES.md`
- Evolucao mensal por macrofase: `docs/metodologia/METODOLOGIA_EVOLUCAO_MACROFASES.md`
- Historico da investigacao do funil: `docs/sessoes/SESSAO_2025-05-12.md`

Leia os docs de metodologia antes de alterar calculos.

Antes de mexer em uma tela, leia `docs/arquitetura/MAPA_TELAS.md` para localizar a rota, o `page.tsx` e o `*Screen.tsx` correto.

## Como Rodar

Backend:

```powershell
cd C:\Users\Felipe.Freire\Documents\Documentos\Tarefas\Metricas\backend
conda activate metrics
uvicorn api:app --reload --port 8001
```

Frontend:

```powershell
cd C:\Users\Felipe.Freire\Documents\Documentos\Tarefas\Metricas\frontend
npm run dev -- --port 3001
```

O frontend usa `frontend/.env.local` para `NEXT_PUBLIC_API_URL`. Neste ambiente ele costuma apontar para `http://localhost:8001`.

## Estrutura Atual

Backend:

```text
backend/
  api.py
  app/
    main.py
    core/
    db/
    domain/
    routers/
    services/
  CONSULTAS/
```

Frontend:

```text
frontend/src/
  app/
  features/
  components/
  hooks/
  contexts/
  services/
  types/
  utils/
  theme/
  constants/
```

## Regras de Dominio Criticas

- Fase 600 e o marco principal de Registro do Contrato para validacao/cobranca.
- Em `/fases`, Registro de Contrato deve representar a fase 600.
- Transicoes (`Recebeu de` / `Saiu para`) sao diagnostico de caminho, nao soma contabil perfeita.
- Gaps de transicao podem acontecer por filtro de periodo, timestamps iguais, entradas diretas, ajustes administrativos e registros retroativos.
- Funil acumulado e diferente de passagem mensal por macrofase.
- Frontend nao consulta banco diretamente e nao abre SSH tunnel.

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
- Antes de reorganizar pastas, conferir `backend/README.md` e `frontend/README.md`.
- Se alterar o shape do backend, atualizar `frontend/src/types/`.
- Preserve o CSS/estrutura visual existente quando a solicitacao for apenas de logica.
