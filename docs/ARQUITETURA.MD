# Guia de Arquitetura — Next.js Project

> Baseado na arquitetura real do HobbyMap. Adaptado para um projeto single Next.js (sem monorepo).

---

## Princípio Fundamental

```
lógica   → hooks      (toda regra de negócio, fetch, validação, transformação)
render   → componente (só JSX, sem useState de dados, sem fetch, sem lógica)
api      → services   (abstração de toda comunicação HTTP)
texto    → strings.ts (todo texto visível ao usuário em um único lugar)
visual   → theme/     (todo valor de design como constante nomeada)
contrato → types/     (todos os tipos de domínio em um lugar)
```

> Se você está escrevendo lógica dentro de um componente → está errado. Mova para um hook.
> Se você está escrevendo um texto literal em JSX → está errado. Mova para `strings.ts`.
> Se você está escrevendo `fetch()` direto → está errado. Mova para um service.

---

## Estrutura de Pastas

```
meu-projeto/
├── app/                          # Next.js App Router (só wrappers finos)
│   ├── layout.tsx                # Root layout com providers globais
│   ├── globals.css               # CSS variables do design system
│   ├── not-found.tsx
│   └── (main)/                   # Route group do app principal
│       ├── layout.tsx            # Layout com Header/Footer
│       ├── page.tsx              # Home → chama <HomeScreen />
│       └── [feature]/
│           └── page.tsx          # → chama <FeatureScreen />
│
├── src/
│   ├── components/
│   │   ├── ui/                   # Primitivos sem domínio
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Card/
│   │   │   ├── Badge/
│   │   │   ├── Spinner/
│   │   │   └── Avatar/
│   │   │
│   │   ├── cards/                # Cards de entidades do domínio
│   │   │   ├── entity/           # Cards de dados reais
│   │   │   │   ├── UserCard/
│   │   │   │   └── ProductCard/
│   │   │   ├── skeleton/         # Loading skeletons dos cards
│   │   │   │   └── SkeletonUserCard/
│   │   │   └── ui/               # Cards genéricos de UI
│   │   │       ├── StatsCard/
│   │   │       └── DashboardCard/
│   │   │
│   │   ├── features/             # Features completas (telas grandes)
│   │   │   └── NomeFeature/
│   │   │       ├── NomeFeature.tsx
│   │   │       ├── NomeFeature.module.css
│   │   │       ├── components/   # Sub-componentes da feature
│   │   │       ├── modals/       # Modais específicos da feature
│   │   │       └── index.ts
│   │   │
│   │   ├── shared/               # Componentes reutilizáveis cross-feature
│   │   │   ├── EmptyState/
│   │   │   ├── LoadingState/
│   │   │   ├── SectionTitle/
│   │   │   └── Skeleton/
│   │   │
│   │   ├── modals/               # Modais globais organizados por propósito
│   │   │   ├── feedback/         # ConfirmModal, WarningModal, SuccessModal
│   │   │   ├── forms/            # Modais de formulário (AddItemModal, EditModal)
│   │   │   ├── pickers/          # Seletores (DatePicker, LocationPicker)
│   │   │   └── viewers/          # Visualizadores (ImageViewer, DetailViewer)
│   │   │
│   │   └── layout/               # Estrutura de página
│   │       ├── Header/
│   │       ├── Footer/
│   │       └── Sidebar/
│   │
│   ├── screens/                  # Camada de fetch + skeleton + error
│   │   └── NomeScreen/
│   │       ├── NomeScreen.tsx
│   │       ├── NomeScreen.module.css
│   │       └── index.ts
│   │
│   ├── hooks/                    # Toda a lógica React
│   │   ├── shared/               # Hooks utilitários reutilizáveis
│   │   │   ├── useDebounce.ts
│   │   │   ├── useAsyncData.ts
│   │   │   ├── useIsMobile.ts
│   │   │   └── useLocalStorage.ts
│   │   └── [dominio]/            # Hooks por domínio de negócio
│   │       ├── useNomeScreen.ts
│   │       ├── useNomeForm.ts
│   │       └── useNomeTab.ts
│   │
│   ├── services/                 # Abstração de API (um arquivo por domínio)
│   │   ├── api.ts                # Instância axios + interceptors
│   │   ├── userService.ts
│   │   ├── productService.ts
│   │   └── index.ts
│   │
│   ├── types/                    # Contratos de dados por domínio
│   │   ├── user/
│   │   │   └── index.ts
│   │   ├── product/
│   │   │   └── index.ts
│   │   └── shared/               # ApiResponse<T>, PaginatedResponse<T>
│   │       └── index.ts
│   │
│   ├── constants/
│   │   ├── strings.ts            # TODO texto de UI em um lugar
│   │   ├── icons.ts              # Mapeamento centralizado de ícones
│   │   └── routes.ts             # Todas as rotas como constantes
│   │
│   ├── theme/                    # Design tokens (valores visuais)
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   ├── shadows.ts
│   │   ├── radius.ts
│   │   ├── sizing.ts
│   │   ├── animation.ts
│   │   ├── breakpoints.ts
│   │   ├── zIndex.ts
│   │   └── index.ts
│   │
│   ├── utils/                    # Funções puras de transformação
│   │   ├── formatters/           # Formatação (data, moeda, telefone)
│   │   ├── mappers/              # backend → display (por domínio)
│   │   ├── validation/           # Validação de formulários (por domínio)
│   │   └── errors/               # Error handling
│   │
│   ├── contexts/                 # React Context (estado global de UI)
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   ├── lib/                      # Utilitários de infraestrutura
│   │   └── axios.ts
│   │
│   └── styles/
│       └── globals.css           # CSS variables do design system
│
└── public/                       # Assets estáticos
```

