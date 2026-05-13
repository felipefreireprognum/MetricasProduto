import pandas as pd

# FASE_MAP: por banco → código → (nome da fase, macrofase)
# Adicione novos bancos como chaves adicionais conforme necessário.
FASE_MAP: dict[str, dict[int, tuple[str, str]]] = {
    'c6': {
        0:    ('Fase inicial',                                           'Simulação'),
        1:    ('Proposta',                                               'Simulação'),
        50:   ('Cadastro da Proposta',                                   'Cadastro'),
        80:   ('Checklist - Crédito',                                    'Cadastro'),
        90:   ('Pendente Documentos - Crédito',                          'Cadastro'),
        100:  ('Análise de Crédito',                                     'Crédito'),
        101:  ('Crédito Reprovado',                                      'Crédito'),
        200:  ('Negociação Comercial',                                   'Negociação'),
        201:  ('Envio de documentos - Pasta',                            'Negociação'),
        202:  ('Regularizar Cadastro/Documentos para a Análise Documental', 'Negociação'),
        300:  ('Validação da Pasta',                                     'Análise de Documentos'),
        301:  ('Pendencia da Pasta',                                     'Análise de Documentos'),
        400:  ('Análise Técnica e da Garantia',                          'Análise Técnica'),
        401:  ('Laudo solicitado',                                       'Análise Técnica'),
        402:  ('Laudo em análise',                                       'Análise Técnica'),
        403:  ('Solicitação de Laudo',                                   'Análise Técnica'),
        404:  ('Laudo recusado',                                         'Análise Técnica'),
        405:  ('Laudo em revisão',                                       'Análise Técnica'),
        406:  ('Pendência do Laudo',                                     'Análise Técnica'),
        407:  ('Reanálise de Crédito',                                   'Análise Técnica'),
        408:  ('Divergência - Valor de avaliação',                       'Análise Técnica'),
        409:  ('Enquadrar proposta',                                     'Análise Técnica'),
        500:  ('Formalização',                                           'Formalização'),
        501:  ('Emissão de contrato',                                    'Formalização'),
        502:  ('Assinatura de contrato',                                 'Formalização'),
        503:  ('Confirmação de Valores',                                 'Formalização'),
        504:  ('Pendente - Emissão de Contrato',                         'Formalização'),
        505:  ('Analise Documental',                                     'Formalização'),
        600:  ('Registro do Contrato',                                   'Formalização'),
        601:  ('Pendente - Registro do Contrato',                        'Formalização'),
        700:  ('Liberação de Recursos',                                  'Liberação'),
        701:  ('Pendente - Liberação de Recursos',                       'Liberação'),
        800:  ('Operação Concluída',                                     'Concluído'),
        900:  ('Cliente Desistiu',                                       'Cancelada'),
        901:  ('Concorrente Santander',                                  'Cancelada'),
        902:  ('Concorrente Itaú',                                       'Cancelada'),
        903:  ('Concorrente Creditas',                                   'Cancelada'),
        904:  ('Concorrente - Cashme',                                   'Cancelada'),
        905:  ('Concorrente - Inter',                                    'Cancelada'),
        906:  ('Concorrente - Bradesco',                                 'Cancelada'),
        907:  ('Concorrente - Daycoval',                                 'Cancelada'),
        908:  ('Concorrente - Outro',                                    'Cancelada'),
        909:  ('Cond. N agrada - Prazo',                                 'Cancelada'),
        910:  ('Cond. N agrada - Valor aprov',                           'Cancelada'),
        911:  ('Cond. N agrada - Quitação Dívidas',                      'Cancelada'),
        912:  ('Cond. N agrada - Taxa/Prestação',                        'Cancelada'),
        913:  ('Cond. N agrada - Indexador',                             'Cancelada'),
        914:  ('Contato sem sucesso',                                    'Cancelada'),
        915:  ('N enviou docs',                                          'Cancelada'),
        916:  ('Participante não concorda',                              'Cancelada'),
        917:  ('Só simulando',                                           'Cancelada'),
        918:  ('Processo demorado',                                      'Cancelada'),
        919:  ('Vendeu imóvel',                                          'Cancelada'),
        920:  ('Outro Prod. - Fin. imob',                                'Cancelada'),
        921:  ('Outro prod. - Car Equity',                               'Cancelada'),
        922:  ('Outro Prod. - Refin',                                    'Cancelada'),
        923:  ('Outro Prod. - Fin. Veículos',                            'Cancelada'),
        924:  ('Outro Prod. - Consig',                                   'Cancelada'),
        925:  ('Outro Prod. - Outro',                                    'Cancelada'),
        926:  ('Imóvel - Sem Averbação',                                 'Cancelada'),
        927:  ('Imóvel - Sem habite-se',                                 'Cancelada'),
        928:  ('Imóvel - Multifamiliar',                                 'Cancelada'),
        929:  ('Imóvel - lq>=LTV',                                       'Cancelada'),
        930:  ('Jurídico - C/C Negada',                                  'Cancelada'),
        931:  ('Jurídico - Ação Judicial',                               'Cancelada'),
        932:  ('Jurídico - Cláusulas restritivas',                       'Cancelada'),
        933:  ('Jurídico - Não quita condicionante',                     'Cancelada'),
        934:  ('Laudo - Divergência Metragem Terreno',                   'Cancelada'),
        935:  ('Laudo - Imóvel misto',                                   'Cancelada'),
        936:  ('Laudo - Sem documentação exigência',                     'Cancelada'),
        937:  ('Distrato - Demora no Registro',                          'Cancelada'),
        938:  ('Proposta expirada',                                      'Cancelada'),
        1000: ('Proposta Cancelada',                                     'Cancelada'),
    },
}

_FALLBACK_FASE = ('Desconhecida', 'Desconhecida')

def _apply_fase_map(df: pd.DataFrame, banco: str) -> pd.DataFrame:
    fmap = FASE_MAP.get(banco, {})
    def _lookup(cod, idx):
        try:
            return fmap.get(int(cod), _FALLBACK_FASE)[idx]
        except Exception:
            return _FALLBACK_FASE[idx]
    df['NO_FASE']   = df['NU_FASE_OPERACAO'].apply(lambda x: _lookup(x, 0))
    df['MACROFASE'] = df['NU_FASE_OPERACAO'].apply(lambda x: _lookup(x, 1))
    return df
