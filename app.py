import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from pathlib import Path

from ui.app.styles import TEMAS, gerar_css
from ui.app.components import card, plotly_layout, axis_style
from parsers.xml_parser import carregar_xml
from parsers.pdf_parser import carregar_pdf

st.set_page_config(
    page_title="Metricas AG31 - Multi Banco",
    layout="wide",
    initial_sidebar_state="expanded",
)

# =============================================================
# PATHS E CARREGAMENTO
# =============================================================
BASE_PATH = Path(__file__).parent / "documentosuteis"
ARQUIVOS = {
    "Sicredi": BASE_PATH / "AG31",
    "C6 Bank": BASE_PATH / "C6-AG31_022026.pdf",
    "Itau":    BASE_PATH / "ITAU-AG31-itaufcvs.022026.pdf",
}


@st.cache_data
def carregar_banco(banco):
    path = ARQUIVOS[banco]
    if str(path).endswith(".pdf"):
        return carregar_pdf(path)
    return carregar_xml(path)


# =============================================================
# SIDEBAR
# =============================================================
if "banco" not in st.session_state:
    st.session_state.banco = "Sicredi"
if "pagina" not in st.session_state:
    st.session_state.pagina = "Dashboard"

with st.sidebar:
    st.markdown(
        "<p style='font-size:1.3rem; font-weight:800; color:#1a1f36; "
        "margin-bottom:0.1rem; letter-spacing:-0.5px;'>AG31 Metricas</p>",
        unsafe_allow_html=True,
    )
    st.markdown(
        "<p style='font-size:0.75rem; color:#6b7280; margin-bottom:1rem;'>"
        "Painel Multi-Banco</p>",
        unsafe_allow_html=True,
    )
    st.markdown("---")

    st.markdown(
        "<p style='font-size:0.7rem; font-weight:700; color:#6b7280; "
        "text-transform:uppercase; letter-spacing:1px; margin-bottom:0.5rem;'>"
        "Selecione o Banco</p>",
        unsafe_allow_html=True,
    )

    for banco_nome in TEMAS:
        t = TEMAS[banco_nome]
        is_active = st.session_state.banco == banco_nome
        if st.button(
            f"{t['logo_emoji']}  {t['nome_display']}",
            use_container_width=True,
            type="primary" if is_active else "secondary",
            key=f"btn_{banco_nome}",
        ):
            st.session_state.banco = banco_nome
            st.rerun()

    st.markdown("---")

    st.markdown(
        "<p style='font-size:0.7rem; font-weight:700; color:#6b7280; "
        "text-transform:uppercase; letter-spacing:1px; margin-bottom:0.5rem;'>"
        "Navegacao</p>",
        unsafe_allow_html=True,
    )

    paginas = ["Dashboard", "Tabela Detalhada", "Dados Brutos", "Comparativo"]
    for pag in paginas:
        if st.button(
            pag,
            use_container_width=True,
            type="primary" if st.session_state.pagina == pag else "secondary",
            key=f"nav_{pag}",
        ):
            st.session_state.pagina = pag
            st.rerun()

    st.markdown("---")
    st.markdown(
        "<p style='font-size:0.75rem; color:#9ca3af; margin-top:0.5rem;'>"
        "Fonte: Arquivo AG31<br>Sistema de Credito Imobiliario</p>",
        unsafe_allow_html=True,
    )


# =============================================================
# CARREGAR DADOS E APLICAR CSS/TEMA
# =============================================================
banco  = st.session_state.banco
tema   = TEMAS[banco]
pagina = st.session_state.pagina

st.markdown(gerar_css(tema), unsafe_allow_html=True)

info, metricas, df_fases = carregar_banco(banco)