---

## As 3 Camadas de uma Tela

```
app/feature/page.tsx        → Wrapper fino. ~5 linhas. Zero lógica, zero styles.
screens/FeatureScreen/      → Busca dados, skeleton, error, back.
features/FeatureView/       → UI pura. Recebe props. Zero fetch. Zero router.
```

```typescript
// CAMADA 1 — app/feature/page.tsx
export default function FeaturePage() {
  return <FeatureScreen />;
}

// CAMADA 2 — src/screens/FeatureScreen/FeatureScreen.tsx
export default function FeatureScreen() {
  const { data, loading, error } = useFeatureScreen();

  if (loading) return <SkeletonFeature />;
  if (error || !data) return <ErrorState />;

  return <FeatureView data={data} />;
}

// CAMADA 3 — src/components/features/Feature/FeatureView.tsx
export default function FeatureView({ data }: FeatureViewProps) {
  // ZERO fetch. ZERO router. ZERO useState de dados.
  return (
    <div className={styles.container}>
      <SectionA value={data.title} />
      <SectionB items={data.items} />
    </div>
  );
}
```

**Regra:** cada camada tem uma e somente uma responsabilidade. A rota não sabe que existe um skeleton. A screen não sabe que existe um `<SectionA>`. O view não sabe que existe uma API.

---

## Componentes — Estrutura Obrigatória

Todo componente segue a mesma estrutura:

```
ComponentName/
├── ComponentName.tsx           # Componente
├── ComponentName.module.css    # Styles (SEMPRE separado — nunca inline)
├── ComponentName.types.ts      # Se tiver mais de 5 interfaces
└── index.ts                    # Barrel export obrigatório
```

```typescript
// index.ts — sempre assim
export { default } from './ComponentName';
// ou
export { ComponentName } from './ComponentName';
```

**Ordem de imports obrigatória:**
```typescript
// 1. React
// 2. Bibliotecas externas (next/navigation, axios, etc.)
// 3. Componentes UI internos (@/src/components/ui)
// 4. Contexts
// 5. Hooks
// 6. Types (import type)
// 7. Arquivos locais (styles, types, utils)
```

