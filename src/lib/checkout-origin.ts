/**
 * Stripe return URLs must be based on the tenant-resolved Host header, not on
 * an unchecked request.url that a reverse proxy may derive from forwarded data.
 * Call only after getCurrentTenant() has validated the tenant/hostname.
 */
export function checkoutReturnOrigin(
  requestUrl: string,
  hostHeader: string | null,
  production: boolean,
): string {
  if (!production) return new URL(requestUrl).origin;

  if (!hostHeader) throw new Error("Missing trusted storefront host.");
  const host = hostHeader.trim().toLowerCase();
  if (
    host.includes(",") ||
    host.includes("/") ||
    host.includes("\\") ||
    host.includes("@") ||
    host.includes("#") ||
    host.includes("?")
  ) {
    throw new Error("Invalid storefront host.");
  }
  const url = new URL("https://" + host);
  if (
    !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(url.hostname) ||
    !url.hostname.includes(".") ||
    url.hostname.includes("..") ||
    Boolean(url.port) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Invalid storefront host.");
  }
  return url.origin;
}
