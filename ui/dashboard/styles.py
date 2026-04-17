COLORS = {
    "bg":           "#FFFFFF",
    "sidebar":      "#F7F9FC",
    "card":         "#FFFFFF",
    "border":       "#E3EAF4",
    "blue":         "#1A5FFF",
    "blue_soft":    "#EEF3FF",
    "yellow":       "#FFD93D",
    "yellow_soft":  "#FFFBE6",
    "text":         "#0F1C35",
    "muted":        "#8696B0",
    "danger":       "#EF4444",
}

CHART_COLORS = [
    COLORS["blue"], COLORS["yellow"],
    "#34D399", "#FB923C", "#A78BFA", "#60A5FA",
]

PLOTLY_LAYOUT = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(247,249,252,0.8)",
    font=dict(family="Inter, sans-serif", color=COLORS["text"], size=11),
    title_font=dict(family="Inter, sans-serif", size=13, color=COLORS["text"]),
    xaxis=dict(
        gridcolor=COLORS["border"],
        linecolor=COLORS["border"],
        tickfont=dict(size=10, color=COLORS["muted"]),
    ),
    yaxis=dict(
        gridcolor=COLORS["border"],
        linecolor=COLORS["border"],
        tickfont=dict(size=10, color=COLORS["muted"]),
    ),
    margin=dict(l=12, r=12, t=36, b=12),
    legend=dict(bgcolor="rgba(0,0,0,0)", bordercolor=COLORS["border"]),
    colorway=CHART_COLORS,
)


def get_css(colors):
    return f"""
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  html, body, .stApp {{
    background-color: {colors['bg']} !important;
    font-family: 'Inter', sans-serif !important;
  }}
  .main .block-container {{
    padding: 1.75rem 2.5rem 4rem;
    max-width: 1600px;
  }}

  section[data-testid="stSidebar"] {{
    background-color: {colors['sidebar']} !important;
    border-right: 1px solid {colors['border']};
  }}
  section[data-testid="stSidebar"] .stSelectbox label,
  section[data-testid="stSidebar"] .stSlider label,
  section[data-testid="stSidebar"] .stTextArea label,
  section[data-testid="stSidebar"] [data-testid="stWidgetLabel"] p {{
    color: {colors['muted']} !important;
    font-size: 0.68rem !important;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }}

  .stSelectbox > div > div,
  .stTextArea textarea {{
    background-color: {colors['bg']} !important;
    border: 1px solid {colors['border']} !important;
    border-radius: 8px !important;
    color: {colors['text']} !important;
    font-family: 'Inter', sans-serif !important;
    font-size: 0.85rem !important;
  }}
  .stSelectbox > div > div:focus-within,
  .stTextArea textarea:focus {{
    border-color: {colors['blue']} !important;
    box-shadow: 0 0 0 3px {colors['blue']}22 !important;
  }}

  .stSlider [role="slider"] {{ background: {colors['blue']} !important; }}
  .stSlider [data-testid="stThumbValue"] {{ background: {colors['blue']} !important; color: #fff !important; }}

  .stButton > button {{
    background: {colors['blue']} !important;
    border: none !important;
    color: #ffffff !important;
    font-family: 'Inter', sans-serif !important;
    font-size: 0.8rem !important;
    font-weight: 600;
    border-radius: 8px !important;
    padding: 0.5rem 1.25rem !important;
    transition: all 0.15s ease !important;
    width: 100%;
  }}
  .stButton > button:hover {{
    background: #1450DD !important;
    color: #ffffff !important;
    box-shadow: 0 4px 14px {colors['blue']}44 !important;
  }}
  .stButton > button p {{ color: #ffffff !important; }}

  .stDownloadButton > button {{
    background: {colors['yellow_soft']} !important;
    border: 1px solid {colors['yellow']} !important;
    color: #8B6200 !important;
    font-family: 'Inter', sans-serif !important;
    font-size: 0.8rem !important;
    font-weight: 600;
    border-radius: 8px !important;
    width: 100%;
    transition: all 0.15s ease !important;
  }}
  .stDownloadButton > button:hover {{
    background: {colors['yellow']} !important;
    color: #5C4100 !important;
  }}

  [data-testid="stMetric"] {{
    background: {colors['blue_soft']};
    border: 1px solid {colors['border']};
    border-top: 3px solid {colors['blue']};
    border-radius: 10px;
    padding: 1rem 1.25rem;
    margin-bottom: 0.75rem;
  }}
  [data-testid="stMetric"] label {{
    color: {colors['muted']} !important;
    font-size: 0.65rem !important;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }}
  [data-testid="stMetricValue"] {{
    color: {colors['blue']} !important;
    font-size: 1.6rem !important;
    font-weight: 700 !important;
  }}

  [data-testid="stDataFrame"] {{
    border: 1px solid {colors['border']};
    border-radius: 10px;
    overflow: hidden;
  }}

  hr {{ border-color: {colors['border']} !important; margin: 1.25rem 0 !important; }}

  h1, h2, h3 {{ font-family: 'Inter', sans-serif !important; color: {colors['text']} !important; }}
  p, span, div {{ color: {colors['text']}; }}
  .stCaption, [data-testid="stCaptionContainer"] p {{
    color: {colors['muted']} !important;
    font-size: 0.72rem !important;
  }}
  .stSpinner > div {{ border-top-color: {colors['blue']} !important; }}
</style>
"""
