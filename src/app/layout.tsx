import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getCurrentTenant } from "@/lib/tenant";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  const name = tenant?.name ?? "Stems White Label";

  return {
    title: {
      default: name + " — Source Archive",
      template: "%s — " + name,
    },
    description:
      "Masters, stem groups, and source material presented in a bespoke artist-owned archive.",
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
