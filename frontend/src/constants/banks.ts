export interface BankConfig {
  id: string;
  name: string;
  fullName: string;
  dbType: string;
  ambiente: string;
  apiPrefix: string;
  enabled: boolean;
  colors: {
    bg: string;
    text: string;
    accent: string;
    badge: string;
  };
}

export const BANKS: BankConfig[] = [
  {
    id: 'c6',
    name: 'C6 Bank',
    fullName: 'C6 Bank',
    dbType: 'Firebird',
    ambiente: process.env.NEXT_PUBLIC_C6_AMBIENTE || '/u10/c6bank/dados/scci.gdb',
    apiPrefix: '',
    enabled: true,
    colors: {
      bg: '#0D0D0D',
      text: '#FFFFFF',
      accent: '#FF6B35',
      badge: '#FF6B35',
    },
  },
  {
    id: 'sicoob',
    name: 'Sicoob',
    fullName: 'Sicoob',
    dbType: 'Firebird',
    ambiente: '',
    apiPrefix: '',
    enabled: false,
    colors: {
      bg: '#003641',
      text: '#FFFFFF',
      accent: '#00AE9D',
      badge: '#00AE9D',
    },
  },
  {
    id: 'cfae',
    name: 'CFAE',
    fullName: 'CFAE',
    dbType: 'A definir',
    ambiente: '',
    apiPrefix: '',
    enabled: false,
    colors: {
      bg: '#1E3A5F',
      text: '#FFFFFF',
      accent: '#4A90D9',
      badge: '#4A90D9',
    },
  },
  {
    id: 'inter',
    name: 'Inter',
    fullName: 'Banco Inter',
    dbType: 'SQL Server',
    ambiente: '',
    apiPrefix: '/inter',
    enabled: false,
    colors: {
      bg: '#FF8700',
      text: '#FFFFFF',
      accent: '#FFFFFF',
      badge: '#FF8700',
    },
  },
];
