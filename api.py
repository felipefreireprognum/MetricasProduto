import os
import json
import numpy as np
import pandas as pd
from datetime import date as _date, datetime
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from core.database import get_connection, listar_tabelas

class _NpEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, np.integer):  return int(o)
        if isinstance(o, np.floating): return float(o)
        if isinstance(o, np.ndarray):  return o.tolist()
        if isinstance(o, pd.Timestamp): return str(o)
        return super().default(o)

def _to_native(obj):
    return json.loads(json.dumps(obj, cls=_NpEncoder, default=str))


CACHE_DIR = 'CONSULTAS'
os.makedirs(CACHE_DIR, exist_ok=True)


def _cache_path(banco: str, ambiente: str | None = None) -> str:
    slug = banco
    if ambiente:
        # /u10/c6bank/dados/scci.gdb → scci
        basename = os.path.splitext(os.path.basename(ambiente))[0]
        if basename:
            slug = f"{banco}_{basename}"
    return os.path.join(CACHE_DIR, f"metricas_{slug}.parquet")


def _ambiente_label(banco: str, ambiente: str | None) -> str:
    """Human-readable ambiente identifier stored as column in Parquet."""
    if ambiente:
        return os.path.splitext(os.path.basename(ambiente))[0]  # /u10/.../scci.gdb → 'scci'
    return banco


def _list_available_parquets() -> list[tuple[str, str]]:
    """Returns [(banco_id, filepath)] for every Parquet in CONSULTAS/."""
    result = []
    if not os.path.exists(CACHE_DIR):
        return result
    for fname in sorted(os.listdir(CACHE_DIR)):
        if fname.startswith('metricas_') and fname.endswith('.parquet'):
            stem  = fname[len('metricas_'):-len('.parquet')]  # e.g. 'c6_scci' or 'inter'
            banco = stem.split('_')[0]                         # e.g. 'c6' or 'inter'
            result.append((banco, os.path.join(CACHE_DIR, fname)))
    return result


def _read_all_parquets() -> tuple[pd.DataFrame, list[str]]:
    """Read all Parquets, ensure BANCO/AMBIENTE columns, concatenate. Returns (df, banco_ids)."""
    dfs, bancos = [], []
    for banco_id, path in _list_available_parquets():
        try:
            df = pd.read_parquet(path)
            df['BANCO'] = banco_id
            if 'AMBIENTE' not in df.columns:
                # Derive from filename for old Parquets: metricas_c6_scci → scci
                stem  = os.path.basename(path)[len('metricas_'):-len('.parquet')]
                parts = stem.split('_')
                df['AMBIENTE'] = '_'.join(parts[1:]) if len(parts) > 1 else banco_id
            dfs.append(df)
            bancos.append(banco_id)
        except Exception:
            pass
    if not dfs:
        return pd.DataFrame(), []
    return pd.concat(dfs, ignore_index=True), bancos

# FASE_MAP: por banco → código → (nome da fase, macrofase)
# Adicione novos bancos como chaves adicionais conforme necessário.
FASE_MAP: dict[str, dict[int, tuple[str, str]]] = {
    'c6': {
        0:    ('Fase inicial',                                           'Simulação'),
        1:    ('Proposta',                                               'Simulação'),
        50:   ('Cadastro da Proposta',                                   'Cadastro'),
        80:   ('Checklist - Crédito',                                    'Cadastro'),
        90:   ('Pendente Documentos - Crédito',                          'Cadastro'),
        100:  ('Análise de Crédito',                                     'Crédito'),
        101:  ('Crédito Reprovado',                                      'Crédito'),
        200:  ('Negociação Comercial',                                   'Negociação'),
        201:  ('Envio de documentos - Pasta',                            'Negociação'),
        202:  ('Regularizar Cadastro/Documentos para a Análise Documental', 'Negociação'),
        300:  ('Validação da Pasta',                                     'Análise de Documentos'),
        301:  ('Pendencia da Pasta',                                     'Análise de Documentos'),
        400:  ('Análise Técnica e da Garantia',                          'Análise Técnica'),
        401:  ('Laudo solicitado',                                       'Análise Técnica'),
        402:  ('Laudo em análise',                                       'Análise Técnica'),
        403:  ('Solicitação de Laudo',                                   'Análise Técnica'),
        404:  ('Laudo recusado',                                         'Análise Técnica'),
        405:  ('Laudo em revisão',                                       'Análise Técnica'),
        406:  ('Pendência do Laudo',                                     'Análise Técnica'),
        407:  ('Reanálise de Crédito',                                   'Análise Técnica'),
        408:  ('Divergência - Valor de avaliação',                       'Análise Técnica'),
        409:  ('Enquadrar proposta',                                     'Análise Técnica'),
        500:  ('Formalização',                                           'Formalização'),
        501:  ('Emissão de contrato',                                    'Formalização'),
        502:  ('Assinatura de contrato',                                 'Formalização'),
        503:  ('Confirmação de Valores',                                 'Formalização'),
        504:  ('Pendente - Emissão de Contrato',                         'Formalização'),
        505:  ('Analise Documental',                                     'Formalização'),
        600:  ('Registro do Contrato',                                   'Formalização'),
        601:  ('Pendente - Registro do Contrato',                        'Formalização'),
        700:  ('Liberação de Recursos',                                  'Liberação'),
        701:  ('Pendente - Liberação de Recursos',                       'Liberação'),
        800:  ('Operação Concluída',                                     'Concluído'),
        900:  ('Cliente Desistiu',                                       'Cancelada'),
        901:  ('Concorrente Santander',                                  'Cancelada'),
        902:  ('Concorrente Itaú',                                       'Cancelada'),
        903:  ('Concorrente Creditas',                                   'Cancelada'),
        904:  ('Concorrente - Cashme',                                   'Cancelada'),
        905:  ('Concorrente - Inter',                                    'Cancelada'),
        906:  ('Concorrente - Bradesco',                                 'Cancelada'),
        907:  ('Concorrente - Daycoval',                                 'Cancelada'),
        908:  ('Concorrente - Outro',                                    'Cancelada'),
        909:  ('Cond. N agrada - Prazo',                                 'Cancelada'),
        910:  ('Cond. N agrada - Valor aprov',                           'Cancelada'),
        911:  ('Cond. N agrada - Quitação Dívidas',                      'Cancelada'),
        912:  ('Cond. N agrada - Taxa/Prestação',                        'Cancelada'),
        913:  ('Cond. N agrada - Indexador',                             'Cancelada'),
        914:  ('Contato sem sucesso',                                    'Cancelada'),
        915:  ('N enviou docs',                                          'Cancelada'),
        916:  ('Participante não concorda',                              'Cancelada'),
        917:  ('Só simulando',                                           'Cancelada'),
        918:  ('Processo demorado',                                      'Cancelada'),
        919:  ('Vendeu imóvel',                                          'Cancelada'),
        920:  ('Outro Prod. - Fin. imob',                                'Cancelada'),
        921:  ('Outro prod. - Car Equity',                               'Cancelada'),
        922:  ('Outro Prod. - Refin',                                    'Cancelada'),
        923:  ('Outro Prod. - Fin. Veículos',                            'Cancelada'),
        924:  ('Outro Prod. - Consig',                                   'Cancelada'),
        925:  ('Outro Prod. - Outro',                                    'Cancelada'),
        926:  ('Imóvel - Sem Averbação',                                 'Cancelada'),
        927:  ('Imóvel - Sem habite-se',                                 'Cancelada'),
        928:  ('Imóvel - Multifamiliar',                                 'Cancelada'),
        929:  ('Imóvel - lq>=LTV',                                       'Cancelada'),
        930:  ('Jurídico - C/C Negada',                                  'Cancelada'),
        931:  ('Jurídico - Ação Judicial',                               'Cancelada'),
        932:  ('Jurídico - Cláusulas restritivas',                       'Cancelada'),
        933:  ('Jurídico - Não quita condicionante',                     'Cancelada'),
        934:  ('Laudo - Divergência Metragem Terreno',                   'Cancelada'),
        935:  ('Laudo - Imóvel misto',                                   'Cancelada'),
        936:  ('Laudo - Sem documentação exigência',                     'Cancelada'),
        937:  ('Distrato - Demora no Registro',                          'Cancelada'),
        938:  ('Proposta expirada',                                      'Cancelada'),
        1000: ('Proposta Cancelada',                                     'Cancelada'),
    },
}

