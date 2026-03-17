"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

interface PageData {
  id: string;
  title: string;
  icon: string;
  slug: string;
}

interface SubtemaData {
  name: string;
  pages: PageData[];
}

interface ThemeData {
  name: string;
  icon: string;
  color: string;
  subtemas: SubtemaData[];
  totalPages: number;
}

interface ThemeAccordionProps {
  themes: ThemeData[];
  anoSlug: string;
}

function slugifyTheme(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function ThemeAccordion({
  themes,
  anoSlug,
}: ThemeAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number>(-1);
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());

  // On mount, open the theme matching the URL hash and scroll to it
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#tema-")) {
      const idx = themes.findIndex(
        (t) => `tema-${slugifyTheme(t.name)}` === hash.slice(1)
      );
      if (idx !== -1) {
        setOpenIndex(idx);
        requestAnimationFrame(() => {
          const el = cardRefs.current.get(idx);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? -1 : index));
  }, []);

  return (
    <>
      {/* Theme cards */}
      <div className="theme-accordion">
        {themes.map((theme, index) => {
          const isOpen = openIndex === index;

          return (
            <section
              key={theme.name}
              id={`tema-${slugifyTheme(theme.name)}`}
              ref={(el) => {
                if (el) cardRefs.current.set(index, el);
              }}
              className={`theme-card ${isOpen ? "theme-card-active" : ""}`}
              style={
                {
                  "--theme-color": theme.color,
                  "--theme-color-bg": `${theme.color}08`,
                  "--theme-color-border": `${theme.color}20`,
                  scrollMarginTop: "80px",
                } as React.CSSProperties
              }
            >
              <button
                className="theme-card-header"
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
              >
                <div className="theme-card-icon">{theme.icon}</div>
                <div className="theme-card-info">
                  <h2 className="theme-card-title">{theme.name}</h2>
                  <span className="theme-card-count">
                    {theme.totalPages}{" "}
                    {theme.totalPages === 1 ? "conteúdo" : "conteúdos"} ·{" "}
                    {theme.subtemas.length}{" "}
                    {theme.subtemas.length === 1 ? "subtema" : "subtemas"}
                  </span>
                </div>
                <div
                  className={`theme-card-chevron ${isOpen ? "open" : ""}`}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 8 10 12 14 8" />
                  </svg>
                </div>
              </button>

              <div
                className={`theme-card-body ${isOpen ? "theme-card-body-open" : ""}`}
              >
                <div className="theme-card-body-inner">
                  {theme.subtemas.map((subtema) => (
                    <div key={subtema.name} className="subtema-block">
                      <div className="subtema-header">
                        <div
                          className="subtema-dot"
                          style={{ background: theme.color }}
                        />
                        <h3 className="subtema-title">{subtema.name}</h3>
                      </div>
                      <div className="subtema-pages">
                        {subtema.pages.map((page) => (
                          <Link
                            key={page.id}
                            href={`/${anoSlug}/${page.slug}`}
                            className="page-card"
                          >
                            <span className="page-card-icon">
                              {page.icon}
                            </span>
                            <span className="page-card-title">
                              {page.title}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