# =============================================================
# HEADER
# =============================================================
st.markdown(f"""
<div class="dash-header">
    <div>
        <h1>Dashboard de Metricas AG31</h1>
        <div class="subtitle">{info['Empresa']} — Referencia: {info['Data Referencia']}</div>
    </div>
    <div class="badge">{tema['nome_display']}</div>
</div>
""", unsafe_allow_html=True)


# =============================================================
# PAGINA: DASHBOARD
# =============================================================
if pagina == "Dashboard":
    colors   = tema["chart_colors"]
    pri      = tema["primary"]
    pri_dark = tema["primary_dark"]
    acc      = tema["accent"]

    st.markdown('<div class="section-title">Visao Geral</div>', unsafe_allow_html=True)

    ctr_ativos   = metricas.get("PRI_CTR_ATIVOS", 0)
    ctr_inativos = metricas.get("PRI_CTR_INATIVOS", metricas.get("FIN_CTR_INATIVOS", 0))
    imv_total    = metricas.get("IMV_TOTAL", metricas.get("PRI_IMV_CADASTRADOS", 0))
    imv_ocupados = metricas.get("PRI_IMV_OCUPADOS", 0)
    total_contratos = metricas.get("TOTAL_CONTRATOS", metricas.get("PRI_CTR_CADASTRADOS", ctr_ativos + ctr_inativos))

    c1, c2, c3, c4, c5 = st.columns(5)
    with c1: st.markdown(card("Total Contratos",   total_contratos, "",       tema), unsafe_allow_html=True)
    with c2: st.markdown(card("Contratos Ativos",  ctr_ativos,      "accent", tema), unsafe_allow_html=True)
    with c3: st.markdown(card("Contratos Inativos",ctr_inativos,    "muted",  tema), unsafe_allow_html=True)
    with c4: st.markdown(card("Imoveis Total",     imv_total,       "dark",   tema), unsafe_allow_html=True)
    with c5: st.markdown(card("Imoveis Ocupados",  imv_ocupados,    "accent", tema), unsafe_allow_html=True)

    st.markdown("<div style='height:1.5rem'></div>", unsafe_allow_html=True)

    st.markdown('<div class="section-title">Composicao de Contratos</div>', unsafe_allow_html=True)

    g1, g2 = st.columns([3, 2])

    with g1:
        items = [
            ("Ativos c/ Serie",       metricas.get("PRI_CTR_ATV_COM_SERIE", 0)),
            ("Ativos s/ Serie",       metricas.get("PRI_CTR_ATV_SEM_SERIE", 0)),
            ("Ativos c/ FCVS",        metricas.get("PRI_CTR_ATV_COM_COB_FCVS", 0)),
            ("Ativos s/ FCVS",        metricas.get("PRI_CTR_ATV_SEM_COB_FCVS", 0)),
            ("c/ Prest. Emitida",     metricas.get("PRI_CTR_ATV_COM_PREST_EMITIDA", 0)),
            ("s/ Prest. Emitida",     metricas.get("PRI_CTR_ATV_SEM_PREST_EMITIDA", 0)),
            ("c/ Baixas Proc.",       metricas.get("PRI_CTR_ATV_COM_BAIXAS_PROCESSADAS", 0)),
            ("Enviados Seguradora",   metricas.get("PRI_CTR_SEGURADORA", 0)),
        ]
        items_filtrados = [(n, v) for n, v in items if v > 0] or items

        categorias = [n for n, _ in items_filtrados]
        valores    = [v for _, v in items_filtrados]
        cores_bar  = [colors[i % len(colors)] for i in range(len(items_filtrados))]

        fig_comp = go.Figure()
        fig_comp.add_trace(go.Bar(
            y=categorias, x=valores, orientation="h",
            marker=dict(color=cores_bar, cornerradius=5, line=dict(width=0)),
            text=valores, textposition="outside",
            textfont=dict(color=tema["text"], size=13, family="Inter"),
            hovertemplate="<b>%{y}</b><br>Quantidade: %{x:,}<extra></extra>",
        ))
        fig_comp.update_layout(
            **plotly_layout(tema),
            title=dict(text="Detalhamento de Contratos Ativos", font=dict(size=15, color=tema["text"])),
            height=max(350, len(items_filtrados) * 45 + 80),
            margin=dict(l=20, r=100, t=50, b=20),
            yaxis=dict(autorange="reversed", **axis_style()),
            xaxis=dict(title="Quantidade", **axis_style()),
            showlegend=False,
        )
        st.plotly_chart(fig_comp, use_container_width=True)

    with g2:
        fig_donut = go.Figure(go.Pie(
            labels=["Ativos", "Inativos"],
            values=[ctr_ativos, ctr_inativos],
            hole=0.55,
            marker=dict(colors=[pri, tema["text_muted"]], line=dict(color="#ffffff", width=3)),
            textinfo="label+percent+value",
            textposition="outside",
            textfont=dict(size=13, color=tema["text"], family="Inter"),
            pull=[0.03, 0],
            hovertemplate="<b>%{label}</b><br>%{value:,} contratos<br>%{percent}<extra></extra>",
        ))
        fig_donut.update_layout(
            **plotly_layout(tema),
            title=dict(text="Ativos vs Inativos", font=dict(size=15, color=tema["text"])),
            height=380,
            margin=dict(l=40, r=40, t=50, b=40),
            showlegend=False,
        )
        st.plotly_chart(fig_donut, use_container_width=True)

    if imv_total > 0:
        st.markdown("<div style='height:1rem'></div>", unsafe_allow_html=True)
        st.markdown('<div class="section-title">Imoveis</div>', unsafe_allow_html=True)

        i1, i2, i3, i4 = st.columns(4)
        with i1: st.markdown(card("Cadastrados", metricas.get("PRI_IMV_CADASTRADOS", 0), "",       tema), unsafe_allow_html=True)
        with i2: st.markdown(card("Vagos",       metricas.get("PRI_IMV_VAGOS", 0),       "muted",  tema), unsafe_allow_html=True)
        with i3: st.markdown(card("Novos",       metricas.get("PRI_IMV_NOVOS", 0),       "accent", tema), unsafe_allow_html=True)
        with i4: st.markdown(card("Retomados",   metricas.get("PRI_IMV_RETOMADOS", 0),   "dark",   tema), unsafe_allow_html=True)

        st.markdown("<div style='height:1rem'></div>", unsafe_allow_html=True)

        cat_imv = ["Vagos - Novos", "Vagos - Retomados", "Ocupados - Ativos", "Ocupados - Inativos"]
        val_imv = [
            metricas.get("PRI_IMV_NOVOS", 0),
            metricas.get("PRI_IMV_RETOMADOS", 0),
            metricas.get("PRI_IMV_ATIVOS", 0),
            metricas.get("PRI_IMV_INATIVOS", 0),
        ]
        fig_imv = go.Figure()
        fig_imv.add_trace(go.Bar(
            x=cat_imv, y=val_imv,
            marker=dict(color=[acc, tema["text_muted"], pri, pri_dark], cornerradius=5),
            text=[f"{v:,}" for v in val_imv],
            textposition="outside",
            textfont=dict(color=tema["text"], size=14, family="Inter"),
            hovertemplate="<b>%{x}</b><br>%{y:,} imoveis<extra></extra>",
        ))
        fig_imv.update_layout(
            **plotly_layout(tema),
            title=dict(text="Distribuicao de Imoveis", font=dict(size=15, color=tema["text"])),
            height=400,
            margin=dict(l=20, r=20, t=50, b=20),
            xaxis=dict(**axis_style()),
            yaxis=dict(title="Quantidade", **axis_style()),
            showlegend=False,
        )
        st.plotly_chart(fig_imv, use_container_width=True)

    ori_concluida  = metricas.get("ORI_OPERACAO_CONCLUIDA_MES_REF", 0)
    ori_avaliacao  = metricas.get("ORI_OPERACAO_APOS_AVALIACAO_MES_REF", 0)
    ori_assinatura = metricas.get("ORI_OPERACAO_APOS_ASSINATURA_CTR", 0)
    ori_iniciada   = metricas.get("ORI_OPERACAO_INICIALIZADA_MES_REF", 0)

    if any([ori_concluida, ori_avaliacao, ori_assinatura, ori_iniciada]):
        st.markdown("<div style='height:1rem'></div>", unsafe_allow_html=True)
        st.markdown('<div class="section-title">Originacao — Resumo</div>', unsafe_allow_html=True)

        o1, o2, o3, o4 = st.columns(4)
        with o1: st.markdown(card("Ops Iniciadas",  ori_iniciada,   "",       tema), unsafe_allow_html=True)
        with o2: st.markdown(card("Ops Concluidas", ori_concluida,  "accent", tema), unsafe_allow_html=True)
        with o3: st.markdown(card("Apos Avaliacao", ori_avaliacao,  "dark",   tema), unsafe_allow_html=True)
        with o4: st.markdown(card("Apos Assinatura",ori_assinatura, "accent", tema), unsafe_allow_html=True)

    if not df_fases.empty:
        st.markdown("<div style='height:1rem'></div>", unsafe_allow_html=True)
        st.markdown('<div class="section-title">Originacao - Fases</div>', unsafe_allow_html=True)

        tipo_cor  = {"Andamento": pri, "Cancelada": "#f87171", "Finalizada": pri_dark}
        bar_colors = [tipo_cor.get(t, tema["text_muted"]) for t in df_fases["Tipo"]]

        fig_fases = go.Figure()
        fig_fases.add_trace(go.Bar(
            y=df_fases["Fase"], x=df_fases["Dias Medio (fase)"], orientation="h",
            marker=dict(color=bar_colors, cornerradius=5),
            text=df_fases["Dias Medio (fase)"], textposition="outside",
            textfont=dict(color=tema["text"], size=13, family="Inter"),
            hovertemplate="<b>%{y}</b><br>Dias medios: %{x}<extra></extra>",
        ))
        fig_fases.update_layout(
            **plotly_layout(tema),
            title=dict(text="Tempo Medio por Fase", font=dict(size=15, color=tema["text"])),
            height=420,
            margin=dict(l=20, r=80, t=50, b=20),
            yaxis=dict(autorange="reversed", **axis_style()),
            xaxis=dict(title="Dias", **axis_style()),
            showlegend=False,
        )
        st.plotly_chart(fig_fases, use_container_width=True)

        df_and = df_fases[df_fases["Tipo"] == "Andamento"].copy()
        if not df_and.empty:
            st.markdown("<div style='height:1rem'></div>", unsafe_allow_html=True)
            fig_acum = go.Figure()
            fig_acum.add_trace(go.Scatter(
                x=df_and["Fase"], y=df_and["Dias Max (acumulado)"],
                mode="lines", line=dict(width=0), showlegend=False, hoverinfo="skip",
            ))
            fig_acum.add_trace(go.Scatter(
                x=df_and["Fase"], y=df_and["Dias Min (acumulado)"],
                mode="lines", line=dict(width=0),
                fill="tonexty",
                fillcolor=f"rgba({int(pri[1:3],16)},{int(pri[3:5],16)},{int(pri[5:7],16)},0.12)",
                name="Faixa Min-Max", hoverinfo="skip",
            ))
            fig_acum.add_trace(go.Scatter(
                x=df_and["Fase"], y=df_and["Dias Medio (acumulado)"],
                mode="lines+markers+text",
                line=dict(color=pri, width=3),
                marker=dict(size=12, color="#ffffff", line=dict(width=3, color=pri)),
                text=df_and["Dias Medio (acumulado)"],
                textposition="top center",
                textfont=dict(color=tema["text"], size=13, family="Inter"),
                name="Media",
                hovertemplate="<b>%{x}</b><br>Media: %{y} dias<extra></extra>",
            ))
            fig_acum.update_layout(
                **plotly_layout(tema),
                title=dict(text="Tempo Acumulado (Fases em Andamento)", font=dict(size=15, color=tema["text"])),
                height=400,
                margin=dict(l=20, r=20, t=50, b=80),
                xaxis=dict(tickangle=-25, **axis_style()),
                yaxis=dict(title="Dias", **axis_style()),
                legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(size=11)),
            )
            st.plotly_chart(fig_acum, use_container_width=True)