_FALLBACK_FASE = ('Desconhecida', 'Desconhecida')

def _apply_fase_map(df: pd.DataFrame, banco: str) -> pd.DataFrame:
    fmap = FASE_MAP.get(banco, {})
    def _lookup(cod, idx):
        try:
            return fmap.get(int(cod), _FALLBACK_FASE)[idx]
        except Exception:
            return _FALLBACK_FASE[idx]
    df['NO_FASE']   = df['NU_FASE_OPERACAO'].apply(lambda x: _lookup(x, 0))
    df['MACROFASE'] = df['NU_FASE_OPERACAO'].apply(lambda x: _lookup(x, 1))
    return df

CACHE_SQL_FIREBIRD = (
    "SELECT FIRST {limit} h.NU_OPERACAO, h.NU_FASE_OPERACAO, h.DT_INICIO_FASE, "
    "h.CO_USUARIO_FASE, f.NO_FASE_OPERACAO, cpf_sub.NU_CPF "
    "FROM HISTORICO_OPERACAO h "
    "LEFT JOIN FASE_OPERACAO f ON h.NU_FASE_OPERACAO = f.NU_FASE_OPERACAO "
    "LEFT JOIN (SELECT NU_OPERACAO, MIN(TRIM(NU_CPF)) AS NU_CPF "
    "           FROM OPERACAO_CREDITO GROUP BY NU_OPERACAO) cpf_sub "
    "ON cpf_sub.NU_OPERACAO = h.NU_OPERACAO "
    "ORDER BY h.DT_INICIO_FASE DESC"
)

CACHE_SQL_SQLSERVER = (
    "SELECT TOP {limit} h.NU_OPERACAO, h.NU_FASE_OPERACAO, h.DT_INICIO_FASE, "
    "h.CO_USUARIO_FASE, f.NO_FASE_OPERACAO "
    "FROM HISTORICO_OPERACAO h "
    "LEFT JOIN FASE_OPERACAO f ON h.NU_FASE_OPERACAO = f.NU_FASE_OPERACAO "
    "ORDER BY h.DT_INICIO_FASE DESC"
)

MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

