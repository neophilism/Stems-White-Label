import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedDemoExperience(client: PrismaClient = prisma) {
  const slug = process.env.DEMO_TENANT_SLUG?.trim() || "stems-demo";

  const existing = await client.tenant.findUnique({ where: { slug } });
  if (existing) {
    await client.tenant.delete({ where: { id: existing.id } });
  }

  const tenant = await client.tenant.create({
    data: {
      name: "Aperture Sound",
      slug,
      status: "ACTIVE",
      isSeed: true,
      subscription: {
        create: {
          status: "GRANDFATHERED",
          planKey: "demo-label",
          planName: "Label",
          maxWorks: 100,
          maxStorageBytes: 268435456000n,
          maxCustomDomains: 5,
          maxMembers: 15,
          allowCustomDomains: true,
          allowWhiteLabel: true,
          entitlements: { features: ["demo", "white-label", "analytics"] },
        },
      },
      theme: {
        create: {
          preset: "ATELIER",
          logoText: "AS",
          heroEyebrow: "Aperture Sound · Source Editions",
          heroHeadline: "Inside the finished record.",
          heroSubheadline:
            "Hear the construction, study the source material, and license from the artist-controlled archive.",
          footerStatement:
            "A demonstration tenant showing how one white-label engine can become a distinct artist storefront.",
        },
      },
    },
  });

  const artist = await client.artist.create({
    data: {
      tenantId: tenant.id,
      slug: "mira-vale",
      name: "Mira Vale",
      displayName: "Mira Vale",
      bio: "Composer, producer, and recording artist.",
    },
  });

  const collection = await client.collection.create({
    data: {
      tenantId: tenant.id,
      slug: "source-editions-vol-one",
      title: "Source Editions · Volume One",
      description:
        "Three fictional Works prepared specifically to demonstrate presentation, source grouping, and licensing.",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  const works = [
    {
      slug: "glass-harbor",
      title: "Glass Harbor",
      subtitle: "A nocturnal electronic suite",
      bpm: "92",
      key: "D minor",
      groups: ["Drums", "Low Synth", "Glass Choir", "Field Texture"],
      price: 18000,
    },
    {
      slug: "north-room",
      title: "North Room",
      subtitle: "Piano, tape, and chamber strings",
      bpm: "68",
      key: "A major",
      groups: ["Piano", "String Ensemble", "Tape Loops", "Room Tone"],
      price: 24000,
    },
    {
      slug: "signal-flower",
      title: "Signal Flower",
      subtitle: "Rhythm architecture in five layers",
      bpm: "118",
      key: "F# minor",
      groups: ["Percussion", "Bass Architecture", "Synth Bloom", "Vocal Texture", "Noise Bed"],
      price: 22000,
    },
  ];

  for (let index = 0; index < works.length; index += 1) {
    const source = works[index]!;
    const work = await client.work.create({
      data: {
        tenantId: tenant.id,
        primaryArtistId: artist.id,
        slug: source.slug,
        title: source.title,
        subtitle: source.subtitle,
        description:
          "A fictional demonstration Work showing how source material can be presented with editorial context, arbitrary stem groups, and creator-defined licensing.",
        bpm: source.bpm,
        musicalKey: source.key,
        status: "PUBLISHED",
        publishedAt: new Date(Date.now() - index * 86400000),
      },
    });

    await client.collectionWork.create({
      data: { collectionId: collection.id, workId: work.id, position: index },
    });

    await client.workSection.createMany({
      data: [
        {
          workId: work.id,
          kind: "Construction",
          title: "Built as a record, opened as an archive",
          body: "The public presentation explains how the piece was assembled without reducing the Work to a folder of files.",
          position: 0,
        },
        {
          workId: work.id,
          kind: "Provenance",
          title: "Creator-controlled source edition",
          body: "This fictional example demonstrates provenance and licensing presentation for prospective platform customers.",
          position: 1,
        },
      ],
    });

    const groups = [];
    for (let position = 0; position < source.groups.length; position += 1) {
      groups.push(
        await client.stemGroup.create({
          data: {
            workId: work.id,
            slug: "group-" + (position + 1),
            label: source.groups[position]!,
            position,
            isFeatured: position < 2,
          },
        }),
      );
    }

    const license = await client.licenseProduct.create({
      data: {
        tenantId: tenant.id,
        workId: work.id,
        slug: "source-license",
        name: "Source Edition License",
        summary: "Commercial source-material license for the complete Work.",
        scope: "ALL_STEMS",
        isActive: true,
        position: 0,
      },
    });

    await client.licenseVersion.create({
      data: {
        licenseProductId: license.id,
        version: 1,
        priceCents: source.price,
        currency: "USD",
        termsText:
          "Demonstration terms only. This fictional catalog entry is not offered for sale.",
        attributionRequired: true,
        commercialUseAllowed: true,
        derivativesAllowed: true,
        redistributionAllowed: false,
      },
    });

    const reveal = await client.revealSequence.create({
      data: {
        workId: work.id,
        name: "Reveal the Record",
        description: "A sample creator-authored source reveal.",
        isPublished: true,
        position: 0,
      },
    });

    for (let position = 0; position < Math.min(groups.length, 3); position += 1) {
      await client.revealStep.create({
        data: {
          sequenceId: reveal.id,
          stemGroupId: groups[position]!.id,
          atMs: position * 12000,
          action: "ADD_SOURCE",
          caption: "Introduce " + groups[position]!.label,
        },
      });
    }
  }

  return tenant;
}

if (import.meta.url === new URL(process.argv[1]!, "file:").href) {
  seedDemoExperience()
    .then((tenant) => {
      console.log("Seeded demo tenant: " + tenant.slug);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
