import Link from "next/link";

type SiteHeaderProps = {
  tenantName: string;
};

export function SiteHeader({ tenantName }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="storefront-shell site-header__inner">
        <Link className="wordmark" href="/" aria-label={tenantName + " home"}>
          <span className="wordmark__seal" aria-hidden="true">
            UR
          </span>
          <span className="wordmark__name">{tenantName}</span>
        </Link>

        <nav className="site-nav" aria-label="Primary navigation">
          <Link href="/archive">Archive</Link>
          <Link href="/collections">Collections</Link>
          <Link href="/#licensing">Licensing</Link>
          <Link href="/cart">Cart</Link>
          <Link href="/library">Library</Link>
        </nav>
      </div>
    </header>
  );
}
