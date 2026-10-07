import assert from "node:assert/strict";
import test from "node:test";

import {
  assertRoleAssignmentAllowed,
  hashInvitationToken,
  invitationIsActive,
  normalizeTeamEmail,
  normalizeTeamRole,
} from "@/lib/team-accounts";

test("normalizes team email addresses", () => {
  assert.equal(normalizeTeamEmail("  Artist@Example.COM "), "artist@example.com");
  assert.throws(() => normalizeTeamEmail("not-an-email"), /valid email/i);
});

test("validates tenant roles", () => {
  assert.equal(normalizeTeamRole("CATALOG_MANAGER"), "CATALOG_MANAGER");
  assert.throws(() => normalizeTeamRole("SUPER_ADMIN"), /tenant role/i);
});

test("only owners can assign or manage OWNER", () => {
  assert.doesNotThrow(() =>
    assertRoleAssignmentAllowed("OWNER", null, "OWNER"),
  );
  assert.throws(
    () => assertRoleAssignmentAllowed("ADMIN", null, "OWNER"),
    /only a tenant owner/i,
  );
  assert.throws(
    () => assertRoleAssignmentAllowed("ADMIN", "OWNER", "ADMIN"),
    /only a tenant owner/i,
  );
});

test("invitation activity requires open timestamps and future expiry", () => {
  const now = new Date("2026-10-07T12:00:00Z");
  assert.equal(
    invitationIsActive(
      {
        acceptedAt: null,
        revokedAt: null,
        expiresAt: new Date("2026-10-08T12:00:00Z"),
      },
      now,
    ),
    true,
  );
  assert.equal(
    invitationIsActive(
      {
        acceptedAt: null,
        revokedAt: new Date("2026-10-07T11:00:00Z"),
        expiresAt: new Date("2026-10-08T12:00:00Z"),
      },
      now,
    ),
    false,
  );
});

test("invitation tokens are stored by one-way hash", () => {
  const hash = hashInvitationToken("a-secret-invitation-token");
  assert.equal(hash.length, 64);
  assert.notEqual(hash, "a-secret-invitation-token");
});
