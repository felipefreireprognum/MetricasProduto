# Gap de Metodologia — Contagem por Registros vs. Transições

## Contexto

O funil de originação pode ser medido de duas formas distintas:

1. **Contagem por registros** (`record_count`) — quantas linhas existem no Parquet para aquela fase, independente de ordem ou sequência. É o número bruto da tabela `HISTORICO_OPERACAO`.

2. **Contagem por transições** (`transitions`) — pares consecutivos (fase N → fase N+1) construídos pelo backend ao ordenar cronologicamente os registros de cada operação. É o que alimenta as setas do Fluxo e os cálculos de abandono.

Além disso existe o **emAndamento** — operações cuja última fase registrada é a fase em questão e que ainda não têm um registro posterior. Calculado diretamente pelo backend a partir do estado atual de cada operação.

A identidade esperada é:

```
record_count = transitions_saindo + emAndamento + gap
```

O `gap` deveria ser zero, mas não é.

---

## Números Observados (snapshot de maio/2026)

| Fase | Registros | Saídas (transições) | Em Andamento | Gap | Gap % |
|------|-----------|---------------------|--------------|-----|--------|
| 100 — Crédito        | 8.350 | 8.226 | 107 | **17** | 0,2% |
| 101 — Créd. Reprovado | 4.623 | 4.578 | 23  | **22** | 0,5% |

---

## Causas do Gap

### 1. Timestamps idênticos

Dois ou mais registros de uma mesma operação têm exatamente o mesmo valor em `DT_INICIO_FASE`. O backend ordena por data para montar a sequência de transições. Com datas iguais, a ordem é arbitrária — o par (fase anterior → fase atual) pode ser ignorado ou invertido, fazendo com que a transição de saída da fase em questão não seja registrada.

**Exemplo:** operação X tem `(fase 100, 2025-03-10 09:00)` e `(fase 200, 2025-03-10 09:00)`. A transição 100→200 depende de qual registro vem "antes" — sem desempate garantido, o backend pode montar 200→100 ou simplesmente não capturar o par.

### 2. Operações encerradas administrativamente

Algumas operações são arquivadas ou canceladas no Prognum por processo administrativo sem gerar um novo registro em `HISTORICO_OPERACAO`. O último registro gravado é da fase 100 (ou 101), mas o sistema externo já considera a operação encerrada.

Resultado: o registro existe no Parquet, mas não há transição de saída (porque não houve fase seguinte), e `emAndamento` não inclui a operação porque algum critério externo a marca como inativa.

### 3. Registros retroativos fora de ordem

Às vezes um registro é inserido com uma `DT_INICIO_FASE` anterior à data de outros registros já existentes para a mesma operação — retroativamente, como correção ou auditoria. Ao reordenar cronologicamente, o backend coloca este registro no meio da sequência onde não deveria estar, quebrando a lógica de pares consecutivos e "perdendo" uma transição real de saída.

---

## Por que é aceitável

- O gap máximo observado é de **22 operações em ~4.600 registros (0,5%)** — dentro do ruído estatístico normal de qualquer sistema transacional com entrada manual de dados.
- Os três casos acima são todos **falhas de dados de origem** (timestamps duplicados, encerramentos externos, entradas retroativas) — não erros do dashboard.
- As métricas de decisão (taxa de conversão, tempo médio, volume por fase) não são afetadas de forma significativa por desvios dessa magnitude.
- A contagem por **emAndamento** usada nos cards vem diretamente do backend (não é derivada), garantindo que o número exibido seja sempre confiável para o estado atual.

---

## Como monitorar

Se o gap crescer de forma inesperada em futuras atualizações do Parquet, inspecionar:

```python
# Operações com registros duplicados de data na mesma fase
df.groupby(['NU_OPERACAO', 'NU_FASE_OPERACAO', 'DT_INICIO_FASE']).size().reset_index(name='n').query('n > 1')

# Registros sem transição de saída nem emAndamento
# (requer cruzar record_count com transitions_saindo + emAndamento por fase)
```

---

*Última revisão: 2026-05-12*
