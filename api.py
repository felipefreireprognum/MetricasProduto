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

FASE_WEB = {
    0:    'Simulação',
    1:    'Simulação',
    50:   'Cadastro',
    80:   'Cadastro',
    90:   'Cadastro',
    100:  'Crédito',
    101:  'Crédito',
    200:  'Negociação',
    201:  'Negociação',
    202:  'Negociação',
    300:  'Análise de Documentos',
    301:  'Análise de Documentos',
    400:  'Análise Técnica',
    401:  'Análise Técnica',
    402:  'Análise Técnica',
    403:  'Análise Técnica',
    404:  'Análise Técnica',
    405:  'Análise Técnica',
    406:  'Análise Técnica',
    407:  'Análise Técnica',
    408:  'Análise Técnica',
    409:  'Análise Técnica',
    500:  'Formalização',
    501:  'Formalização',
    502:  'Formalização',
    503:  'Formalização',
    504:  'Formalização',
    505:  'Formalização',
    600:  'Formalização',
    601:  'Formalização',
    700:  'Liberação',
    701:  'Liberação',
    800:  'Concluído',
    900:  'Cancelada',
    901:  'Cancelada',
    902:  'Cancelada',
    903:  'Cancelada',
    904:  'Cancelada',
    905:  'Cancelada',
    906:  'Cancelada',
    907:  'Cancelada',
    908:  'Cancelada',
    909:  'Cancelada',
    910:  'Cancelada',
    911:  'Cancelada',
    912:  'Cancelada',
    913:  'Cancelada',
    914:  'Cancelada',
    915:  'Cancelada',
    916:  'Cancelada',
    917:  'Cancelada',
    918:  'Cancelada',
    919:  'Cancelada',
    920:  'Cancelada',
    921:  'Cancelada',
    922:  'Cancelada',
    923:  'Cancelada',
    924:  'Cancelada',
    925:  'Cancelada',
    926:  'Cancelada',
    927:  'Cancelada',
    928:  'Cancelada',
    929:  'Cancelada',
    930:  'Cancelada',
    931:  'Cancelada',
    932:  'Cancelada',
    933:  'Cancelada',
    934:  'Cancelada',
    935:  'Cancelada',
    936:  'Cancelada',
    937:  'Cancelada',
    938:  'Cancelada',
    1000: 'Cancelada',
}

