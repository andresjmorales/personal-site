import Link from "next/link";

const nav = [
  { href: "/#about", label: "About" },
  { href: "/#projects", label: "Projects" },
  { href: "/#writing", label: "Writing" },
  { href: "/#links", label: "Links" },
];

export function Header() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-header-brand">
          <Link href="/" className="site-logo">
            Andrés Morales
          </Link>
        </div>
        <nav className="site-nav" aria-label="Primary">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="site-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
