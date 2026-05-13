# Produto — Métricas SCCI / FCVS

## O que é

Dashboard interno de análise de **originação de crédito imobiliário** no contexto do SCCI (Sistema de Controle de Crédito Imobiliário) / FCVS (Fundo de Compensação de Variações Salariais).

O sistema recebe dados de bancos (atualmente C6 Bank, previsto Banco Inter), processa o histórico de fases das propostas e apresenta indicadores de desempenho do funil de originação — sem depender de consultas SQL em tempo real.

---

## O Funil de Originação

Cada proposta de crédito imobiliário passa por uma série de etapas. O sistema agrupa essas etapas em **macrofases**:

| # | Macrofase | O que representa |
|---|---|---|
| 1 | Simulação | Primeiro contato — proposta iniciada |
| 2 | Cadastro | Dados do cliente cadastrados |
| 3 | Crédito | Análise de crédito (aprovação ou reprovação) |
| 4 | Negociação | Ajuste de condições com o cliente |
| 5 | Análise de Documentos | Documentação recebida e analisada |
| 6 | Análise Técnica | Avaliação técnica do imóvel |
| 7 | **Emissão de Contrato** | **Marco final — relatório enviado ao cliente** |

Após a Emissão de Contrato, há uma etapa de continuidade:

| | Pós-emissão | O que representa |
|---|---|---|
| + | Registro de Contratos | Registro cartorial e liberação de recursos |

A **Emissão de Contrato é o ponto central do produto** — é o que define que uma proposta foi concluída com sucesso para fins de análise. Tudo o que vem depois (Registro de Contratos) é acompanhamento pós-contrato.

### Crédito Reprovado

A fase 101 (Crédito Reprovado) é tratada separadamente: não entra no funil como abandono comum, mas é contabilizada à parte dentro da macrofase Crédito. O total de Crédito no funil exclui reprovados; Negociação = Crédito total − reprovados − abandonos.

---

## Métricas Principais

### Dimensões de análise

O sistema opera em duas dimensões que podem ser alternadas:

- **Proposta** — conta registros de operações (uma proposta pode ter múltiplas fases)
- **CPF** — conta pessoas únicas (CPFs distintos), eliminando duplicatas

### Indicadores

| Indicador | O que mede |
|---|---|
| Propostas iniciadas | Volume total que entrou no funil no período |
| Taxa de conversão | % que chegou à Emissão de Contrato |
| Tempo médio | Dias médios por macrofase ou total |
| Abandono | Propostas cuja última fase ativa foi nessa macrofase |
| Em andamento | Propostas abertas, sem movimentação recente |
| CPFs únicos | Pessoas distintas no funil |
| CPFs reincidentes | Pessoas que aparecem em mais de uma proposta |

---

## Telas do Sistema

### Visão Geral `/dashboard`
Painel principal com:
- KPIs do período (propostas iniciadas, concluídas, em andamento, conversão, tempo médio)
- Gráfico de evolução mensal (barras + linhas)
- Funil por macrofase com contagens e percentuais
- Top usuários por volume
- Desempenho comparativo por banco

### Por Fase `/fases`
Análise detalhada do funil:
- Chevrons clicáveis por macrofase — cada um abre o drill-down das fases individuais
- Por fase: volume, tempo médio, fluxo de saída (para onde as propostas foram), cancelamentos
- Seção Pós-emissão com Registro de Contratos separado

### Tendências `/tendencias`
Série temporal mensal:
- Iniciadas, concluídas e canceladas ao longo dos meses
- Taxa de conversão como linha sobre o gráfico de barras
- Alternável entre dimensão Proposta e CPF

### Rankings `/rankings`
Tabelas de destaque:
- Top usuários por volume de propostas
- Fases com maior estoque (em andamento)
- Fases mais lentas (tempo médio)
- Top CPFs por reincidência
- Fases com maior taxa de abandono

### Diagnóstico `/diagnostico`
Análise automática com semáforo de severidade:
- **Crítico** — indicador fora do esperado, requer ação imediata
- **Alerta** — indicador em zona de atenção
- **Bom** — indicador saudável
- **Neutro** — dado insuficiente ou situação estável

Analisa: conversão, tempo médio, fila (em andamento), abandono e tendência recente.

### Jornada `/jornada`
Perspectiva centrada na pessoa:
- Pizza de distribuição de CPFs por macrofase
- KPIs: CPFs únicos, reincidentes, tempo médio por CPF
- MacroPhaseBar e funil chevron filtrados por dimensão CPF
- Focado em entender o comportamento da pessoa, não só do volume de propostas

### BD Métricas `/explorer`
Exploração do warehouse local:
- Tabela paginada de todos os registros do Parquet
- Filtro por macrofase
- Mini-barra de progresso por registro (em qual etapa está)
- Colunas: operação, fase, etapa, data início, usuário

### Fontes `/dados`
Gestão do warehouse local:
- **Atualizar** — busca os N registros mais recentes do banco e mescla com o Parquet existente (sem duplicar)
- **Expandir** — adiciona N registros anteriores ao mais antigo salvo, acumulando histórico
- Seletor de limite: 20k / 50k / 100k / 200k registros por operação
- Status de cada banco: data da última atualização, total de registros, total de operações

### Consulta BD `/tabelas`
Acesso direto ao banco de dados ao vivo:
- Lista de tabelas disponíveis no Firebird
- Visualização paginada de qualquer tabela
- Para uso administrativo / exploração de dados brutos

---

## Domínio

| Termo | Significado |
|---|---|
| SCCI | Sistema de Controle de Crédito Imobiliário |
| FCVS | Fundo de Compensação de Variações Salariais — cobertura governamental para contratos antigos |
| Proposta | Uma operação de crédito imobiliário em andamento |
| Fase | Etapa específica dentro de uma proposta (ex: "Emissão de contrato", "Análise Técnica") |
| Macrofase | Agrupamento de fases afins (ex: Crédito agrupa aprovação e reprovação) |
| HISTORICO_OPERACAO | Tabela principal do Firebird com o histórico de todas as fases |
| NU_OPERACAO | Identificador único da proposta |
| NU_CPF | Identificador da pessoa (CPF) |
| Abandono | Proposta cujo último evento ativo foi uma fase cancelada — contabilizado na macrofase onde parou |
| Emissão de Contrato | Marco de conclusão — a proposta foi convertida e o contrato emitido |
