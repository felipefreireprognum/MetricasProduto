# Metricas SCCI - Contexto para Codex

Este arquivo e o guia rapido para trabalho no repositorio. A arquitetura detalhada por camada fica nos READMEs locais:

- Backend: `backend/README.md`
- Frontend: `frontend/README.md`
- Mapa de telas: `docs/arquitetura/MAPA_TELAS.md`
- Documentacao geral: `docs/README.md`
- Arquitetura historica/geral: `docs/arquitetura/ARQUITETURA.md`

Leia o README da camada antes de reorganizar pastas ou mover codigo.

## Prioridade de Leitura

Antes de mexer em calculos, funil, fases, gaps ou metodologia:

1. `docs/metodologia/GAPS_TRANSICOES.md`
2. `docs/metodologia/METODOLOGIA_EVOLUCAO_MACROFASES.md`
3. `docs/sessoes/SESSAO_2025-05-12.md`
4. `backend/README.md`
5. `frontend/README.md`
6. `docs/arquitetura/MAPA_TELAS.md` quando a mudanca for em tela/rota/frontend

Para contexto de produto:

- `docs/produto/PRODUTO.md`
- `README.md`

## Projeto

Dashboard interno de metricas de originacao de credito imobiliario no SCCI/FCVS.

Fluxo principal:

```text
Banco remoto via SSH
-> FastAPI abre tunnel e atualiza cache
-> Parquet local em backend/CONSULTAS/
-> FastAPI processa com pandas
-> Next.js renderiza dashboards
```

O frontend nao consulta banco e nao abre tunnel.

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

Observacao: `uvicorn api:app` deve rodar a partir de `backend/`.

## Estrutura Atual

Backend:

- `backend/api.py`: entrada compativel para Uvicorn.
- `backend/app/main.py`: cria FastAPI, CORS e registra routers.
- `backend/app/routers/`: endpoints HTTP.
- `backend/app/services/`: processamento e leitura de dados.
- `backend/app/domain/`: regras de dominio/metodologia.
- `backend/app/db/`: conectores e SSH tunnel.
- `backend/app/core/`: config e helpers tecnicos.

Frontend:

- `frontend/src/app/`: rotas Next.
- `frontend/src/features/`: screens e componentes especificos.
- `frontend/src/components/`: componentes compartilhados.
- `frontend/src/hooks/`: hooks centralizados.
- `frontend/src/services/`: chamadas HTTP.
- `frontend/src/types/`: contratos TypeScript.
- `frontend/src/utils/`: helpers e formatadores.

Antes de mexer em uma tela especifica, consulte `docs/arquitetura/MAPA_TELAS.md` para identificar a rota, o `page.tsx` e o `*Screen.tsx` correto.

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
python -m py_compile backend\api.py backend\app\main.py
```

Frontend:

```powershell
cd frontend
.\node_modules\.bin\tsc.cmd --noEmit
```