app = FastAPI(title="Métricas API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Dashboard processing ───────────────────────────────────────────────────────

def _build_dashboard_data(df: pd.DataFrame) -> dict | None:
    if df.empty:
        return {
            'operacoesPorFase': [], 'volumePorData': [], 'tempoMedioPorFase': [],
            'topUsuarios': [], 'distribuicaoFases': [], 'evolucaoMensal': [],
            'kpis': {
                'totalRegistros': 0, 'operacoesUnicas': 0, 'fasesUnicas': 0, 'topUsuario': '—',
                'operacoesIniciadas': 0, 'operacoesConcluidas': 0, 'operacoesCanceladas': 0,
                'operacoesEmFila': 0, 'taxaConversao': 0, 'tempoMedioTotal': None,
            },
            'colunas': [], 'primeiraLinha': None,
        }

    df = df.copy()
    df.columns = [c.upper() if isinstance(c, str) else str(c) for c in df.columns]
    df['DT_INICIO_FASE'] = pd.to_datetime(df['DT_INICIO_FASE'], errors='coerce')
    df['NU_FASE_OPERACAO'] = pd.to_numeric(df['NU_FASE_OPERACAO'], errors='coerce').fillna(0).astype(int)
    df['NU_OPERACAO'] = df['NU_OPERACAO'].astype(str).str.strip()

    col_usuario = 'CO_USUARIO_FASE'
    if col_usuario in df.columns:
        df[col_usuario] = df[col_usuario].astype(str).str.strip()
        df[col_usuario] = df[col_usuario].replace({'': 'Desconhecido', 'nan': 'Desconhecido', 'None': 'Desconhecido'})
    else:
        df[col_usuario] = 'Desconhecido'

    # Phase labels: prefer NO_FASE (from FASE_MAP) > NO_FASE_OPERACAO (raw DB join) > fallback
    if 'NO_FASE' in df.columns:
        df['FASE_NOME'] = df['NO_FASE'].fillna('Desconhecida').astype(str)
    elif 'NO_FASE_OPERACAO' in df.columns:
        df['FASE_NOME'] = df['NO_FASE_OPERACAO'].astype(str).str.strip()
        bad = df['FASE_NOME'].isin(['', 'nan', 'None', 'null'])
        df.loc[bad, 'FASE_NOME'] = df.loc[bad, 'NU_FASE_OPERACAO'].apply(lambda x: f'Fase {x}')
    else:
        df['FASE_NOME'] = df['NU_FASE_OPERACAO'].apply(lambda x: f'Fase {x}')

    if 'MACROFASE' not in df.columns:
        df['MACROFASE'] = df['FASE_NOME']

    _CANCELADAS_CODES = set(range(900, 939)) | {1000}

    # 1. Unique operations per phase (nunique avoids counting retries/re-entries as extra ops)
    phase_counts = (
        df.groupby(['NU_FASE_OPERACAO', 'FASE_NOME', 'MACROFASE'])['NU_OPERACAO']
        .nunique()
        .reset_index(name='total')
        .sort_values('NU_FASE_OPERACAO')
    )
    # Funnel: "ops that reached at least this stage" — max non-cancelled phase per op
    # Simulação (min 0) = all ops; numbers decrease monotonically down the pipeline
    _MACROFASE_MIN_CODE = {
        'Simulação':             0,
        'Cadastro':             50,
        'Crédito':             100,
        'Negociação':          200,
        'Análise de Documentos': 300,
        'Análise Técnica':     400,
        'Formalização':        500,
        'Liberação':           700,
        'Concluído':           800,
    }
    df_pipeline     = df[~df['NU_FASE_OPERACAO'].isin(_CANCELADAS_CODES)]
    op_max_pipeline = df_pipeline.groupby('NU_OPERACAO')['NU_FASE_OPERACAO'].max()
    # ops that only appear in cancelled states get max = 0 (they at least started)
    all_op_ids      = df['NU_OPERACAO'].unique()
    op_max_pipeline = op_max_pipeline.reindex(all_op_ids, fill_value=0)

    macrofase_totais = [
        {'macrofase': nome, 'total': int((op_max_pipeline >= min_code).sum())}
        for nome, min_code in _MACROFASE_MIN_CODE.items()
    ]
    # Cancelada appended after op_last_phase is computed in step 3
    # operacoes_por_fase built later (after abandono calculation)

    # 2. Consecutive phase time diffs
    df_by_fase = df.sort_values(['NU_OPERACAO', 'NU_FASE_OPERACAO'])
    df_by_fase['NEXT_DT'] = df_by_fase.groupby('NU_OPERACAO')['DT_INICIO_FASE'].shift(-1)
    df_by_fase['DIAS_DIFF'] = (df_by_fase['NEXT_DT'] - df_by_fase['DT_INICIO_FASE']).dt.days
    valid_diffs = df_by_fase.dropna(subset=['DIAS_DIFF']).query('DIAS_DIFF >= 0')
    tempo_por_fase = (
        valid_diffs.groupby(['NU_FASE_OPERACAO', 'FASE_NOME', 'MACROFASE'])['DIAS_DIFF']
        .mean()
        .reset_index()
        .sort_values('NU_FASE_OPERACAO')
    )
    tempo_medio_por_fase = [
        {'fase': int(r.NU_FASE_OPERACAO), 'nome': r.FASE_NOME, 'macrofase': r.MACROFASE, 'tempoMedioDias': round(float(r.DIAS_DIFF), 1)}
        for r in tempo_por_fase.itertuples()
    ]

    # 3. Per-operation first/last date and last phase (sorted by date then phase, same as JS byDate)
    df_by_date = df.sort_values(['NU_OPERACAO', 'DT_INICIO_FASE', 'NU_FASE_OPERACAO'])
    op_first_date = df_by_date.groupby('NU_OPERACAO')['DT_INICIO_FASE'].first()
    op_last_date  = df_by_date.groupby('NU_OPERACAO')['DT_INICIO_FASE'].last()
    op_last_phase = df_by_date.groupby('NU_OPERACAO')['NU_FASE_OPERACAO'].last()
    macrofase_totais.append({
        'macrofase': 'Cancelada',
        'total': int(op_last_phase.isin(_CANCELADAS_CODES).sum()),
    })

    # 3b. Abandono: for cancelled operations, find last non-cancelada phase
    cancelled_op_ids = set(op_last_phase[op_last_phase.isin(_CANCELADAS_CODES)].index)
    abandono_per_phase: dict[int, int] = {}
    if cancelled_op_ids:
        df_cancelled  = df[df['NU_OPERACAO'].isin(cancelled_op_ids)]
        df_pre_cancel = df_cancelled[~df_cancelled['NU_FASE_OPERACAO'].isin(_CANCELADAS_CODES)]
        if not df_pre_cancel.empty:
            last_pre_cancel = (
                df_pre_cancel
                .sort_values(['NU_OPERACAO', 'DT_INICIO_FASE', 'NU_FASE_OPERACAO'])
                .groupby('NU_OPERACAO')['NU_FASE_OPERACAO']
                .last()
            )
            abandono_per_phase = {int(k): int(v) for k, v in last_pre_cancel.value_counts().items()}

    # 3b-1. Operations currently parked per phase (last recorded phase = this code, not terminal)
    _terminal_codes = _CANCELADAS_CODES | {800}
    em_andamento_por_fase: dict[int, int] = {
        int(k): int(v)
        for k, v in op_last_phase[~op_last_phase.isin(_terminal_codes)].value_counts().items()
    }

    # 3b-ext. Unique CPFs per phase (for CPF lens)
    cpf_por_fase_code: dict[int, int] = {}
    if 'NU_CPF' in df.columns:
        cpf_por_fase_code = (
            df.dropna(subset=['NU_CPF'])
            .groupby('NU_FASE_OPERACAO')['NU_CPF']
            .nunique()
            .to_dict()
        )
        cpf_por_fase_code = {int(k): int(v) for k, v in cpf_por_fase_code.items()}

    operacoes_por_fase = [
        {
            'fase':      int(r.NU_FASE_OPERACAO),
            'nome':      r.FASE_NOME,
            'macrofase': r.MACROFASE,
            'total':     int(r.total),
            'abandono':    int(abandono_per_phase.get(int(r.NU_FASE_OPERACAO), 0)),
            'emAndamento': int(em_andamento_por_fase.get(int(r.NU_FASE_OPERACAO), 0)),
            'totalCpf':    cpf_por_fase_code.get(int(r.NU_FASE_OPERACAO)),
        }
        for r in phase_counts.itertuples()
    ]

    # 3c. Phase transitions (top-5 destinations per phase)
    _tr = df_by_date[['NU_OPERACAO', 'NU_FASE_OPERACAO']].copy()
    _tr['NEXT_FASE'] = _tr.groupby('NU_OPERACAO')['NU_FASE_OPERACAO'].shift(-1)
    trans_counts = (
        _tr.dropna(subset=['NEXT_FASE'])
        .assign(NEXT_FASE=lambda x: x['NEXT_FASE'].astype(int))
        .groupby(['NU_FASE_OPERACAO', 'NEXT_FASE'])
        .size()
        .reset_index(name='qtd')
    )
    trans_top5 = (
        trans_counts
        .sort_values(['NU_FASE_OPERACAO', 'qtd'], ascending=[True, False])
        .groupby('NU_FASE_OPERACAO')
        .head(5)
    )
    _fase_nome = {int(r.NU_FASE_OPERACAO): r.FASE_NOME for r in phase_counts.itertuples()}
    transicoes_list = [
        {
            'de':       int(r.NU_FASE_OPERACAO),
            'para':     int(r.NEXT_FASE),
            'paraNome': _fase_nome.get(int(r.NEXT_FASE), f'Fase {int(r.NEXT_FASE)}'),
            'qtd':      int(r.qtd),
        }
        for r in trans_top5.itertuples()
    ]

    # 4. Monthly time sums (for tempoMedio per month in evolucaoMensal)
    op_duracao = (op_last_date - op_first_date).dt.days
    op_duracao_valid = op_duracao[(op_duracao >= 0) & (op_duracao < 3650)]
    op_mes = op_first_date.dt.to_period('M')
    month_time_df = pd.DataFrame({'dias': op_duracao_valid, 'mes': op_mes[op_duracao_valid.index]})
    month_time_agg = month_time_df.groupby('mes')['dias'].agg(['sum', 'count'])

    # 5. Monthly evolution
    iniciadas_mes  = op_mes.value_counts()
    concluidas_mes = op_mes[op_last_phase == 800].value_counts()
    canceladas_mes = op_mes[op_last_phase.isin(_CANCELADAS_CODES)].value_counts()

    all_months = sorted(set(iniciadas_mes.index) | set(concluidas_mes.index) | set(canceladas_mes.index))
    all_months = all_months[-12:]

    # 5-cpf. CPF monthly evolution (unique CPFs per month of operation start / conclusion)
    cpf_iniciadas_mes: dict = {}
    cpf_concluidas_mes: dict = {}
    if 'NU_CPF' in df.columns:
        op_cpf_map = df.dropna(subset=['NU_CPF']).groupby('NU_OPERACAO')['NU_CPF'].first()
        op_cpf_mes_df = pd.DataFrame({'cpf': op_cpf_map, 'mes': op_mes.reindex(op_cpf_map.index)}).dropna(subset=['mes'])
        cpf_iniciadas_mes = op_cpf_mes_df.groupby('mes')['cpf'].nunique().to_dict()
        concluded_idx = op_last_phase[op_last_phase == 800].index
        op_cpf_concluded = op_cpf_map.reindex(concluded_idx).dropna()
        op_cpf_mes_conc = pd.DataFrame({'cpf': op_cpf_concluded, 'mes': op_mes.reindex(op_cpf_concluded.index)}).dropna(subset=['mes'])
        cpf_concluidas_mes = op_cpf_mes_conc.groupby('mes')['cpf'].nunique().to_dict()

    evolucao_mensal = []
    for mes in all_months:
        ini  = int(iniciadas_mes.get(mes, 0))
        con_ = int(concluidas_mes.get(mes, 0))
        can  = int(canceladas_mes.get(mes, 0))
        em_fila = ini - con_ - can
        taxa    = round((con_ / ini * 100), 1) if ini > 0 else 0.0
        label   = f"{MONTH_NAMES[mes.month - 1]}/{str(mes.year)[-2:]}"
        ts = month_time_agg.loc[mes] if mes in month_time_agg.index else None
        tempo_medio = round(float(ts['sum'] / ts['count']), 1) if ts is not None and ts['count'] > 0 else None
        ini_cpf = int(cpf_iniciadas_mes.get(mes, 0))
        con_cpf = int(cpf_concluidas_mes.get(mes, 0))
        taxa_cpf = round((con_cpf / ini_cpf * 100), 1) if ini_cpf > 0 else 0.0
        evolucao_mensal.append({
            'mes': str(mes), 'label': label,
            'iniciadas': ini, 'concluidas': con_, 'canceladas': can,
            'emFila': em_fila, 'taxaConversao': taxa, 'tempoMedio': tempo_medio,
            'iniciadasCpf': ini_cpf, 'concluidasCpf': con_cpf, 'taxaConversaoCpf': taxa_cpf,
        })

    # 6. Top users
    top_usuarios = [
        {'usuario': str(u), 'total': int(c)}
        for u, c in df[col_usuario].value_counts().head(10).items()
    ]

    # 6-cpf. Top CPFs by operation count (reincidentes)
    top_cpfs: list = []
    if 'NU_CPF' in df.columns:
        cpf_op_cnt = df.dropna(subset=['NU_CPF']).groupby('NU_CPF')['NU_OPERACAO'].nunique()
        top_cpfs = [
            {'cpf': str(cpf), 'total': int(cnt)}
            for cpf, cnt in cpf_op_cnt.nlargest(20).items()
        ]

    # 7. Volume by date (last 30 days)
    vol_series = (
        df.dropna(subset=['DT_INICIO_FASE'])
        .groupby(df['DT_INICIO_FASE'].dt.date)
        .size()
        .sort_index()
        .tail(30)
    )
    volume_por_data = [{'data': str(k), 'total': int(v)} for k, v in vol_series.items()]

    # 8. KPIs
    n_iniciadas  = len(op_last_phase)
    n_concluidas = int((op_last_phase == 800).sum())
    n_canceladas = int(op_last_phase.isin(_CANCELADAS_CODES).sum())
    n_em_fila    = max(n_iniciadas - n_concluidas - n_canceladas, 0)
    taxa_conv    = round((n_concluidas / n_iniciadas * 100), 1) if n_iniciadas > 0 else 0.0
    duracoes_valid = op_duracao[(op_duracao >= 0) & (op_duracao < 3650)]
    tempo_medio_total = round(float(duracoes_valid.mean()), 1) if not duracoes_valid.empty else None
    top_usuario = str(df[col_usuario].value_counts().idxmax()) if not df.empty else '—'

    # CPF metrics (only when NU_CPF column present — requires updated ETL)
    cpf_kpis: dict = {}
    if 'NU_CPF' in df.columns:
        op_cpf = df.dropna(subset=['NU_CPF']).groupby('NU_OPERACAO')['NU_CPF'].first()
        n_cpfs_unicos = int(op_cpf.nunique())
        if n_cpfs_unicos > 0:
            cpf_op_count   = op_cpf.reset_index().groupby('NU_CPF')['NU_OPERACAO'].nunique()
            concluded_cpfs = op_cpf[op_cpf.index.isin(set(op_last_phase[op_last_phase == 800].index))].unique()
            n_cpfs_concluidos   = int(len(concluded_cpfs))
            n_cpfs_reincidentes = int((cpf_op_count > 1).sum())
            n_cpfs_novos        = int((cpf_op_count == 1).sum())
            cpf_kpis = {
                'cpfsUnicos':        n_cpfs_unicos,
                'cpfsConcluidos':    n_cpfs_concluidos,
                'cpfsReincidentes':  n_cpfs_reincidentes,
                'pctReincidentes':   round(n_cpfs_reincidentes / n_cpfs_unicos * 100, 1),
                'taxaConversaoCpf':  round(n_cpfs_concluidos  / n_cpfs_unicos * 100, 1),
                'cpfsNovos':         n_cpfs_novos,
                'cpfsRetorno':       n_cpfs_reincidentes,
            }

    kpis = {
        'totalRegistros': len(df),
        'operacoesUnicas': n_iniciadas,
        'fasesUnicas': len(operacoes_por_fase),
        'topUsuario': top_usuario,
        'operacoesIniciadas': n_iniciadas,
        'operacoesConcluidas': n_concluidas,
        'operacoesCanceladas': n_canceladas,
        'operacoesEmFila': n_em_fila,
        'taxaConversao': taxa_conv,
        'tempoMedioTotal': tempo_medio_total,
        **cpf_kpis,
    }

    first_row = {k: (None if pd.isnull(v) else v) for k, v in df.iloc[0].items()} if not df.empty else None

    return _to_native({
        'operacoesPorFase': operacoes_por_fase,
        'volumePorData': volume_por_data,
        'tempoMedioPorFase': tempo_medio_por_fase,
        'topUsuarios': top_usuarios,
        'topCpfs': top_cpfs,
        'distribuicaoFases': operacoes_por_fase,
        'evolucaoMensal': evolucao_mensal,
        'kpis': kpis,
        'colunas': list(df.columns),
        'primeiraLinha': first_row,
        'transicoes': transicoes_list,
        'macrofaseTotais': macrofase_totais,
    })


# ── Tabelas ────────────────────────────────────────────────────────────────────

@app.get("/tabelas")
def get_tabelas(
    login:    str = Query(default=None),
    senha:    str = Query(default=None),
    ambiente: str = Query(default=None),
):
    try:
        return {"tabelas": listar_tabelas(login=login, senha=senha, ambiente=ambiente)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _firebird_date_col(con, nome: str) -> str | None:
    try:
        sql = (
            "SELECT FIRST 1 TRIM(rf.RDB$FIELD_NAME) "
            "FROM RDB$RELATION_FIELDS rf "
            "JOIN RDB$FIELDS f ON rf.RDB$FIELD_SOURCE = f.RDB$FIELD_NAME "
            f"WHERE TRIM(rf.RDB$RELATION_NAME) = '{nome.upper()}' "
            "AND f.RDB$FIELD_TYPE IN (12, 35) "
            "ORDER BY rf.RDB$FIELD_POSITION"
        )
        df = pd.read_sql(sql, con)
        if not df.empty:
            return df.iloc[0, 0].strip()
    except Exception:
        pass
    return None


@app.get("/tabela/{nome}")
def get_tabela(
    nome:     str,
    limit:    int = Query(default=100, le=200000),
    offset:   int = Query(default=0),
    login:    str = Query(default=None),
    senha:    str = Query(default=None),
    ambiente: str = Query(default=None),
):
    try:
        con = get_connection(login=login, senha=senha, ambiente=ambiente)
        sql = f"SELECT FIRST {limit} SKIP {offset} * FROM {nome}"
        df = pd.read_sql(sql, con)
        con.close()
        return {
            "tabela": nome,
            "total_retornado": len(df),
            "colunas": list(df.columns),
            "dados": df.to_dict(orient="records"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/query")
def executar_query(
    sql:      str = Query(...),
    login:    str = Query(default=None),
    senha:    str = Query(default=None),
    ambiente: str = Query(default=None),
):
    try:
        con = get_connection(login=login, senha=senha, ambiente=ambiente)
        df = pd.read_sql(sql, con)
        con.close()
        return {"colunas": list(df.columns), "total": len(df), "dados": df.to_dict(orient="records")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Dashboard ──────────────────────────────────────────────────────────────────

# ── Parquet explorer ──────────────────────────────────────────────────────────

@app.get("/fases")
def get_fases(banco: str = Query(default='c6')):
    if banco == 'all':
        result = []
        for b, fmap in FASE_MAP.items():
            for cod, (nome, macrofase) in fmap.items():
                result.append({'cod': cod, 'nome': nome, 'macrofase': macrofase, 'banco': b})
        result.sort(key=lambda x: (x['banco'], x['cod']))
        return {'banco': banco, 'fases': result}
    fmap = FASE_MAP.get(banco, {})
    fases = [{'cod': cod, 'nome': nome, 'macrofase': macrofase, 'banco': banco} for cod, (nome, macrofase) in fmap.items()]
    fases.sort(key=lambda x: x['cod'])
    return {'banco': banco, 'fases': fases}


@app.get("/parquet/info")
def parquet_info(
    banco:    str = Query(default='c6'),
    ambiente: str = Query(default=None),
):
    try:
        if banco == 'all':
            df, bancos = _read_all_parquets()
            if df.empty:
                return {'existe': False, 'bancos': []}
        else:
            path = _cache_path(banco, ambiente)
            if not os.path.exists(path):
                return {'existe': False, 'bancos': []}
            df = pd.read_parquet(path)
            bancos = [banco]

        dt_col     = 'DT_INICIO_FASE'
        macrofases = sorted(df['MACROFASE'].dropna().unique().tolist()) if 'MACROFASE' in df.columns else []
        fases      = sorted(df['NO_FASE'].dropna().unique().tolist())   if 'NO_FASE'  in df.columns else []
        ambientes  = sorted(df['AMBIENTE'].dropna().unique().tolist())  if 'AMBIENTE' in df.columns else []
        return _to_native({
            'existe':     True,
            'total':      len(df),
            'colunas':    list(df.columns),
            'dtInicio':   str(df[dt_col].min()) if dt_col in df.columns else None,
            'dtFim':      str(df[dt_col].max()) if dt_col in df.columns else None,
            'macrofases': macrofases,
            'fases':      fases,
            'bancos':     bancos,
            'ambientes':  ambientes,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/parquet/diagnostico")
def parquet_diagnostico(
    banco:    str = Query(default='c6'),
    ambiente: str = Query(default=None),
):
    """Mostra distribuição da primeira fase registrada por operação — revela se operações pulam etapas."""
    path = _cache_path(banco, ambiente)
    if not os.path.exists(path):
        return {'existe': False}
    try:
        df = pd.read_parquet(path)
        _SIMULACAO_CODES = {0, 1}

        # Para cada operação, pega a fase com menor código (a "primeira" etapa registrada)
        primeira_fase = (
            df.sort_values('NU_FASE_OPERACAO')
            .groupby('NU_OPERACAO')[['NU_FASE_OPERACAO', 'FASE_NOME', 'MACROFASE']]
            .first()
            .reset_index()
        )

        total_ops = len(primeira_fase)

        # Operações que têm Simulação em algum momento vs as que não têm
        ops_com_simulacao  = int(df[df['NU_FASE_OPERACAO'].isin(_SIMULACAO_CODES)]['NU_OPERACAO'].nunique())
        ops_sem_simulacao  = total_ops - ops_com_simulacao

        # Distribuição: qual macrofase é a PRIMEIRA registrada para cada operação
        dist_primeira_macro = (
            primeira_fase.groupby('MACROFASE')['NU_OPERACAO']
            .count()
            .sort_values(ascending=False)
            .reset_index(name='ops')
        )

        # Distribuição por fase individual (código)
        dist_primeira_fase = (
            primeira_fase.groupby(['NU_FASE_OPERACAO', 'FASE_NOME'])['NU_OPERACAO']
            .count()
            .sort_values(ascending=False)
            .head(20)
            .reset_index(name='ops')
        )

        return _to_native({
            'totalOps':          total_ops,
            'comSimulacao':      ops_com_simulacao,
            'semSimulacao':      ops_sem_simulacao,
            'pctSemSimulacao':   round(ops_sem_simulacao / total_ops * 100, 1) if total_ops else 0,
            'primeiraMacrofase': [
                {'macrofase': r.MACROFASE, 'ops': int(r.ops)}
                for r in dist_primeira_macro.itertuples()
            ],
            'primeiraFase': [
                {'fase': int(r.NU_FASE_OPERACAO), 'nome': r.FASE_NOME, 'ops': int(r.ops)}
                for r in dist_primeira_fase.itertuples()
            ],
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/parquet/dados")
def parquet_dados(
    banco:      str  = Query(default='c6'),
    ambiente:   str  = Query(default=None),
    limit:      int  = Query(default=100, le=500),
    offset:     int  = Query(default=0),
    ordem:      str  = Query(default='DT_INICIO_FASE'),
    desc:       bool = Query(default=True),
    busca:      str  = Query(default=None),
    macrofase:  str  = Query(default=None),
    fase_nome:  str  = Query(default=None),
):
    try:
        if banco == 'all':
            df, bancos = _read_all_parquets()
            if df.empty:
                raise HTTPException(status_code=404, detail='Nenhum Parquet encontrado. Use Fontes → Atualizar.')
        else:
            path = _cache_path(banco, ambiente)
            if not os.path.exists(path):
                raise HTTPException(status_code=404, detail='Parquet não encontrado. Use Fontes → Atualizar.')
            df = pd.read_parquet(path)

        if macrofase and 'MACROFASE' in df.columns:
            df = df[df['MACROFASE'] == macrofase]
        if fase_nome and 'NO_FASE' in df.columns:
            df = df[df['NO_FASE'] == fase_nome]
        if busca:
            mask = pd.Series(False, index=df.index)
            for col in ('NU_OPERACAO', 'CO_USUARIO_FASE', 'NO_FASE', 'MACROFASE', 'BANCO'):
                if col in df.columns:
                    mask |= df[col].astype(str).str.contains(busca, case=False, na=False)
            df = df[mask]

        if ordem in df.columns:
            df = df.sort_values(ordem, ascending=not desc)
        total = len(df)
        chunk = df.iloc[offset:offset + limit].copy()
        chunk = chunk.where(pd.notnull(chunk), None)
        return _to_native({'total': total, 'offset': offset, 'limit': limit, 'dados': chunk.to_dict(orient='records')})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/parquet/export")
def parquet_export(
    banco:     str = Query(default='c6'),
    ambiente:  str = Query(default=None),
    limit:     int = Query(default=None, le=1000000),
    macrofases: str = Query(default=None),
    fase_nome:  str = Query(default=None),
):
    try:
        if banco == 'all':
            df, _ = _read_all_parquets()
            if df.empty:
                raise HTTPException(status_code=404, detail='Nenhum Parquet encontrado. Use Fontes → Atualizar.')
        else:
            path = _cache_path(banco, ambiente)
            if not os.path.exists(path):
                raise HTTPException(status_code=404, detail='Parquet não encontrado. Use Fontes → Atualizar.')
            df = pd.read_parquet(path)
            if 'BANCO'    not in df.columns: df['BANCO']    = banco
            if 'AMBIENTE' not in df.columns: df['AMBIENTE'] = _ambiente_label(banco, ambiente)

        if macrofases and 'MACROFASE' in df.columns:
            mf_list = [m.strip() for m in macrofases.split(',') if m.strip()]
            df = df[df['MACROFASE'].isin(mf_list)]
        if fase_nome and 'NO_FASE' in df.columns:
            df = df[df['NO_FASE'] == fase_nome]
        if limit:
            df = df.head(limit)

        now      = datetime.now().strftime('%Y%m%d_%H%M%S')
        slug     = 'todos' if banco == 'all' else banco
        filename = f'metricas_{slug}_{now}.csv'

        # utf-8-sig adds BOM so Excel opens with correct encoding
        csv_bytes = df.to_csv(index=False, encoding='utf-8-sig').encode('utf-8-sig')
        return Response(
            content=csv_bytes,
            media_type='text/csv; charset=utf-8-sig',
            headers={'Content-Disposition': f'attachment; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Dashboard ──────────────────────────────────────────────────────────────────

@app.get("/dashboard")
def get_dashboard(
    banco:    str   = Query(default='c6'),
    ambiente: str   = Query(default=None),
    inicio:   _date = Query(default=None),
    fim:      _date = Query(default=None),
):
    path = _cache_path(banco, ambiente)
    if not os.path.exists(path):
        return {'existe': False, 'banco': banco, 'data': None, 'savedAt': None}
    try:
        df = pd.read_parquet(path)
        if inicio or fim:
            dt = pd.to_datetime(df['DT_INICIO_FASE'], errors='coerce')
            if inicio:
                df = df[dt.dt.date >= inicio]
            if fim:
                df = df[dt.dt.date <= fim]
        saved_at = datetime.fromtimestamp(os.path.getmtime(path)).isoformat()
        data     = _build_dashboard_data(df)
        return {'existe': True, 'banco': banco, 'data': data, 'savedAt': saved_at}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/historico")
def get_historico(
    banco:    str   = Query(default='c6'),
    limit:    int   = Query(default=1000, le=50000),
    inicio:   _date = Query(default=None),
    fim:      _date = Query(default=None),
    login:    str   = Query(default=None),
    senha:    str   = Query(default=None),
    ambiente: str   = Query(default=None),
):
    try:
        conditions = []
        if inicio:
            conditions.append(f"h.DT_INICIO_FASE >= '{inicio}'")
        if fim:
            conditions.append(f"h.DT_INICIO_FASE <= '{fim}'")
        where = f" WHERE {' AND '.join(conditions)}" if conditions else ""

        if banco == 'inter':
            from core import database_sqlserver
            con = database_sqlserver.get_connection(login=login, senha=senha)
            sql = (
                f"SELECT TOP {limit} h.NU_OPERACAO, h.NU_FASE_OPERACAO, h.DT_INICIO_FASE, "
                f"h.CO_USUARIO_FASE, f.NO_FASE_OPERACAO "
                f"FROM HISTORICO_OPERACAO h "
                f"LEFT JOIN FASE_OPERACAO f ON h.NU_FASE_OPERACAO = f.NU_FASE_OPERACAO"
                f"{where} ORDER BY h.DT_INICIO_FASE DESC"
            )
        else:
            con = get_connection(login=login, senha=senha, ambiente=ambiente)
            sql = (
                f"SELECT FIRST {limit} h.NU_OPERACAO, h.NU_FASE_OPERACAO, h.DT_INICIO_FASE, "
                f"h.CO_USUARIO_FASE, f.NO_FASE_OPERACAO "
                f"FROM HISTORICO_OPERACAO h "
                f"LEFT JOIN FASE_OPERACAO f ON h.NU_FASE_OPERACAO = f.NU_FASE_OPERACAO"
                f"{where} ORDER BY h.DT_INICIO_FASE DESC"
            )

        df = pd.read_sql(sql, con)
        df = _apply_fase_map(df, banco)
        con.close()
        return _to_native({'dados': df.to_dict(orient='records'), 'total': len(df)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Cache ──────────────────────────────────────────────────────────────────────

@app.get("/cache/refresh")
def refresh_cache(
    banco:    str = Query(default='c6'),
    limit:    int = Query(default=20000, le=200000),
    login:    str = Query(default=None),
    senha:    str = Query(default=None),
    ambiente: str = Query(default=None),
):
    path = _cache_path(banco, ambiente)
    try:
        if banco == 'inter':
            from core import database_sqlserver
            con = database_sqlserver.get_connection(login=login, senha=senha)
            df = pd.read_sql(CACHE_SQL_SQLSERVER.format(limit=limit), con)
        else:
            con = get_connection(login=login, senha=senha, ambiente=ambiente)
            df = pd.read_sql(CACHE_SQL_FIREBIRD.format(limit=limit), con)
        con.close()

        # Merge with existing — deduplicate by NU_OPERACAO + NU_FASE_OPERACAO
        if os.path.exists(path):
            try:
                df_old = pd.read_parquet(path)
                df = pd.concat([df_old, df], ignore_index=True).drop_duplicates(
                    subset=['NU_OPERACAO', 'NU_FASE_OPERACAO'], keep='last'
                )
            except Exception:
                pass

        df = _apply_fase_map(df, banco)
        df['BANCO']    = banco
        df['AMBIENTE'] = _ambiente_label(banco, ambiente)

        df.to_parquet(path, index=False, compression='snappy')
        saved_at = datetime.fromtimestamp(os.path.getmtime(path)).isoformat()

        data = _build_dashboard_data(df)
        return {'existe': True, 'banco': banco, 'data': data, 'savedAt': saved_at}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/cache/expand")
def expand_cache(
    banco:    str = Query(default='c6'),
    limit:    int = Query(default=20000, le=200000),
    login:    str = Query(default=None),
    senha:    str = Query(default=None),
    ambiente: str = Query(default=None),
):
    path = _cache_path(banco, ambiente)
    if not os.path.exists(path):
        raise HTTPException(status_code=400, detail="Parquet não encontrado. Use Atualizar primeiro.")

    try:
        df_old = pd.read_parquet(path)
        if df_old.empty or 'DT_INICIO_FASE' not in df_old.columns:
            raise HTTPException(status_code=400, detail="Parquet sem dados válidos. Use Atualizar primeiro.")

        min_date = df_old['DT_INICIO_FASE'].min()

        if banco == 'inter':
            from core import database_sqlserver
            con = database_sqlserver.get_connection(login=login, senha=senha)
            sql = (
                f"SELECT TOP {limit} h.NU_OPERACAO, h.NU_FASE_OPERACAO, h.DT_INICIO_FASE, "
                f"h.CO_USUARIO_FASE, f.NO_FASE_OPERACAO "
                f"FROM HISTORICO_OPERACAO h "
                f"LEFT JOIN FASE_OPERACAO f ON h.NU_FASE_OPERACAO = f.NU_FASE_OPERACAO "
                f"WHERE h.DT_INICIO_FASE < '{min_date}' "
                f"ORDER BY h.DT_INICIO_FASE DESC"
            )
        else:
            con = get_connection(login=login, senha=senha, ambiente=ambiente)
            sql = (
                f"SELECT FIRST {limit} h.NU_OPERACAO, h.NU_FASE_OPERACAO, h.DT_INICIO_FASE, "
                f"h.CO_USUARIO_FASE, f.NO_FASE_OPERACAO, cpf_sub.NU_CPF "
                f"FROM HISTORICO_OPERACAO h "
                f"LEFT JOIN FASE_OPERACAO f ON h.NU_FASE_OPERACAO = f.NU_FASE_OPERACAO "
                f"LEFT JOIN (SELECT NU_OPERACAO, MIN(TRIM(NU_CPF)) AS NU_CPF "
                f"           FROM OPERACAO_CREDITO GROUP BY NU_OPERACAO) cpf_sub "
                f"ON cpf_sub.NU_OPERACAO = h.NU_OPERACAO "
                f"WHERE h.DT_INICIO_FASE < '{min_date}' "
                f"ORDER BY h.DT_INICIO_FASE DESC"
            )

        df_new = pd.read_sql(sql, con)
        con.close()

        df = pd.concat([df_old, df_new], ignore_index=True).drop_duplicates(
            subset=['NU_OPERACAO', 'NU_FASE_OPERACAO'], keep='last'
        )
        df = _apply_fase_map(df, banco)
        df['BANCO']    = banco
        df['AMBIENTE'] = _ambiente_label(banco, ambiente)

        df.to_parquet(path, index=False, compression='snappy')
        saved_at = datetime.fromtimestamp(os.path.getmtime(path)).isoformat()

        data = _build_dashboard_data(df)
        return {'existe': True, 'banco': banco, 'data': data, 'savedAt': saved_at, 'adicionados': len(df_new)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Inter — SQL Server ────────────────────────────────────────────────────────

@app.get("/inter/tabelas")
def get_tabelas_inter(
    login: str = Query(default=None),
    senha: str = Query(default=None),
):
    try:
        from core import database_sqlserver
        return {"tabelas": database_sqlserver.listar_tabelas(login=login, senha=senha)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _sqlserver_date_col(con, nome: str) -> str | None:
    try:
        sql = (
            "SELECT TOP 1 COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            f"WHERE TABLE_NAME = '{nome}' "
            "AND DATA_TYPE IN ('date','datetime','datetime2','smalldatetime') "
            "ORDER BY ORDINAL_POSITION"
        )
        df = pd.read_sql(sql, con)
        if not df.empty:
            return df.iloc[0, 0]
    except Exception:
        pass
    return None


@app.get("/inter/tabela/{nome}")
def get_tabela_inter(
    nome:   str,
    limit:  int = Query(default=100, le=200000),
    offset: int = Query(default=0),
    login:  str = Query(default=None),
    senha:  str = Query(default=None),
):
    try:
        from core import database_sqlserver
        con = database_sqlserver.get_connection(login=login, senha=senha)
        date_col = _sqlserver_date_col(con, nome)
        if date_col:
            if offset == 0:
                sql = f"SELECT TOP {limit} * FROM {nome} ORDER BY {date_col} DESC"
            else:
                sql = f"SELECT * FROM {nome} ORDER BY {date_col} DESC OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY"
        else:
            if offset == 0:
                sql = f"SELECT TOP {limit} * FROM {nome}"
            else:
                sql = f"SELECT * FROM {nome} ORDER BY (SELECT NULL) OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY"
        df = pd.read_sql(sql, con)
        con.close()
        return {
            "tabela": nome,
            "total_retornado": len(df),
            "colunas": list(df.columns),
            "dados": df.to_dict(orient="records"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inter/query")
def executar_query_inter(
    sql:   str = Query(...),
    login: str = Query(default=None),
    senha: str = Query(default=None),
):
    try:
        from core import database_sqlserver
        con = database_sqlserver.get_connection(login=login, senha=senha)
        df = pd.read_sql(sql, con)
        con.close()
        return {"colunas": list(df.columns), "total": len(df), "dados": df.to_dict(orient="records")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/jornada")
def get_jornada(banco: str = 'c6', ambiente: str = ''):
    path = _cache_path(banco, ambiente)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Parquet não encontrado")

    df = pd.read_parquet(path)

    if 'NU_CPF' not in df.columns or df['NU_CPF'].isna().all():
        return _to_native({'semDados': True})

    df = df.dropna(subset=['NU_CPF']).copy()
    _CANCELADAS = set(range(900, 939)) | {1000}

    # ── 1. Distribuição de tentativas ─────────────────────────────────────────
    cpf_ops = df.groupby('NU_CPF')['NU_OPERACAO'].nunique()
    concluded_cpfs = set(
        df[df['NU_FASE_OPERACAO'] == 800]['NU_CPF'].unique()
    )

    grupos_labels = ['1 tentativa', '2 tentativas', '3–4 tentativas', '5+ tentativas']
    buckets = [{'grupo': g, 'pessoas': 0, 'concluidas': 0, 'operacoes': 0} for g in grupos_labels]

    def _grp(n):
        if n == 1: return 0
        if n == 2: return 1
        if n <= 4: return 2
        return 3

    for cpf, n in cpf_ops.items():
        i = _grp(n)
        buckets[i]['pessoas']   += 1
        buckets[i]['operacoes'] += int(n)
        if cpf in concluded_cpfs:
            buckets[i]['concluidas'] += 1

    for b in buckets:
        b['conversao'] = round(b['concluidas'] / b['pessoas'] * 100, 1) if b['pessoas'] > 0 else 0.0

    tentativas_dist = [b for b in buckets if b['pessoas'] > 0]

    # ── 2. Onde a 1ª tentativa trava ─────────────────────────────────────────
    df_s = df.sort_values(['NU_CPF', 'DT_INICIO_FASE', 'NU_FASE_OPERACAO'])
    op_start = (
        df_s.groupby(['NU_CPF', 'NU_OPERACAO'])['DT_INICIO_FASE']
        .min().reset_index()
    )
    op_start.columns = ['NU_CPF', 'NU_OPERACAO', 'OP_START']
    first_op = op_start.sort_values('OP_START').groupby('NU_CPF').first().reset_index()

    df_first = df_s.merge(first_op[['NU_CPF', 'NU_OPERACAO']], on=['NU_CPF', 'NU_OPERACAO'])
    last_first = df_first.sort_values('DT_INICIO_FASE').groupby('NU_CPF').last().reset_index()
    cancelled_first_cpfs = set(
        last_first[last_first['NU_FASE_OPERACAO'].isin(_CANCELADAS)]['NU_CPF']
    )
    total_quebrou = len(cancelled_first_cpfs)

    primeira_quebra = []
    if cancelled_first_cpfs:
        df_fc = df_first[
            df_first['NU_CPF'].isin(cancelled_first_cpfs) &
            ~df_first['NU_FASE_OPERACAO'].isin(_CANCELADAS)
        ]
        if not df_fc.empty:
            last_nc = df_fc.sort_values('DT_INICIO_FASE').groupby('NU_CPF').last().reset_index()
            grp_cols = ['NU_FASE_OPERACAO', 'FASE_NOME', 'MACROFASE']
            available = [c for c in grp_cols if c in last_nc.columns]
            quebra = (
                last_nc.groupby(available).size()
                .reset_index(name='pessoas')
                .sort_values('pessoas', ascending=False)
                .head(10)
            )
            for r in quebra.itertuples():
                primeira_quebra.append({
                    'fase':      int(r.NU_FASE_OPERACAO),
                    'nome':      getattr(r, 'FASE_NOME', f'Fase {r.NU_FASE_OPERACAO}'),
                    'macrofase': getattr(r, 'MACROFASE', ''),
                    'pessoas':   int(r.pessoas),
                    'pct':       round(int(r.pessoas) / total_quebrou * 100, 1) if total_quebrou > 0 else 0.0,
                })

    # ── 3. Tempo entre tentativas ─────────────────────────────────────────────
    multi_cpfs = cpf_ops[cpf_ops >= 2].index
    tempo_dist = []
    mediana_dias = None
    media_dias = None

    if len(multi_cpfs) > 0:
        multi_starts = op_start[op_start['NU_CPF'].isin(multi_cpfs)].sort_values(['NU_CPF', 'OP_START']).copy()
        multi_starts['prev'] = multi_starts.groupby('NU_CPF')['OP_START'].shift(1)
        gaps = multi_starts.dropna(subset=['prev']).copy()
        gaps['dias'] = (gaps['OP_START'] - gaps['prev']).dt.days
        gaps = gaps[gaps['dias'] >= 0]
        if len(gaps) > 0:
            mediana_dias = float(gaps['dias'].median())
            media_dias   = float(gaps['dias'].mean())
            faixas = [
                ('< 7 dias',   int((gaps['dias'] < 7).sum())),
                ('7–30 dias',  int(((gaps['dias'] >= 7)  & (gaps['dias'] < 30)).sum())),
                ('30–90 dias', int(((gaps['dias'] >= 30) & (gaps['dias'] < 90)).sum())),
                ('90+ dias',   int((gaps['dias'] >= 90).sum())),
            ]
            tempo_dist = [{'faixa': f, 'total': t} for f, t in faixas if t > 0]

    # ── 4. Progresso na 2ª tentativa ─────────────────────────────────────────
    progresso: dict = {'melhorou': 0, 'igual': 0, 'piorou': 0, 'converteuNa2a': 0, 'totalReincidentes': 0}

    if 'MACROFASE' in df.columns:
        _MACROFASE_ORDER = ['Simulação', 'Cadastro', 'Crédito', 'Negociação',
                            'Análise de Documentos', 'Análise Técnica', 'Formalização', 'Liberação']
        _macro_rank = {m: i for i, m in enumerate(_MACROFASE_ORDER)}

        reinc_cpfs = cpf_ops[cpf_ops >= 2].index
        op_start_reinc = op_start[op_start['NU_CPF'].isin(reinc_cpfs)].sort_values(['NU_CPF', 'OP_START']).copy()
        op_start_reinc['op_rank'] = op_start_reinc.groupby('NU_CPF').cumcount()

        first_ops_r  = op_start_reinc[op_start_reinc['op_rank'] == 0][['NU_CPF', 'NU_OPERACAO']].copy()
        second_ops_r = op_start_reinc[op_start_reinc['op_rank'] == 1][['NU_CPF', 'NU_OPERACAO']].copy()

        df_nc = df[~df['NU_FASE_OPERACAO'].isin(_CANCELADAS)].copy()
        df_nc['_mr'] = df_nc['MACROFASE'].map(_macro_rank).fillna(-1)
        op_max_rank = df_nc.groupby('NU_OPERACAO')['_mr'].max().to_dict()

        first_ops_r['rank1']  = first_ops_r['NU_OPERACAO'].map(op_max_rank).fillna(-1)
        second_ops_r['rank2'] = second_ops_r['NU_OPERACAO'].map(op_max_rank).fillna(-1)

        paired = first_ops_r[['NU_CPF', 'rank1']].merge(second_ops_r[['NU_CPF', 'rank2']], on='NU_CPF', how='inner')

        progresso['totalReincidentes'] = int(len(paired))
        progresso['melhorou'] = int((paired['rank2'] > paired['rank1']).sum())
        progresso['igual']    = int((paired['rank2'] == paired['rank1']).sum())
        progresso['piorou']   = int((paired['rank2'] < paired['rank1']).sum())

        op2_set = set(second_ops_r['NU_OPERACAO'].tolist())
        progresso['converteuNa2a'] = int(
            df[(df['NU_OPERACAO'].isin(op2_set)) & (df['NU_FASE_OPERACAO'] == 800)]['NU_CPF'].nunique()
        )

    # ── KPIs summary ─────────────────────────────────────────────────────────
    total_cpfs   = int(len(cpf_ops))
    reincidentes = int((cpf_ops >= 2).sum())
    pct_reinc    = round(reincidentes / total_cpfs * 100, 1) if total_cpfs > 0 else 0.0
    media_ops    = round(float(cpf_ops.mean()), 2)
    conv_1a      = tentativas_dist[0]['conversao'] if tentativas_dist else 0.0
    conv_reinc   = tentativas_dist[1]['conversao'] if len(tentativas_dist) > 1 else 0.0

    total_ops_all      = int(cpf_ops.sum())
    total_retentativas = total_ops_all - total_cpfs
    pct_retentativas   = round(total_retentativas / total_ops_all * 100, 1) if total_ops_all > 0 else 0.0

    return _to_native({
        'semDados':              False,
        'totalCpfs':             total_cpfs,
        'reincidentes':          reincidentes,
        'pctReincidentes':       pct_reinc,
        'mediaOps':              media_ops,
        'totalRetentativas':     total_retentativas,
        'pctRetentativas':       pct_retentativas,
        'convPrimeiraTentativa': conv_1a,
        'convReincidentes':      conv_reinc,
        'totalQuebrou':          total_quebrou,
        'tentativasDistribuicao': tentativas_dist,
        'primeiraQuebra':        primeira_quebra,
        'progresso':             progresso,
        'tempoEntreAtividades':  {
            'mediana': mediana_dias,
            'media':   media_dias,
            'distribuicao': tempo_dist,
        },
    })
