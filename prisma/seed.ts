import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "unsealed-records" },
    update: { name: "Unsealed Records", status: "ACTIVE", isSeed: true },
    create: {
      name: "Unsealed Records",
      slug: "unsealed-records",
      status: "ACTIVE",
      isSeed: true,
    },
  });

  const hostnames = ["stems.unsealedrecords.com", "localhost", "127.0.0.1"];

  for (const hostname of hostnames) {
    await prisma.tenantDomain.upsert({
      where: { hostname },
      update: {
        tenantId: tenant.id,
        ownershipStatus: "VERIFIED",
        routingStatus: "READY",
        tlsStatus: "READY",
        verifiedAt: new Date(),
        routingVerifiedAt: new Date(),
        tlsVerifiedAt: new Date(),
        claimExpiresAt: null,
      },
      create: {
        tenantId: tenant.id,
        hostname,
        isPrimary: hostname === "stems.unsealedrecords.com",
        ownershipStatus: "VERIFIED",
        routingStatus: "READY",
        tlsStatus: "READY",
        verifiedAt: new Date(),
        routingVerifiedAt: new Date(),
        tlsVerifiedAt: new Date(),
      },
    });
  }

  await prisma.tenantTheme.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      preset: "UNSEALED",
      logoText: "UR",
      heroEyebrow: "Unsealed source archive",
      heroHeadline: "The record is not a file.",
      heroSubheadline: "It is a construction.",
      footerStatement:
        "Masters, sections, and source material presented as works in their own right.",
    },
  });

  await prisma.artist.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: "unsealed-records",
      },
    },
    update: {
      name: "Unsealed Records",
      displayName: "Unsealed Records",
    },
    create: {
      tenantId: tenant.id,
      slug: "unsealed-records",
      name: "Unsealed Records",
      displayName: "Unsealed Records",
    },
  });

  console.log("Seeded tenant and catalog identity: " + tenant.name);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
