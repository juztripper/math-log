"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ContentBarProps {
  anoSlug: string;
  anoLabel: string;
  tema: string;
  themeColor: string;
  themeHash: string;
  pageTitle: string;
  pageIcon: string;
}

export default function ContentBar({
  anoSlug,
  anoLabel,
  tema,
  themeColor,
  themeHash,
  pageTitle,
  pageIcon,
}: ContentBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 160);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`content-bar ${visible ? "content-bar-visible" : ""}`}>
      <div className="content-bar-inner">
        <Link
          href={`/${anoSlug}${themeHash}`}
          className="content-bar-back"
          title={`Voltar a ${anoLabel}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="11 5 7 9 11 13" />
          </svg>
        </Link>
        <div
          className="content-bar-dot"
          style={{ background: themeColor }}
        />
        <span className="content-bar-tema">{tema}</span>
        <span className="content-bar-sep">·</span>
        <span className="content-bar-page">
          {pageIcon} {pageTitle}
        </span>
      </div>
    </div>
  );
}
