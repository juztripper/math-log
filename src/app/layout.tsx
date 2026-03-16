import type { Metadata } from "next";
import Header from "@/components/Header";
import CookieConsent from "@/components/CookieConsent";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "math.log — Conteúdos de Matemática A",
  description:
    "Conteúdos de Matemática A para o 10.º e 11.º anos, organizados por temas e subtemas. Aprendizagens Essenciais.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,300;1,6..72,400;1,6..72,500&family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <footer className="footer">
          <p>
            math.log · Conteúdos de Matemática A · Baseado nas{" "}
            <a
              href="https://aem.dge.mec.pt/pt/projeto"
              target="_blank"
              rel="noopener noreferrer"
            >
              Aprendizagens Essenciais
            </a>
          </p>
          <p className="footer-links">
            <a href="/privacidade">Privacidade</a>
          </p>
        </footer>
        <CookieConsent />
        <AnalyticsTracker />
      </body>
    </html>
  );
}
