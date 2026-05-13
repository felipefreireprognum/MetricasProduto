import pandas as pd

from ..core.serialization import to_native as _to_native


MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']


def _build_dashboard_data(df: pd.DataFrame, ops_com_sim: set | None = None) -> dict | None:
    _EMPTY = {
        'operacoesPorFase': [], 'volumePorData': [], 'tempoMedioPorFase': [],
        'topUsuarios': [], 'topCpfs': [], 'distribuicaoFases': [], 'evolucaoMensal': [],
        'transicoes': [], 'macrofaseTotais': [],
        'kpis': {
            'totalRegistros': 0, 'operacoesUnicas': 0, 'fasesUnicas': 0, 'topUsuario': '—',
            'operacoesIniciadas': 0, 'operacoesConcluidas': 0, 'operacoesCanceladas': 0,
            'operacoesEmFila': 0, 'taxaConversao': 0, 'tempoMedioTotal': None,
        },
        'colunas': [], 'primeiraLinha': None,
    }
    if df.empty:
        return _EMPTY

    df = df.copy()
    df.columns = [c.upper() if isinstance(c, str) else str(c) for c in df.columns]
    df['DT_INICIO_FASE'] = pd.to_datetime(df['DT_INICIO_FASE'], errors='coerce')
    df['NU_FASE_OPERACAO'] = pd.to_numeric(df['NU_FASE_OPERACAO'], errors='coerce').fillna(0).astype(int)
    df['NU_OPERACAO'] = df['NU_OPERACAO'].astype(str).str.strip()

    # Integrity filter: keep only ops that have at least one Simulação (phase 0 or 1) record.
    # When called from /dashboard with a date filter, ops_com_sim is pre-computed from the FULL
    # Parquet so ops whose Simulação falls outside the filtered period are not wrongly dropped.
    if ops_com_sim is None:
        _ops = set(df.loc[df['NU_FASE_OPERACAO'].isin({0, 1}), 'NU_OPERACAO'].unique())
    else:
        _ops = ops_com_sim
    df = df[df['NU_OPERACAO'].isin(_ops)]

    if df.empty:
        return _EMPTY

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

    # Normalise macrofase names from Parquet to dashboard categories:
    # - fases 500-505 → 'Emissão de Contrato'   (formalização + emissão, fim do funil)
    # - fases 600-701 → 'Registro de Contratos'  (registro + liberação)
    if 'NU_FASE_OPERACAO' in df.columns:
        _emissao_codes  = {500, 501, 502, 503, 504, 505}
        _registro_codes = {600, 601, 700, 701}
        _mask_formal = df['MACROFASE'].isin({'Formalização', 'Emissão de Contrato'})
        _mask_libera = df['MACROFASE'].isin({'Liberação', 'Registro de Contratos'})
        if _mask_formal.any():
            df.loc[_mask_formal & df['NU_FASE_OPERACAO'].isin(_emissao_codes),  'MACROFASE'] = 'Emissão de Contrato'
            df.loc[_mask_formal & df['NU_FASE_OPERACAO'].isin(_registro_codes), 'MACROFASE'] = 'Registro de Contratos'
        if _mask_libera.any():
            df.loc[_mask_libera, 'MACROFASE'] = 'Registro de Contratos'

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
        'Emissão de Contrato': 500,
        'Registro de Contratos': 600,
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
    # Crédito Reprovado (fase 101): ops whose highest non-cancelled phase is exactly 101.
    # They entered Crédito but were rejected — shown separately from the approved count.
    credito_reprovados = int((op_max_pipeline == 101).sum())
    for _m in macrofase_totais:
        if _m['macrofase'] == 'Crédito':
            _m['total'] = max(0, _m['total'] - credito_reprovados)
            _m['reprovados'] = credito_reprovados
            break
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
