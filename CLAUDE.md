# Métricas AG31 — SCCI / FCVS

## Contexto do Projeto

Sistema de visualização e análise de métricas do **AG31** — relatório padrão do **SCCI (Sistema de Controle de Crédito Imobiliário)**, relacionado ao **FCVS (Fundo de Compensação de Variações Salariais)**. Os dados vêm de múltiplos bancos que operam crédito imobiliário (Sicredi, C6 Bank, Itaú) e de um banco de dados Firebird interno.

O AG31 é um relatório mensal que os bancos enviam contendo métricas de:
- **Contratos** (Base Principal e Base de Finalizados): ativos, inativos, com/sem cobertura FCVS, com/sem série, prestações emitidas, baixas processadas, etc.
- **Imóveis**: cadastrados, vagos (novos e retomados), ocupados (ativos e inativos)
- **Originação**: operações iniciadas, concluídas, após avaliação, após assinatura de contrato, tempo por fase

---

## Arquivos

### `app.py` — Dashboard Multi-Banco (AG31 estático)
Streamlit. Lê arquivos locais em `documentosuteis/`:
- **Sicredi**: XML (`AG31`) — parser com `xml.etree.ElementTree`
- **C6 Bank**: PDF (`C6-AG31_022026.pdf`) — parser com `fitz` (PyMuPDF)
- **Itaú**: PDF (`ITAU-AG31-itaufcvs.022026.pdf`) — parser com `fitz`

Páginas: Dashboard, Tabela Detalhada, Dados Brutos, Comparativo.

Tema visual dinâmico por banco (TEMAS dict). Métricas normalizadas para chaves padronizadas:
- `PRI_CTR_*` = Base Principal / Contratos
- `FIN_CTR_*` = Base Finalizados / Contratos
- `PRI_IMV_*` / `FIN_IMV_*` = Imóveis
- `ORI_*` = Originação

### `dashboard.py` — Dashboard Live (Firebird via API)
Streamlit. Conecta à API REST local para consultar o banco Firebird em tempo real.
- Sidebar: seleção de tabela, slider de limite, query SQL customizada
- Análise especial para tabela `HISTORICO_OPERACAO`: gráficos por fase, volume por data, top usuários
- Para outras tabelas: gráficos automáticos por tipo de coluna

### `api.py` — Backend FastAPI
Endpoints:
- `GET /tabelas` — lista todas as tabelas do Firebird
- `GET /tabela/{nome}?limit=&offset=` — retorna dados de uma tabela
- `GET /query?sql=` — executa SQL livre

### `database.py` — Conexão Firebird
Conecta via **SSH tunnel** (`sshtunnel`) ao servidor remoto, depois abre conexão **Firebird** (`fdb`) com charset `WIN1252`.
Variáveis de ambiente: `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PASSWORD`, `DB_PORT`, `DB_PATH`, `DB_USER`, `DB_PASSWORD`, `DB_CHARSET`.

### `compare_banks.py` — Script de Comparação
Script standalone para comparar métricas entre Sicredi (XML), C6 (PDF) e Itaú (PDF). Imprime tabela terminal com campos faltantes/extras por banco.

---

## Stack

- **Frontend**: Streamlit + Plotly (go.Figure, px)
- **Backend**: FastAPI + Uvicorn
- **Banco**: Firebird via `fdb`, acesso remoto via SSH tunnel (`sshtunnel`)
- **Parse PDF**: PyMuPDF (`fitz`)
- **Parse XML**: `xml.etree.ElementTree`
- **Dados**: pandas

---

## Convenções Visuais

- Paleta: azul `#1A5FFF`, amarelo `#FFD93D`, fundo branco — estilo corporativo clean
- Fonte: Inter (Google Fonts)
- Cards de métricas com borda superior colorida por variante
- Tema dinâmico em `app.py`: cada banco tem seu tema de cores próprio
- Componente `section_label()` / `.section-title` para separação visual de seções

---

## Domínio (Glossário)

- **AG31**: Relatório mensal do SCCI enviado pelos bancos ao governo
- **FCVS**: Fundo de Compensação de Variações Salariais — cobertura governamental para contratos antigos
- **SCCI**: Sistema de Controle de Crédito Imobiliário
- **Fase de Operação**: etapas do processo de originação (avaliação, assinatura, etc.)
- **Base Principal / Base de Finalizados**: segmentação dos contratos no AG31
- **HISTORICO_OPERACAO**: tabela principal do Firebird com histórico das operações/fases
