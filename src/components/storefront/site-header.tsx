import Link from "next/link";

import { getResolvedTenantTheme } from "@/lib/theme";
import { getCurrentTenant } from "@/lib/tenant";

type SiteHeaderProps = {
  tenantName: string;
};

export async function SiteHeader({ tenantName }: SiteHeaderProps) {
  const tenant = await getCurrentTenant();
  const theme = tenant ? await getResolvedTenantTheme(tenant.id) : null;

  return (
    <header className={"site-header site-header--" + (theme?.navStyle ?? "BORDERED").toLowerCase()}>
      <div className="storefront-shell site-header__inner">
        <Link className="wordmark" href="/" aria-label={tenantName + " home"}>
          {theme?.logoAssetId ? (
            <span className="wordmark__logo-wrap">
              <img className="wordmark__logo" src="/api/theme/logo" alt="" />
            </span>
          ) : (
            <span className="wordmark__seal" aria-hidden="true">
              {theme?.logoText ?? "UR"}
            </span>
          )}
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
