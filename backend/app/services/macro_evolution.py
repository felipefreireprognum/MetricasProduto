import pandas as pd

from ..core.serialization import to_native


MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
CANCELADAS_CODES = set(range(900, 939)) | {1000}
TERMINAL_CODES = CANCELADAS_CODES | {800}

STAGES = [
    {'id': 'simulacao', 'label': 'Simulacao', 'shortLabel': 'Simulacao', 'codes': {0, 1}},
    {'id': 'cadastro', 'label': 'Cadastro', 'shortLabel': 'Cadastro', 'codes': {50, 80, 90}},
    {'id': 'credito', 'label': 'Credito', 'shortLabel': 'Credito', 'codes': {100, 101}},
    {'id': 'negociacao', 'label': 'Negociacao', 'shortLabel': 'Negociacao', 'codes': {200, 201, 202}},
    {'id': 'analise_documental', 'label': 'Analise Documental', 'shortLabel': 'Anal. Docs', 'codes': {300, 301}},
    {'id': 'analise_tecnica', 'label': 'Analise Tecnica', 'shortLabel': 'Anal. Tecnica', 'codes': set(range(400, 410))},
    {'id': 'emissao_contrato', 'label': 'Emissao de Contrato', 'shortLabel': 'Emissao Contr.', 'codes': {500, 501, 502, 503, 504, 505}},
    {'id': 'registro_contrato', 'label': 'Registro de Contrato', 'shortLabel': 'Reg. Contrato', 'codes': {600}},
]


def _stage_meta() -> list[dict]:
    return [
        {'id': s['id'], 'label': s['label'], 'shortLabel': s['shortLabel']}
        for s in STAGES
    ]


def _stage_id_for_phase(code: int) -> str | None:
    for stage in STAGES:
        if code in stage['codes']:
            return stage['id']
    return None


