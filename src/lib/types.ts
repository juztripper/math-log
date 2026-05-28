export interface ContentPage {
  id: string;
  title: string;
  icon: string;
  slug: string;
  ano: string;
  tema: string;
  subtema: string;
  status: string;
  date: string | null;
  url: string;
  ordem: number | null;
}

export interface ThemeGroup {
  name: string;
  color: string;
  subtemas: SubtemaGroup[];
}

export interface SubtemaGroup {
  name: string;
  pages: ContentPage[];
}

export interface YearData {
  ano: string;
  slug: string;
  themes: ThemeGroup[];
  totalPages: number;
}

export const THEME_COLORS: Record<string, string> = {
  "Modelos Matemáticos para a Cidadania": "#059669",
  "Estatística": "#d97706",
  "Geometria Sintética no Plano": "#7c3aed",
  "Funções": "#e11d48",
  "Geometria Analítica": "#0284c7",
  "Trigonometria e Funções Trigonométricas": "#dc2626",
  "Produto Escalar": "#2563eb",
  "Sucessões Progressões Aritméticas e Geométricas": "#4f46e5",
  "Contagem": "#db2777",
};

export const THEME_ICONS: Record<string, string> = {
  "Modelos Matemáticos para a Cidadania": "🏛️",
  "Estatística": "📊",
  "Geometria Sintética no Plano": "📐",
  "Funções": "📈",
  "Geometria Analítica": "🧭",
  "Trigonometria e Funções Trigonométricas": "🔺",
  "Produto Escalar": "↗️",
  "Sucessões Progressões Aritméticas e Geométricas": "🔢",
  "Contagem": "🧮",
  "Funções Polinomiais e Racionais": "〰️",
  "Cálculo Diferencial": "⚡",
};

export const ANO_SLUGS: Record<string, string> = {
  "10º Ano": "10-ano",
  "11º Ano": "11-ano",
};

export const SLUG_TO_ANO: Record<string, string> = {
  "10-ano": "10º Ano",
  "11-ano": "11º Ano",
};

export const ANO_DB: Record<string, string> = {
  "10-ano": "10",
  "11-ano": "11",
};

