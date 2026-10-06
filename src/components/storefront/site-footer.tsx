type SiteFooterProps = {
  tenantName: string;
};

export function SiteFooter({ tenantName }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="storefront-shell site-footer__grid">
        <div>
          <p className="micro-label">Source archive</p>
          <p className="site-footer__name">{tenantName}</p>
        </div>
        <p className="site-footer__statement">
          Masters, sections, and source material presented as works in their own
          right.
        </p>
        <p className="site-footer__legal">
          © {new Date().getFullYear()} {tenantName}
        </p>
      </div>
    </footer>
  );
}
