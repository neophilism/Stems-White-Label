/**
 * Recognize a host owned by the platform (for example its exact Render hostname).
 * Customer custom domains still require ownership, routing and TLS verification.
 */
export function matchesManagedPlatformHost(
  requestHost: string,
  configuredHostname: string | undefined,
): boolean {
  const expected = configuredHostname?.trim().toLowerCase();
  if (
    !expected ||
    !expected.includes(".") ||
    !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(expected) ||
    expected.includes("..")
  ) {
    return false;
  }

  const supplied = requestHost.trim().toLowerCase();
  if (
    supplied.includes(",") ||
    supplied.includes("/") ||
    supplied.includes("\\") ||
    supplied.includes("@")
  ) {
    return false;
  }

  const actual = supplied.replace(/:443$/, "").replace(/\.$/, "");
  return actual === expected;
}