# =============================================================
# PAGINA: TABELA DETALHADA
# =============================================================
elif pagina == "Tabela Detalhada":
    if not df_fases.empty:
        st.markdown('<div class="section-title">Tabela Detalhada das Fases</div>', unsafe_allow_html=True)
        st.dataframe(df_fases, use_container_width=True, hide_index=True, height=500)
    else:
        st.markdown('<div class="section-title">Dados de Contratos</div>', unsafe_allow_html=True)

        secoes = {
            "Base Principal - Ativos":   {k: v for k, v in metricas.items() if k.startswith("PRI_CTR_ATV")},
            "Base Principal - Inativos": {k: v for k, v in metricas.items() if k.startswith("PRI_CTR_INA")},
            "Base Finalizados":          {k: v for k, v in metricas.items() if k.startswith("FIN_CTR")},
            "Imoveis - Principal":       {k: v for k, v in metricas.items() if k.startswith("PRI_IMV")},
            "Imoveis - Finalizados":     {k: v for k, v in metricas.items() if k.startswith("FIN_IMV")},
            "Originacao":                {k: v for k, v in metricas.items() if k.startswith("ORI_")},
        }
        dados_tabela = [
            {"Secao": secao, "Campo": campo, "Valor": valor}
            for secao, campos in secoes.items()
            for campo, valor in campos.items()
        ]
        if dados_tabela:
            st.dataframe(pd.DataFrame(dados_tabela), use_container_width=True, hide_index=True, height=600)
        else:
            st.info("Nenhum dado disponivel para este banco.")


