import Link from "next/link";
import { notFound } from "next/navigation";
import { compareSubtema, compareTema, fetchDatabasePages } from "@/lib/notion";
import {
  SLUG_TO_ANO,
  ANO_DB,
  THEME_COLORS,
  THEME_ICONS,
  ContentPage,
  ThemeGroup,
  SubtemaGroup,
} from "@/lib/types";
import ThemeAccordion from "@/components/ThemeCard";

function buildThemes(dbKey: string, pages: ContentPage[]): ThemeGroup[] {
  const themeMap = new Map<string, Map<string, ContentPage[]>>();

  for (const page of pages) {
    const tema = page.tema || "Outros";
    const subtema = page.subtema || "Geral";
    if (!themeMap.has(tema)) themeMap.set(tema, new Map());
    const sub = themeMap.get(tema)!;
    if (!sub.has(subtema)) sub.set(subtema, []);
    sub.get(subtema)!.push(page);
  }

  const orderedTemas = Array.from(themeMap.keys()).sort((a, b) =>
    compareTema(dbKey, a, b)
  );

  return orderedTemas.map((tema) => {
    const subtemaMap = themeMap.get(tema)!;
    const orderedSubs = Array.from(subtemaMap.keys()).sort((a, b) =>
      compareSubtema(dbKey, a, b)
    );

    const subtemas: SubtemaGroup[] = orderedSubs.map((subtema) => {
      const pages = subtemaMap.get(subtema)!;
      pages.sort((a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity));
      return { name: subtema, pages };
    });

    return {
      name: tema,
      color: THEME_COLORS[tema] || "#6b7280",
      subtemas,
    };
  });
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { ano: string };
}) {
  const { ano } = await params;
  const label = SLUG_TO_ANO[ano];
  if (!label) return { title: "Não encontrado" };
  return {
    title: `${label} — math.log`,
    description: `Conteúdos de Matemática A do ${label}`,
  };
}

export default async function YearPage({
  params,
}: {
  params: { ano: string };
}) {
  const { ano } = await params;
  const label = SLUG_TO_ANO[ano];
  const dbKey = ANO_DB[ano] as "10" | "11";
  if (!label || !dbKey) notFound();

  const pages = await fetchDatabasePages(dbKey);
  const themes = buildThemes(dbKey, pages);

  return (
    <div className="year-page">
      <div className="year-page-header">
        <div className="year-page-breadcrumb">
          <Link href="/">math.log</Link>
          <span> / </span>
          <span>{label}</span>
        </div>
        <h1 className="year-page-title">{label}</h1>
        <p className="year-page-subtitle">
          Matemática A · {pages.length} conteúdos em {themes.length} temas
        </p>
      </div>

      {themes.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p>Ainda não há conteúdos disponíveis para este ano.</p>
        </div>
      )}

      <ThemeAccordion
        themes={themes.map((theme) => ({
          name: theme.name,
          icon: THEME_ICONS[theme.name] || "📚",
          color: theme.color,
          totalPages: theme.subtemas.reduce(
            (sum, s) => sum + s.pages.length,
            0
          ),
          subtemas: theme.subtemas.map((s) => ({
            name: s.name,
            pages: s.pages.map((p) => ({
              id: p.id,
              title: p.title,
              icon: p.icon,
              slug: p.slug,
            })),
          })),
        }))}
        anoSlug={ano}
      />
    </div>
  );
}
