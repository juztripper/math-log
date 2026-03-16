import Link from "next/link";
import { fetchAllYearData } from "@/lib/notion";
import { THEME_COLORS } from "@/lib/types";

export default function HomePage() {
  const years = fetchAllYearData();

  return (
    <>
      <section className="hero">
        <h1 className="hero-title">
          math<span className="hero-dot">.</span>log
        </h1>
        <div className="hero-rule" />
        <p className="hero-subtitle">
          Conteúdos de Matemática A
        </p>
        <p className="hero-caption">
          10.º e 11.º anos · Aprendizagens Essenciais
        </p>
      </section>

      <section className="year-cards">
        {years.map((year) => {
          const themeCount = year.themes.length;
          const pageCount = year.totalPages;

          return (
            <Link
              key={year.slug}
              href={`/${year.slug}`}
              className="year-card"
            >
              <div className="year-card-year">{year.ano}</div>
              <div className="year-card-themes">
                {year.themes.map((theme) => (
                  <div
                    key={theme.name}
                    className="year-card-theme-dot"
                    style={{ background: theme.color }}
                    title={theme.name}
                  />
                ))}
              </div>
              <div className="year-card-meta">
                <span>
                  {themeCount} {themeCount === 1 ? "tema" : "temas"}
                </span>
                <span>
                  {pageCount}{" "}
                  {pageCount === 1 ? "conteúdo" : "conteúdos"}
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="sources">
        <div className="sources-label">Fontes consultadas</div>
        <p className="sources-text">
          Domínio 10 (Vol. 1, 2 e 3) · Espiral 11 (Vol. 1 e 2)
        </p>
        <p className="sources-text">
          <a
            href="https://pedronoia.pt/"
            target="_blank"
            rel="noopener noreferrer"
          >
            pedronoia.pt
          </a>{" "}
          ·{" "}
          <a
            href="https://mat.absolutamente.net"
            target="_blank"
            rel="noopener noreferrer"
          >
            mat.absolutamente.net
          </a>{" "}
          ·{" "}
          <a
            href="https://www.matematica.pt"
            target="_blank"
            rel="noopener noreferrer"
          >
            matematica.pt
          </a>
        </p>
      </section>
    </>
  );
}