def build_macro_evolution(df: pd.DataFrame, meses: int = 12, ops_com_simulacao: set[str] | None = None) -> dict:
    empty = {
        'stages': _stage_meta(),
        'rows': [],
        'totais': [],
    }
    if df.empty:
        return empty

    df = df.copy()
    df.columns = [c.upper() if isinstance(c, str) else str(c) for c in df.columns]
    df['DT_INICIO_FASE'] = pd.to_datetime(df['DT_INICIO_FASE'], errors='coerce')
    df['NU_FASE_OPERACAO'] = pd.to_numeric(df['NU_FASE_OPERACAO'], errors='coerce').fillna(0).astype(int)
    df['NU_OPERACAO'] = df['NU_OPERACAO'].astype(str).str.strip()
    df = df.dropna(subset=['DT_INICIO_FASE'])

    ops_com_sim = ops_com_simulacao
    if ops_com_sim is None:
        ops_com_sim = set(df.loc[df['NU_FASE_OPERACAO'].isin({0, 1}), 'NU_OPERACAO'].unique())
    df = df[df['NU_OPERACAO'].isin(ops_com_sim)]
    if df.empty:
        return empty

    df['MES'] = df['DT_INICIO_FASE'].dt.to_period('M')
    all_months = sorted(df['MES'].dropna().unique())
    if meses and meses > 0:
        all_months = all_months[-meses:]

    df_by_date = df.sort_values(['NU_OPERACAO', 'DT_INICIO_FASE', 'NU_FASE_OPERACAO'])
    op_last_phase = df_by_date.groupby('NU_OPERACAO')['NU_FASE_OPERACAO'].last()
    op_last_month = df_by_date.groupby('NU_OPERACAO')['MES'].last()

    cancelled_op_ids = set(op_last_phase[op_last_phase.isin(CANCELADAS_CODES)].index)
    abandono_rows = []
    if cancelled_op_ids:
        df_cancelled = df[df['NU_OPERACAO'].isin(cancelled_op_ids)]
        df_pre_cancel = df_cancelled[~df_cancelled['NU_FASE_OPERACAO'].isin(CANCELADAS_CODES)]
        if not df_pre_cancel.empty:
            last_pre_cancel = (
                df_pre_cancel
                .sort_values(['NU_OPERACAO', 'DT_INICIO_FASE', 'NU_FASE_OPERACAO'])
                .groupby('NU_OPERACAO')
                .last()
            )
            for op_id, row in last_pre_cancel.iterrows():
                stage_id = _stage_id_for_phase(int(row['NU_FASE_OPERACAO']))
                cancel_month = op_last_month.get(op_id)
                if stage_id and cancel_month is not None:
                    abandono_rows.append({'MES': cancel_month, 'stage': stage_id, 'NU_OPERACAO': op_id})

    abandono_df = pd.DataFrame(abandono_rows)

    em_andamento_rows = []
    for op_id, phase in op_last_phase[~op_last_phase.isin(TERMINAL_CODES)].items():
        stage_id = _stage_id_for_phase(int(phase))
        last_month = op_last_month.get(op_id)
        if stage_id and last_month is not None:
            em_andamento_rows.append({'MES': last_month, 'stage': stage_id, 'NU_OPERACAO': op_id})
    em_andamento_df = pd.DataFrame(em_andamento_rows)

    df_by_phase = df.sort_values(['NU_OPERACAO', 'NU_FASE_OPERACAO'])
    df_by_phase['NEXT_DT'] = df_by_phase.groupby('NU_OPERACAO')['DT_INICIO_FASE'].shift(-1)
    df_by_phase['DIAS_DIFF'] = (df_by_phase['NEXT_DT'] - df_by_phase['DT_INICIO_FASE']).dt.days
    valid_diffs = df_by_phase.dropna(subset=['DIAS_DIFF']).query('DIAS_DIFF >= 0').copy()

    rows = []
    totals = {
        s['id']: {
            'id': s['id'],
            'label': s['label'],
            'total': 0,
            'abandono': 0,
            'emAndamento': 0,
            'creditoReprovado': 0,
            'tempoSoma': 0.0,
            'tempoCount': 0,
        }
        for s in STAGES
    }

    for mes in all_months:
        row = {
            'mes': str(mes),
            'label': f"{MONTH_NAMES[mes.month - 1]}/{str(mes.year)[-2:]}",
        }
        month_df = df[df['MES'] == mes]
        month_tempo = valid_diffs[valid_diffs['MES'] == mes]

        for stage in STAGES:
            stage_id = stage['id']
            codes = stage['codes']
            volume = int(month_df.loc[month_df['NU_FASE_OPERACAO'].isin(codes), 'NU_OPERACAO'].nunique())

            abandono = 0
            if not abandono_df.empty:
                abandono = int(abandono_df[(abandono_df['MES'] == mes) & (abandono_df['stage'] == stage_id)]['NU_OPERACAO'].nunique())

            em_andamento = 0
            if not em_andamento_df.empty:
                em_andamento = int(em_andamento_df[(em_andamento_df['MES'] == mes) & (em_andamento_df['stage'] == stage_id)]['NU_OPERACAO'].nunique())

            tempo_vals = month_tempo.loc[month_tempo['NU_FASE_OPERACAO'].isin(codes), 'DIAS_DIFF']
            tempo_medio = round(float(tempo_vals.mean()), 1) if len(tempo_vals) else None
            credito_reprovado = int(month_df.loc[month_df['NU_FASE_OPERACAO'] == 101, 'NU_OPERACAO'].nunique()) if stage_id == 'credito' else 0

            row[stage_id] = volume
            row[f'{stage_id}_abandono'] = abandono
            row[f'{stage_id}_emAndamento'] = em_andamento
            row[f'{stage_id}_creditoReprovado'] = credito_reprovado
            row[f'{stage_id}_tempoMedio'] = tempo_medio

            totals[stage_id]['total'] += volume
            totals[stage_id]['abandono'] += abandono
            totals[stage_id]['emAndamento'] += em_andamento
            totals[stage_id]['creditoReprovado'] += credito_reprovado
            if len(tempo_vals):
                totals[stage_id]['tempoSoma'] += float(tempo_vals.sum())
                totals[stage_id]['tempoCount'] += int(len(tempo_vals))

        previous_volume = None
        for stage in STAGES:
            stage_id = stage['id']
            current_volume = int(row[stage_id])
            if previous_volume is None:
                pct_avanco = 100.0 if current_volume > 0 else 0.0
            else:
                pct_avanco = round((current_volume / previous_volume * 100), 1) if previous_volume > 0 else 0.0
            row[f'{stage_id}_pctAvanco'] = pct_avanco
            previous_volume = current_volume

        rows.append(row)

    total_rows = []
    previous_total = None
    for stage in STAGES:
        item = totals[stage['id']]
        tempo_count = item.pop('tempoCount')
        tempo_soma = item.pop('tempoSoma')
        item['tempoMedio'] = round(tempo_soma / tempo_count, 1) if tempo_count else None
        if previous_total is None:
            item['pctAvanco'] = 100.0 if item['total'] > 0 else 0.0
        else:
            item['pctAvanco'] = round((item['total'] / previous_total * 100), 1) if previous_total > 0 else 0.0
        previous_total = item['total']
        total_rows.append(item)

    return to_native({
        'stages': _stage_meta(),
        'rows': rows,
        'totais': total_rows,
    })
