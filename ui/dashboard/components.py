import streamlit as st
from .styles import COLORS, PLOTLY_LAYOUT


def apply_chart_style(fig, accent=None):
    fig.update_layout(**PLOTLY_LAYOUT)
    if accent:
        fig.update_traces(marker_color=accent)
    return fig


def section_label(text):
    st.markdown(f"""
    <div style="
      font-family:Inter,sans-serif; font-size:0.65rem; font-weight:700;
      letter-spacing:0.1em; color:{COLORS['muted']}; text-transform:uppercase;
      margin:1.5rem 0 0.85rem; display:flex; align-items:center; gap:0.75rem;
    ">
      <span>{text}</span>
      <span style="flex:1; height:1px; background:{COLORS['border']};"></span>
    </div>
    """, unsafe_allow_html=True)
