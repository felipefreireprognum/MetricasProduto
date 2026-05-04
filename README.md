# Métricas AG31 — SCCI / FCVS

Dashboard interno para análise de métricas do **relatório AG31** enviado mensalmente ao governo pelos bancos participantes do **SCCI** (Sistema de Controle de Crédito Imobiliário), vinculado ao **FCVS** (Fundo de Compensação de Variações Salariais).

---

## Sumário

1. [Contexto de Negócio](#1-contexto-de-negócio)
2. [Arquitetura Geral](#2-arquitetura-geral)
3. [Pré-requisitos](#3-pré-requisitos)
4. [Configuração de Ambiente](#4-configuração-de-ambiente)
5. [Conexão SSH e Bancos de Dados](#5-conexão-ssh-e-bancos-de-dados)
6. [Criação do Banco de Métricas (Parquet)](#6-criação-do-banco-de-métricas-parquet)
7. [Exportação para CSV](#7-exportação-para-csv)
8. [Como Rodar](#8-como-rodar)
9. [API — Endpoints Completos](#9-api--endpoints-completos)
10. [ETL — Fluxo de Dados](#10-etl--fluxo-de-dados)
11. [Mapeamento de Fases (FASE_MAP)](#11-mapeamento-de-fases-fase_map)
12. [Dashboard — Telas e Funcionalidades](#12-dashboard--telas-e-funcionalidades)
13. [Adicionando um Novo Banco](#13-adicionando-um-novo-banco)
14. [Stack Tecnológica](#14-stack-tecnológica)
15. [Glossário](#15-glossário)

---

## 1. Contexto de Negócio

### O que é o AG31?

O **AG31** é um relatório mensal padronizado exigido pelo governo federal de todos os bancos que operam crédito imobiliário no Brasil. Ele contém métricas de:

- **Contratos** — Base Principal e Base de Finalizados (ativos, inativos, com/sem cobertura FCVS, com/sem série, prestações emitidas, baixas processadas)
- **Imóveis** — cadastrados, vagos (novos e retomados), ocupados (ativos e inativos)
- **Originação** — operações iniciadas, concluídas, por fase, tempo médio por etapa

### O que este sistema faz?

Conecta aos bancos de dados de cada instituição financeira, extrai o histórico de operações de crédito imobiliário, armazena localmente em formato **Parquet** e exibe dashboards analíticos com:

- Funil de operações por macrofase (Simulação → Cadastro → Crédito → ... → Concluído)
- KPIs globais consolidados
- Análise de abandono por fase (quais etapas mais perdem operações para Cancelada)
- Fluxo de transições entre fases
- Evolução mensal
- Ranking de fases por abandono
- Explorer do banco de métricas com paginação e ordenação

### Bancos suportados

| Banco       | Tipo        | Status      |
|-------------|-------------|-------------|
| C6 Bank     | Firebird    | Ativo       |
| Banco Inter | SQL Server  | Desabilitado|
| Sicoob      | Firebird    | Planejado   |
| CFAE        | A definir   | Planejado   |

---

## 2. Arquitetura Geral

```
┌─────────────────────────────────────────────────────┐
│              BANCO DE DADOS REMOTO                  │
│                                                     │
│  Firebird (.gdb)          SQL Server                │
│  HISTORICO_OPERACAO       HISTORICO_OPERACAO        │
│  FASE_OPERACAO            FASE_OPERACAO             │
└────────────────┬────────────────────────────────────┘
                 │  SSH Tunnel (sshtunnel + paramiko)
                 │  porta local aleatória → porta remota do BD
                 ▼
┌─────────────────────────────────────────────────────┐
│              FASTAPI (api.py)                       │
│                                                     │
│  /cache/refresh  → busca N registros mais recentes  │
│  /cache/expand   → busca N registros mais antigos   │
│  /dashboard      → lê Parquet, processa métricas    │
│  /parquet/dados  → explorer paginado do Parquet     │
└────────────────┬────────────────────────────────────┘
                 │  Parquet (Snappy) — warehouse local
                 │  CONSULTAS/metricas_<banco>_<slug>.parquet
                 ▼
┌─────────────────────────────────────────────────────┐
│              NEXT.JS (frontend/)                    │
│                                                     │
│  /dashboard  → Visão Geral (KPIs, funil, evolução) │
│  /fases      → Por Fase (funil expandível, ranking) │
│  /explorer   → BD de Métricas (tabela Parquet)     │
│  /dados      → Fontes (Atualizar / Expandir)       │
│  /tabelas    → Consulta BD (acesso live ao Firebird)│
└─────────────────────────────────────────────────────┘
```

### Por que Parquet?

O sistema **não faz consultas SQL em tempo real** ao renderizar o dashboard. O fluxo é:

```
Banco remoto → ETL → Parquet local → FastAPI lê em <1s → Next.js renderiza
```

Vantagens do Parquet vs JSON/CSV:
- **5–10× mais rápido** para leitura (formato colunar)
- **~10× menor** em disco (compressão Snappy)
- **Tipos preservados** — datas são `datetime64`, não strings
- **Incrementável** — merge sem duplicatas via `drop_duplicates`

---

## 3. Pré-requisitos

### Python (backend)

```bash
Python >= 3.10
```

Instalar dependências:

```bash
pip install -r requirements.txt
```

`requirements.txt`:
```
fdb              # driver Firebird
pymssql          # driver SQL Server
fastapi          # framework HTTP
uvicorn          # servidor ASGI
pandas           # processamento de dados
pyarrow          # leitura/escrita Parquet
python-dotenv    # variáveis de ambiente
requests         # HTTP client
sshtunnel        # túnel SSH
paramiko==2.12.0 # SSH (versão fixada — compatibilidade com sshtunnel)
```

### Node.js (frontend)

```bash
Node.js >= 18
npm >= 9
```

Instalar dependências:

```bash
cd frontend
npm install
```

Stack frontend:
```
Next.js 16      # framework React
React 19        # UI
Tailwind CSS 4  # estilos
Recharts        # gráficos (AreaChart, sparklines)
Lucide React    # ícones
```

---

## 4. Configuração de Ambiente

Copie `.env.example` para `.env` na raiz do projeto e preencha:

```bash
cp .env.example .env
```

Arquivo `.env`:

```ini
# ── Firebird ───────────────────────────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=3050
DB_PATH=/u10/c6bank/dados/scci.gdb   # caminho do .gdb no servidor Linux
DB_USER=SYSDBA
DB_PASSWORD=sua_senha_do_firebird
DB_CHARSET=WIN1252                    # charset legado brasileiro

# ── SSH ────────────────────────────────────────────────────────────────────────
SSH_HOST=10.3.98.108                  # IP do servidor da empresa
SSH_PORT=23                           # porta SSH (padrão é 22)
SSH_USER=seu_usuario_linux
SSH_PASSWORD=sua_senha_linux

# ── SQL Server (Banco Inter) ───────────────────────────────────────────────────
INTER_DB_HOST=MSSQL_2022
INTER_DB_PORT=1433
INTER_DB_NAME=intermedium_2022
INTER_DB_USER=sa
INTER_DB_PASSWORD=sua_senha_sqlserver
```

> **Segurança:** O `.env` está no `.gitignore`. Nunca commite credenciais reais.

---

## 5. Conexão SSH e Bancos de Dados

### Por que SSH Tunnel?

Os bancos de dados (Firebird e SQL Server) ficam em servidores Linux dentro da rede interna da empresa. Eles não são expostos publicamente. O túnel SSH cria um canal seguro:

```
Sua máquina (Windows)
    └─ porta local aleatória (ex: 54321)
           │  SSH Tunnel (sshtunnel)
           └──► servidor Linux (10.3.98.108, porta 23)
                       └─ Firebird (localhost:3050)
                       └─ SQL Server (MSSQL_2022:1433)
```

### Como o túnel funciona (código)

**`core/database.py`** — Firebird via SSH:

```python
from sshtunnel import SSHTunnelForwarder
import fdb

tunnel = SSHTunnelForwarder(
    ('10.3.98.108', 23),            # servidor SSH
    ssh_username='usuario_linux',
    ssh_password='senha_linux',
    remote_bind_address=('localhost', 3050),  # Firebird no servidor
)
tunnel.start()

conn = fdb.connect(
    dsn=f"localhost/{tunnel.local_bind_port}:/u10/c6bank/dados/scci.gdb",
    user='SYSDBA',
    password='senha_firebird',
    charset='WIN1252',
)
```

**`core/database_sqlserver.py`** — SQL Server via SSH:

```python
from sshtunnel import SSHTunnelForwarder
import pymssql

tunnel = SSHTunnelForwarder(
    ('10.3.98.108', 23),
    ssh_username='usuario_linux',
    ssh_password='senha_linux',
    remote_bind_address=('MSSQL_2022', 1433),  # hostname do SQL Server
)
tunnel.start()

conn = pymssql.connect(
    server='127.0.0.1',
    port=tunnel.local_bind_port,
    user='sa',
    password='senha_sqlserver',
    database='intermedium_2022',
)
```

### Reuso de túnel

O sistema mantém **um túnel ativo por banco** e só o recria se:
- As credenciais SSH mudarem (login diferente)
- O túnel estiver inativo (`is_active == False`)

Isso evita reconexões a cada requisição.

### Tabelas consultadas

```sql
-- Histórico de fases de cada operação
SELECT h.NU_OPERACAO, h.NU_FASE_OPERACAO, h.DT_INICIO_FASE, h.CO_USUARIO_FASE,
       f.NO_FASE_OPERACAO
FROM HISTORICO_OPERACAO h
LEFT JOIN FASE_OPERACAO f ON h.NU_FASE_OPERACAO = f.NU_FASE_OPERACAO
ORDER BY h.DT_INICIO_FASE DESC
```

| Coluna           | Tipo    | Descrição                                     |
|------------------|---------|-----------------------------------------------|
| NU_OPERACAO      | INTEGER | ID único da operação de crédito               |
| NU_FASE_OPERACAO | INTEGER | Código da fase (0–1000)                       |
| DT_INICIO_FASE   | DATE    | Data em que a operação entrou nessa fase      |
| CO_USUARIO_FASE  | VARCHAR | Login do usuário responsável                  |
| NO_FASE_OPERACAO | VARCHAR | Nome da fase no banco (substituído pelo FASE_MAP)|

---

## 6. Criação do Banco de Métricas (Parquet)

O "banco de métricas" é um arquivo **Parquet** local gerado automaticamente pelo ETL. Não é necessário criar nenhuma tabela SQL — o Parquet funciona como um data warehouse de arquivo único.

### Localização

```
CONSULTAS/
├── metricas_c6_scci.parquet       # C6 Bank, ambiente scci.gdb
├── metricas_inter.parquet         # Banco Inter
└── metricas_<banco>_<slug>.parquet
```

O nome do arquivo é gerado pela função `_cache_path(banco, ambiente)`:

```python
def _cache_path(banco: str, ambiente: str | None = None) -> str:
    slug = banco
    if ambiente:
        basename = os.path.splitext(os.path.basename(ambiente))[0]  # "scci"
        if basename:
            slug = f"{banco}_{basename}"  # "c6_scci"
    return os.path.join('CONSULTAS', f"metricas_{slug}.parquet")
```

### Schema do Parquet

| Coluna           | Tipo pandas   | Descrição                              |
|------------------|---------------|----------------------------------------|
| NU_OPERACAO      | object (str)  | ID da operação (string para join)      |
| NU_FASE_OPERACAO | int64         | Código numérico da fase                |
| DT_INICIO_FASE   | datetime64    | Data de início da fase                 |
| CO_USUARIO_FASE  | object (str)  | Login do usuário                       |
| NO_FASE_OPERACAO | object (str)  | Nome bruto do banco (legado)           |
| NO_FASE          | object (str)  | Nome legível (do FASE_MAP)             |
| MACROFASE        | object (str)  | Macrofase (Simulação, Cadastro, etc.)  |

### Como criar / popular o Parquet

**Via interface (recomendado):**

1. Abra `http://localhost:3000/dados` (tela Fontes)
2. Clique em **Atualizar** no card do banco desejado
3. Escolha o limite de registros (20k / 50k / 100k / 200k)
4. O Parquet é criado em `CONSULTAS/` automaticamente

**Via API diretamente:**

```bash
# Busca os 50.000 registros mais recentes do C6 Bank
curl "http://localhost:8000/cache/refresh?banco=c6&limit=50000&login=usuario&senha=senha"

# Expande com 50.000 registros mais antigos (acumula histórico)
curl "http://localhost:8000/cache/expand?banco=c6&limit=50000&login=usuario&senha=senha"
```

### Estratégia de deduplicação

O Parquet nunca tem duplicatas. A cada merge:

```python
df = pd.concat([df_existente, df_novo], ignore_index=True)
df = df.drop_duplicates(subset=['NU_OPERACAO', 'NU_FASE_OPERACAO'], keep='last')
df.to_parquet(path, index=False, compression='snappy')
```

A chave primária é `(NU_OPERACAO, NU_FASE_OPERACAO)` — uma operação só passa uma vez por cada fase.

### Acumulando 1M+ de registros

**Atualizar** busca os N mais recentes (do banco para o Parquet).  
**Expandir** busca os N anteriores ao mais antigo já salvo:

```sql
-- Firebird: busca registros antes da data mínima do Parquet
SELECT FIRST 50000 ...
FROM HISTORICO_OPERACAO h
WHERE h.DT_INICIO_FASE < '2022-01-15'   -- data mínima atual do Parquet
ORDER BY h.DT_INICIO_FASE DESC
```

Fluxo recomendado para chegar em 1M+ de registros sem fazer SELECT gigante:

```
1. Atualizar (50k)   → Parquet: 50k registros recentes
2. Expandir (50k)    → Parquet: 100k
3. Expandir (50k)    → Parquet: 150k
4. ...               → Parquet: 1M+
```

---

## 7. Exportação para CSV

O Parquet pode ser exportado para CSV a qualquer momento via pandas:

```python
import pandas as pd

df = pd.read_parquet('CONSULTAS/metricas_c6_scci.parquet')
df.to_csv('metricas_c6.csv', index=False, encoding='utf-8-sig')  # utf-8-sig para Excel
```

### Exportar via Python script

Crie `exportar_csv.py`:

```python
import pandas as pd
import os

PARQUET_DIR = 'CONSULTAS'

for arquivo in os.listdir(PARQUET_DIR):
    if arquivo.endswith('.parquet'):
        nome = arquivo.replace('.parquet', '')
        df = pd.read_parquet(os.path.join(PARQUET_DIR, arquivo))
        saida = os.path.join(PARQUET_DIR, f"{nome}.csv")
        df.to_csv(saida, index=False, encoding='utf-8-sig')
        print(f"Exportado: {saida} ({len(df):,} linhas)")
```

```bash
python exportar_csv.py
```

### Colunas do CSV exportado

```
NU_OPERACAO, NU_FASE_OPERACAO, DT_INICIO_FASE, CO_USUARIO_FASE,
NO_FASE_OPERACAO, NO_FASE, MACROFASE
```

---

## 8. Como Rodar

### Terminal 1 — Backend (FastAPI)

```bash
# Na raiz do projeto
uvicorn api:app --reload --port 8000
```

- `--reload`: reinicia automaticamente ao salvar `api.py`
- Acesso: `http://localhost:8000`
- Docs interativas: `http://localhost:8000/docs`

### Terminal 2 — Frontend (Next.js)

```bash
cd frontend
npm run dev
```

- Acesso: `http://localhost:3000`
- Hot reload automático

### Verificar se está funcionando

```bash
# Backend saudável?
curl http://localhost:8000/docs

# Parquet existe e tem dados?
curl http://localhost:8000/parquet/info?banco=c6

# Dashboard processado?
curl http://localhost:8000/dashboard?banco=c6
```

---

## 9. API — Endpoints Completos

Base URL: `http://localhost:8000`

### Dashboard

| Método | Endpoint | Parâmetros | Descrição |
|--------|----------|------------|-----------|
| GET | `/dashboard` | `banco`, `ambiente` | Lê Parquet, processa e retorna `DashboardData` |

Resposta `DashboardData`:
```json
{
  "kpis": {
    "totalRegistros": 150000,
    "operacoesUnicas": 45231,
    "operacoesIniciadas": 45231,
    "operacoesConcluidas": 8102,
    "operacoesCanceladas": 21500,
    "operacoesEmFila": 15629,
    "taxaConversao": 17.9,
    "topUsuario": "joao.silva",
    "tempoMedioTotal": 42.3
  },
  "operacoesPorFase": [
    { "fase": 50, "nome": "Cadastro da Proposta", "macrofase": "Cadastro", "total": 45231, "abandono": 340 }
  ],
  "tempoMedioPorFase": [
    { "fase": 50, "nome": "Cadastro da Proposta", "macrofase": "Cadastro", "tempoMedioDias": 2.1 }
  ],
  "transicoes": [
    { "de": 100, "para": 200, "paraNome": "Negociação Comercial", "qtd": 12500 },
    { "de": 100, "para": 900, "paraNome": "Cliente Desistiu", "qtd": 3200 }
  ],
  "evolucaoMensal": [
    { "mes": "2024-01", "label": "Jan/24", "iniciadas": 4200, "concluidas": 720, "canceladas": 1800, "emFila": 1680, "taxaConversao": 17.1, "tempoMedio": 41.5 }
  ],
  "topUsuarios": [{ "usuario": "joao.silva", "total": 8420 }],
  "volumePorData": [{ "data": "2024-03-15", "total": 142 }]
}
```

### ETL — Cache / Warehouse

| Método | Endpoint | Parâmetros | Descrição |
|--------|----------|------------|-----------|
| GET | `/cache/refresh` | `banco`, `limit`, `login`, `senha`, `ambiente` | Busca N mais recentes, merge, salva Parquet |
| GET | `/cache/expand` | `banco`, `limit`, `login`, `senha`, `ambiente` | Busca N anteriores ao mínimo, merge, acumula |

Ambos retornam `DashboardData` + `savedAt`. O `/cache/expand` também retorna `adicionados: int`.

### Explorer Parquet

| Método | Endpoint | Parâmetros | Descrição |
|--------|----------|------------|-----------|
| GET | `/parquet/info` | `banco`, `ambiente` | Metadados: total, colunas, dtInicio, dtFim |
| GET | `/parquet/dados` | `banco`, `ambiente`, `limit`, `offset`, `ordem`, `desc` | Linhas paginadas e ordenadas |

### Consulta BD Live (Firebird)

| Método | Endpoint | Parâmetros | Descrição |
|--------|----------|------------|-----------|
| GET | `/tabelas` | `login`, `senha`, `ambiente` | Lista todas as tabelas do Firebird |
| GET | `/tabela/{nome}` | `limit`, `offset`, `login`, `senha`, `ambiente` | Dados paginados de uma tabela |
| GET | `/query` | `sql`, `login`, `senha`, `ambiente` | Query SQL livre (admin) |

### Consulta BD Live (SQL Server — Inter)

| Método | Endpoint | Parâmetros | Descrição |
|--------|----------|------------|-----------|
| GET | `/inter/tabelas` | `login`, `senha` | Lista tabelas do SQL Server |
| GET | `/inter/tabela/{nome}` | `limit`, `offset`, `login`, `senha` | Dados paginados |
| GET | `/inter/query` | `sql`, `login`, `senha` | Query SQL livre |

### Histórico live (sem Parquet)

| Método | Endpoint | Parâmetros | Descrição |
|--------|----------|------------|-----------|
| GET | `/historico` | `banco`, `limit`, `inicio`, `fim`, `login`, `senha`, `ambiente` | Consulta live com filtro de data |

---

## 10. ETL — Fluxo de Dados

### `_apply_fase_map(df, banco)`

Após a consulta SQL, adiciona duas colunas calculadas ao DataFrame:

```python
df['NO_FASE']   # nome legível da fase (ex: "Análise de Crédito")
df['MACROFASE'] # macrofase (ex: "Crédito")
```

Usa o `FASE_MAP` definido em `api.py` — um dicionário por banco:

```python
FASE_MAP = {
    'c6': {
        100: ('Análise de Crédito', 'Crédito'),
        101: ('Crédito Reprovado',  'Crédito'),
        200: ('Negociação Comercial', 'Negociação'),
        # ...
    }
}
```

### `_build_dashboard_data(df)`

Função central que transforma o DataFrame bruto em `DashboardData`:

1. **Normalização** — tipos, encoding, colunas ausentes
2. **Phase counts** — `groupby(['NU_FASE_OPERACAO', 'FASE_NOME', 'MACROFASE']).size()`
3. **Tempo por fase** — `shift(-1)` por operação calcula dias entre fases consecutivas
4. **Last phase por operação** — identifica se concluída, cancelada ou em fila
5. **Abandono** — para operações canceladas, identifica qual foi a última fase ativa antes do cancelamento
6. **Transições** — para cada fase, quais são os top-5 destinos seguintes
7. **Evolução mensal** — agrupa por período, calcula iniciadas/concluídas/canceladas/em fila
8. **KPIs** — totais consolidados
9. **Serialização** — converte tipos numpy/pandas para Python nativo via `_to_native()`

---

## 11. Mapeamento de Fases (FASE_MAP)

O `FASE_MAP` em `api.py` mapeia cada código numérico de fase para `(nome_legível, macrofase)`:

```python
FASE_MAP: dict[str, dict[int, tuple[str, str]]] = {
    'c6': {
        0:    ('Fase inicial',          'Simulação'),
        1:    ('Proposta',              'Simulação'),
        50:   ('Cadastro da Proposta',  'Cadastro'),
        80:   ('Checklist - Crédito',   'Cadastro'),
        90:   ('Pendente Documentos',   'Cadastro'),
        100:  ('Análise de Crédito',    'Crédito'),
        101:  ('Crédito Reprovado',     'Crédito'),
        200:  ('Negociação Comercial',  'Negociação'),
        # ... fases 300-938, 1000
    }
}
```

### Macrofases e seus códigos (C6 Bank)

| Macrofase              | Códigos de fase                        |
|------------------------|----------------------------------------|
| Simulação              | 0, 1                                   |
| Cadastro               | 50, 80, 90                             |
| Crédito                | 100, 101                               |
| Negociação             | 200, 201, 202                          |
| Análise de Documentos  | 300, 301                               |
| Análise Técnica        | 400–409                                |
| Formalização           | 500–506, 600, 601                      |
| Liberação              | 700, 701                               |
| Concluído              | 800                                    |
| Cancelada              | 900–938, 1000                          |

### KPIs de status

| KPI                  | Critério                                          |
|----------------------|---------------------------------------------------|
| Operações Concluídas | Última fase da operação == 800                    |
| Operações Canceladas | Última fase ∈ {900–938, 1000}                     |
| Operações em Fila    | Iniciadas − Concluídas − Canceladas               |
| Abandono por fase    | Última fase ativa (não-cancelada) antes de 900+   |

---

## 12. Dashboard — Telas e Funcionalidades

### `/dashboard` — Visão Geral

- **5 KPI cards** com sparkline e delta mês a mês: Operações Iniciadas, Concluídas, Taxa de Conversão, Em Fila, Usuário Mais Ativo
- **Gráfico de evolução mensal** (área) — iniciadas, concluídas, canceladas, em fila
- **Tabela de variação** mês a mês com badge colorido por direção
- **Funil por macrofase** (compacto, 2/3 da tela) — com tooltip hover mostrando fases individuais
- **Performance por banco** (1/3 da tela)

### `/fases` — Por Fase

- **Funil expandível** por macrofase (2/3 da tela):
  - Linha de macrofase: volume total, `% do funil`, tempo médio, abandono com `% do total`
  - Clique expande para ver as fases individuais como cards
  - Cada card de fase: barra proporcional, registros, `% da etapa`, tempo, abandono com `% do total`
  - Linha **Fluxo**: chips coloridos mostrando destinos (cor da macrofase de destino)
- **Ranking de Abandono** (1/3 da tela): top-10 fases com maior abandono, ordenadas por contagem

### `/explorer` — BD de Métricas

- Tabela paginada do Parquet com todas as linhas
- Colunas: Operação, Cód. Fase, Etapa (NO_FASE), Macrofase (badge colorido), Data Início, Usuário
- Ordenação clicável por coluna
- Seletor de linhas por página: 50 / 100 / 200
- Paginação com números de página

### `/dados` — Fontes

- Card por banco configurado
- Status: Buscando / Erro / Cache / Atualizado
- Estatísticas: total de registros e operações únicas no Parquet
- Seletor de limite: 20k / 50k / 100k / 200k
- **Atualizar**: busca N mais recentes, merge sem duplicatas
- **Expandir**: adiciona N registros anteriores ao mais antigo, acumula histórico
- Modal de confirmação com descrição clara da operação

### `/tabelas` — Consulta BD

- Acesso live ao banco Firebird (sem Parquet)
- Lista de todas as tabelas
- Visualização de qualquer tabela com paginação
- Ordenação automática pela coluna de data

---

## 13. Adicionando um Novo Banco

### 1. Backend — `api.py`

Adicione o banco no `FASE_MAP`:

```python
FASE_MAP['novo_banco'] = {
    100: ('Nome da Fase', 'Macrofase'),
    # ...
}
```

Se o banco usa SQL Server, ele já usa `database_sqlserver.py`. Se usa Firebird, usa `database.py`.

Para SQL Server, adicione condições `if banco == 'novo_banco':` nos endpoints `/cache/refresh` e `/cache/expand`.

### 2. Frontend — `src/constants/banks.ts`

```typescript
{
  id: 'novo_banco',
  name: 'Nome do Banco',
  fullName: 'Nome Completo',
  dbType: 'Firebird',          // ou 'SQL Server'
  ambiente: '/caminho/banco.gdb',
  apiPrefix: '',
  enabled: true,
  colors: {
    bg: '#HEX',
    text: '#FFFFFF',
    accent: '#HEX',
    badge: '#HEX',
  },
}
```

### 3. Arquivo Parquet

Na primeira execução, clique em **Atualizar** na tela Fontes. O Parquet é criado em:
```
CONSULTAS/metricas_<id>_<slug>.parquet
```

---

## 14. Stack Tecnológica

### Backend

| Tecnologia | Versão | Função |
|------------|--------|--------|
| Python | ≥ 3.10 | Linguagem principal |
| FastAPI | latest | Framework HTTP/API |
| Uvicorn | latest | Servidor ASGI |
| pandas | latest | Processamento de dados |
| pyarrow | latest | Leitura/escrita Parquet |
| fdb | latest | Driver Firebird (Python) |
| pymssql | latest | Driver SQL Server (Python) |
| sshtunnel | latest | Túnel SSH automático |
| paramiko | 2.12.0 | SSH client (versão fixada) |
| python-dotenv | latest | Variáveis de ambiente |

### Frontend

| Tecnologia | Versão | Função |
|------------|--------|--------|
| Next.js | 16 | Framework React (App Router) |
| React | 19 | UI |
| TypeScript | latest | Tipagem estática |
| Tailwind CSS | 4 | Estilos utilitários |
| Recharts | latest | Gráficos (AreaChart, sparklines) |
| Lucide React | latest | Ícones |

### Armazenamento

| Formato | Local | Ferramenta |
|---------|-------|------------|
| Parquet (Snappy) | `CONSULTAS/*.parquet` | pyarrow via pandas |

---

## 15. Glossário

| Termo | Definição |
|-------|-----------|
| **AG31** | Relatório mensal do SCCI enviado pelos bancos ao governo |
| **FCVS** | Fundo de Compensação de Variações Salariais — cobertura governamental para contratos antigos de crédito imobiliário |
| **SCCI** | Sistema de Controle de Crédito Imobiliário |
| **Operação** | Uma proposta/contrato de crédito imobiliário identificada por `NU_OPERACAO` |
| **Fase** | Etapa no ciclo de vida da operação (ex: Análise de Crédito = fase 100) |
| **Macrofase** | Agrupamento de fases relacionadas (ex: fases 100 e 101 são ambas "Crédito") |
| **HISTORICO_OPERACAO** | Tabela principal no Firebird — registra cada vez que uma operação muda de fase |
| **FASE_OPERACAO** | Tabela de cadastro de fases no Firebird (usada apenas para fallback de nome) |
| **NO_FASE** | Nome legível da fase, gerado pelo `FASE_MAP` no ETL (não vem do banco) |
| **MACROFASE** | Coluna calculada pelo ETL agrupando fases em etapas maiores |
| **Abandono** | Operações cuja última fase ativa (não-cancelada) foi X — indica que saíram do funil nesse ponto |
| **Transição** | Movimento de operações de uma fase para outra (ex: 100 → 200 = saiu de Crédito para Negociação) |
| **Atualizar** | Busca os N registros mais recentes do banco e mescla com o Parquet existente |
| **Expandir** | Busca os N registros anteriores ao mais antigo do Parquet — acumula histórico sem refazer consultas grandes |
| **Parquet** | Formato de arquivo colunar, muito eficiente para leitura analítica |
| **ETL** | Extract, Transform, Load — o processo de buscar dados do banco, transformar e salvar no Parquet |
| **BASE_PRINCIPAL** | Segmento de contratos ativos no AG31 |
| **BASE_FINALIZADOS** | Segmento de contratos encerrados no AG31 |
| **Taxa de Conversão** | `(Concluídas / Iniciadas) × 100%` |
| **Em Fila** | `Iniciadas − Concluídas − Canceladas` — operações ainda em andamento |
