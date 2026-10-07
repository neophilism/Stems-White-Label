import type { ReactNode } from "react";

export default function PlatformAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="admin-theme-reset">{children}</div>;
}
