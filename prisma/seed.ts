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
      update: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        hostname,
        isPrimary: hostname === "stems.unsealedrecords.com",
        verifiedAt: hostname.includes("unsealedrecords.com") ? null : new Date(),
      },
    });
  }

  console.log("Seeded tenant: " + tenant.name + " (" + tenant.slug + ")");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
