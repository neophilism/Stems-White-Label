export type TenantRole =
  | "OWNER"
  | "ADMIN"
  | "CATALOG_MANAGER"
  | "FINANCE"
  | "VIEWER";

export type Permission =
  | "tenant.manage"
  | "members.manage"
  | "catalog.read"
  | "catalog.write"
  | "finance.read"
  | "analytics.read";

const permissionsByRole: Record<TenantRole, ReadonlySet<Permission>> = {
  OWNER: new Set([
    "tenant.manage",
    "members.manage",
    "catalog.read",
    "catalog.write",
    "finance.read",
    "analytics.read",
  ]),
  ADMIN: new Set([
    "tenant.manage",
    "members.manage",
    "catalog.read",
    "catalog.write",
    "finance.read",
    "analytics.read",
  ]),
  CATALOG_MANAGER: new Set([
    "catalog.read",
    "catalog.write",
    "analytics.read",
  ]),
  FINANCE: new Set([
    "catalog.read",
    "finance.read",
    "analytics.read",
  ]),
  VIEWER: new Set(["catalog.read", "analytics.read"]),
};

export function hasPermission(role: TenantRole, permission: Permission) {
  return permissionsByRole[role].has(permission);
}
