import { notFound } from "next/navigation";

import { CheckoutSuccessClient } from "@/components/storefront/checkout-success-client";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { getCurrentTenant } from "@/lib/tenant";

type PageProps = { searchParams: Promise<{ session_id?: string }> };

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();
  const params = await searchParams;
  if (!params.session_id) notFound();

  return (
    <>
      <SiteHeader tenantName={tenant.name} />
      <main className="storefront-shell checkout-success-page">
        <CheckoutSuccessClient sessionId={params.session_id} />
      </main>
      <SiteFooter tenantName={tenant.name} />
    </>
  );
}
