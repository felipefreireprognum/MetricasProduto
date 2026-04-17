export const STRINGS = {
  app: {
    name: 'Métricas AG31',
    subtitle: 'SCCI / FCVS',
  },

  login: {
    title: 'Métricas AG31',
    subtitle: 'SCCI / FCVS — Acesso ao Sistema',
    loginLabel: 'Usuário (SSH)',
    loginPlaceholder: 'ex: felipe.freire',
    senhaLabel: 'Senha',
    senhaPlaceholder: '••••••••',
    ambienteLabel: 'Ambiente (caminho do banco)',
    ambientePlaceholder: 'ex: /u10/c6bank/dados/scci.gdb',
    submit: 'Conectar',
    connecting: 'Conectando...',
    errorTitle: 'Erro de conexão',
    successTitle: 'Conectado com sucesso',
  },

  nav: {
    dashboard: 'Dashboard',
    ag31: 'AG31',
    comparativo: 'Comparativo',
    logout: 'Sair',
  },

  dashboard: {
    title: 'Dashboard',
    subtitle: 'Operações em tempo real',
    tabela: 'Tabela',
    carregando: 'Carregando dados...',
    semDados: 'Nenhum dado encontrado',
    selecioneTabela: 'Selecione uma tabela',
    limite: 'Limite de registros',
    sqlCustom: 'SQL Customizado',
    executar: 'Executar',
    charts: {
      operacoesPorFase: 'Operações por Fase',
      volumePorData: 'Volume por Data',
      tempoMedioPorFase: 'Tempo Médio por Fase (dias)',
      topUsuarios: 'Top Usuários',
      distribuicaoFases: 'Distribuição de Fases',
    },
  },

  ag31: {
    title: 'AG31',
    subtitle: 'Relatório mensal SCCI',
    upload: 'Carregar arquivo',
    banco: 'Banco',
    periodo: 'Período',
    baseContratos: 'Base Contratos',
    basePrincipal: 'Base Principal',
    baseFinalizados: 'Base Finalizados',
    imoveis: 'Imóveis',
    originacao: 'Originação',
  },

  comparativo: {
    title: 'Comparativo de Bancos',
    subtitle: 'Sicredi × C6 Bank × Itaú',
    campo: 'Campo',
    sicredi: 'Sicredi',
    c6: 'C6 Bank',
    itau: 'Itaú',
    status: 'Status',
    faltaC6: 'Falta C6',
    faltaItau: 'Falta Itaú',
    extraPdf: 'Extra PDF',
    ok: 'OK',
  },

  errors: {
    generic: 'Ocorreu um erro inesperado.',
    network: 'Erro de rede. Verifique a conexão.',
    unauthorized: 'Credenciais inválidas.',
    notFound: 'Recurso não encontrado.',
  },

  states: {
    loading: 'Carregando...',
    empty: 'Nenhum dado disponível.',
    error: 'Erro ao carregar dados.',
    retry: 'Tentar novamente',
  },
} as const;