**Quando criar subcomponente:**
- Seção com 50+ linhas de JSX
- Usado em 2+ lugares
- Tem lógica própria

Não criar subcomponente para JSX < 30 linhas ou uso único simples.

---

## Hooks — O Cérebro da Aplicação

### Nomenclatura por responsabilidade

| Sufixo | O que faz | Exemplo |
|--------|-----------|---------|
| `useXxxScreen` | Orquestra dados + estado UI de uma tela | `useProductDetailScreen` |
| `useXxxForm` | Estado de formulário + validação + submit | `useProductForm` |
| `useXxxTab` | Lista filtrável dentro de uma tab | `useProductsTab` |
| `useXxxData` | Só carrega dados, sem ações | `useProductData` |
| `useXxxCardData` | Transforma dados para display em card | `useProductCardData` |
| `useXxxManager` | Wrapper fino sobre Context | `useCartManager` |
| `useXxxModal` | Estado e ações de um modal | `useDeleteModal` |

### Interface padrão de um hook

```typescript
// hooks/product/useProductScreen.ts

export interface UseProductScreenOptions {
  id?: number;
  onSuccess?: () => void;        // navegação — responsabilidade do componente
  onError?: (msg: string) => void;
}

export interface UseProductScreenReturn {
  data: ProductDetail | null;
  loading: boolean;
  isSaving: boolean;
  handleSave: (data: ProductFormData) => Promise<void>;
  handleDelete: () => Promise<void>;
}

export function useProductScreen(options: UseProductScreenOptions): UseProductScreenReturn {
  // toda a lógica aqui
}
```

### O que VAI no hook vs o que FICA no componente

| No hook | No componente |
|---------|---------------|
| `useState` de dados/formulário | JSX |
| `useEffect` de fetch | Styles |
| `useMemo` de filtros/validação | Navegação (router) |
| `handleSave`, `handleDelete` | Feedback (alert, toast) |
| Transformação form → payload | Modais (show/hide) |
| Formatação para display | Animações |

---

## Services — Abstração de API

Nunca use `fetch()` ou `axios` direto em componente ou hook.

```typescript
// ❌ Nunca
const res = await fetch('/api/products');

// ✅ Sempre
const products = await productService.list();
```

### Estrutura de um service

```typescript
// src/services/productService.ts
import api from './api';
import type { Product, ProductCreateData, ProductUpdateData } from '@/src/types/product';

export const productService = {
  list: () =>
    api.get<Product[]>('/products/').then(r => r.data),

  getById: (id: number) =>
    api.get<Product>(`/products/${id}/`).then(r => r.data),

  create: (data: ProductCreateData) =>
    api.post<Product>('/products/', data).then(r => r.data),

  update: (id: number, data: ProductUpdateData) =>
    api.patch<Product>(`/products/${id}/`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/products/${id}/`),
};
```

```typescript
// src/services/api.ts — instância centralizada
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Interceptor de auth
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

---

## Types — Contratos de Dados

### Três níveis para cada entidade

```typescript
// types/product/index.ts

// Nível 1: shape da API (o que vem do backend)
export interface ProductAPI {
  id: number;
  name: string;
  price_cents: number;       // snake_case do backend
  created_at: string;
  category_id: number;
}

// Nível 2: tipo interno da aplicação (camelCase, processado)
export interface Product {
  id: number;
  name: string;
  priceCents: number;
  createdAt: Date;
  categoryId: number;
}

// Nível 3: tipo de display (o que o card/tela precisa mostrar)
export interface ProductCardData {
  id: number;
  title: string;
  priceFormatted: string;    // "R$ 29,90"
  categoryLabel: string;
}
```

### Tipos que podem ser locais (no arquivo do componente)

