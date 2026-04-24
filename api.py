import os
import pandas as pd
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from core.database import get_connection, listar_tabelas

CACHE_FILES = {
    'c6':    'metricas_c6.json',
    'inter': 'metricas_inter.json',
}

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

app = FastAPI(title="Métricas API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/tabelas")
def get_tabelas(
    login: str = Query(default=None),
    senha: str = Query(default=None),
    ambiente: str = Query(default=None),
):
    try:
        return {"tabelas": listar_tabelas(login=login, senha=senha, ambiente=ambiente)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _firebird_date_col(con, nome: str) -> str | None:
    """Retorna a primeira coluna DATE/TIMESTAMP da tabela no Firebird, ou None."""
    try:
        sql = (
            "SELECT FIRST 1 TRIM(rf.RDB$FIELD_NAME) "
            "FROM RDB$RELATION_FIELDS rf "
            "JOIN RDB$FIELDS f ON rf.RDB$FIELD_SOURCE = f.RDB$FIELD_NAME "
            f"WHERE TRIM(rf.RDB$RELATION_NAME) = '{nome.upper()}' "
            "AND f.RDB$FIELD_TYPE IN (12, 35) "   # 12=DATE, 35=TIMESTAMP
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
    nome: str,
    limit: int = Query(default=100, le=200000),
    offset: int = Query(default=0),
    login: str = Query(default=None),
    senha: str = Query(default=None),
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
    sql: str = Query(...),
    login: str = Query(default=None),
    senha: str = Query(default=None),
    ambiente: str = Query(default=None),
):
    try:
        con = get_connection(login=login, senha=senha, ambiente=ambiente)
        df = pd.read_sql(sql, con)
        con.close()
        return {
            "colunas": list(df.columns),
            "total": len(df),
            "dados": df.to_dict(orient="records"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Cache CSV ─────────────────────────────────────────────────────────────────

@app.get("/cache")
def get_cache(banco: str = Query(default='c6')):
    import json
    path = CACHE_FILES.get(banco)
    if not path:
        raise HTTPException(status_code=400, detail=f"Banco '{banco}' inválido. Use: {list(CACHE_FILES.keys())}")
    if not os.path.exists(path):
        return {"existe": False, "banco": banco, "dados": [], "total": 0, "savedAt": None}
    try:
        with open(path, 'r', encoding='utf-8') as f:
            payload = json.load(f)
        saved_at = datetime.fromtimestamp(os.path.getmtime(path)).isoformat()
        return {"existe": True, "banco": banco, "dados": payload["dados"], "total": len(payload["dados"]), "savedAt": saved_at}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/cache/refresh")
def refresh_cache(
    banco: str = Query(default='c6'),
    limit: int = Query(default=20000, le=200000),
    login: str = Query(default=None),
    senha: str = Query(default=None),
    ambiente: str = Query(default=None),
):
    import json
    path = CACHE_FILES.get(banco)
    if not path:
        raise HTTPException(status_code=400, detail=f"Banco '{banco}' inválido.")
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
                with open(path, 'r', encoding='utf-8') as f:
                    old_dados = json.load(f)["dados"]
                df_old = pd.DataFrame(old_dados)
                df = pd.concat([df_old, df], ignore_index=True).drop_duplicates(
                    subset=['NU_OPERACAO', 'NU_FASE_OPERACAO'], keep='last'
                )
            except Exception:
                pass

        # Aplica de-para após merge — garante que todos os registros tenham NO_FASE_WEB
        df['NO_FASE_WEB'] = df['NU_FASE_OPERACAO'].map(FASE_WEB).fillna('Desconhecida')

        dados = df.to_dict(orient="records")
        with open(path, 'w', encoding='utf-8') as f:
            json.dump({"dados": dados}, f, ensure_ascii=False, default=str)

        return {"banco": banco, "dados": dados, "total": len(dados), "savedAt": datetime.now().isoformat()}
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
    """Retorna a primeira coluna de data da tabela no SQL Server, ou None."""
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
    nome: str,
    limit: int = Query(default=100, le=200000),
    offset: int = Query(default=0),
    login: str = Query(default=None),
    senha: str = Query(default=None),
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
    sql: str = Query(...),
    login: str = Query(default=None),
    senha: str = Query(default=None),
):
    try:
        from core import database_sqlserver
        con = database_sqlserver.get_connection(login=login, senha=senha)
        df = pd.read_sql(sql, con)
        con.close()
        return {
            "colunas": list(df.columns),
            "total": len(df),
            "dados": df.to_dict(orient="records"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
