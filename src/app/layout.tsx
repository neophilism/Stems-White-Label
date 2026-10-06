import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";

import {
  getResolvedTenantTheme,
  getThemePreset,
  themeCssVariables,
} from "@/lib/theme";
import { getCurrentTenant } from "@/lib/tenant";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  const name = tenant?.name ?? "Stems White Label";
  const theme = tenant ? await getResolvedTenantTheme(tenant.id) : null;

  return {
    title: {
      default: name + " — Source Archive",
      template: "%s — " + name,
    },
    description:
      "Masters, stem groups, and source material presented in a bespoke artist-owned archive.",
    icons: theme?.faviconAssetId ? { icon: "/api/theme/favicon" } : undefined,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const tenant = await getCurrentTenant();
  const theme = tenant
    ? await getResolvedTenantTheme(tenant.id)
    : { ...getThemePreset("UNSEALED"), logoAssetId: null, faviconAssetId: null };

  return (
    <html lang="en">
      <body
        data-theme-density={theme.density}
        data-theme-footer={theme.footerStyle}
        data-theme-hero={theme.heroStyle}
        data-theme-motion={theme.motionEnabled ? "true" : "false"}
        data-theme-nav={theme.navStyle}
        data-theme-preset={theme.preset}
        style={themeCssVariables(theme) as CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}
