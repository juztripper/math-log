import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty-state" style={{ paddingTop: "6rem" }}>
      <div className="empty-state-icon">🔍</div>
      <h2
        style={{
          fontFamily: "Newsreader, Georgia, serif",
          fontSize: "1.75rem",
          marginBottom: "0.5rem",
          fontWeight: 400,
        }}
      >
        Página não encontrada
      </h2>
      <p style={{ marginBottom: "1.5rem" }}>
        O conteúdo que procuras não existe ou ainda não foi publicado.
      </p>
      <Link
        href="/"
        style={{
          color: "#b78628",
          textDecoration: "none",
          fontWeight: 600,
          borderBottom: "1px solid #f0ddb4",
        }}
      >
        Voltar ao início
      </Link>
    </div>
  );
}
