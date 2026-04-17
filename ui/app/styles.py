TEMAS = {
    "Sicredi": {
        "primary": "#00AB4F",
        "primary_dark": "#008C3E",
        "accent": "#00D45F",
        "bg": "#f0fdf4",
        "card_bg": "#ffffff",
        "text": "#1a1f36",
        "text_muted": "#6b7280",
        "border": "#d1fae5",
        "badge_bg": "#ecfdf5",
        "badge_text": "#059669",
        "gradient": ["#d1fae5", "#00AB4F", "#008C3E"],
        "chart_colors": ["#00AB4F", "#00D45F", "#008C3E", "#34d399", "#6ee7b7"],
        "nome_display": "SICREDI",
        "logo_emoji": "",
    },
    "C6 Bank": {
        "primary": "#1a1a1a",
        "primary_dark": "#000000",
        "accent": "#FFCC00",
        "bg": "#f5f5f5",
        "card_bg": "#ffffff",
        "text": "#1a1a1a",
        "text_muted": "#737373",
        "border": "#e5e5e5",
        "badge_bg": "#1a1a1a",
        "badge_text": "#FFCC00",
        "gradient": ["#f5f5f5", "#737373", "#1a1a1a"],
        "chart_colors": ["#1a1a1a", "#FFCC00", "#404040", "#8c8c8c", "#bfbfbf"],
        "nome_display": "C6 BANK",
        "logo_emoji": "",
    },
    "Itau": {
        "primary": "#EC7000",
        "primary_dark": "#003366",
        "accent": "#FF8C1A",
        "bg": "#FFF8F0",
        "card_bg": "#ffffff",
        "text": "#003366",
        "text_muted": "#6b7280",
        "border": "#FFE0B2",
        "badge_bg": "#FFF3E0",
        "badge_text": "#EC7000",
        "gradient": ["#FFE0B2", "#EC7000", "#003366"],
        "chart_colors": ["#EC7000", "#003366", "#FF8C1A", "#0055A4", "#FFB347"],
        "nome_display": "ITAU",
        "logo_emoji": "",
    },
}


def gerar_css(tema):
    return f"""
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
    * {{ font-family: 'Inter', sans-serif; }}

    .stApp {{ background: {tema['bg']}; }}

    header[data-testid="stHeader"] {{ background: {tema['bg']}; }}

    section[data-testid="stSidebar"] {{
        background: #ffffff;
        border-right: 1px solid {tema['border']};
        min-width: 280px !important;
        width: 280px !important;
    }}
    section[data-testid="stSidebar"] > div {{ width: 280px !important; }}

    .dash-header {{
        background: #ffffff;
        border: 1px solid {tema['border']};
        border-radius: 14px;
        padding: 1.6rem 2rem;
        margin-bottom: 1.8rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 4px solid {tema['primary']};
    }}
    .dash-header h1 {{
        color: {tema['text']};
        font-size: 1.6rem;
        font-weight: 800;
        margin: 0;
        letter-spacing: -0.3px;
    }}
    .dash-header .subtitle {{
        color: {tema['text_muted']};
        font-size: 0.88rem;
        margin-top: 0.2rem;
        font-weight: 400;
    }}
    .dash-header .badge {{
        background: {tema['badge_bg']};
        color: {tema['badge_text']};
        padding: 0.4rem 1.2rem;
        border-radius: 20px;
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.5px;
    }}

    .section-title {{
        color: {tema['text']};
        font-size: 1rem;
        font-weight: 700;
        margin: 1.8rem 0 1rem 0;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid {tema['primary']};
        display: inline-block;
        letter-spacing: -0.2px;
    }}

    .metric-card {{
        background: {tema['card_bg']};
        border: 1px solid {tema['border']};
        border-radius: 14px;
        padding: 1.3rem 1.2rem;
        text-align: center;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
    }}
    .metric-card::before {{
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: {tema['primary']};
        border-radius: 14px 14px 0 0;
    }}
    .metric-card:hover {{
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }}
    .metric-value {{
        font-size: 2rem;
        font-weight: 800;
        color: {tema['text']};
        line-height: 1.2;
    }}
    .metric-label {{
        color: {tema['text_muted']};
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-top: 0.4rem;
        font-weight: 600;
    }}
    .metric-card.accent::before {{ background: {tema['accent']}; }}
    .metric-card.dark::before {{ background: {tema['primary_dark']}; }}
    .metric-card.muted::before {{ background: {tema['text_muted']}; }}

    .stDataFrame {{
        border-radius: 12px;
        border: 1px solid {tema['border']};
    }}

    hr {{ border-color: {tema['border']} !important; }}

    .stSelectbox label {{
        color: {tema['text']};
        font-weight: 600;
        font-size: 0.85rem;
    }}

    section[data-testid="stSidebar"] .stButton button {{
        font-size: 0.78rem;
        padding: 0.45rem 0.8rem;
        font-family: 'Inter', sans-serif;
        font-weight: 600;
        border-radius: 8px;
    }}
    section[data-testid="stSidebar"] .stButton button[kind="primary"] {{
        background: {tema['primary']};
        border-color: {tema['primary']};
        color: #ffffff;
    }}
    section[data-testid="stSidebar"] .stButton button[kind="primary"]:hover {{
        background: {tema['primary_dark']};
        border-color: {tema['primary_dark']};
    }}
    section[data-testid="stSidebar"] .stButton button[kind="secondary"] {{
        background: #ffffff;
        border: 1px solid #d1d5db;
        color: {tema['text']};
    }}
    section[data-testid="stSidebar"] .stButton button[kind="secondary"]:hover {{
        background: {tema['badge_bg']};
        border-color: {tema['primary']};
        color: {tema['primary']};
    }}
</style>
"""
