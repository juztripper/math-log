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

// Ordem dos temas tal como definida no Notion (schema options order)
export const THEME_ORDER: Record<string, string[]> = {
  "10": [
    "Modelos Matemáticos para a Cidadania",
    "Estatística",
    "Geometria Sintética no Plano",
    "Funções",
    "Geometria Analítica",
  ],
  "11": [
    "Trigonometria e Funções Trigonométricas",
    "Produto Escalar",
    "Sucessões Progressões Aritméticas e Geométricas",
    "Contagem",
  ],
};

// Ordem dos subtemas tal como definida no Notion (schema options order)
export const SUBTEMA_ORDER: Record<string, string[]> = {
  "10": [
    "Modelos Matemáticos nas Eleições",
    "Modelos Matemáticos na Partilha",
    "Modelos Matemáticos em Finanças",
    "Introdução à Estatística",
    "Organização e Representação de Dados",
    "Medidas Estatísticas",
    "Dados Bivariados",
    "Pontos Notáveis do Triângulo",
    "Generalidades sobre Funções",
    "Funções Polinomiais de Grau ≤ 2",
    "Funções Definidas por Ramos",
    "Plano",
    "Espaço",
    "Vetores no Plano e no Espaço",
    "Reta de Euler",
    "Circunferência dos 9 Pontos",
    "Referencial Cartesiano",
    "Circunferência e Círculo",
    "Inequações no Plano",
    "Equação da Reta",
  ],
  "11": [
    "Ângulos e Razões Trigonométricas",
    "Redução ao 1.º Quadrante",
    "Funções Trigonométricas",
    "Declive e Inclinação de uma Reta",
    "Produto Escalar",
    "Equações de Planos no Espaço",
    "Sucessões",
    "Progressões Aritméticas",
    "Progressões Geométricas",
  ],
};
