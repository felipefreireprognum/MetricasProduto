import os
import sys
import time
import subprocess
import requests
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from pathlib import Path

from ui.dashboard.styles import COLORS, get_css
from ui.dashboard.components import apply_chart_style, section_label

API_URL = f"http://{os.getenv('API_HOST', 'localhost')}:{os.getenv('API_PORT', '8000')}"

st.set_page_config(page_title="Métricas de Produto", layout="wide", initial_sidebar_state="expanded")
st.markdown(get_css(COLORS), unsafe_allow_html=True)


# ── API Server ────────────────────────────────────────────────────────────────
def start_api_server():
    try:
        requests.get(f"{API_URL}/docs", timeout=2)
        return True
    except Exception:
        pass

    subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "api:app",
         "--host", os.getenv("API_HOST", "localhost"),
         "--port", os.getenv("API_PORT", "8000")],
        cwd=str(Path(__file__).parent),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    for _ in range(20):
        time.sleep(0.5)
        try:
            requests.get(f"{API_URL}/docs", timeout=1)
            return True
        except Exception:
            continue
    return False


# ── Login ─────────────────────────────────────────────────────────────────────
if not st.session_state.get("autenticado"):
    _, mid, _ = st.columns([1, 1.2, 1])
    with mid:
        st.markdown(f"""
        <div style="text-align:center; padding:3rem 0 1.75rem;">
          <div style="
            width:52px; height:52px; border-radius:12px; background:{COLORS['blue']};
            display:inline-flex; align-items:center; justify-content:center;
            font-size:1.5rem; font-weight:800; color:#fff; margin-bottom:0.9rem;
          ">M</div>
          <div style="font-family:Inter,sans-serif; font-size:1.3rem; font-weight:700; color:{COLORS['text']};">
            Métricas de Produto
          </div>
          <div style="font-family:Inter,sans-serif; font-size:0.7rem; color:{COLORS['muted']};
            letter-spacing:0.1em; text-transform:uppercase; margin-top:0.25rem;">
            SCCI · FIREBIRD · ACESSO
          </div>
        </div>
        <div style="
          background:{COLORS['blue_soft']}; border:1px solid {COLORS['border']};
          border-radius:8px; padding:0.55rem 0.85rem; margin-bottom:0.85rem;
          font-family:Inter,sans-serif; font-size:0.65rem; font-weight:700;
          color:{COLORS['muted']}; letter-spacing:0.1em; text-transform:uppercase;
        ">Credenciais de Acesso</div>
        """, unsafe_allow_html=True)

        login_val    = st.text_input("Login",    placeholder="Usuário do sistema", label_visibility="collapsed")
        senha_val    = st.text_input("Senha",    placeholder="Senha", type="password", label_visibility="collapsed")

        st.markdown(f"""<div style="font-family:Inter,sans-serif; font-size:0.65rem; font-weight:700;
          color:{COLORS['muted']}; letter-spacing:0.1em; text-transform:uppercase;
          margin:0.75rem 0 0.3rem;">Ambiente (caminho do banco)</div>""", unsafe_allow_html=True)

        ambiente_val = st.text_input("Ambiente", placeholder="/u10/c6bank", label_visibility="collapsed")

        st.markdown("<div style='height:0.5rem'></div>", unsafe_allow_html=True)
        conectar = st.button("Conectar", use_container_width=True)

        if conectar:
            if login_val and senha_val and ambiente_val:
                with st.spinner("Iniciando servidor..."):
                    api_ok = start_api_server()
                if not api_ok:
                    st.error("Não foi possível iniciar o servidor interno. Verifique o ambiente.")
                else:
                    with st.spinner("Verificando credenciais..."):
                        try:
                            r = requests.get(
                                f"{API_URL}/tabelas",
                                params={"login": login_val, "senha": senha_val, "ambiente": ambiente_val},
                                timeout=15,
                            )
                            if not r.ok:
                                detalhe = r.json().get("detail", r.text) if r.headers.get("content-type", "").startswith("application/json") else r.text
                                st.error(f"Erro {r.status_code}: {detalhe}")
                            else:
                                st.session_state.autenticado = True
                                st.session_state.login       = login_val
                                st.session_state.senha       = senha_val
                                st.session_state.ambiente    = ambiente_val
                                st.rerun()
                        except Exception as e:
                            st.error(f"Falha na conexão: {e}")
            else:
                st.warning("Preencha todos os campos.")
    st.stop()

