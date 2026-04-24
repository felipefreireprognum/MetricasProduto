export interface BankTokens {
  bg: {
    base: string;
    surface: string;
    elevated: string;
    sidebar: string;
    input: string;
  };
  border: {
    default: string;
    subtle: string;
    focus: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  accent: {
    primary: string;
    primaryHover: string;
    yellow: string;
    yellowSubtle: string;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
    inset: string;
  };
  chart: string[];
  kpi: {
    danger: string;
    warning: string;
    success: string;
    info: string;
  };
  sidebar: {
    activeText: string;
    activeBg: string;
    activeBorder: string;
    hoverBg: string;
    text: string;
  };
}

const base: BankTokens = {
  bg: {
    base: '#F8F9FC',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    sidebar: '#FFFFFF',
    input: '#FFFFFF',
  },
  border: {
    default: '#E2E8F0',
    subtle: '#F1F5F9',
    focus: '#1A5FFF',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#94A3B8',
    inverse: '#FFFFFF',
  },
  accent: {
    primary: '#1A5FFF',
    primaryHover: '#0040CC',
    yellow: '#FFD93D',
    yellowSubtle: '#FFF9E6',
  },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    lg: '0 4px 8px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)',
    inset: 'inset 0 1px 2px rgba(0,0,0,0.05)',
  },
  chart: ['#1A5FFF', '#FFD93D', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
  kpi: {
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#22C55E',
    info: '#1A5FFF',
  },
  sidebar: {
    activeText: '#1A5FFF',
    activeBg: 'rgba(26,95,255,0.06)',
    activeBorder: '#1A5FFF',
    hoverBg: '#F8F9FC',
    text: '#64748B',
  },
};

export const bankTokens: Record<string, BankTokens> = {
  default: base,
  c6: base,
};
