import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from core.database import get_connection, listar_tabelas

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


@app.get("/tabela/{nome}")
def get_tabela(
    nome: str,
    limit: int = Query(default=100, le=5000),
    offset: int = Query(default=0),
    login: str = Query(default=None),
    senha: str = Query(default=None),
    ambiente: str = Query(default=None),
):
    try:
        con = get_connection(login=login, senha=senha, ambiente=ambiente)
        df = pd.read_sql(f"SELECT FIRST {limit} SKIP {offset} * FROM {nome}", con)
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
