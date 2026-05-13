import {
  Layers,
  Scan,
  UserPlus,
  Landmark,
  MessageSquare,
  FileSearch,
  Wrench,
  FilePen,
  Stamp,
  PenLine,
  Unlock,
  type LucideIcon,
} from 'lucide-react';

export const MACROFASES = [
  { id: 'SimulaÃƒÂ§ÃƒÂ£o',              color: '#94A3B8' },
  { id: 'Cadastro',               color: '#3B82F6' },
  { id: 'CrÃƒÂ©dito',                color: '#8B5CF6' },
  { id: 'NegociaÃƒÂ§ÃƒÂ£o',             color: '#F59E0B' },
  { id: 'AnÃƒÂ¡lise de Documentos',  color: '#EC4899' },
  { id: 'AnÃƒÂ¡lise TÃƒÂ©cnica',        color: '#F97316' },
  { id: 'EmissÃƒÂ£o de Contrato',    color: '#059669' },
  { id: 'FormalizaÃƒÂ§ÃƒÂ£o',           color: '#10B981' },
  { id: 'LiberaÃƒÂ§ÃƒÂ£o',              color: '#06B6D4' },
  { id: 'ConcluÃƒÂ­do',              color: '#16A34A' },
  { id: 'Cancelada',              color: '#EF4444' },
  { id: 'Registro de Contrato',   color: '#34D399' },
  { id: 'Registro de Contratos',  color: '#06B6D4' },
];

export const POS_EMISSAO_IDS = new Set(['FormalizaÃƒÂ§ÃƒÂ£o', 'LiberaÃƒÂ§ÃƒÂ£o', 'Registro de Contratos']);

export const MACROFASE_ICONS: Record<string, LucideIcon> = {
  'SimulaÃƒÂ§ÃƒÂ£o':             Scan,
  'Cadastro':              UserPlus,
  'CrÃƒÂ©dito':               Landmark,
  'NegociaÃƒÂ§ÃƒÂ£o':            MessageSquare,
  'AnÃƒÂ¡lise de Documentos': FileSearch,
  'AnÃƒÂ¡lise TÃƒÂ©cnica':       Wrench,
  'EmissÃƒÂ£o de Contrato':   FilePen,
  'Registro de Contrato':  Stamp,
  'FormalizaÃƒÂ§ÃƒÂ£o':          PenLine,
  'LiberaÃƒÂ§ÃƒÂ£o':             Unlock,
  'Registro de Contratos': Unlock,
};

export const FALLBACK_MACROFASE_ICON = Layers;