# =============================================================
# PAGINA: DADOS BRUTOS
# =============================================================
elif pagina == "Dados Brutos":
    st.markdown('<div class="section-title">Todas as Metricas Extraidas</div>', unsafe_allow_html=True)
    df_metricas = pd.DataFrame([{"Metrica": k, "Valor": v} for k, v in sorted(metricas.items())])
    st.dataframe(df_metricas, use_container_width=True, hide_index=True, height=600)
    st.markdown(f"**Total de metricas:** {len(metricas)}")


# =============================================================
# PAGINA: COMPARATIVO
# =============================================================
elif pagina == "Comparativo":
    st.markdown('<div class="section-title">Comparativo entre Bancos</div>', unsafe_allow_html=True)

    dados_todos = {}
    for b in TEMAS:
        try:
            _, m, _ = carregar_banco(b)
            dados_todos[b] = m
        except Exception as e:
            st.warning(f"Erro ao carregar {b}: {e}")

    if dados_todos:
        campos_comp = [
            ("Total Contratos",                "TOTAL_CONTRATOS"),
            ("Contratos Ativos",               "PRI_CTR_ATIVOS"),
            ("Contratos Inativos (Principal)", "PRI_CTR_INATIVOS"),
            ("Contratos Inativos (Finalizados)","FIN_CTR_INATIVOS"),
            ("c/ Cobertura FCVS",              "PRI_CTR_ATV_COM_COB_FCVS"),
            ("s/ Cobertura FCVS",              "PRI_CTR_ATV_SEM_COB_FCVS"),
            ("c/ Prest. Emitida",              "PRI_CTR_ATV_COM_PREST_EMITIDA"),
            ("c/ Baixas Processadas",          "PRI_CTR_ATV_COM_BAIXAS_PROCESSADAS"),
            ("Enviados Seguradora",            "PRI_CTR_SEGURADORA"),
            ("Total Imoveis",                  "IMV_TOTAL"),
            ("Imoveis Ocupados",               "PRI_IMV_OCUPADOS"),
            ("Imoveis Vagos",                  "PRI_IMV_VAGOS"),
        ]

        comp_data = []
        for label, key in campos_comp:
            row = {"Metrica": label}
            for b in TEMAS:
                if b in dados_todos:
                    row[TEMAS[b]["nome_display"]] = dados_todos[b].get(key, 0)
            comp_data.append(row)

        st.dataframe(pd.DataFrame(comp_data), use_container_width=True, hide_index=True)
        st.markdown("<div style='height:2rem'></div>", unsafe_allow_html=True)

        bancos_nomes = [TEMAS[b]["nome_display"] for b in dados_todos]
        totais       = [dados_todos[b].get("TOTAL_CONTRATOS", dados_todos[b].get("PRI_CTR_ATIVOS", 0) + dados_todos[b].get("FIN_CTR_INATIVOS", 0)) for b in dados_todos]
        cores_comp   = [TEMAS[b]["primary"] for b in dados_todos]

        fig_total = go.Figure()
        fig_total.add_trace(go.Bar(
            x=bancos_nomes, y=totais,
            marker=dict(color=cores_comp, cornerradius=8),
            text=[f"{v:,}" for v in totais], textposition="outside",
            textfont=dict(size=16, family="Inter", color="#1a1f36"),
            hovertemplate="<b>%{x}</b><br>Total: %{y:,}<extra></extra>",
        ))
        fig_total.update_layout(
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font=dict(family="Inter, sans-serif", size=13),
            title=dict(text="Total de Contratos por Banco", font=dict(size=16, color="#1a1f36")),
            height=420, margin=dict(l=20, r=20, t=60, b=20),
            yaxis=dict(title="Quantidade", **axis_style()),
            xaxis=dict(**axis_style()), showlegend=False,
        )
        st.plotly_chart(fig_total, use_container_width=True)

        st.markdown("<div style='height:1rem'></div>", unsafe_allow_html=True)

        fig_ai = go.Figure()
        fig_ai.add_trace(go.Bar(
            name="Ativos", x=bancos_nomes,
            y=[dados_todos[b].get("PRI_CTR_ATIVOS", 0) for b in dados_todos],
            marker=dict(cornerradius=5), textposition="outside",
            text=[f"{dados_todos[b].get('PRI_CTR_ATIVOS', 0):,}" for b in dados_todos],
            textfont=dict(size=13, family="Inter"),
        ))
        fig_ai.add_trace(go.Bar(
            name="Inativos (Finalizados)", x=bancos_nomes,
            y=[dados_todos[b].get("FIN_CTR_INATIVOS", dados_todos[b].get("PRI_CTR_INATIVOS", 0)) for b in dados_todos],
            marker=dict(cornerradius=5), textposition="outside",
            text=[f"{dados_todos[b].get('FIN_CTR_INATIVOS', dados_todos[b].get('PRI_CTR_INATIVOS', 0)):,}" for b in dados_todos],
            textfont=dict(size=13, family="Inter"),
        ))
        fig_ai.update_layout(
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font=dict(family="Inter, sans-serif", size=13),
            title=dict(text="Contratos Ativos vs Inativos", font=dict(size=16, color="#1a1f36")),
            height=420, margin=dict(l=20, r=20, t=60, b=20),
            yaxis=dict(title="Quantidade", **axis_style()),
            xaxis=dict(**axis_style()),
            barmode="group",
            legend=dict(bgcolor="rgba(0,0,0,0)"),
        )
        st.plotly_chart(fig_ai, use_container_width=True)
