# Metodologia - Evolucao Mensal por Macrofase

## Objetivo

Criar uma visao macro, comparando mes a mes o volume de propostas que passaram pelas principais etapas do processo.

Essa visao responde:

> Em cada mes, quantas propostas tiveram registro em cada grande etapa?

Ela e diferente do funil acumulado. O objetivo nao e dizer quantas propostas chegaram ate uma etapa ou alem, mas sim medir o volume mensal observado em cada etapa.

---

## Macrofases sugeridas

Para a primeira versao, a visao deve focar nas etapas pedidas:

| Etapa exibida | Fases consideradas | Observacao |
|---|---:|---|
| Simulacao | 0, 1 | Inicio da proposta |
| Cadastro | 50, 80, 90 | Cadastro e pendencias iniciais |
| Credito | 100 | Analise de credito aprovada/em analise |
| Analise de Documento | 300, 301 | Validacao e pendencia de pasta |
| Registro de Contrato | 600 | Marco principal para validacao/cobranca |

Credito Reprovado (`101`) deve ser tratado separadamente se necessario, porque representa encerramento/reprovacao e nao avanco natural do funil.

---

## Regra de contagem

A metrica recomendada e:

```text
operacoes unicas com pelo menos um registro na fase/macro dentro do mes
```

Ou seja:

```text
group by mes(DT_INICIO_FASE), macrofase
count distinct NU_OPERACAO
```

Exemplo:

```text
Abr/26
Simulacao: 120 propostas unicas com fase 0 ou 1 em abril
Cadastro: 95 propostas unicas com fase 50, 80 ou 90 em abril
Credito: 70 propostas unicas com fase 100 em abril
Analise Documento: 50 propostas unicas com fase 300 ou 301 em abril
Registro Contrato: 12 propostas unicas com fase 600 em abril
```

---

## Data usada

A data de referencia deve ser:

```text
DT_INICIO_FASE
```

Interpretacao:

> A proposta entrou naquela fase naquele mes.

Isso significa que, se uma proposta entrou em Credito em marco e so foi para Registro em abril, ela conta em:

```text
Credito: marco
Registro: abril
```

---

## Diferenca para o funil acumulado

O funil acumulado usa uma logica como:

```text
maior fase nao cancelada da operacao >= limite da etapa
```

Exemplo:

```text
Registro >= 600
Emissao >= 500
Credito >= 100
```

Essa logica e correta para responder:

> Quantas propostas chegaram ate esta etapa ou alem?

Mas nao e a melhor para o grafico mensal por macrofase, porque uma proposta que chegou em Registro tambem seria contada como tendo chegado em todas as etapas anteriores.

Na visao mensal por macrofase, queremos medir passagem real no mes:

```text
teve registro naquela fase/macro dentro do mes
```

---

## Diferenca para transicoes

As transicoes mostram pares consecutivos:

```text
fase anterior -> fase seguinte
```

Elas sao uteis para entender fluxo, origem, destino e abandono.

Mas o grafico mensal por macrofase nao deve depender das transicoes, porque transicoes podem ter gaps quando:

- a fase anterior ficou fora do periodo filtrado;
- existem timestamps iguais;
- houve ajuste manual/administrativo;
- a proposta entrou diretamente em uma fase intermediaria;
- registros retroativos mudaram a ordem cronologica.

Portanto:

```text
grafico mensal por macrofase = registros reais por etapa no mes
transicoes = diagnostico de caminho entre etapas
```

---

## Registro de Contrato como marco de cobranca

Para validacao de conclusao operacional ou cobranca dos bancos, a fase principal deve ser:

```text
NU_FASE_OPERACAO = 600
```

Essa fase representa o evento formal de Registro do Contrato.

Fases posteriores como `601`, `700` e `701` devem ser analisadas como pos-registro ou acompanhamento operacional, mas nao devem substituir a fase 600 como marco principal sem validacao da regra de negocio.

---

## Estrutura esperada para API

Sugestao de novo campo no retorno do dashboard:

```ts
evolucaoMacrofasesMensal: [
  {
    mes: '2026-04',
    label: 'Abr/26',
    simulacao: 120,
    cadastro: 95,
    credito: 70,
    analiseDocumento: 50,
    registroContrato: 12
  }
]
```

---

## Visual recomendado

Grafico de barras agrupadas:

- eixo X: meses;
- eixo Y: quantidade de propostas unicas;
- uma barra por macrofase;
- tooltip mostrando os valores do mes;
- legenda com as etapas.

Etapas iniciais:

```text
Simulacao
Cadastro
Credito
Analise de Documento
Registro de Contrato
```

---

## Frase executiva

> Esta visao compara, mes a mes, o volume de propostas que passaram por cada etapa principal do processo. Ela usa registros reais de entrada em fase (`DT_INICIO_FASE`) e conta propostas unicas por macrofase no mes. Nao e o funil acumulado; e uma leitura operacional de volume mensal por etapa.

