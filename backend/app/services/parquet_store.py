import os

import pandas as pd

from ..core.config import CACHE_DIR


def _cache_path(banco: str, ambiente: str | None = None) -> str:
    slug = banco
    if ambiente:
        # /u10/c6bank/dados/scci.gdb → scci
        basename = os.path.splitext(os.path.basename(ambiente))[0]
        if basename:
            slug = f"{banco}_{basename}"
    return str(CACHE_DIR / f"metricas_{slug}.parquet")


def _ambiente_label(banco: str, ambiente: str | None) -> str:
    """Human-readable ambiente identifier stored as column in Parquet."""
    if ambiente:
        return os.path.splitext(os.path.basename(ambiente))[0]  # /u10/.../scci.gdb → 'scci'
    return banco


def _list_available_parquets() -> list[tuple[str, str]]:
    """Returns [(banco_id, filepath)] for every Parquet in CONSULTAS/."""
    result = []
    if not os.path.exists(CACHE_DIR):
        return result
    for fname in sorted(os.listdir(CACHE_DIR)):
        if fname.startswith('metricas_') and fname.endswith('.parquet'):
            stem  = fname[len('metricas_'):-len('.parquet')]  # e.g. 'c6_scci' or 'inter'
            banco = stem.split('_')[0]                         # e.g. 'c6' or 'inter'
            result.append((banco, os.path.join(CACHE_DIR, fname)))
    return result


def _read_all_parquets() -> tuple[pd.DataFrame, list[str]]:
    """Read all Parquets, ensure BANCO/AMBIENTE columns, concatenate. Returns (df, banco_ids)."""
    dfs, bancos = [], []
    for banco_id, path in _list_available_parquets():
        try:
            df = pd.read_parquet(path)
            df['BANCO'] = banco_id
            if 'AMBIENTE' not in df.columns:
                # Derive from filename for old Parquets: metricas_c6_scci → scci
                stem  = os.path.basename(path)[len('metricas_'):-len('.parquet')]
                parts = stem.split('_')
                df['AMBIENTE'] = '_'.join(parts[1:]) if len(parts) > 1 else banco_id
            dfs.append(df)
            bancos.append(banco_id)
        except Exception:
            pass
    if not dfs:
        return pd.DataFrame(), []
    return pd.concat(dfs, ignore_index=True), bancos
