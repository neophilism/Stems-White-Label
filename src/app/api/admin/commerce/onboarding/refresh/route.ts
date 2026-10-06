import { redirect } from "next/navigation";

import { getTenantApiAccess } from "@/lib/access";
import { createConnectedAccountOnboardingLink } from "@/lib/stripe-connect";

export async function GET(request: Request) {
  const access = await getTenantApiAccess("tenant.manage");
  if (!access) redirect("/auth/sign-in?callbackUrl=/admin/commerce");

  const origin = new URL(request.url).origin;
  const url = await createConnectedAccountOnboardingLink({
    tenantId: access.tenant.id,
    email: access.session.user?.email ?? null,
    origin,
  });

  redirect(url);
}
