import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPageBySlug, getAllSlugs, slugify } from "@/lib/notion";
import { SLUG_TO_ANO, ANO_DB, THEME_COLORS } from "@/lib/types";
import NotionContent from "@/components/NotionRenderer";
import ContentBar from "@/components/ContentBar";

export const dynamicParams = true;

export function generateStaticParams() {
  try {
    const slugs = getAllSlugs();
    return slugs.map(({ ano, slug }) => ({ ano, slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { ano: string; slug: string };
}) {
  const { ano, slug } = await params;
  const label = SLUG_TO_ANO[ano];
  const dbKey = ANO_DB[ano] as "10" | "11";
  if (!label || !dbKey) return { title: "Não encontrado" };

  const data = fetchPageBySlug(dbKey, slug);
  if (!data) return { title: "Não encontrado" };

  return {
    title: `${data.page.title} — ${label} — math.log`,
    description: `${data.page.title} — ${data.page.subtema} — ${data.page.tema}`,
  };
}

export default async function ContentPageRoute({
  params,
}: {
  params: { ano: string; slug: string };
}) {
  const { ano, slug } = await params;
  const label = SLUG_TO_ANO[ano];
  const dbKey = ANO_DB[ano] as "10" | "11";
  if (!label || !dbKey) notFound();

  const data = fetchPageBySlug(dbKey, slug);
  if (!data) notFound();

  const { page, blocks, nav } = data;
  const themeColor = THEME_COLORS[page.tema] || "#6b7280";
  const themeHash = `#tema-${slugify(page.tema)}`;

  return (
    <>
      <ContentBar
        anoSlug={ano}
        anoLabel={label}
        tema={page.tema}
        themeColor={themeColor}
        themeHash={themeHash}
        pageTitle={page.title}
        pageIcon={page.icon}
      />
      <article className="content-page">
      <nav className="content-breadcrumb">
        <Link href="/">math.log</Link>
        <span className="sep">/</span>
        <Link href={`/${ano}${themeHash}`}>{label}</Link>
        <span className="sep">/</span>
        <Link href={`/${ano}${themeHash}`}>{page.tema}</Link>
        <span className="sep">/</span>
        <span>{page.title}</span>
      </nav>

      <header className="content-header">
        <div
          className="content-theme-tag"
          style={{
            background: `${themeColor}12`,
            color: themeColor,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: themeColor,
              display: "inline-block",
            }}
          />
          {page.subtema}
        </div>
        <h1 className="content-title">
          {page.icon} {page.title}
        </h1>
      </header>

      <NotionContent blocks={blocks} />

      {/* Prev / Next navigation */}
      <nav className="content-nav">
        {nav.prev ? (
          <Link href={`/${ano}/${nav.prev.slug}`} className="content-nav-link content-nav-prev">
            <span className="content-nav-direction">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="10 4 6 8 10 12" />
              </svg>
              Anterior
            </span>
            <span className="content-nav-title">
              <span className="content-nav-icon">{nav.prev.icon}</span>
              {nav.prev.title}
            </span>
            <span className="content-nav-sub">{nav.prev.subtema}</span>
          </Link>
        ) : (
          <Link href={`/${ano}${themeHash}`} className="content-nav-link content-nav-prev content-nav-back">
            <span className="content-nav-direction">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="10 4 6 8 10 12" />
              </svg>
              Voltar
            </span>
            <span className="content-nav-title">{label}</span>
            <span className="content-nav-sub">Ver todos os temas</span>
          </Link>
        )}

        {nav.next ? (
          <Link href={`/${ano}/${nav.next.slug}`} className="content-nav-link content-nav-next">
            <span className="content-nav-direction">
              Seguinte
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 4 10 8 6 12" />
              </svg>
            </span>
            <span className="content-nav-title">
              <span className="content-nav-icon">{nav.next.icon}</span>
              {nav.next.title}
            </span>
            <span className="content-nav-sub">{nav.next.subtema}</span>
          </Link>
        ) : (
          <Link href={`/${ano}${themeHash}`} className="content-nav-link content-nav-next content-nav-back">
            <span className="content-nav-direction">
              Voltar
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 4 10 8 6 12" />
              </svg>
            </span>
            <span className="content-nav-title">{label}</span>
            <span className="content-nav-sub">Ver todos os temas</span>
          </Link>
        )}
      </nav>
    </article>
    </>
  );
}
