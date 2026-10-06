import { NextResponse } from "next/server";

import { quoteLicenseProducts } from "@/lib/checkout";
import { getCurrentTenant } from "@/lib/tenant";

export async function POST(request: Request) {
  const tenant = await getCurrentTenant();
  if (!tenant) return NextResponse.json({ error: "Storefront not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  try {
    const quote = await quoteLicenseProducts(tenant.id, body?.licenseProductIds);
    return NextResponse.json({
      currency: quote.currency,
      subtotalCents: quote.subtotalCents,
      items: quote.items.map((item) => ({
        licenseProductId: item.licenseProductId,
        workSlug: item.workSlug,
        workTitle: item.workTitle,
        licenseName: item.licenseName,
        licenseVersionNumber: item.licenseVersionNumber,
        scope: item.scope,
        priceCents: item.priceCents,
        currency: item.currency,
        termsText: item.termsText,
        selectedStemLabels: item.selectedStemLabels,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to quote cart." },
      { status: 400 },
    );
  }
}