```typescript
// Props de componente → local ok
interface ProductCardProps {
  data: ProductCardData;
  onPress: () => void;
}

// Estado de UI puro → local ok
const [isMenuOpen, setIsMenuOpen] = useState(false);
const [activeTab, setActiveTab] = useState<'info' | 'reviews'>('info');

// Contrato de hook → local ok
interface UseProductFormReturn { ... }
```

---

## Design System — Tokens Visuais

Nenhum valor visual hardcoded em componente. Tudo como constante nomeada.

```typescript
// ❌ Nunca
padding: 16px
border-radius: 12px
color: #6366f1
font-size: 14px

// ✅ Sempre
padding: var(--spacing-lg)
border-radius: var(--radius-md)
color: var(--color-primary)
font-size: var(--font-size-sm)
```

### theme/spacing.ts — Grid de 8px

```typescript
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
  '5xl': 64,
} as const;
```

### theme/colors.ts

```typescript
export const colors = {
  primary:   '#6366f1',
  secondary: '#2F2F2F',
  success:   '#22c55e',
  error:     '#ef4444',
  warning:   '#f59e0b',

  gray50:  '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
} as const;
```

### theme/typography.ts

```typescript
export const FONT_SIZE = {
  xs:   12,
  sm:   14,
  base: 16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const FONT_WEIGHT = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
} as const;
```

### theme/shadows.ts — Opacidade consistente (0.10–0.18)

```typescript
export const SHADOWS = {
  sm: '0 1px 3px rgba(0,0,0,0.10)',
  md: '0 4px 6px rgba(0,0,0,0.12)',
  lg: '0 10px 15px rgba(0,0,0,0.14)',
  xl: '0 20px 25px rgba(0,0,0,0.16)',
} as const;
```

### theme/radius.ts

```typescript
export const RADIUS = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;
```

### globals.css — CSS Variables (o que o CSS consome)

```css
:root {
  /* Spacing */
  --spacing-xs:  4px;
  --spacing-sm:  8px;
  --spacing-md:  12px;
  --spacing-lg:  16px;
  --spacing-xl:  20px;
  --spacing-2xl: 24px;
  --spacing-3xl: 32px;

  /* Colors */
  --color-primary:   #6366f1;
  --color-secondary: #2F2F2F;
  --color-success:   #22c55e;
  --color-error:     #ef4444;
  --color-warning:   #f59e0b;

  --color-gray-50:  #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;

  /* Typography */
  --font-size-xs:   12px;
  --font-size-sm:   14px;
  --font-size-base: 16px;
  --font-size-lg:   18px;
  --font-size-xl:   20px;
  --font-size-2xl:  24px;

  /* Radius */
  --radius-xs:   4px;
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.10);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.12);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.14);
  --shadow-xl: 0 20px 25px rgba(0,0,0,0.16);

  /* Z-index */
  --z-dropdown: 100;
  --z-sticky:   200;
  --z-modal:    300;
  --z-toast:    400;
  --z-tooltip:  500;

  /* Grid */
  --grid-margin:  32px;
  --grid-gutter:  16px;

  /* Layout */
  --header-height: 64px;
}

@media (max-width: 1024px) {
  :root { --grid-margin: 24px; }
}

@media (max-width: 768px) {
  :root { --grid-margin: 16px; }
}
```

---

## STRINGS — Todo Texto de UI em Um Lugar

