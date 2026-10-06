# Stems White Label

A multi-tenant white-label platform for artists and labels to present and license
musical source material in a bespoke storefront rather than a commodity marketplace.

## PR 1 foundation

The initial platform foundation includes:

- Next.js and TypeScript application shell
- PostgreSQL and Prisma schema plus initial migration
- Auth.js/NextAuth database-backed authentication
- multi-tenant Tenant, TenantDomain, and TenantMembership models
- hostname-based tenant resolution
- tenant roles and permission checks
- Unsealed Records seed tenant
- protected tenant-admin shell
- health endpoint
- local PostgreSQL via Docker Compose
- GitHub Actions validation

The music-domain models such as Work, Collection, StemGroup, and AudioAsset are
intentionally deferred to PR 2.

## Local setup

1. Copy .env.example to .env.
2. Run docker compose up -d.
3. Run npm install.
4. Run npm run db:migrate.
5. Run npm run db:seed.
6. Run npm run dev.

The local tenant resolver falls back to DEFAULT_TENANT_SLUG, which defaults to
unsealed-records.

## Authentication

Create a GitHub OAuth application and set GITHUB_ID, GITHUB_SECRET,
NEXTAUTH_URL, and NEXTAUTH_SECRET.

Memberships are tenant-scoped. Authentication alone does not grant tenant admin
access; a TenantMembership with an appropriate role is also required.
