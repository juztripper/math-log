import Link from "next/link";

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="header-logo">
          <span className="header-logo-mark" aria-hidden="true" />
          <span className="header-logo-text">
            math<span className="header-logo-dot">.</span>log
          </span>
        </Link>
        <nav className="header-nav">
          <Link href="/10-ano" className="header-nav-link">
            10.º<span className="ano-label"> ano</span>
          </Link>
          <Link href="/11-ano" className="header-nav-link">
            11.º<span className="ano-label"> ano</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
