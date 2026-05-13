import os
import pandas as pd
from datetime import date as _date, datetime
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from ..core.serialization import to_native as _to_native
from ..domain.fases import FASE_MAP, _apply_fase_map
from ..services.dashboard_metrics import _build_dashboard_data
from ..services.macro_evolution import build_macro_evolution
from ..services.metrics_cache import get_or_set as _metrics_cache_get_or_set, invalidate_path as _invalidate_metrics_cache


def _firebird_db():
    from ..db import firebird
    return firebird


from ..services.parquet_store import _ambiente_label, _cache_path, _list_available_parquets, _read_all_parquets

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
    "h.CO_USUARIO_FASE, f.NO_FASE_OPERACAO, cpf_sub.NU_CPF "
    "FROM HISTORICO_OPERACAO h "
    "LEFT JOIN FASE_OPERACAO f ON h.NU_FASE_OPERACAO = f.NU_FASE_OPERACAO "
    "LEFT JOIN (SELECT NU_OPERACAO, MIN(LTRIM(RTRIM(NU_CPF))) AS NU_CPF "
    "           FROM OPERACAO_CREDITO GROUP BY NU_OPERACAO) cpf_sub "
    "ON cpf_sub.NU_OPERACAO = h.NU_OPERACAO "
    "ORDER BY h.DT_INICIO_FASE DESC"
)


router = APIRouter()

@router.get("/tabelas")
def get_tabelas(
    login:    str = Query(default=None),
    senha:    str = Query(default=None),
    ambiente: str = Query(default=None),
):
    try:
        return {"tabelas": _firebird_db().listar_tabelas(login=login, senha=senha, ambiente=ambiente)}
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


@router.get("/tabela/{nome}")
def get_tabela(
    nome:     str,
    limit:    int = Query(default=100, le=200000),
    offset:   int = Query(default=0),
    login:    str = Query(default=None),
    senha:    str = Query(default=None),
    ambiente: str = Query(default=None),
):
    try:
        con = _firebird_db().get_connection(login=login, senha=senha, ambiente=ambiente)
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