creds = (st.session_state.login, st.session_state.senha, st.session_state.ambiente)


# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="
  display:flex; align-items:center; gap:1rem;
  padding-bottom:1.25rem;
  border-bottom:2px solid {COLORS['border']};
  margin-bottom:1.75rem;
">
  <div style="
    width:38px; height:38px; border-radius:8px; background:{COLORS['blue']};
    display:flex; align-items:center; justify-content:center;
    font-size:1rem; font-weight:800; color:#fff;
  ">M</div>
  <div>
    <div style="font-family:Inter,sans-serif; font-size:1.15rem; font-weight:700; color:{COLORS['text']}; line-height:1.1;">
      Métricas de Produto
    </div>
    <div style="font-family:Inter,sans-serif; font-size:0.68rem; color:{COLORS['muted']}; letter-spacing:0.05em; margin-top:2px;">
      SCCI · FIREBIRD · TEMPO REAL
    </div>
  </div>
  <div style="margin-left:auto; display:flex; gap:0.5rem; align-items:center;">
    <div style="
      background:{COLORS['yellow_soft']}; border:1px solid {COLORS['yellow']};
      color:#8B6200; font-size:0.68rem; font-weight:600;
      padding:0.2rem 0.75rem; border-radius:20px; letter-spacing:0.04em;
    ">AO VIVO</div>
  </div>
</div>
""", unsafe_allow_html=True)


# ── Fetch ─────────────────────────────────────────────────────────────────────
@st.cache_data(ttl=60)
def fetch_tabelas(creds):
    login, senha, ambiente = creds
    r = requests.get(f"{API_URL}/tabelas",
                     params={"login": login, "senha": senha, "ambiente": ambiente})
    r.raise_for_status()
    return r.json()["tabelas"]

@st.cache_data(ttl=60)
def fetch_tabela(nome, limit, creds):
    login, senha, ambiente = creds
    r = requests.get(f"{API_URL}/tabela/{nome}",
                     params={"limit": limit, "login": login, "senha": senha, "ambiente": ambiente})
    r.raise_for_status()
    return r.json()

@st.cache_data(ttl=60)
def fetch_query(sql, creds):
    login, senha, ambiente = creds
    r = requests.get(f"{API_URL}/query",
                     params={"sql": sql, "login": login, "senha": senha, "ambiente": ambiente})
    r.raise_for_status()
    return r.json()


# ── Sidebar ───────────────────────────────────────────────────────────────────
st.sidebar.markdown(f"""
<div style="
  font-family:Inter,sans-serif; font-size:0.68rem; font-weight:700;
  color:{COLORS['muted']}; letter-spacing:0.1em; text-transform:uppercase;
  padding:0.25rem 0 1rem; border-bottom:1px solid {COLORS['border']}; margin-bottom:1rem;
">Explorar banco</div>
""", unsafe_allow_html=True)

try:
    tabelas    = fetch_tabelas(creds)
    st.sidebar.caption(f"{len(tabelas)} tabelas disponíveis")
    tabela_sel = st.sidebar.selectbox("Selecionar tabela", tabelas)
    limit      = st.sidebar.slider("Limite de registros", 10, 5000, 100, step=10)
except Exception as e:
    st.error(f"Erro ao conectar na API: {e}")
    st.stop()

st.sidebar.divider()
st.sidebar.markdown(f"""
<div style="font-family:Inter,sans-serif; font-size:0.68rem; font-weight:700;
  color:{COLORS['muted']}; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:0.6rem;">
  Query customizada
</div>""", unsafe_allow_html=True)

sql_custom  = st.sidebar.text_area("SQL", placeholder="SELECT * FROM HISTORICO_OPERACAO WHERE ...",
                                    label_visibility="collapsed", height=110)
rodar_query = st.sidebar.button("Executar Query")

st.sidebar.divider()
st.sidebar.markdown(f"""
<div style="font-family:Inter,sans-serif; font-size:0.72rem; color:{COLORS['muted']}; margin-bottom:0.5rem;">
  <span style="font-weight:600; color:{COLORS['text']};">{st.session_state.get('login','')}</span><br>
  <span style="font-size:0.65rem;">{st.session_state.get('ambiente','')}</span>
