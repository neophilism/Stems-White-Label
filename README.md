# Stems White Label

A multi-tenant white-label platform for artists and labels to present and license
musical source material in a bespoke storefront rather than a commodity marketplace.

## Platform foundation

The platform includes:

- Next.js and TypeScript application shell
- PostgreSQL and Prisma
- Auth.js/NextAuth database-backed authentication
- hostname-resolved tenants and tenant-scoped roles
- Unsealed Records seed tenant
- protected tenant administration
- local PostgreSQL via Docker Compose
- GitHub Actions validation

## Core music domain

The catalog model is deliberately presentation-neutral and creator-controlled:

- Artist
- Collection
- Work
- WorkCredit
- CollectionWork
- StemGroup
- AudioAsset

A StemGroup is an arbitrary musically meaningful source grouping. It does not
represent an individual instrument unless the creator wants it to. Examples can
include Drums, Horn Section 1, Horn Section 2, Orchestra, Choir, Textures, or
any other custom grouping. Optional parent/child relationships allow a creator
to group related sections later without forcing nested structure.

Works use the lifecycle:

DRAFT -> PROCESSING -> READY -> PUBLISHED -> ARCHIVED

Supported transitions also allow a published Work to return to READY for
unpublishing and an archived Work to return to DRAFT for restoration.

## Luxury storefront

The public storefront is deliberately not a marketplace UI.

It now provides:

- a full-screen editorial entrance for the tenant
- a display-case visual language for source material
- a featured published Work selected from tenant catalog data
- metadata and arbitrary StemGroup summaries
- selected-Work presentation
- published Collection navigation
- dedicated Collection pages
- a licensing-philosophy section
- bespoke empty-catalog states
- responsive desktop, tablet, and mobile layouts
- reduced-motion support

No demo Works are hard-coded into the storefront. Public content comes from the
tenant's published catalog. Until artwork storage is introduced, Work visuals use
a deterministic typographic jacket generated from catalog metadata.

## Local setup

1. Copy .env.example to .env.
2. Run docker compose up -d.
3. Run npm install.
4. Run npm run db:migrate.
5. Run npm run db:seed.
6. Run npm test.
7. Run npm run dev.

The local tenant resolver falls back to DEFAULT_TENANT_SLUG, which defaults to
unsealed-records.

## Authentication

Create a GitHub OAuth application and set GITHUB_ID, GITHUB_SECRET,
NEXTAUTH_URL, and NEXTAUTH_SECRET.

Memberships are tenant-scoped. Authentication alone does not grant tenant admin
access; a TenantMembership with an appropriate role is also required.