```typescript
// src/constants/strings.ts

export const STRINGS = {
  actions: {
    save:    'Salvar',
    cancel:  'Cancelar',
    edit:    'Editar',
    delete:  'Excluir',
    back:    'Voltar',
    add:     'Adicionar',
    create:  'Criar',
    close:   'Fechar',
    loading: 'Carregando...',
    saving:  'Salvando...',
    confirm: 'Confirmar',
  },

  product: {
    title:       'Produtos',
    empty: {
      title:    'Nenhum produto encontrado',
      subtitle: 'Tente ajustar os filtros',
    },
    detail: {
      title:       'Detalhe do Produto',
      price:       'Preço',
      category:    'Categoria',
      description: 'Descrição',
    },
    form: {
      namePlaceholder:  'Nome do produto',
      pricePlaceholder: 'Preço',
      saveSuccess:      'Produto salvo com sucesso',
      saveError:        'Erro ao salvar produto',
      deleteConfirm:    (name: string) => `Excluir "${name}"?`,
    },
    search: {
      placeholder: 'Buscar produtos...',
    },
  },

  auth: {
    login: {
      title:             'Entrar',
      emailPlaceholder:  'seu@email.com',
      passwordPlaceholder: 'Senha',
      submitButton:      'Entrar',
      forgotPassword:    'Esqueci a senha',
      noAccount:         'Não tem conta?',
      signupLink:        'Criar conta',
      errorInvalid:      'Email ou senha incorretos',
    },
    signup: {
      title:      'Criar Conta',
      hasAccount: 'Já tem conta?',
      loginLink:  'Entrar',
    },
  },

  errors: {
    generic:     'Algo deu errado. Tente novamente.',
    notFound:    'Página não encontrada.',
    unauthorized:'Você não tem permissão para isso.',
    network:     'Sem conexão. Verifique sua internet.',
  },
} as const;
```

**Regras:**
- Zero strings literais em JSX — sempre `STRINGS.dominio.chave`
- Strings com parâmetro são funções: `STRINGS.product.form.deleteConfirm(name)`
- Strings genéricas ficam em `STRINGS.actions.*`
- Organizado por domínio/tela, não por tipo de string

---

## Utils — Transformações Puras

### Mappers — backend → display

```typescript
// utils/mappers/product/productCardMappers.ts
import type { ProductAPI, ProductCardData } from '@/src/types/product';

export function mapProductCardData(product: ProductAPI): ProductCardData {
  return {
    id:             product.id,
    title:          product.name,
    priceFormatted: formatCurrency(product.price_cents),
    categoryLabel:  product.category_id.toString(), // ou lookup
  };
}
```

### Formatters

```typescript
// utils/formatters/currency.ts
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

// utils/formatters/date.ts
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(dateStr));
}
```

### Validation

```typescript
// utils/validation/productValidation.ts
import type { ProductFormData } from '@/src/types/product';

export interface ProductValidationErrors {
  name?: string;
  price?: string;
}

export function validateProduct(data: ProductFormData): ProductValidationErrors {
  const errors: ProductValidationErrors = {};
  if (!data.name.trim())         errors.name  = 'Nome é obrigatório';
  if (data.priceCents <= 0)      errors.price = 'Preço deve ser maior que zero';
  return errors;
}

export function isProductValid(data: ProductFormData): boolean {
  return Object.keys(validateProduct(data)).length === 0;
}
```

---

## Modais — Organização por Propósito

```
modals/
├── feedback/       → ConfirmModal, WarningModal, SuccessModal
├── forms/          → CreateProductModal, EditUserModal
├── pickers/        → DatePickerModal, CategoryPickerModal
└── viewers/        → ImageViewerModal, DetailPreviewModal
```

**Padrão de uso:**
- Desktop: `<Modal>` (dialog centralizado)
- Mobile (≤768px): bottom sheet

```typescript
// Abrir modal sempre via estado local ou hook dedicado
const [isConfirmOpen, setIsConfirmOpen] = useState(false);

// Ou hook de modal
const { isOpen, open, close } = useDeleteModal();
```

---

## Routing — Rotas como Constantes

```typescript
// src/constants/routes.ts
export const ROUTES = {
  HOME:              '/',
  PRODUCT:      (id: number) => `/product/${id}`,
  PRODUCT_EDIT: (id: number) => `/product/${id}/edit`,
  PRODUCT_NEW:       '/product/new',
  PROFILE:           '/profile',
  PROFILE_EDIT:      '/profile/edit',
  AUTH: {
    LOGIN:  '/login',
    SIGNUP: '/signup',
  },
} as const;
```

