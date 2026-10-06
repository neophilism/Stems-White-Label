import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, type Permission, type TenantRole } from "@/lib/permissions";
import { getCurrentTenant } from "@/lib/tenant";

export async function requireTenantPermission(permission: Permission) {
  const [tenant, session] = await Promise.all([
    getCurrentTenant(),
    getServerSession(authOptions),
  ]);

  if (!tenant) {
    throw new Error("No active tenant resolved for this hostname.");
  }

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const membership = await db.tenantMembership.findUnique({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: session.user.id,
      },
    },
  });

  if (!membership || !hasPermission(membership.role as TenantRole, permission)) {
    redirect("/");
  }

  return { tenant, session, membership };
}
