import { redirect } from "next/navigation";

import { LibraryPackageControls } from "@/components/storefront/library-package-controls";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { requireCustomerAccount } from "@/lib/customer-access";
import { getCustomerLibrary } from "@/lib/download-delivery";

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function bytes(value: bigint | null | undefined) {
  if (!value) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = number;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return size.toFixed(size >= 10 || unit === 0 ? 0 : 1) + " " + units[unit];
}

export default async function CustomerLibraryPage() {
  const { tenant, session, customer } = await requireCustomerAccount();
  if (!tenant || !session?.user?.id) redirect("/auth/sign-in?callbackUrl=/library");

  const licenses = customer
    ? await getCustomerLibrary(tenant.id, customer.id)
    : [];

  return (
    <>
      <SiteHeader tenantName={tenant.name} />
      <main className="storefront-shell library-page">
        <header className="library-page__header">
          <div>
            <p className="micro-label">Customer library</p>
            <h1>Your licensed source archive.</h1>
            <p>
              Original files remain private. Each download request is checked
              against your tenant-scoped purchase and receives a fresh,
              short-lived storage URL.
            </p>
          </div>
          <div className="library-page__identity">
            <span>{session.user.email}</span>
            <a href="/api/auth/signout">Sign out</a>
          </div>
        </header>

        {!customer ? (
          <section className="library-empty">
            <h2>No purchase profile is attached to this account.</h2>
            <p>
              Sign in with the same email address used during Stripe Checkout.
            </p>
          </section>
        ) : licenses.length === 0 ? (
          <section className="library-empty">
            <h2>No licenses yet.</h2>
            <p>Completed purchases will appear here automatically.</p>
          </section>
        ) : (
          <div className="library-list">
            {licenses.map((license) => {
              const revoked = Boolean(license.revokedAt);
              const selectedLabels = Array.isArray(
                license.orderItem.selectedStemLabelsSnapshot,
              )
                ? license.orderItem.selectedStemLabelsSnapshot.filter(
                    (entry): entry is string => typeof entry === "string",
                  )
                : [];

              return (
                <article
                  className={
                    "library-license" +
                    (revoked ? " library-license--revoked" : "")
                  }
                  key={license.id}
                >
                  <div className="library-license__heading">
                    <div>
                      <p className="micro-label">
                        License v{license.orderItem.licenseVersionNumber}
                      </p>
                      <h2>{license.orderItem.workTitleSnapshot}</h2>
                      <p>{license.orderItem.licenseNameSnapshot}</p>
                    </div>
                    <div className="library-license__price">
                      <strong>
                        {money(
                          license.orderItem.unitPriceCents,
                          license.orderItem.currency,
                        )}
                      </strong>
                      <span>
                        Accepted {license.acceptedAt.toLocaleDateString("en-US")}
                      </span>
                    </div>
                  </div>

                  <div className="library-license__meta">
                    <span>{license.orderItem.scopeSnapshot.replaceAll("_", " ")}</span>
                    {selectedLabels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                    <span>Order {license.order.id}</span>
                    {revoked ? <span>Access revoked: {license.revocationReason}</span> : null}
                  </div>

                  <div className="library-license__actions">
                    <a
                      className="library-download-button library-download-button--secondary"
                      href={
                        "/api/library/licenses/" +
                        encodeURIComponent(license.id) +
                        "/document"
                      }
                    >
                      Download license record
                    </a>
                    <LibraryPackageControls
                      purchaseLicenseId={license.id}
                      disabled={revoked}
                      initialPackage={
                        license.downloadPackage
                          ? {
                              id: license.downloadPackage.id,
                              status: license.downloadPackage.status,
                              fileName: license.downloadPackage.fileName,
                              sizeBytes:
                                license.downloadPackage.sizeBytes?.toString() ??
                                null,
                              lastError: license.downloadPackage.lastError,
                            }
                          : null
                      }
                    />
                  </div>

                  {!revoked ? (
                    <div className="library-files">
                      {license.downloadEntitlements.map((entitlement) => (
                        <div className="library-file" key={entitlement.id}>
                          <div>
                            <strong>{entitlement.fileNameSnapshot}</strong>
                            <span>
                              {entitlement.audioAsset.kind}
                              {bytes(entitlement.audioAsset.sizeBytes)
                                ? " · " + bytes(entitlement.audioAsset.sizeBytes)
                                : ""}
                              {entitlement.downloadsCount
                                ? " · downloaded " +
                                  entitlement.downloadsCount +
                                  " time" +
                                  (entitlement.downloadsCount === 1 ? "" : "s")
                                : ""}
                            </span>
                          </div>
                          <a
                            className="library-download-button"
                            href={
                              "/api/library/downloads/" +
                              encodeURIComponent(entitlement.id)
                            }
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter tenantName={tenant.name} />
    </>
  );
}
