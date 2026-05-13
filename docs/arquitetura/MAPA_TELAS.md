# Mapa de Telas

Referencia rapida para localizar qual arquivo mexer em cada tela do frontend.

Regra geral:

```text
frontend/src/app/.../page.tsx -> define a rota Next
frontend/src/features/.../*Screen.tsx -> implementa a tela
```

O layout autenticado, sidebar, header, filtro de periodo e modais globais ficam em:

```text
frontend/src/app/(main)/layout.tsx
frontend/src/components/layout/Sidebar/Sidebar.tsx
frontend/src/components/layout/PageHeader/PageHeader.tsx
frontend/src/components/features/DateFilterModal/DateFilterModal.tsx
```

As rotas declaradas ficam em:

```text
frontend/src/constants/routes.ts
```

## Telas Ativas

| Rota | Tela | Page | Screen/JSX principal | Quando mexer |
| --- | --- | --- | --- | --- |
| `/` | Login | `frontend/src/app/page.tsx` | `frontend/src/features/auth/LoginScreen.tsx` | Credenciais, conexao inicial, selecao de ambiente/banco antes de entrar no app. |
| `/dashboard` | Visao Geral | `frontend/src/app/(main)/dashboard/page.tsx` | `frontend/src/features/dashboard/DashboardScreen.tsx` | KPIs gerais, cards principais, grafico de evolucao, barras de macrofase e comparacoes resumidas. |
| `/fases` | Por Fase | `frontend/src/app/(main)/fases/page.tsx` | `frontend/src/features/fases/FaseAnalysisScreen.tsx` | Funil por fase/macrofase, chevrons, detalhes de transicao, modal de gaps, Registro de Contrato fase 600. |
| `/tendencias` | Tendencias | `frontend/src/app/(main)/tendencias/page.tsx` | `frontend/src/features/tendencias/TendenciasScreen.tsx` | Graficos mensais de volume, conversao e tempo do dashboard geral. |
| `/macrofases` | Macro Mensal | `frontend/src/app/(main)/macrofases/page.tsx` | `frontend/src/features/macrofases/MacrofasesScreen.tsx` | Comparacao mes a mes por macrofase, Registro de Contrato mensal, selecao de meses, indicadores abaixo do volume. |
| `/exportacoes` | Exportacoes | `frontend/src/app/(main)/exportacoes/page.tsx` | `frontend/src/features/exportacoes/ExportacoesScreen.tsx` | URLs para Power BI, CSV da Macro Mensal e CSV da base completa do Parquet. |
| `/rankings` | Rankings | `frontend/src/app/(main)/rankings/page.tsx` | `frontend/src/features/rankings/RankingsScreen.tsx` | Rankings de fases, usuarios, volumes e impacto no funil. |
| `/diagnostico` | Diagnostico | `frontend/src/app/(main)/diagnostico/page.tsx` | `frontend/src/features/diagnostico/DiagnosticoScreen.tsx` | Gargalos, riscos, prioridades, insights e diagnosticos consolidados. |
| `/jornada` | Jornada | `frontend/src/app/(main)/jornada/page.tsx` | `frontend/src/features/jornada/JornadaScreen.tsx` | Analise por CPF, reincidencia, retentativas, retorno e comportamento da pessoa. |
| `/explorer` | BD Metricas | `frontend/src/app/(main)/explorer/page.tsx` | `frontend/src/features/explorer/ExplorerScreen.tsx` | Exploracao do Parquet/cache local de metricas, filtros e consulta visual dos registros salvos. |
| `/dados` | Fontes | `frontend/src/app/(main)/dados/page.tsx` | `frontend/src/features/dados/DadosScreen.tsx` | Atualizar/expandir base, cache local, status das fontes e carga do Parquet. |
| `/tabelas` | Consulta BD | `frontend/src/app/(main)/tabelas/page.tsx` | `frontend/src/features/tabelas/TabelasScreen.tsx` | Consulta direta de tabelas do banco remoto via backend. |

## Telas/Features Existentes Fora do Menu Principal

| Rota/Feature | Arquivo | Status | Observacao |
| --- | --- | --- | --- |
| `/comparativo` | `frontend/src/features/comparativo/ComparativoScreen.tsx` | Em desenvolvimento | A rota existe em `ROUTES`, mas nao esta ativa como tela principal pronta. |
| `/abandono` | sem screen ativa dedicada | Em desenvolvimento | Rota declarada para futuro modulo de cancelamentos/abandono. |
| `/relatorios` | sem screen ativa dedicada | Em desenvolvimento | Rota declarada para futuro modulo de relatorios. |

## Componentes Importantes Por Area

### Dashboard

```text
frontend/src/features/dashboard/components/CompanyPerformance.tsx
frontend/src/features/dashboard/components/EvolutionChart.tsx
frontend/src/features/dashboard/components/MacroPhaseBar.tsx
frontend/src/features/dashboard/components/VariationTable.tsx
```

### Fases

```text
frontend/src/features/fases/components/GapsModal.tsx
frontend/src/features/fases/components/MacroMilestones/MacroMilestones.tsx
frontend/src/features/fases/components/MacroMilestones/buildRows.ts
frontend/src/features/fases/components/MacroMilestones/constants.ts
frontend/src/features/fases/components/MacroMilestones/helpers.ts
frontend/src/features/fases/components/MacroMilestones/components/ChevronFunnelMode.tsx
frontend/src/features/fases/components/MacroMilestones/components/DetailMode.tsx
frontend/src/features/fases/components/MacroMilestones/components/ExpandFunnelMode.tsx
frontend/src/features/fases/components/MacroMilestones/components/FunnelMode.tsx
frontend/src/features/fases/components/MacroMilestones/components/HoverCard.tsx
frontend/src/features/fases/components/MacroMilestones/components/PosEmissaoSection.tsx
```

Use `buildRows.ts` para montagem dos dados visuais da MacroMilestones. Tipos ficam em `frontend/src/types/fases/`.

## Backend Relacionado

As telas acima normalmente consomem:

```text
frontend/src/services/databaseService.ts
backend/app/routers/metrics.py
backend/app/services/dashboard_metrics.py
backend/app/services/macro_evolution.py
backend/app/services/parquet_store.py
backend/app/services/metrics_cache.py
```

Antes de alterar shape de resposta do backend, atualize:

```text
frontend/src/types/
frontend/src/services/databaseService.ts
```

## Regras Rapidas

- Mudanca de rota/menu: `frontend/src/constants/routes.ts`, `frontend/src/components/layout/Sidebar/Sidebar.tsx` e, se necessario, `frontend/src/app/(main)/layout.tsx`.
- Mudanca visual de uma tela: mexer primeiro no `*Screen.tsx` da feature correspondente.
- Mudanca compartilhada de filtro/header/sidebar: mexer no layout ou componentes compartilhados, nao em cada tela.
- Mudanca de metodologia/calculo: conferir `docs/metodologia/` e preferir backend.
- Nao alterar CSS de outras telas quando o pedido for uma mudanca localizada.