CACHE_SQL_FIREBIRD = (
    "SELECT FIRST {limit} h.NU_OPERACAO, h.NU_FASE_OPERACAO, h.DT_INICIO_FASE, "
    "h.CO_USUARIO_FASE, f.NO_FASE_OPERACAO "
    "FROM HISTORICO_OPERACAO h "
    "LEFT JOIN FASE_OPERACAO f ON h.NU_FASE_OPERACAO = f.NU_FASE_OPERACAO "
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

    # Phase label: prefer NO_FASE_OPERACAO (from DB join), same as frontend mapper
    if 'NO_FASE_OPERACAO' in df.columns:
        df['FASE_NOME'] = df['NO_FASE_OPERACAO'].astype(str).str.strip()
        bad = df['FASE_NOME'].isin(['', 'nan', 'None', 'null'])
        df.loc[bad, 'FASE_NOME'] = df.loc[bad, 'NU_FASE_OPERACAO'].apply(lambda x: f'Fase {x}')
    elif 'NO_FASE_WEB' in df.columns:
        df['FASE_NOME'] = df['NO_FASE_WEB'].fillna('Desconhecida').astype(str)
    else:
        df['FASE_NOME'] = df['NU_FASE_OPERACAO'].apply(lambda x: f'Fase {x}')

    # 1. Operations per phase (sorted by phase number, same as JS)
    phase_counts = (
        df.groupby(['NU_FASE_OPERACAO', 'FASE_NOME'])
        .size()
        .reset_index(name='total')
        .sort_values('NU_FASE_OPERACAO')
    )
    operacoes_por_fase = [
        {'fase': int(r.NU_FASE_OPERACAO), 'nome': r.FASE_NOME, 'total': int(r.total)}
        for r in phase_counts.itertuples()
    ]

    # 2. Consecutive phase time diffs (sorted by phase number, same as JS faseTimes logic)
    df_by_fase = df.sort_values(['NU_OPERACAO', 'NU_FASE_OPERACAO'])
    df_by_fase['NEXT_DT'] = df_by_fase.groupby('NU_OPERACAO')['DT_INICIO_FASE'].shift(-1)
    df_by_fase['DIAS_DIFF'] = (df_by_fase['NEXT_DT'] - df_by_fase['DT_INICIO_FASE']).dt.days
    valid_diffs = df_by_fase.dropna(subset=['DIAS_DIFF']).query('DIAS_DIFF >= 0')
    tempo_por_fase = (
        valid_diffs.groupby(['NU_FASE_OPERACAO', 'FASE_NOME'])['DIAS_DIFF']
        .mean()
        .reset_index()
        .sort_values('NU_FASE_OPERACAO')
    )
    tempo_medio_por_fase = [
        {'fase': int(r.NU_FASE_OPERACAO), 'nome': r.FASE_NOME, 'tempoMedioDias': round(float(r.DIAS_DIFF), 1)}
        for r in tempo_por_fase.itertuples()
    ]

    # 3. Per-operation first/last date and last phase (sorted by date then phase, same as JS byDate)
    df_by_date = df.sort_values(['NU_OPERACAO', 'DT_INICIO_FASE', 'NU_FASE_OPERACAO'])
    op_first_date = df_by_date.groupby('NU_OPERACAO')['DT_INICIO_FASE'].first()
    op_last_date  = df_by_date.groupby('NU_OPERACAO')['DT_INICIO_FASE'].last()
    op_last_phase = df_by_date.groupby('NU_OPERACAO')['NU_FASE_OPERACAO'].last()

    # 4. Monthly time sums (for tempoMedio per month in evolucaoMensal)
    op_duracao = (op_last_date - op_first_date).dt.days
    op_duracao_valid = op_duracao[(op_duracao >= 0) & (op_duracao < 3650)]
    op_mes = op_first_date.dt.to_period('M')
    month_time_df = pd.DataFrame({'dias': op_duracao_valid, 'mes': op_mes[op_duracao_valid.index]})
    month_time_agg = month_time_df.groupby('mes')['dias'].agg(['sum', 'count'])

    # 5. Monthly evolution
    iniciadas_mes = op_mes.value_counts()
    concluidas_mes = op_mes[op_last_phase == 1300].value_counts()
    canceladas_mes = op_mes[op_last_phase == 1200].value_counts()

    all_months = sorted(set(iniciadas_mes.index) | set(concluidas_mes.index) | set(canceladas_mes.index))
    all_months = all_months[-12:]

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
        evolucao_mensal.append({
            'mes': str(mes), 'label': label,
            'iniciadas': ini, 'concluidas': con_, 'canceladas': can,
            'emFila': em_fila, 'taxaConversao': taxa, 'tempoMedio': tempo_medio,
        })

    # 6. Top users
    top_usuarios = [
        {'usuario': str(u), 'total': int(c)}
        for u, c in df[col_usuario].value_counts().head(10).items()
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
    n_concluidas = int((op_last_phase == 1300).sum())
    n_canceladas = int((op_last_phase == 1200).sum())
    n_em_fila    = max(n_iniciadas - n_concluidas - n_canceladas, 0)
    taxa_conv    = round((n_concluidas / n_iniciadas * 100), 1) if n_iniciadas > 0 else 0.0
    duracoes_valid = op_duracao[(op_duracao >= 0) & (op_duracao < 3650)]
    tempo_medio_total = round(float(duracoes_valid.mean()), 1) if not duracoes_valid.empty else None
    top_usuario = str(df[col_usuario].value_counts().idxmax()) if not df.empty else '—'

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
    }

    first_row = {k: (None if pd.isnull(v) else v) for k, v in df.iloc[0].items()} if not df.empty else None

    return _to_native({
        'operacoesPorFase': operacoes_por_fase,
        'volumePorData': volume_por_data,
        'tempoMedioPorFase': tempo_medio_por_fase,
        'topUsuarios': top_usuarios,
        'distribuicaoFases': operacoes_por_fase,
        'evolucaoMensal': evolucao_mensal,
        'kpis': kpis,
        'colunas': list(df.columns),
        'primeiraLinha': first_row,
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
        date_col = _firebird_date_col(con, nome)
        if date_col:
            sql = f"SELECT FIRST {limit} SKIP {offset} * FROM {nome} ORDER BY {date_col} DESC"
        else:
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

@app.get("/parquet/info")
def parquet_info(
    banco:    str = Query(default='c6'),
    ambiente: str = Query(default=None),
):
    path = _cache_path(banco, ambiente)
    if not os.path.exists(path):
        return {'existe': False}
    try:
        df = pd.read_parquet(path)
        dt_col = 'DT_INICIO_FASE'
        return _to_native({
            'existe':   True,
            'total':    len(df),
            'colunas':  list(df.columns),
            'dtInicio': str(df[dt_col].min()) if dt_col in df.columns else None,
            'dtFim':    str(df[dt_col].max()) if dt_col in df.columns else None,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/parquet/dados")
def parquet_dados(
    banco:    str  = Query(default='c6'),
    ambiente: str  = Query(default=None),
    limit:    int  = Query(default=100, le=500),
    offset:   int  = Query(default=0),
    ordem:    str  = Query(default='DT_INICIO_FASE'),
    desc:     bool = Query(default=True),
):
    path = _cache_path(banco, ambiente)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail='Parquet não encontrado. Use Fontes → Atualizar.')
    try:
        df = pd.read_parquet(path)
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


# ── Dashboard ──────────────────────────────────────────────────────────────────

@app.get("/dashboard")
def get_dashboard(
    banco:    str = Query(default='c6'),
    ambiente: str = Query(default=None),
):
    path = _cache_path(banco, ambiente)
    if not os.path.exists(path):
        return {'existe': False, 'banco': banco, 'data': None, 'savedAt': None}
    try:
        df       = pd.read_parquet(path)
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
        df['NO_FASE_WEB'] = df['NU_FASE_OPERACAO'].map(FASE_WEB).fillna('Desconhecida')
        con.close()
        return {'dados': df.to_dict(orient='records'), 'total': len(df)}
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

        df['NO_FASE_WEB'] = df['NU_FASE_OPERACAO'].map(FASE_WEB).fillna('Desconhecida')

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
                f"h.CO_USUARIO_FASE, f.NO_FASE_OPERACAO "
                f"FROM HISTORICO_OPERACAO h "
                f"LEFT JOIN FASE_OPERACAO f ON h.NU_FASE_OPERACAO = f.NU_FASE_OPERACAO "
                f"WHERE h.DT_INICIO_FASE < '{min_date}' "
                f"ORDER BY h.DT_INICIO_FASE DESC"
            )

        df_new = pd.read_sql(sql, con)
        con.close()

        df = pd.concat([df_old, df_new], ignore_index=True).drop_duplicates(
            subset=['NU_OPERACAO', 'NU_FASE_OPERACAO'], keep='last'
        )
        df['NO_FASE_WEB'] = df['NU_FASE_OPERACAO'].map(FASE_WEB).fillna('Desconhecida')

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
