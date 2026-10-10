# Safe initial production database and Unsealed Records bootstrap

**Existing connected Neon project:** Stems Showcase. Preserve the production
branch and its existing `stems-demo` tenant.

The database previously had only the first 13 Prisma migrations applied.
Migrations for analytics, global administration and team accounts are additive,
and must be applied by Prisma's migration engine before enabling the later
administrative routes. Do not manually alter `_prisma_migrations`.

## First deployment

* The existing Render web service uses `npm start`. Its `prestart` hook now
  runs `npm run db:deploy` and the explicit, optional flagship bootstrap.
  Render currently has a single web instance. When scaling out, replace the
  process-level migration step with a single dedicated pre-deploy job.
* Verify `DATABASE_URL` is configured privately for the Render service and
  references **Stems Showcase** production, not a test/preview branch.
* Set `BOOTSTRAP_UNSEALED_RECORDS=true` only after verifying that project.
  Bootstrap upserts the flagship identity, theme, subscription and artist. It
  does **not** delete or overwrite the demo tenant, does not publish works,
  does not assign users administrative privileges, does not create payments,
  and does not assert DNS/TLS ownership of `stems.unsealedrecords.com`.
* Set `DEFAULT_TENANT_SLUG=unsealed-records` and
  `PLATFORM_DEFAULT_HOSTNAME=stems-white-label-preview.onrender.com` after
  the host-routing PR has passed CI and merged.
* Observe the next Render deploy, `/api/health`, `/api/ready`, and the new
  public-host smoke workflow. Verify all migrations are applied via Prisma
  migration status or read-only queries to `_prisma_migrations`.
* The flagship begins with no published real tracks or stem files. Upload
  licensed originals with the authenticated creator CMS and independent
  media/package workers before enabling real checkout.
* For an external custom hostname, go through domain ownership TXT challenge,
  routing validation and provider TLS readiness. Never insert artificially
  verified domain records.

## Risks and rollback

The checked-in migrations should be examined for unsafe DDL before promotion.
Do not automatically roll back production schemas. Keep previous Render build
available and use a provider backup/restore point before non-additive migrations.
If the bootstrap is rerun, existing tenant/theme/artist/subscription records
are left unchanged. Preserve `BOOTSTRAP_UNSEALED_RECORDS=true` only if desired;
turning it off leaves the tenant intact.
