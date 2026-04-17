# Analise AG31 - Metricas Multi-Banco

## O que e o AG31?

Relatorio mensal obrigatorio do **Sistema de Controle de Credito Imobiliario** da CAIXA.
Todo banco que opera credito imobiliario envia esse relatorio. E um "raio-X" da carteira de financiamento do banco naquele mes.

- **Nome oficial**: Relatorio de Apoio a Cobranca/Faturamento - Sintetico
- **Sistema**: Sistema de Controle de Credito Imobiliario (versoes 9.54 a 9.77)
- **Periodicidade**: Mensal
- **Padrao**: Campos identicos para todos os bancos (definido pela CAIXA/FCVS)

---

## Bancos Analisados

| Banco | Formato | Referencia | Arquivo |
|---|---|---|---|
| Sicredi | XML | 1/Jul/2021 | `documentosuteis/AG31` |
| C6 Bank | PDF (5 pag) | 27/Fev/2026 | `documentosuteis/C6-AG31_022026.pdf` |
| Itau | PDF (2 pag) | 1/Fev/2026 | `documentosuteis/ITAU-AG31-itaufcvs.022026.pdf` |

---

## Estrutura do Relatorio

O AG31 tem 4 grandes secoes. Todas seguem o mesmo padrao para qualquer banco.

### 1. CONTRATOS - Base Principal

Contratos de financiamento imobiliario **ativos na carteira atual** do banco.

| Campo | O que significa |
|---|---|
| Qtd Mes Anterior | Quantos contratos tinha no mes passado |
| Incluidos | Novos contratos que entraram neste mes |
| Excluidos | Contratos que sairam (quitacao, distrato, etc.) |
| Subrogados | Contratos transferidos de/para outro banco |
| **TOTAL** | = Mes Anterior + Incluidos - Excluidos +/- Subrogados |
| **ATIVOS** | Contratos em andamento (mutuario pagando) |
| **INATIVOS** | Contratos encerrados mas ainda na base principal |

**Detalhamento dos Ativos:**

| Campo | O que significa |
|---|---|
| c/ Serie / s/ Serie | Se o contrato pertence a uma serie de titulos |
| c/ COB FCVS / s/ COB FCVS | Se tem cobertura do FCVS (Fundo de Compensacao de Variacoes Salariais) |
| c/ Prest. Emitida / s/ Prest. Emitida | Se ja emitiu prestacao no mes |
| c/ Baixas Processadas | Contratos com quitacao/baixa processada |
| C.R.I | Certificado de Recebiveis Imobiliarios |
| Enviados p/ Seguradora | Contratos enviados para seguro habitacional |
| c/ Cobranca Diferenca / s/ Cobranca Diferenca | Contratos no sistema de diferenca |

**Detalhamento dos Inativos:**

| Campo | O que significa |
|---|---|
| c/ Serie / s/ Serie | Mesma logica dos ativos |
| S/COB FCVS / C/COB FCVS | Cobertura FCVS |
| SO NA PRINCIPAL | Se a cobertura e so na base principal |
| c/ Cessao | Contratos cedidos a terceiros |
| c/ C.R.I | Se virou CRI |

### 2. CONTRATOS - Base de Finalizados

Contratos que ja **sairam da base principal** - foram totalmente quitados/encerrados, mas ficam registrados por questoes de FCVS e habilitacao.

| Campo | O que significa |
|---|---|
| Retorno FCVS | Contratos que voltaram do processo FCVS |
| Processada Habilitacao | Se ja processou a habilitacao junto a CAIXA |
| Nao Processada Habilitacao | Ainda pendente de habilitacao |
| SEM RCV / COM RCV | Revisao de Credito por Variacao (reajustes) |
| c/ Cessao | Contratos cedidos |

### 3. IMOVEIS

Cada contrato e vinculado a um imovel. Secao separada em Base Principal e Finalizados.

| Campo | O que significa |
|---|---|
| **Vagos - Novos** | Imovel novo nunca ocupado |
| **Vagos - Retomados** | Imovel retomado por inadimplencia |
| **Ocupados - Ativos** | Imovel com morador e contrato ativo |
| **Ocupados - Inativos** | Imovel ocupado mas contrato ja encerrado |
| S/COB FCVS / C/COB FCVS | Mesma logica de contratos |
| SO NA PRINCIPAL | Cobertura so na base principal |

**Validacao**: Total Imoveis = Vagos (Novos + Retomados) + Ocupados (Ativos + Inativos)

### 4. ORIGINACAO

O "funil" de novos financiamentos no mes. So aparece quando o banco tem operacao ativa.

| Campo | O que significa |
|---|---|
| Ops Iniciadas | Propostas que entraram no sistema |
| Ops Concluidas (Finalizacoes) | Financiamentos que fecharam no mes |
| Apos Avaliacao (Antes Comercial) | Operacoes na base antes da etapa comercial |
| Apos Assinatura (Apos Comercial) | Operacoes que ja assinaram contrato |

### 5. FASES (exclusivo XML)