@router.get("/query")
def executar_query(
    sql:      str = Query(...),
    login:    str = Query(default=None),
    senha:    str = Query(default=None),
    ambiente: str = Query(default=None),
):
    try:
        con = _firebird_db().get_connection(login=login, senha=senha, ambiente=ambiente)
        df = pd.read_sql(sql, con)
        con.close()
        return {"colunas": list(df.columns), "total": len(df), "dados": df.to_dict(orient="records")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# â”€â”€ Parquet explorer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.get("/fases")
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


@router.get("/parquet/info")
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


@router.get("/parquet/diagnostico")
def parquet_diagnostico(
    banco:    str = Query(default='c6'),
    ambiente: str = Query(default=None),
):
    """Mostra distribuiÃ§Ã£o da primeira fase registrada por operaÃ§Ã£o â€” revela se operaÃ§Ãµes pulam etapas."""
    path = _cache_path(banco, ambiente)
    if not os.path.exists(path):
        return {'existe': False}
    try:
        df = pd.read_parquet(path)
        _SIMULACAO_CODES = {0, 1}

        # Normalize: Parquets antigos tÃªm NO_FASE, novos tÃªm NO_FASE (via _apply_fase_map)
        nome_col = 'NO_FASE' if 'NO_FASE' in df.columns else ('FASE_NOME' if 'FASE_NOME' in df.columns else None)
        macro_col = 'MACROFASE' if 'MACROFASE' in df.columns else None

        group_cols = ['NU_FASE_OPERACAO']
        if nome_col:  group_cols.append(nome_col)
        if macro_col: group_cols.append(macro_col)

        # Para cada operaÃ§Ã£o, pega a fase com menor cÃ³digo (a "primeira" etapa registrada)
        primeira_fase = (
            df.sort_values('NU_FASE_OPERACAO')
            .groupby('NU_OPERACAO')[group_cols]
            .first()
            .reset_index()
        )

        total_ops = len(primeira_fase)

        # OperaÃ§Ãµes que tÃªm SimulaÃ§Ã£o em algum momento vs as que nÃ£o tÃªm
        ops_com_simulacao  = int(df[df['NU_FASE_OPERACAO'].isin(_SIMULACAO_CODES)]['NU_OPERACAO'].nunique())
        ops_sem_simulacao  = total_ops - ops_com_simulacao

        # DistribuiÃ§Ã£o: qual macrofase Ã© a PRIMEIRA registrada para cada operaÃ§Ã£o
        dist_primeira_macro = []
        if macro_col:
            dist_primeira_macro = (
                primeira_fase.groupby(macro_col)['NU_OPERACAO']
                .count()
                .sort_values(ascending=False)
                .reset_index(name='ops')
            )

        # DistribuiÃ§Ã£o por fase individual (cÃ³digo)
        fase_group = ['NU_FASE_OPERACAO'] + ([nome_col] if nome_col else [])
        dist_primeira_fase = (
            primeira_fase.groupby(fase_group)['NU_OPERACAO']
            .count()
            .sort_values(ascending=False)
            .head(20)
            .reset_index(name='ops')
        )

        def _macro_rows(df_m):
            if df_m is None or (hasattr(df_m, '__len__') and len(df_m) == 0): return []
            col = macro_col or 'MACROFASE'
            return [{'macrofase': getattr(r, col, ''), 'ops': int(r.ops)} for r in df_m.itertuples()]

        def _fase_rows(df_f):
            rows = []
            for r in df_f.itertuples():
                nome = getattr(r, nome_col, f'Fase {r.NU_FASE_OPERACAO}') if nome_col else f'Fase {r.NU_FASE_OPERACAO}'
                rows.append({'fase': int(r.NU_FASE_OPERACAO), 'nome': nome, 'ops': int(r.ops)})
            return rows

        return _to_native({
            'totalOps':          total_ops,
            'comSimulacao':      ops_com_simulacao,
            'semSimulacao':      ops_sem_simulacao,
            'pctSemSimulacao':   round(ops_sem_simulacao / total_ops * 100, 1) if total_ops else 0,
            'primeiraMacrofase': _macro_rows(dist_primeira_macro),
            'primeiraFase':      _fase_rows(dist_primeira_fase),
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gaps")
def gaps_analysis(
    banco:    str = Query(default='c6'),
    ambiente: str = Query(default=None),
    inicio:   _date = Query(default=None),
    fim:      _date = Query(default=None),
):
    """
    Para cada macrofase do funil, mostra:
      - total_macrofase : ops contadas via op_max_pipeline >= threshold (o nÃºmero do funil)
      - ops_com_registro: ops com pelo menos um registro real nessa macrofase
      - gap             : total_macrofase - ops_com_registro
        (ops que o funil conta mas que nunca tocaram a fase â€” entradas laterais em etapas posteriores)
    TambÃ©m devolve a distribuiÃ§Ã£o da primeira fase registrada por operaÃ§Ã£o.
    """
    path = _cache_path(banco, ambiente)
    if not os.path.exists(path):
        return {'existe': False}
    try:
        df = pd.read_parquet(path)
        if inicio or fim:
            ops_com_sim = set(
                df.loc[df['NU_FASE_OPERACAO'].isin({0, 1}), 'NU_OPERACAO'].astype(str).str.strip()
            )
            dt = pd.to_datetime(df['DT_INICIO_FASE'], errors='coerce')
            if inicio:
                df = df[dt >= pd.Timestamp(str(inicio))]
            if fim:
                df = df[dt < pd.Timestamp(str(fim)) + pd.Timedelta(days=1)]
            df = df[df['NU_OPERACAO'].astype(str).str.strip().isin(ops_com_sim)]

        _CANCELADAS_CODES = set(range(900, 939)) | {1000}

        # Fase mÃ¡xima nÃ£o-cancelada por operaÃ§Ã£o (mesma lÃ³gica de _build_dashboard_data)
        df_pipeline     = df[~df['NU_FASE_OPERACAO'].isin(_CANCELADAS_CODES)]
        op_max_pipeline = df_pipeline.groupby('NU_OPERACAO')['NU_FASE_OPERACAO'].max()
        all_op_ids      = df['NU_OPERACAO'].unique()
        op_max_pipeline = op_max_pipeline.reindex(all_op_ids, fill_value=0)
        total_ops       = len(op_max_pipeline)

        # Mapeamento: macrofase â†’ threshold mÃ­nimo (igual ao _build_dashboard_data)
        _MACROFASE_MIN = {
            'SimulaÃ§Ã£o':              0,
            'Cadastro':              50,
            'CrÃ©dito':              100,
            'NegociaÃ§Ã£o':           200,
            'AnÃ¡lise de Documentos': 300,
            'AnÃ¡lise TÃ©cnica':      400,
            'EmissÃ£o de Contrato':  501,
        }

        # Mapeamento: macrofase â†’ cÃ³digos de fase reais
        _MACROFASE_CODES = {
            'SimulaÃ§Ã£o':              {0, 1},
            'Cadastro':               {50, 80, 90},
            'CrÃ©dito':                {100, 101},
            'NegociaÃ§Ã£o':             {200, 201, 202},
            'AnÃ¡lise de Documentos':  {300, 301},
            'AnÃ¡lise TÃ©cnica':        {400, 401, 402, 403, 404, 405, 406, 407, 408, 409},
            'EmissÃ£o de Contrato':    {500, 501},
        }

        _emissao_macro = next((m for m in _MACROFASE_MIN if m.startswith('Emiss')), None)
        if _emissao_macro:
            _MACROFASE_MIN[_emissao_macro] = 500
            _MACROFASE_CODES[_emissao_macro] = {500, 501, 502, 503, 504, 505}
        _MACROFASE_MIN['Registro de Contratos'] = 600
        _MACROFASE_CODES['Registro de Contratos'] = {600, 601, 700, 701}

        rows = []
        for macro, min_code in _MACROFASE_MIN.items():
            total_macro   = int((op_max_pipeline >= min_code).sum())
            phase_codes   = _MACROFASE_CODES.get(macro, set())
            ops_com_reg   = int(df[df['NU_FASE_OPERACAO'].isin(phase_codes)]['NU_OPERACAO'].nunique()) if phase_codes else 0
            gap           = total_macro - ops_com_reg
            rows.append({
                'macrofase':       macro,
                'totalMacrofase':  total_macro,
                'opsComRegistro':  ops_com_reg,
                'gap':             gap,
                'pctGap':          round(gap / total_macro * 100, 2) if total_macro else 0,
            })

        # Primeira fase registrada por operaÃ§Ã£o (by menor cÃ³digo de fase)
        nome_col  = next((c for c in ('FASE_NOME', 'NO_FASE') if c in df.columns), None)
        macro_col = 'MACROFASE' if 'MACROFASE' in df.columns else None

        primeira_fase = (
            df.sort_values('NU_FASE_OPERACAO')
            .groupby('NU_OPERACAO')[['NU_FASE_OPERACAO'] + ([nome_col] if nome_col else []) + ([macro_col] if macro_col else [])]
            .first()
            .reset_index()
        )

        # DistribuiÃ§Ã£o de onde cada operaÃ§Ã£o "comeÃ§ou"
        grp_cols = ['NU_FASE_OPERACAO'] + ([nome_col] if nome_col else []) + ([macro_col] if macro_col else [])
        dist = (
            primeira_fase.groupby(grp_cols)['NU_OPERACAO']
            .count()
            .sort_values(ascending=False)
            .head(25)
            .reset_index(name='ops')
        )
        primeiraFase = []
        for r in dist.itertuples():
            primeiraFase.append({
                'fase':      int(r.NU_FASE_OPERACAO),
                'nome':      getattr(r, nome_col, f'Fase {r.NU_FASE_OPERACAO}') if nome_col else f'Fase {r.NU_FASE_OPERACAO}',
                'macrofase': getattr(r, macro_col, '') if macro_col else '',
                'ops':       int(r.ops),
                'pct':       round(int(r.ops) / total_ops * 100, 1) if total_ops else 0,
            })

        return _to_native({
            'existe':       True,
            'totalOps':     total_ops,
            'porMacrofase': rows,
            'primeiraFase': primeiraFase,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/parquet/dados")
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
                raise HTTPException(status_code=404, detail='Nenhum Parquet encontrado. Use Fontes â†’ Atualizar.')
        else:
            path = _cache_path(banco, ambiente)
            if not os.path.exists(path):
                raise HTTPException(status_code=404, detail='Parquet nÃ£o encontrado. Use Fontes â†’ Atualizar.')
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


@router.get("/parquet/export")
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
                raise HTTPException(status_code=404, detail='Nenhum Parquet encontrado. Use Fontes â†’ Atualizar.')
        else:
            path = _cache_path(banco, ambiente)
            if not os.path.exists(path):
                raise HTTPException(status_code=404, detail='Parquet nÃ£o encontrado. Use Fontes â†’ Atualizar.')
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


# â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.get("/dashboard")
def get_dashboard(
    banco:    str   = Query(default='c6'),
    ambiente: str   = Query(default=None),
    inicio:   _date = Query(default=None),
    fim:      _date = Query(default=None),
):
    path = _cache_path(banco, ambiente)
    if not os.path.exists(path):
        return {'existe': False, 'banco': banco, 'data': None, 'savedAt': None}
    def _build_response():
        df = pd.read_parquet(path)
        ops_com_sim_full: set | None = None
        if inicio or fim:
            # Integrity check on FULL dataset: ops valid only if they have a SimulaÃ§Ã£o record.
            # Must run BEFORE date filter so ops that started before the period are not wrongly
            # excluded (ops whose SimulaÃ§Ã£o falls outside the filtered window would be dropped
            # if the check ran on the already-filtered df).
            ops_com_sim_full = set(
                df.loc[df['NU_FASE_OPERACAO'].isin({0, 1}), 'NU_OPERACAO'].astype(str).str.strip()
            )
            # Row-level date filter: compare Timestamps directly to avoid TypeError on NaT rows
            # that arise when DT_INICIO_FASE has coerced-null values (dt.dt.date + None >= date
            # raises TypeError in Python which becomes an unhandled 500).
            dt = pd.to_datetime(df['DT_INICIO_FASE'], errors='coerce')
            if inicio:
                df = df[dt >= pd.Timestamp(str(inicio))]
            if fim:
                df = df[dt < pd.Timestamp(str(fim)) + pd.Timedelta(days=1)]
            # Apply integrity filter using the pre-computed full-dataset set.
            df = df[df['NU_OPERACAO'].astype(str).str.strip().isin(ops_com_sim_full)]
        saved_at = datetime.fromtimestamp(os.path.getmtime(path)).isoformat()
        # Pass ops_com_sim_full so _build_dashboard_data doesn't re-run integrity check on the
        # filtered slice (which would remove ops whose SimulaÃ§Ã£o is outside the date window).
        data     = _build_dashboard_data(df, ops_com_sim=ops_com_sim_full)
        return {'existe': True, 'banco': banco, 'data': data, 'savedAt': saved_at}
    try:
        return _metrics_cache_get_or_set(
            path,
            'dashboard',
            (banco, ambiente or '', str(inicio) if inicio else '', str(fim) if fim else ''),
            _build_response,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/macro-evolucao")
def get_macro_evolucao(
    banco:    str   = Query(default='c6'),
    ambiente: str   = Query(default=None),
    inicio:   _date = Query(default=None),
    fim:      _date = Query(default=None),
    meses:    int   = Query(default=12, ge=1, le=36),
):
    path = _cache_path(banco, ambiente)
    if not os.path.exists(path):
        return {'existe': False, 'banco': banco, 'data': None, 'savedAt': None}
    def _build_response():
        df = pd.read_parquet(path)
        ops_com_sim_full = set(
            df.loc[df['NU_FASE_OPERACAO'].isin({0, 1}), 'NU_OPERACAO'].astype(str).str.strip()
        )

        if inicio or fim:
            dt = pd.to_datetime(df['DT_INICIO_FASE'], errors='coerce')
            if inicio:
                df = df[dt >= pd.Timestamp(str(inicio))]
            if fim:
                df = df[dt < pd.Timestamp(str(fim)) + pd.Timedelta(days=1)]

        saved_at = datetime.fromtimestamp(os.path.getmtime(path)).isoformat()
        data = build_macro_evolution(df, meses=meses, ops_com_simulacao=ops_com_sim_full)
        return {'existe': True, 'banco': banco, 'data': data, 'savedAt': saved_at}
    try:
        return _metrics_cache_get_or_set(
            path,
            'macro-evolucao',
            (banco, ambiente or '', str(inicio) if inicio else '', str(fim) if fim else '', meses),
            _build_response,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exports/macro-evolucao")
def export_macro_evolucao(
    banco:    str   = Query(default='c6'),
    ambiente: str   = Query(default=None),
    inicio:   _date = Query(default=None),
    fim:      _date = Query(default=None),
    meses:    int   = Query(default=12, ge=1, le=36),
    formato:  str   = Query(default='json'),
):
    path = _cache_path(banco, ambiente)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail='Parquet nao encontrado. Use Fontes -> Atualizar.')

    try:
        df = pd.read_parquet(path)
        ops_com_sim_full = set(
            df.loc[df['NU_FASE_OPERACAO'].isin({0, 1}), 'NU_OPERACAO'].astype(str).str.strip()
        )

        if inicio or fim:
            dt = pd.to_datetime(df['DT_INICIO_FASE'], errors='coerce')
            if inicio:
                df = df[dt >= pd.Timestamp(str(inicio))]
            if fim:
                df = df[dt < pd.Timestamp(str(fim)) + pd.Timedelta(days=1)]

        data = build_macro_evolution(df, meses=meses, ops_com_simulacao=ops_com_sim_full)
        flat_rows = []
        for row in data['rows']:
            for stage in data['stages']:
                stage_id = stage['id']
                flat_rows.append({
                    'banco': banco,
                    'ambiente': _ambiente_label(banco, ambiente),
                    'mes': row['mes'],
                    'mes_label': row['label'],
                    'macrofase_id': stage_id,
                    'macrofase': stage['label'],
                    'volume': row.get(stage_id, 0),
                    'avanco_pct': row.get(f'{stage_id}_pctAvanco', 0),
                    'abandono': row.get(f'{stage_id}_abandono', 0),
                    'credito_reprovado': row.get(f'{stage_id}_creditoReprovado', 0),
                    'em_fila': row.get(f'{stage_id}_emAndamento', 0),
                    'tempo_medio_dias': row.get(f'{stage_id}_tempoMedio'),
                })

        if formato.lower() == 'csv':
            export_df = pd.DataFrame(flat_rows)
            now = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'macro_evolucao_{banco}_{now}.csv'
            csv_bytes = export_df.to_csv(index=False, encoding='utf-8-sig').encode('utf-8-sig')
            return Response(
                content=csv_bytes,
                media_type='text/csv; charset=utf-8-sig',
                headers={'Content-Disposition': f'attachment; filename="{filename}"'},
            )

        return _to_native({'existe': True, 'banco': banco, 'dados': flat_rows})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/historico")
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
            from ..db import sqlserver as database_sqlserver
            con = database_sqlserver.get_connection(login=login, senha=senha)
            sql = (
                f"SELECT TOP {limit} h.NU_OPERACAO, h.NU_FASE_OPERACAO, h.DT_INICIO_FASE, "
                f"h.CO_USUARIO_FASE, f.NO_FASE_OPERACAO "
                f"FROM HISTORICO_OPERACAO h "
                f"LEFT JOIN FASE_OPERACAO f ON h.NU_FASE_OPERACAO = f.NU_FASE_OPERACAO"
                f"{where} ORDER BY h.DT_INICIO_FASE DESC"
            )
        else:
            con = _firebird_db().get_connection(login=login, senha=senha, ambiente=ambiente)
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


# â”€â”€ Cache â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.get("/cache/refresh")
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
            from ..db import sqlserver as database_sqlserver
            con = database_sqlserver.get_connection(login=login, senha=senha)
            df = pd.read_sql(CACHE_SQL_SQLSERVER.format(limit=limit), con)
        else:
            con = _firebird_db().get_connection(login=login, senha=senha, ambiente=ambiente)
            df = pd.read_sql(CACHE_SQL_FIREBIRD.format(limit=limit), con)
        con.close()

        # Merge with existing â€” deduplicate by NU_OPERACAO + NU_FASE_OPERACAO
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
        _invalidate_metrics_cache(path)
        saved_at = datetime.fromtimestamp(os.path.getmtime(path)).isoformat()

        data = _build_dashboard_data(df)
        return {'existe': True, 'banco': banco, 'data': data, 'savedAt': saved_at}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cache/expand")
def expand_cache(
    banco:    str = Query(default='c6'),
    limit:    int = Query(default=20000, le=200000),
    login:    str = Query(default=None),
    senha:    str = Query(default=None),
    ambiente: str = Query(default=None),
):
    path = _cache_path(banco, ambiente)
    if not os.path.exists(path):
        raise HTTPException(status_code=400, detail="Parquet nÃ£o encontrado. Use Atualizar primeiro.")

    try:
        df_old = pd.read_parquet(path)
        if df_old.empty or 'DT_INICIO_FASE' not in df_old.columns:
            raise HTTPException(status_code=400, detail="Parquet sem dados vÃ¡lidos. Use Atualizar primeiro.")

        min_date = df_old['DT_INICIO_FASE'].min()

        if banco == 'inter':
            from ..db import sqlserver as database_sqlserver
            con = database_sqlserver.get_connection(login=login, senha=senha)
            sql = (
                f"SELECT TOP {limit} h.NU_OPERACAO, h.NU_FASE_OPERACAO, h.DT_INICIO_FASE, "
                f"h.CO_USUARIO_FASE, f.NO_FASE_OPERACAO, cpf_sub.NU_CPF "
                f"FROM HISTORICO_OPERACAO h "
                f"LEFT JOIN FASE_OPERACAO f ON h.NU_FASE_OPERACAO = f.NU_FASE_OPERACAO "
                f"LEFT JOIN (SELECT NU_OPERACAO, MIN(LTRIM(RTRIM(NU_CPF))) AS NU_CPF "
                f"           FROM OPERACAO_CREDITO GROUP BY NU_OPERACAO) cpf_sub "
                f"ON cpf_sub.NU_OPERACAO = h.NU_OPERACAO "
                f"WHERE h.DT_INICIO_FASE < '{min_date}' "
                f"ORDER BY h.DT_INICIO_FASE DESC"
            )
        else:
            con = _firebird_db().get_connection(login=login, senha=senha, ambiente=ambiente)
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
        _invalidate_metrics_cache(path)
        saved_at = datetime.fromtimestamp(os.path.getmtime(path)).isoformat()

        data = _build_dashboard_data(df)
        return {'existe': True, 'banco': banco, 'data': data, 'savedAt': saved_at, 'adicionados': len(df_new)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# â”€â”€ Inter â€” SQL Server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.get("/inter/tabelas")
def get_tabelas_inter(
    login: str = Query(default=None),
    senha: str = Query(default=None),
):
    try:
        from ..db import sqlserver as database_sqlserver
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


@router.get("/inter/tabela/{nome}")
def get_tabela_inter(
    nome:   str,
    limit:  int = Query(default=100, le=200000),
    offset: int = Query(default=0),
    login:  str = Query(default=None),
    senha:  str = Query(default=None),
):
    try:
        from ..db import sqlserver as database_sqlserver
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


@router.get("/inter/query")
def executar_query_inter(
    sql:   str = Query(...),
    login: str = Query(default=None),
    senha: str = Query(default=None),
):
    try:
        from ..db import sqlserver as database_sqlserver
        con = database_sqlserver.get_connection(login=login, senha=senha)
        df = pd.read_sql(sql, con)
        con.close()
        return {"colunas": list(df.columns), "total": len(df), "dados": df.to_dict(orient="records")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jornada")
def get_jornada(banco: str = 'c6', ambiente: str = ''):
    path = _cache_path(banco, ambiente)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Parquet nÃ£o encontrado")

    df = pd.read_parquet(path)

    if 'NU_CPF' not in df.columns or df['NU_CPF'].isna().all():
        return _to_native({'semDados': True})

    df = df.dropna(subset=['NU_CPF']).copy()
    _CANCELADAS = set(range(900, 939)) | {1000}

    # â”€â”€ 1. DistribuiÃ§Ã£o de tentativas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    cpf_ops = df.groupby('NU_CPF')['NU_OPERACAO'].nunique()
    concluded_cpfs = set(
        df[df['NU_FASE_OPERACAO'] == 800]['NU_CPF'].unique()
    )

    grupos_labels = ['1 tentativa', '2 tentativas', '3â€“4 tentativas', '5+ tentativas']
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

    # â”€â”€ 2. Onde a 1Âª tentativa trava â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    # â”€â”€ 3. Tempo entre tentativas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                ('7â€“30 dias',  int(((gaps['dias'] >= 7)  & (gaps['dias'] < 30)).sum())),
                ('30â€“90 dias', int(((gaps['dias'] >= 30) & (gaps['dias'] < 90)).sum())),
                ('90+ dias',   int((gaps['dias'] >= 90).sum())),
            ]
            tempo_dist = [{'faixa': f, 'total': t} for f, t in faixas if t > 0]

    # â”€â”€ 4. Progresso na 2Âª tentativa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    progresso: dict = {'melhorou': 0, 'igual': 0, 'piorou': 0, 'converteuNa2a': 0, 'totalReincidentes': 0}

    if 'MACROFASE' in df.columns:
        _MACROFASE_ORDER = ['SimulaÃ§Ã£o', 'Cadastro', 'CrÃ©dito', 'NegociaÃ§Ã£o',
                            'AnÃ¡lise de Documentos', 'AnÃ¡lise TÃ©cnica', 'FormalizaÃ§Ã£o', 'LiberaÃ§Ã£o']
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

    # â”€â”€ KPIs summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
