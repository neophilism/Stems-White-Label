import assert from "node:assert/strict";

import { db } from "../src/lib/db";
import { getResolvedTenantTheme, themeCssVariables } from "../src/lib/theme";

async function main() {
  const suffix = Date.now().toString(36);
  const tenant = await db.tenant.create({
    data: {
      name: "Theme Validation " + suffix,
      slug: "theme-validation-" + suffix,
    },
  });

  try {
    const [logo, favicon] = await Promise.all([
      db.themeAsset.create({
        data: {
          tenantId: tenant.id,
          kind: "LOGO",
          status: "READY",
          fileName: "logo.png",
          storageKey: "tenants/" + tenant.id + "/theme/logo/logo.png",
          mimeType: "image/png",
          sizeBytes: BigInt(1200),
        },
      }),
      db.themeAsset.create({
        data: {
          tenantId: tenant.id,
          kind: "FAVICON",
          status: "READY",
          fileName: "favicon.ico",
          storageKey: "tenants/" + tenant.id + "/theme/favicon/favicon.ico",
          mimeType: "image/x-icon",
          sizeBytes: BigInt(800),
        },
      }),
    ]);

    await db.tenantTheme.create({
      data: {
        tenantId: tenant.id,
        preset: "CUSTOM",
        displayTypography: "CLASSIC",
        bodyTypography: "HUMANIST",
        heroStyle: "SPLIT",
        navStyle: "FLOATING",
        footerStyle: "COMPACT",
        density: "BALANCED",
        background: "#f4f0e8",
        surface: "#ebe5da",
        surfaceRaised: "#fffdf8",
        ink: "#1c1a17",
        inkSoft: "#4e4942",
        muted: "#7b7469",
        accent: "#8b5e3c",
        accentSoft: "#b89578",
        cornerRadiusPx: 4,
        artworkAspect: "4 / 5",
        motionEnabled: false,
        logoText: "TV",
        heroHeadline: "Tenant-specific source archive.",
        logoAssetId: logo.id,
        faviconAssetId: favicon.id,
      },
    });

    const resolved = await getResolvedTenantTheme(tenant.id);
    assert.equal(resolved.preset, "CUSTOM");
    assert.equal(resolved.heroStyle, "SPLIT");
    assert.equal(resolved.logoAssetId, logo.id);
    assert.equal(resolved.faviconAssetId, favicon.id);

    const variables = themeCssVariables(resolved);
    assert.equal(variables["--background"], "#f4f0e8");
    assert.equal(variables["--artwork-aspect"], "4 / 5");
    assert.equal(variables["--theme-color-scheme"], "light");
    assert.match(variables["--serif"], /Didot/);

    const secondTenant = await db.tenant.create({
      data: {
        name: "Theme Isolation " + suffix,
        slug: "theme-isolation-" + suffix,
      },
    });

    try {
      const fallback = await getResolvedTenantTheme(secondTenant.id);
      assert.equal(fallback.preset, "UNSEALED");
      assert.equal(fallback.logoAssetId, null);
      assert.notEqual(fallback.background, resolved.background);
    } finally {
      await db.tenant.delete({ where: { id: secondTenant.id } });
    }

    console.log("White-label theme database integration validation passed.");
  } finally {
    await db.tenant.delete({ where: { id: tenant.id } }).catch(() => undefined);
    await db.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exitCode = 1;
});
