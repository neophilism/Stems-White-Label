import { hasValidMutationOrigin } from "@/lib/mutation-origin";
import { NextResponse } from "next/server";

import { getTenantApiAccess } from "@/lib/access";
import { getTenantCommerceState } from "@/lib/commerce";
import {
  createConnectedAccountDashboardLink,
  createConnectedAccountOnboardingLink,
  syncConnectedAccount,
} from "@/lib/merchant-accounts";

export async function GET() {
  const access = await getTenantApiAccess("finance.read");
  if (!access) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const commerce = await getTenantCommerceState(access.tenant.id);
  return NextResponse.json(
    { commerce },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "");
  const permission =
    action === "start-onboarding" ? "tenant.manage" : "finance.read";

  const access = await getTenantApiAccess(permission);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    if (action === "start-onboarding") {
      const origin = new URL(request.url).origin;
      const url = await createConnectedAccountOnboardingLink({
        tenantId: access.tenant.id,
        email: access.session.user?.email ?? null,
        country: body?.country,
        origin,
      });
      return NextResponse.json({ url });
    }

    if (action === "sync") {
      await syncConnectedAccount(access.tenant.id);
      const commerce = await getTenantCommerceState(access.tenant.id);
      return NextResponse.json({ commerce });
    }

    if (action === "dashboard") {
      const url = await createConnectedAccountDashboardLink(access.tenant.id);
      return NextResponse.json({ url });
    }

    return NextResponse.json(
      { error: "Unsupported commerce action." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update merchant commerce.",
      },
      { status: 400 },
    );
  }
}
