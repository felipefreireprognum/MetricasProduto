import re
import pandas as pd


def _extrair_numero(texto, pattern):
    m = re.search(pattern, texto)
    if m:
        val = m.group(1).replace(".", "").strip()
        try:
            return int(val)
        except ValueError:
            return 0
    return 0


def carregar_pdf(path):
    import fitz

    doc = fitz.open(str(path))
    texto_completo = ""
    for page in doc:
        texto_completo += page.get_text() + "\n"

    linhas = texto_completo.split("\n")

    empresa = ""
    data_ref = ""
    for linha in linhas:
        if linha.startswith("#"):
            raw = linha.replace("#", "").strip()
            empresa = re.sub(r"\s+Pag\s*:.*$", "", raw).strip()
            break
    m_data = re.search(r"Referente a\s+(.+?)$", texto_completo, re.MULTILINE)
    if m_data:
        data_ref = m_data.group(1).strip()

    info = {
        "Empresa": empresa,
        "Nome Fantasia": empresa.split()[0] if empresa else "",
        "Data Referencia": data_ref,
    }

    metricas = {}
    secao = None
    sub = None
    base = None

    for i, linha in enumerate(linhas):
        l = linha.strip()

        if "C O N T R A T O S" in l:
            secao = "CTR"
            continue
        if "I M O V E I S" in l or "I M O V E I S" in l.replace("Ó", "O"):
            secao = "IMV"
            continue
        if "O R I G I N A" in l:
            secao = "ORI"
            continue
        if "BASE PRINCIPAL" in l:
            base = "PRI"
            continue
        if "BASE DE FINALIZADOS" in l:
            base = "FIN"
            continue

        if secao == "CTR":
            prefix = f"{base}_CTR" if base else "PRI_CTR"

            if "CONTRATOS CADASTRADOS" in l:
                nums = re.findall(r"(\d+)", l)
                if len(nums) >= 5 and prefix == "PRI_CTR":
                    metricas[f"{prefix}_ATV_QTD_MES_ANTERIOR"] = int(nums[0])
                    metricas[f"{prefix}_INC_MES"]               = int(nums[1])
                    metricas[f"{prefix}_EXC_MES"]               = int(nums[2])
                    metricas[f"{prefix}_SUBROGADOS"]            = int(nums[3])
                    metricas[f"{prefix}_CADASTRADOS"]           = int(nums[4])
                elif len(nums) >= 5 and prefix == "FIN_CTR":
                    metricas[f"{prefix}_INA_QTD_MES_ANTERIOR"] = int(nums[0])
                    metricas[f"{prefix}_INA_INCLUIDOS"]         = int(nums[1])
                    metricas[f"{prefix}_INA_EXCLUIDOS"]         = int(nums[2])
                    metricas[f"{prefix}_INA_SUBROGADOS"]        = int(nums[3])
                    metricas[f"{prefix}_INA_QTD_CADASTRADOS"]   = int(nums[4])
                continue

            if re.match(r"\s*ATIVOS\b", l) and "INATIVOS" not in l:
                sub = "ATV"
                nums = re.findall(r"(\d+)", l)
                if len(nums) >= 1 and prefix == "PRI_CTR":
                    metricas[f"{prefix}_ATIVOS"] = int(nums[-1])
                continue
            if re.match(r"\s*INATIVOS\b", l):
                sub = "INA"
                nums = re.findall(r"(\d+)", l)
                if len(nums) >= 1:
                    metricas[f"{prefix}_INATIVOS"] = int(nums[-1])
                continue

            tag_sub = f"{prefix}_{sub}" if sub else prefix

            if "CONTRATOS COM S" in l and "RIE" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_COM_SERIE"] = int(nums[-1])
            elif "CONTRATOS SEM S" in l and "RIE" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_SEM_SERIE"] = int(nums[-1])
            elif "C/COB FCVS" in l and "S/COB" not in l and "SO NA" not in l and "PROC" not in l and "NAO" not in l and "SEM" not in l and "COM RCV" not in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_COM_COB_FCVS"] = int(nums[-1])
            elif "S/COB FCVS" in l and "SO NA" not in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_SEM_COB_FCVS"] = int(nums[-1])
            elif "S/COB FCVS SO NA PRINCIPAL" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_SEM_COB_FCVS_SO_NA_PRINCIPAL"] = int(nums[-1])
            elif "C/COB FCVS SO NA PRINCIPAL" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_COM_COB_FCVS_SO_NA_PRINCIPAL"] = int(nums[-1])
            elif "COM PREST. EMITIDA" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_COM_PREST_EMITIDA"] = int(nums[-1])
            elif "SEM PREST. EMITIDA" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_SEM_PREST_EMITIDA"] = int(nums[-1])
            elif "COM BAIXAS PROCESSADAS" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_COM_BAIXAS_PROCESSADAS"] = int(nums[-1])
            elif "DE C.R.I" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_COM_CRI"] = int(nums[-1])
            elif "COM COBRAN" in l and "DIFEREN" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_COM_COBR_DIF"] = int(nums[-1])
            elif "SEM COBRAN" in l and "DIFEREN" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_SEM_COBR_DIF"] = int(nums[-1])
            elif "ENVIADOS PARA SEGURADORA" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{prefix}_SEGURADORA"] = int(nums[-1])
            elif "COM CESS" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_COM_CESSAO"] = int(nums[-1])
            elif "PROCESSADA A HABILITACAO" in l and "NAO" not in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_COM_COB_FCVS_PROC_HAB"] = int(nums[-1])
            elif "NAO PROCESSADA A HABILITACAO" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_COM_COB_FCVS_NAO_PROC_HAB"] = int(nums[-1])
            elif "SEM RCV" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_SEM_RCV"] = int(nums[-1])
            elif "COM RCV" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{tag_sub}_COM_RCV"] = int(nums[-1])
            elif "RETORNO DO FCVS" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{prefix}_RETORNO_FCVS"] = int(nums[-1])
            elif "TOTAL DE CONTRATOS" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas["TOTAL_CONTRATOS"] = int(nums[-1])

        elif secao == "IMV":
            prefix = f"{base}_IMV" if base else "PRI_IMV"

            if "IMOVEIS CADASTRADOS" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{prefix}_CADASTRADOS"] = int(nums[-1])
            elif "VAGOS" in l and "RETOMADOS" not in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{prefix}_VAGOS"] = int(nums[-1])
            elif "NOVOS" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{prefix}_NOVOS"] = int(nums[-1])
            elif "RETOMADOS" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{prefix}_RETOMADOS"] = int(nums[-1])
            elif "OCUPADOS" in l and "ATIVOS" not in l and "INATIVOS" not in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{prefix}_OCUPADOS"] = int(nums[-1])
            elif "ATIVOS" in l and "INATIVOS" not in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{prefix}_ATIVOS"] = int(nums[-1])
            elif "INATIVOS" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{prefix}_INATIVOS"] = int(nums[-1])
            elif "S/COB FCVS" in l and "SO NA" not in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{prefix}_SEM_COB_FCVS"] = int(nums[-1])
            elif "S/COB FCVS SO NA PRINCIPAL" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{prefix}_SEM_COB_FCVS_SO_NA_PRINCIPAL"] = int(nums[-1])
            elif "C/COB FCVS" in l and "SO NA" not in l and "PROC" not in l and "NAO" not in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{prefix}_COM_COB_FCVS"] = int(nums[-1])
            elif "EXCLUIDOS" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas[f"{prefix}_EXCLUIDOS"] = int(nums[-1])
            elif "TOTAL DE IMOVEIS" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas["IMV_TOTAL"] = int(nums[-1])

        elif secao == "ORI":
            if "FINALIZACOES" in l:
                nums = re.findall(r"(\d+)", l)
                if nums: metricas["ORI_OPERACAO_CONCLUIDA_MES_REF"] = int(nums[-1])
            if "ANTES DO COMERCIAL" in l or "ANTES DO COMERCIAL" in l.upper():
                nums = re.findall(r"(\d+)", l)
                if nums: metricas["ORI_OPERACAO_APOS_AVALIACAO_MES_REF"] = int(nums[-1])
            if "COMERCIAL)" in l and "ANTES" not in l.upper():
                nums = re.findall(r"(\d+)", l)
                if nums: metricas["ORI_OPERACAO_APOS_ASSINATURA_CTR"] = int(nums[-1])

    for i, linha in enumerate(linhas):
        l = linha.strip()
        if "FINALIZACOES DE PROCESSO" in l:
            nums = re.findall(r"(\d+)", l)
            if not nums and i + 1 < len(linhas):
                nums = re.findall(r"(\d+)", linhas[i + 1].strip())
            if nums: metricas["ORI_OPERACAO_CONCLUIDA_MES_REF"] = int(nums[-1])
        if "ANTES DO COMERCIAL" in l:
            nums = re.findall(r"(\d+)", l)
            if not nums and i + 1 < len(linhas):
                nums = re.findall(r"(\d+)", linhas[i + 1].strip())
            if nums: metricas["ORI_OPERACAO_APOS_AVALIACAO_MES_REF"] = int(nums[-1])
        if "COMERCIAL)" in l and "ANTES" not in l:
            nums = re.findall(r"(\d+)", l)
            if not nums and i + 1 < len(linhas):
                nums = re.findall(r"(\d+)", linhas[i + 1].strip())
            if nums: metricas["ORI_OPERACAO_APOS_ASSINATURA_CTR"] = int(nums[-1])

    norm = dict(metricas)
    if "PRI_CTR_ATIVOS" not in norm and "PRI_CTR_ATV_ATIVOS" in norm:
        norm["PRI_CTR_ATIVOS"] = norm["PRI_CTR_ATV_ATIVOS"]

    return info, norm, pd.DataFrame()
