import pandas as pd
import xml.etree.ElementTree as ET


def carregar_xml(path):
    tree = ET.parse(path)
    root = tree.getroot()
    campos = root.find("CAMPOS")

    info = {
        "Empresa": root.findtext("EMPRESA"),
        "Nome Fantasia": root.findtext("NOMEFANTASIA"),
        "Data Referencia": root.findtext("DATAREF", "").strip(),
    }

    metricas = {}
    for elem in campos:
        if elem.tag != "FASES" and elem.text is not None:
            try:
                metricas[elem.tag] = int(elem.text)
            except ValueError:
                metricas[elem.tag] = elem.text

    fases = []
    fases_elem = campos.find("FASES")
    if fases_elem is not None:
        for fase in fases_elem.findall("FASE"):
            fases.append({
                "Codigo": int(fase.findtext("NU_FASE_OPERACAO")),
                "Fase": fase.findtext("NO_FASE_OPERACAO"),
                "Tipo": fase.findtext("IN_TIPO_FASE"),
                "Qtd Operacoes": int(fase.findtext("QT_OPERACOES_FASE")),
                "Dias Medio (fase)": int(fase.findtext("QT_DIAS_MEDIO_FASE")),
                "Dias Min (fase)": int(fase.findtext("QT_DIAS_MINIMO_FASE")),
                "Dias Max (fase)": int(fase.findtext("QT_DIAS_MAXIMO_FASE")),
                "Desvio Padrao (fase)": int(fase.findtext("QT_DIAS_DPADRAO_FASE")),
                "Dias Medio (acumulado)": int(fase.findtext("QT_DIAS_MEDIO_DA_FASE")),
                "Dias Min (acumulado)": int(fase.findtext("QT_DIAS_MINIMO_DA_FASE")),
                "Dias Max (acumulado)": int(fase.findtext("QT_DIAS_MAXIMO_DA_FASE")),
                "Desvio Padrao (acumulado)": int(fase.findtext("QT_DIAS_DPADRAO_DA_FASE")),
            })

    df_fases = pd.DataFrame(fases) if fases else pd.DataFrame()
    return info, metricas, df_fases
