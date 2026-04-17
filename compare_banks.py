import xml.etree.ElementTree as ET
from parsers.pdf_parser import carregar_pdf

# ---- XML (Sicredi) ----
tree   = ET.parse("documentosuteis/AG31")
campos = tree.getroot().find("CAMPOS")
xml_campos = {}
for e in campos:
    if e.tag != "FASES" and e.text:
        try:
            xml_campos[e.tag] = int(e.text.strip())
        except ValueError:
            xml_campos[e.tag] = e.text.strip()

# ---- PDF (C6 e Itau) ----
_, c6,   _ = carregar_pdf("documentosuteis/C6-AG31_022026.pdf")
_, itau, _ = carregar_pdf("documentosuteis/ITAU-AG31-itaufcvs.022026.pdf")

# ---- Comparativo ----
all_keys = sorted(set(list(xml_campos.keys()) + list(c6.keys()) + list(itau.keys())))
print(f"{'Campo':<50} {'Sicredi':>10} {'C6':>10} {'Itau':>10}  Status")
print("-" * 100)
for k in all_keys:
    sv = xml_campos.get(k, "---")
    cv = c6.get(k, "---")
    iv = itau.get(k, "---")
    status = ""
    if cv == "---" and k in xml_campos:
        status += " FALTA_C6"
    if iv == "---" and k in xml_campos:
        status += " FALTA_ITAU"
    if k not in xml_campos and (k in c6 or k in itau):
        status += " EXTRA_PDF"
    print(f"{k:<50} {str(sv):>10} {str(cv):>10} {str(iv):>10}  {status}")

print(f"\nSicredi: {len(xml_campos)} campos | C6: {len(c6)} campos | Itau: {len(itau)} campos")
