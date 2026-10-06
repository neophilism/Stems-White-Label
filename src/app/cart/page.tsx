import { CartClient } from "@/components/storefront/cart-client";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { getCurrentTenant } from "@/lib/tenant";
import { notFound } from "next/navigation";

type CartPageProps = {
  searchParams: Promise<{ buy?: string }>;
};

export default async function CartPage({ searchParams }: CartPageProps) {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();
  const params = await searchParams;

  return (
    <>
      <SiteHeader tenantName={tenant.name} />
      <main className="storefront-shell cart-page">
        <CartClient buyNowId={typeof params.buy === "string" ? params.buy : null} />
      </main>
      <SiteFooter tenantName={tenant.name} />
    </>
  );
}
