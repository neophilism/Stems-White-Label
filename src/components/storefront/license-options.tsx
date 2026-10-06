import { LicensePurchaseActions } from "@/components/storefront/license-purchase-actions";
import { formatLicensePrice } from "@/lib/licensing";

type LicenseOptionsProps = {
  products: Array<{
    id: string;
    name: string;
    summary: string | null;
    scope: string;
    selectedStems: Array<{ stemGroup: { id: string; label: string } }>;
    versions: Array<{
      version: number;
      priceCents: number;
      currency: string;
      termsText: string;
      attributionRequired: boolean;
      commercialUseAllowed: boolean;
      derivativesAllowed: boolean;
      redistributionAllowed: boolean;
      seatLimit: number | null;
      projectLimit: number | null;
    }>;
  }>;
};

function scopeLabel(product: LicenseOptionsProps["products"][number]) {
  if (product.scope === "WORK") return "Finished Work";
  if (product.scope === "ALL_STEMS") return "Complete source package";
  if (product.scope === "SELECTED_STEMS") {
    return product.selectedStems.map((entry) => entry.stemGroup.label).join(" · ");
  }
  return product.scope;
}

export function LicenseOptions({ products }: LicenseOptionsProps) {
  const available = products.filter((product) => product.versions[0]);
  if (!available.length) return null;

  return (
    <section className="license-options" id="licensing">
      <div className="work-section__heading">
        <p className="micro-label">Rights &amp; License</p>
        <h2>Acquire the source material.</h2>
        <p>
          Each offering is defined by this Work's creator. The exact license
          version accepted at purchase will be preserved with the order.
        </p>
      </div>

      <div className="license-options__grid">
        {available.map((product) => {
          const version = product.versions[0]!;
          const rights = [
            version.commercialUseAllowed ? "Commercial use" : "Non-commercial use only",
            version.derivativesAllowed ? "Derivatives permitted" : "No derivatives",
            version.attributionRequired ? "Attribution required" : "No attribution requirement",
            version.redistributionAllowed ? "Redistribution permitted" : "No redistribution",
            version.projectLimit ? version.projectLimit + " project limit" : null,
            version.seatLimit ? version.seatLimit + " seat limit" : null,
          ].filter(Boolean);

          return (
            <article className="license-option" key={product.id}>
              <div className="license-option__head">
                <div>
                  <p className="micro-label">License v{version.version}</p>
                  <h3>{product.name}</h3>
                </div>
                <strong>{formatLicensePrice(version.priceCents, version.currency)}</strong>
              </div>

              {product.summary ? <p className="license-option__summary">{product.summary}</p> : null}
              <p className="license-option__scope">{scopeLabel(product)}</p>

              <ul className="license-option__rights">
                {rights.map((right) => <li key={right}>{right}</li>)}
              </ul>

              <details className="license-option__terms">
                <summary>Read license terms</summary>
                <div>
                  {version.termsText.split(/\n{2,}/).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </details>

              <LicensePurchaseActions licenseProductId={product.id} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