```typescript
// Uso no componente
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/src/constants/routes';

const router = useRouter();
router.push(ROUTES.PRODUCT(product.id));
```

---

## Icons — Mapeamento Centralizado

```typescript
// src/constants/icons.ts
// Fonte única de verdade para nomes de ícone
// Evita magic strings espalhadas pelo código

export const ICONS = {
  // Navigation
  home:          'fa-house',
  back:          'fa-arrow-left',
  close:         'fa-xmark',
  menu:          'fa-bars',

  // Actions
  edit:          'fa-pen',
  delete:        'fa-trash',
  add:           'fa-plus',
  save:          'fa-check',
  search:        'fa-magnifying-glass',
  filter:        'fa-sliders',

  // State
  loading:       'fa-spinner',
  error:         'fa-triangle-exclamation',
  success:       'fa-circle-check',
  empty:         'fa-inbox',

  // Content
  image:         'fa-image',
  document:      'fa-file',
  user:          'fa-user',
  star:          'fa-star',
  location:      'fa-location-dot',
  calendar:      'fa-calendar',
  clock:         'fa-clock',
  chevronRight:  'fa-chevron-right',
  chevronDown:   'fa-chevron-down',
} as const;

export type IconKey = keyof typeof ICONS;
```

---

## Checklist — Antes de Entregar

### Componente
- [ ] Zero `useState` de dados? (só UI state — modal open, tab ativa)
- [ ] Zero `useEffect` de fetch?
- [ ] Zero `handleSave`, validação, transformação?
- [ ] Chama hook que retorna o que precisa e só renderiza?
- [ ] Tem `index.ts` com barrel export?
- [ ] Styles em `.module.css` separado?

### Hook
- [ ] Toda lógica de negócio está aqui?
- [ ] Retorna dados + handlers + estado de loading?
- [ ] Usa service para comunicação com API?
- [ ] Tem interface `UseXxxReturn` tipada?

### Types
- [ ] Types de domínio em `src/types/`?
- [ ] Apenas `XxxProps` e estado de UI são locais?
- [ ] Três níveis quando necessário (API / App / Display)?

### Strings
- [ ] Zero texto literal em JSX?
- [ ] Tudo vem de `STRINGS.dominio.chave`?
- [ ] Strings novas adicionadas em `strings.ts` no domínio correto?

### Visual
- [ ] Zero valores hardcoded? (`16px` → `var(--spacing-lg)`)
- [ ] Cores via CSS variables ou `colors`?
- [ ] Shadows, radius, typography todos como tokens?

### Services
- [ ] Zero `fetch()` direto em componente ou hook?
- [ ] Todo HTTP passa por um service?
- [ ] Service centralizado em `src/services/`?

---

## Git Workflow

```
main     → produção
staging  → homologação
feat/*   → features em desenvolvimento
fix/*    → correções
ui/*     → melhorias visuais
```

**Fluxo:**
```
1. git checkout main && git pull
2. git checkout -b feat/nome-da-feature
3. Desenvolver + push
4. Testar preview do Vercel
5. Merge em staging → testar
6. Merge em main → produção
```

**Nunca** push direto em `main` ou `staging`.

---

## Princípios Resumidos

1. **Componente não pensa** — só renderiza o que o hook retorna
2. **Hook é o cérebro** — toda lógica, fetch, validação, transformação
3. **Service é o canal** — toda API passa por aqui, nunca fetch direto
4. **Strings são constantes** — todo texto de UI em um lugar
5. **Tokens são lei** — nenhum valor visual hardcoded
6. **Types por domínio** — 3 níveis: API / App / Display
7. **Barrel exports em tudo** — imports limpos, refactor fácil
8. **Hierarquia de 3 camadas** — Rota → Screen → View
