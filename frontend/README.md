# Frontend

Aplicacao Next.js responsavel por renderizar os dashboards e chamar a API FastAPI.

## Entrada

- `src/app/`: rotas do Next App Router.
- `src/app/page.tsx`: login.
- `src/app/(main)/layout.tsx`: layout autenticado com sidebar, header, filtros e modais globais.

## Organizacao

- `src/app/`: URLs reais da aplicacao.
- `src/features/`: telas e componentes especificos de cada area.
- `src/components/`: componentes compartilhados de UI, layout, charts e estados.
- `src/hooks/`: hooks centralizados por dominio de uso.
- `src/contexts/`: estados globais de autenticacao, filtros e cache.
- `src/services/`: chamadas HTTP para o backend.
- `src/types/`: contratos TypeScript compartilhados.
- `src/utils/`: funcoes puras, formatadores e mapeadores.
- `src/theme/`: tokens de tema, cores e cores de fases.
- `src/constants/`: rotas, bancos, strings e icones.

## Rotas e telas

Mapa completo com objetivo de cada tela:

- `docs/arquitetura/MAPA_TELAS.md`

Cada `page.tsx` em `src/app/(main)/...` importa uma screen em `src/features/...`.

```text
src/app/(main)/dashboard/page.tsx    -> src/features/dashboard/DashboardScreen.tsx
src/app/(main)/fases/page.tsx        -> src/features/fases/FaseAnalysisScreen.tsx
src/app/(main)/macrofases/page.tsx   -> src/features/macrofases/MacrofasesScreen.tsx
src/app/(main)/exportacoes/page.tsx  -> src/features/exportacoes/ExportacoesScreen.tsx
src/app/(main)/tendencias/page.tsx   -> src/features/tendencias/TendenciasScreen.tsx
src/app/(main)/rankings/page.tsx     -> src/features/rankings/RankingsScreen.tsx
src/app/(main)/diagnostico/page.tsx  -> src/features/diagnostico/DiagnosticoScreen.tsx
src/app/(main)/jornada/page.tsx      -> src/features/jornada/JornadaScreen.tsx
src/app/(main)/explorer/page.tsx     -> src/features/explorer/ExplorerScreen.tsx
src/app/(main)/dados/page.tsx        -> src/features/dados/DadosScreen.tsx
src/app/(main)/tabelas/page.tsx      -> src/features/tabelas/TabelasScreen.tsx
```

## Features

```text
src/features/
  auth/
  dashboard/
  fases/
  macrofases/
  exportacoes/
  jornada/
  rankings/
  diagnostico/
  tendencias/
  tabelas/
  dados/
  explorer/
  comparativo/
```

Quando uma feature precisar de subcomponentes privados, use `components/` dentro da propria feature.

Exemplo:

```text
src/features/fases/components/MacroMilestones/
  MacroMilestones.tsx
  buildRows.ts
  constants.ts
  helpers.ts
  components/
    ChevronFunnelMode.tsx
    DetailMode.tsx
    ExpandFunnelMode.tsx
    FunnelMode.tsx
    HoverCard.tsx
    PosEmissaoSection.tsx
```

Tipos ficam em `src/types/`, nao dentro da feature.

## Services

`src/services/databaseService.ts` e a camada principal de comunicacao com o backend.

O frontend nao consulta banco diretamente e nao abre SSH tunnel. Ele apenas chama a API HTTP.

## Regras de arquitetura

- `app/` define rota.
- `features/` define tela e componentes especificos.
- `components/` guarda componentes compartilhados.
- `hooks/` fica centralizado.
- `types/` fica centralizado.
- `utils/` fica centralizado.
- `services/` concentra chamadas para o backend.
- Regra de negocio/metodologia deve vir do backend sempre que possivel.

## Validacao

```powershell
cd frontend
.\node_modules\.bin\tsc.cmd --noEmit
```