Detalhamento do processo de originacao com metricas de tempo. **Disponivel apenas no formato XML** (Sicredi).

Cada fase tem:
- Quantidade de operacoes
- Dias medio, minimo e maximo (na fase e acumulado)
- Desvio padrao

---

## Mapeamento PDF → XML

Os campos sao **100% identicos** entre PDF e XML. A diferenca e apenas o formato de entrega.

### Nomenclatura das tags XML

Padrao: `{BASE}_{SECAO}_{SUB}_{DETALHE}`

- **BASE**: `PRI` (Principal) ou `FIN` (Finalizados)
- **SECAO**: `CTR` (Contratos) ou `IMV` (Imoveis)
- **SUB**: `ATV` (Ativos) ou `INA` (Inativos)
- **DETALHE**: campo especifico

Exemplos:
- `PRI_CTR_ATV_COM_COB_FCVS` = Base Principal > Contratos > Ativos > Com Cobertura FCVS
- `FIN_IMV_OCUPADOS` = Base Finalizados > Imoveis > Ocupados
- `ORI_OPERACAO_CONCLUIDA_MES_REF` = Originacao > Operacoes Concluidas no Mes

---

## Validacao dos Dados

### C6 Bank (carteira ativa - 3.000 contratos)

```
Contratos: 2.892 + 140 - 32 + 0 = 3.000  ✓
Ativos (2.454) + Inativos (546) = 3.000   ✓
c/ Serie (0) + s/ Serie (2.454) = 2.454   ✓
c/ FCVS (0) + s/ FCVS (2.454) = 2.454    ✓
c/ Prest (2.260) + s/ Prest (194) = 2.454 ✓

Imoveis: Vagos (1.235) + Ocupados (1.887) = 3.122 ✓
  Vagos: Novos (1.229) + Retomados (6) = 1.235    ✓
  Ocupados: Ativos (1.731) + Inat (156) = 1.887   ✓

Originacao: Finalizacoes 107 | Antes Comercial 4.207 | Apos Comercial 3.379
```

**Status**: Todos os numeros batem. Carteira ativa e crescendo (+140 incluidos, -32 excluidos).

### Itau (carteira legada - 53.971 contratos finalizados)

```
Base Principal: TUDO ZERO (nenhum contrato ativo)
Base Finalizados: 53.971 inativos, todos S/COB FCVS
Movimento no mes: ZERO (inc=0, exc=0, sub=0)
Imoveis: NAO TEM (PDF so tem 2 paginas)
Originacao: NAO TEM
```

**Status**: Carteira **encerrada/legada**. O Itau nao opera mais credito imobiliario neste sistema. Os 53.971 contratos sao historicos finalizados.

### Sicredi (carteira pequena - 9 contratos)

```
Contratos: 9 ativos, 0 inativos
Imoveis: 9 cadastrados, todos ocupados e ativos
Originacao: 2 iniciadas, 1 concluida
Fases: 9 fases detalhadas com metricas de tempo
```

**Status**: Carteira pequena (referencia Jul/2021). Dados de fases disponiveis por ser formato XML.

---

## Observacoes Tecnicas

### PDF do C6 - Dados Duplicados
O PDF tem 5 paginas e repete os dados 2 vezes:
- Paginas 1-2: "Classe: Todos os Contratos"
- Paginas 3-5: "Classe: GERAL"

Os numeros sao identicos. O parser deve ler apenas a primeira ocorrencia.

### Typo no XML Sicredi
- XML usa `PRI_CTR_INA_COM_SESSAO` (com SS)
- PDF usa `COM CESSAO` (com C)
- E o **mesmo campo** (Contratos com Cessao). Corrigir para `CESSAO` na normalizacao.

### Campos que existem so no PDF
- `TOTAL_CONTRATOS` - total geral (no XML vem calculado)
- `FIN_CTR_ATIVOS` - ativos na base de finalizados
- `PRI_CTR_EXCLUIDOS` - excluidos da base principal

### Campos que o Itau nao tem
Nao e falha do parser - o Itau **realmente nao tem** imoveis e originacao porque a carteira e 100% finalizada/inativa.

---

## Estrutura do Projeto

```
Metricas/
├── app.py                     # Dashboard Streamlit multi-banco
├── compare_banks.py           # Script de comparacao de campos
├── ANALISE_AG31.md            # Este documento
└── documentosuteis/
    ├── AG31                   # XML Sicredi
    ├── C6-AG31_022026.pdf     # PDF C6 Bank
    └── ITAU-AG31-itaufcvs.022026.pdf  # PDF Itau
```

## Proximos Passos

- [ ] Corrigir parser PDF para extrair todos os 78+ campos corretamente
- [ ] Ler apenas primeira ocorrencia no PDF do C6 (evitar duplicacao)
- [ ] Normalizar campo SESSAO → CESSAO
- [ ] Tratar campos ausentes do Itau como "N/A" no comparativo (nao como zero)
- [ ] Mapear corretamente campos de originacao do C6 (numero na linha seguinte)
