import { getResolvedTenantTheme } from "@/lib/theme";
import { getCurrentTenant } from "@/lib/tenant";

type SiteFooterProps = {
  tenantName: string;
};

export async function SiteFooter({ tenantName }: SiteFooterProps) {
  const tenant = await getCurrentTenant();
  const theme = tenant ? await getResolvedTenantTheme(tenant.id) : null;

  return (
    <footer className={"site-footer site-footer--" + (theme?.footerStyle ?? "EDITORIAL").toLowerCase()}>
      <div className="storefront-shell site-footer__grid">
        <div>
          <p className="micro-label">Source archive</p>
          <p className="site-footer__name">{tenantName}</p>
        </div>
        <p className="site-footer__statement">
          {theme?.footerStatement ??
            "Masters, sections, and source material presented as works in their own right."}
        </p>
        <p className="site-footer__legal">
          © {new Date().getFullYear()} {tenantName}
        </p>
      </div>
    </footer>
  );
}
