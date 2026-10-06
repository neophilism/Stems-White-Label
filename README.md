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


## Work showcase

Published Works have dedicated work presentation pages at /works/[slug].

The showcase includes:

- a full editorial Work hero
- linked storefront cards and featured Work entry points
- arbitrary creator-defined source groups
- optional nested source-group labels
- technical provenance derived from ready AudioAsset metadata
- ordered Work credits
- published Collection provenance
- optional ordered WorkSection narratives for About, Construction, Session Notes,
  Production Notes, Provenance, or any creator-defined editorial section
- a permanent listening-room surface reserved for the synchronized source player

WorkSection uses a freeform kind instead of a fixed enum. This lets one Work expose
extensive archival documentation while another remains intentionally minimal.

The listening room truthfully reports whether a preview source is registered; it
does not invent demo audio or expose private source files. The synchronized player
and its audio engine are the next milestone.


## Synchronized multitrack player

The Work listening room uses one Web Audio API clock for every decoded preview
source. All available preview buffers are scheduled against the same start time
and playback offset, so source groups stay synchronized when visitors mute, solo,
combine, seek, pause, and resume.

The player supports:

- Full Mix mode when a Work has a full-mix PREVIEW asset
- All Sources reconstruction from available StemGroup PREVIEW assets
- arbitrary creator-defined source groups
- mute per source group
- multiple simultaneous solo selections
- seek and pause/resume without losing alignment
- master volume
- reset-to-full-mix behavior
- mobile layouts and touch-friendly controls
- explicit loading and error states

Only AudioAssets with kind PREVIEW, status READY, a storage key, and a published
parent Work can enter the playback manifest. Original MASTER and STEM assets are
never returned by the player API.

### Preview delivery configuration

Set PREVIEW_URL_SECRET to a long random value. If omitted, NEXTAUTH_SECRET is used
as the signing secret.

Set PREVIEW_ORIGIN_BASE_URL to a server-reachable preview-only object origin.
PREVIEW_ORIGIN_BEARER_TOKEN is optional when that origin accepts bearer
authentication.

The browser receives only short-lived signed application URLs. Storage keys and
origin credentials remain server-side. The application validates the signature,
tenant, published Work, PREVIEW asset kind, and READY status before proxying the
preview.

PR 7 will automate creation and storage of these preview derivatives. The player
and secure preview boundary themselves are functional now for any registered
PREVIEW assets.


## Reveal the Record

A published Work can expose one or more creator-authored RevealSequence records.
The first published sequence is used by the public listening room.

Each sequence contains ordered, timed RevealStep actions:

- ADD_SOURCE
- REMOVE_SOURCE
- ALL_SOURCES
- FULL_MIX
- SILENCE

ADD_SOURCE and REMOVE_SOURCE target arbitrary StemGroups, so the choreography can
work with groups such as Horn Section 1, Horn Section 2, drums, choir, orchestra,
textures, or any other creator-defined section.

Reveal playback is deterministic rather than timer-only. At any playback position,
the client resolves the full sequence state from the beginning through that point.
This means seeking during a Reveal reconstructs the correct source mix immediately
instead of losing earlier additions/removals.

The listening room provides:

- Reveal the Record start/restart control
- creator-defined sequence name and optional description
- timed captions
- visual sequence timeline
- automatic source additions/removals
- optional transition to all source groups
- optional transition back to the finished full mix
- clean exit from guided mode when the listener manually changes the mix
- normal pause/resume and seek behavior while Reveal remains active

Only published sequences are exposed. Reveal steps that reference a StemGroup
without a playable PREVIEW asset are excluded from the public player manifest.
A FULL_MIX step is excluded when no full-mix preview exists.

Sequence authoring UI is intentionally deferred to the catalog CMS milestone;
the domain model and public playback behavior are complete here. The public
player assumes no default reveal order: every timed source transition comes from
the creator-authored sequence data.

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
