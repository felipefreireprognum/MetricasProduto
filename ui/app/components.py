def card(label, value, variant="", tema=None):
    return f"""
    <div class="metric-card {variant}">
        <div class="metric-value">{value:,}</div>
        <div class="metric-label">{label}</div>
    </div>
    """


def plotly_layout(tema):
    return dict(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color=tema["text"], family="Inter, sans-serif", size=12),
    )


def axis_style():
    return dict(gridcolor="#f0f0f0", zerolinecolor="#e5e7eb")
