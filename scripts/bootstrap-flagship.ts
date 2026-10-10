import { PrismaClient } from "@prisma/client";

/**
 * Optional idempotent bootstrap for the platform's own flagship tenant.
 * Unlike the historical demo seed, this deliberately does NOT create, verify,
 * or take over any custom domain. Domain control remains in the domain manager.
 */
const prisma = new PrismaClient();

export async function bootstrapUnsealedRecords(client: PrismaClient = prisma) {
  const tenant = await client.tenant.upsert({
    where: { slug: "unsealed-records" },
    update: {},
    create: {
      slug: "unsealed-records",
      name: "Unsealed Records",
      status: "ACTIVE",
      isSeed: true,
    },
  });

  await client.tenantSubscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      status: "GRANDFATHERED",
      planKey: "flagship",
      planName: "Flagship",
      allowCustomDomains: true,
      allowWhiteLabel: true,
    },
  });

  await client.tenantTheme.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      preset: "UNSEALED",
      logoText: "UR",
      heroEyebrow: "Unsealed Records · Source Archive",
      heroHeadline: "The record is not a file.",
      heroSubheadline: "It is a construction.",
      footerStatement:
        "A creator-controlled archive of masters, stems, and original recordings.",
    },
  });

  await client.artist.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "unsealed-records" } },
    update: {},
    create: {
      tenantId: tenant.id,
      slug: "unsealed-records",
      name: "Unsealed Records",
      displayName: "Unsealed Records",
    },
  });

  return tenant;
}

async function main() {
  if (process.env.BOOTSTRAP_UNSEALED_RECORDS !== "true") {
    console.log("Unsealed Records bootstrap skipped (opt-in not enabled).");
    return;
  }

  const tenant = await bootstrapUnsealedRecords();
  console.log("Flagship tenant ready: " + tenant.slug);
}

main()
  .catch((error) => {
    console.error("Flagship bootstrap failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