</div>
""", unsafe_allow_html=True)
if st.sidebar.button("Sair", use_container_width=True):
    st.session_state.clear()
    st.rerun()


# ── Main ──────────────────────────────────────────────────────────────────────
if rodar_query and sql_custom:
    with st.spinner("Executando..."):
        try:
            resultado = fetch_query(sql_custom, creds)
            df = pd.DataFrame(resultado["dados"])
            section_label(f"Resultado — {resultado['total']} registros")
            st.dataframe(df, use_container_width=True, height=400)
            st.download_button("Exportar CSV", data=df.to_csv(index=False).encode("utf-8"),
                               file_name="resultado_query.csv", mime="text/csv")
        except Exception as e:
            st.error(f"Erro: {e}")

elif tabela_sel:
    with st.spinner(f"Carregando {tabela_sel}..."):
        try:
            resultado = fetch_tabela(tabela_sel, limit, creds)
            df        = pd.DataFrame(resultado["dados"])

            chips = "".join([
                f'<span style="display:inline-block; background:{COLORS["blue_soft"]}; '
                f'border:1px solid {COLORS["blue"]}22; color:{COLORS["blue"]}; '
                f'font-size:0.65rem; font-weight:500; padding:0.15rem 0.55rem; '
                f'border-radius:4px; margin:0.2rem 0.2rem 0.2rem 0;">{c}</span>'
                for c in resultado["colunas"]
            ])

            st.markdown(f"""
            <div style="
              background:{COLORS['card']}; border:1px solid {COLORS['border']};
              border-radius:12px; padding:1.25rem 1.5rem; margin-bottom:1.25rem;
              box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            ">
              <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
                <span style="font-family:Inter,sans-serif; font-size:1.05rem; font-weight:700; color:{COLORS['text']};">
                  {tabela_sel}
                </span>
                <span style="
                  font-size:0.7rem; font-weight:600; color:{COLORS['blue']};
                  background:{COLORS['blue_soft']}; border:1px solid {COLORS['blue']}33;
                  padding:0.15rem 0.65rem; border-radius:20px;
                ">{resultado['total_retornado']} registros</span>
                <span style="
                  font-size:0.7rem; font-weight:600; color:#8B6200;
                  background:{COLORS['yellow_soft']}; border:1px solid {COLORS['yellow']};
                  padding:0.15rem 0.65rem; border-radius:20px;
                ">{len(resultado['colunas'])} colunas</span>
              </div>
              <div style="display:flex; flex-wrap:wrap; gap:0.1rem;">{chips}</div>
            </div>
            """, unsafe_allow_html=True)

            col1, col2 = st.columns([4, 1])
            with col1:
                st.dataframe(df, use_container_width=True, height=380)
            with col2:
                st.metric("Registros", resultado["total_retornado"])
                st.metric("Colunas", len(resultado["colunas"]))
                st.markdown("<div style='height:0.4rem'></div>", unsafe_allow_html=True)
                st.download_button("Exportar CSV", data=df.to_csv(index=False).encode("utf-8"),
                                   file_name=f"{tabela_sel}.csv", mime="text/csv")

            if not df.empty:
                section_label("Análise")

                if tabela_sel == "HISTORICO_OPERACAO":

                    # ── Gráfico 1: Tempo médio por fase — largura total ───
                    section_label("Tempo Médio por Fase")
                    try:
                        res_media = fetch_query("""
                            SELECT NU_FASE_OPERACAO,
                                   CAST(AVG(DATEDIFF(DAY, DT_INICIO_FASE, PROX_DT)) AS INTEGER) AS MEDIA_DIAS,
                                   COUNT(*) AS QTD_TRANSICOES
                            FROM (
                              SELECT NU_OPERACAO, NU_FASE_OPERACAO, DT_INICIO_FASE,
                                     LEAD(DT_INICIO_FASE) OVER (
                                       PARTITION BY NU_OPERACAO ORDER BY DT_INICIO_FASE
                                     ) AS PROX_DT
                              FROM HISTORICO_OPERACAO
                            ) t
                            WHERE PROX_DT IS NOT NULL
                            GROUP BY NU_FASE_OPERACAO
                            ORDER BY MEDIA_DIAS DESC
                        """, creds)
                        df_media = pd.DataFrame(res_media["dados"])
                        if not df_media.empty:
                            df_media["Fase"] = "Fase " + df_media["NU_FASE_OPERACAO"].astype(str)
                            df_media = df_media.sort_values("MEDIA_DIAS", ascending=True)
                            fig_media = px.bar(
                                df_media,
                                x="MEDIA_DIAS", y="Fase", orientation="h",
                                title="Tempo Médio em Cada Fase (dias)",
                                labels={"MEDIA_DIAS": "Dias", "Fase": ""},
                                text="MEDIA_DIAS", color="MEDIA_DIAS",
                                color_continuous_scale=[[0, COLORS["blue_soft"]], [1, COLORS["blue"]]],
                                custom_data=["QTD_TRANSICOES"],
                            )
                            fig_media.update_traces(
                                texttemplate="%{text:.0f}d", textposition="outside",
                                marker_line_width=0,
                                hovertemplate="<b>%{y}</b><br>Média: %{x:.0f} dias<br>Transições: %{customdata[0]}<extra></extra>",
                            )
                            apply_chart_style(fig_media)
                            fig_media.update_layout(
                                height=max(320, len(df_media) * 44 + 80),
                                coloraxis_showscale=False, showlegend=False,
                            )
                            st.plotly_chart(fig_media, use_container_width=True)
                    except Exception as e:
                        st.error(f"Erro ao calcular médias por fase: {e}")

                    # ── Row 2: Fila atual | Heatmap ───────────────────────
                    r2c1, r2c2 = st.columns(2)

                    with r2c1:
                        section_label("Fila Atual por Fase")
                        try:
                            res_fila = fetch_query("""
                                SELECT h.NU_FASE_OPERACAO, COUNT(*) AS QTD
                                FROM HISTORICO_OPERACAO h
                                JOIN (
                                  SELECT NU_OPERACAO, MAX(DT_INICIO_FASE) AS MAX_DT
                                  FROM HISTORICO_OPERACAO
                                  GROUP BY NU_OPERACAO
                                ) u ON h.NU_OPERACAO = u.NU_OPERACAO
                                     AND h.DT_INICIO_FASE = u.MAX_DT
                                GROUP BY h.NU_FASE_OPERACAO
                                ORDER BY QTD DESC
                            """, creds)
                            df_fila = pd.DataFrame(res_fila["dados"])
                            if not df_fila.empty:
                                df_fila["Fase"] = "Fase " + df_fila["NU_FASE_OPERACAO"].astype(str)
                                fig_fila = px.bar(
                                    df_fila, x="Fase", y="QTD",
                                    title="Operações Aguardando em Cada Fase",
                                    labels={"QTD": "Operações", "Fase": ""},
                                    text="QTD", color="QTD",
                                    color_continuous_scale=[[0, COLORS["yellow_soft"]], [1, COLORS["yellow"]]],
                                )
                                fig_fila.update_traces(
                                    textposition="outside", marker_line_width=0,
                                    hovertemplate="<b>%{x}</b><br>%{y} operações<extra></extra>",
                                )
                                apply_chart_style(fig_fila)
                                fig_fila.update_layout(height=360, coloraxis_showscale=False)
                                st.plotly_chart(fig_fila, use_container_width=True)
                        except Exception as e:
                            st.error(f"Erro fila por fase: {e}")

                    with r2c2:
                        section_label("Heatmap Usuário × Fase")
                        try:
                            res_hm = fetch_query("""
                                SELECT CO_USUARIO_FASE, NU_FASE_OPERACAO, COUNT(*) AS QTD
                                FROM HISTORICO_OPERACAO
                                GROUP BY CO_USUARIO_FASE, NU_FASE_OPERACAO
                            """, creds)
                            df_hm = pd.DataFrame(res_hm["dados"])
                            if not df_hm.empty:
                                top_users = df_hm.groupby("CO_USUARIO_FASE")["QTD"].sum().nlargest(12).index
                                df_hm  = df_hm[df_hm["CO_USUARIO_FASE"].isin(top_users)]
                                pivot  = df_hm.pivot_table(
                                    index="CO_USUARIO_FASE", columns="NU_FASE_OPERACAO",
                                    values="QTD", fill_value=0,
                                )
                                fig_hm = go.Figure(go.Heatmap(
                                    z=pivot.values.tolist(),
                                    x=["F" + str(c) for c in pivot.columns],
                                    y=[str(i) for i in pivot.index],
                                    colorscale=[[0, COLORS["blue_soft"]], [1, COLORS["blue"]]],
                                    hovertemplate="Usuário: %{y}<br>Fase: %{x}<br>Qtd: %{z}<extra></extra>",
                                ))
                                apply_chart_style(fig_hm)
                                fig_hm.update_layout(title="Volume por Usuário e Fase (Top 12)", height=360)
                                st.plotly_chart(fig_hm, use_container_width=True)
                        except Exception as e:
                            st.error(f"Erro heatmap: {e}")

                    # ── Row 3: Volume diário | Top usuários ───────────────
                    r3c1, r3c2 = st.columns(2)

                    with r3c1:
                        section_label("Volume de Entradas por Dia")
                        df["DT_INICIO_FASE"] = pd.to_datetime(df["DT_INICIO_FASE"], errors="coerce")
                        por_data = df.groupby(df["DT_INICIO_FASE"].dt.date).size().reset_index()
                        por_data.columns = ["Data", "Qtd"]
                        fig_vol = px.line(por_data, x="Data", y="Qtd",
                                          title="Registros de Fase por Data",
                                          labels={"Qtd": "Registros", "Data": ""})
                        apply_chart_style(fig_vol)
                        fig_vol.update_traces(
                            line_color=COLORS["blue"], line_width=2,
                            fill="tozeroy", fillcolor="rgba(26,95,255,0.08)",
                            hovertemplate="%{x}<br>%{y} registros<extra></extra>",
                        )
                        fig_vol.update_layout(height=360)
                        st.plotly_chart(fig_vol, use_container_width=True)

                    with r3c2:
                        section_label("Top 15 Usuários por Volume Total")
                        try:
                            res_usr = fetch_query("""
                                SELECT FIRST 15 CO_USUARIO_FASE, COUNT(*) AS QTD
                                FROM HISTORICO_OPERACAO
                                GROUP BY CO_USUARIO_FASE
                                ORDER BY QTD DESC
                            """, creds)
                            df_usr = pd.DataFrame(res_usr["dados"])
                            if not df_usr.empty:
                                df_usr = df_usr.sort_values("QTD", ascending=True)
                                fig_usr = px.bar(
                                    df_usr, x="QTD", y="CO_USUARIO_FASE", orientation="h",
                                    title="Top 15 Usuários — Total de Registros",
                                    labels={"QTD": "Registros", "CO_USUARIO_FASE": ""},
                                    text="QTD", color="QTD",
                                    color_continuous_scale=[[0, COLORS["blue_soft"]], [1, COLORS["blue"]]],
                                )
                                fig_usr.update_traces(
                                    textposition="outside", marker_line_width=0,
                                    hovertemplate="<b>%{y}</b><br>%{x} registros<extra></extra>",
                                )
                                apply_chart_style(fig_usr)
                                fig_usr.update_layout(height=360, coloraxis_showscale=False)
                                st.plotly_chart(fig_usr, use_container_width=True)
                        except Exception as e:
                            st.error(f"Erro top usuários: {e}")

                else:
                    colunas_num = df.select_dtypes(include="number").columns.tolist()
                    colunas_obj = df.select_dtypes(include="object").columns.tolist()
                    charts = []

                    if colunas_obj:
                        col_cat = colunas_obj[0]
                        fig = px.bar(df[col_cat].value_counts().head(15).reset_index(),
                                     x=col_cat, y="count", title=f"Distribuição — {col_cat}",
                                     labels={col_cat: col_cat, "count": "Qtd"})
                        apply_chart_style(fig, COLORS["blue"])
                        charts.append(fig)

                    if colunas_num:
                        col_num = colunas_num[0]
                        fig2 = px.histogram(df, x=col_num, title=f"Histograma — {col_num}")
                        apply_chart_style(fig2, COLORS["yellow"])
                        charts.append(fig2)

                    if charts:
                        cols = st.columns(len(charts))
                        for col, fig in zip(cols, charts):
                            with col:
                                st.plotly_chart(fig, use_container_width=True)

        except Exception as e:
            st.error(f"Erro ao carregar tabela: {e}")
