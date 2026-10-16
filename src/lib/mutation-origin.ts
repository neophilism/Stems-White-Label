import { checkoutReturnOrigin } from "@/lib/checkout-origin";

/** Bind cookie-authorized finance actions to the tenant host, including sibling tenants. */
export function hasValidMutationOrigin(request: Request) {
  try {
    const expected = checkoutReturnOrigin(request.url, request.headers.get("host"), process.env.NODE_ENV === "production");
    return request.headers.get("origin") === expected;
  } catch { return false; }
}
