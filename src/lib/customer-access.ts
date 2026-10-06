import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function resolveCustomerForSession() {
  const [tenant, session] = await Promise.all([
    getCurrentTenant(),
    getServerSession(authOptions),
  ]);

  if (!tenant || !session?.user?.id || !session.user.email) {
    return { tenant, session, customer: null };
  }

  const byUser = await db.customer.findFirst({
    where: {
      tenantId: tenant.id,
      userId: session.user.id,
    },
  });

  if (byUser) return { tenant, session, customer: byUser };

  const normalizedEmail = normalizeEmail(session.user.email);
  const byEmail = await db.customer.findUnique({
    where: {
      tenantId_normalizedEmail: {
        tenantId: tenant.id,
        normalizedEmail,
      },
    },
  });

  if (!byEmail || (byEmail.userId && byEmail.userId !== session.user.id)) {
    return { tenant, session, customer: null };
  }

  const customer = byEmail.userId
    ? byEmail
    : await db.customer.update({
        where: { id: byEmail.id },
        data: { userId: session.user.id },
      });

  return { tenant, session, customer };
}

export async function requireCustomerAccount() {
  const resolved = await resolveCustomerForSession();

  if (!resolved.tenant) {
    throw new Error("No active tenant resolved for this hostname.");
  }

  if (!resolved.session?.user?.id) {
    redirect("/auth/sign-in?callbackUrl=/library");
  }

  return resolved;
}

export async function getCustomerApiAccess() {
  const resolved = await resolveCustomerForSession();
  if (!resolved.tenant || !resolved.session?.user?.id || !resolved.customer) {
    return null;
  }
  return resolved;
}
