import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";

export async function GET(request: Request) {
  const tenant = await getCurrentTenant();
  if (!tenant) return NextResponse.json({ error: "Storefront not found." }, { status: 404 });

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Missing session id." }, { status: 400 });

  const order = await db.order.findFirst({
    where: { tenantId: tenant.id, stripeCheckoutSessionId: sessionId },
    select: {
      id: true,
      status: true,
      currency: true,
      totalCents: true,
      buyerEmail: true,
      paidAt: true,
      items: {
        select: {
          id: true,
          workTitleSnapshot: true,
          licenseNameSnapshot: true,
          licenseVersionNumber: true,
          unitPriceCents: true,
          currency: true,
          purchaseLicense: { select: { id: true } },
        },
      },
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  return NextResponse.json({ order }, { headers: { "Cache-Control": "private, no-store" } });
}
