import assert from "node:assert/strict";
import test from "node:test";

import {
  domainRoutingMatches,
  normalizeCustomHostname,
  ownershipVerified,
  verificationRecordValue,
  type DomainDnsSnapshot,
} from "./domains";

test("custom hostname normalization accepts IDNA and rejects URL input", () => {
  assert.equal(normalizeCustomHostname("Music.Example.COM."), "music.example.com");
  assert.throws(() => normalizeCustomHostname("https://music.example.com"));
  assert.throws(() => normalizeCustomHostname("*.example.com"));
  assert.throws(() => normalizeCustomHostname("127.0.0.1"));
});

test("TXT ownership challenge must match exactly", () => {
  const snapshot: DomainDnsSnapshot = {
    txt: [verificationRecordValue("abc"), "other=value"],
    cname: [],
    ipv4: [],
    ipv6: [],
  };
  assert.equal(ownershipVerified(snapshot, "abc"), true);
  assert.equal(ownershipVerified(snapshot, "abcd"), false);
});

test("routing accepts configured CNAME target", () => {
  assert.equal(
    domainRoutingMatches(
      {
        cname: ["domains.platform.example."],
        ipv4: ["192.0.2.10"],
        ipv6: [],
      },
      {
        cname: "domains.platform.example",
        ipv4: new Set(),
        ipv6: new Set(),
      },
    ),
    true,
  );
});

test("apex routing requires every resolved address to be configured", () => {
  const targets = {
    cname: null,
    ipv4: new Set(["192.0.2.10", "192.0.2.11"]),
    ipv6: new Set<string>(),
  };

  assert.equal(
    domainRoutingMatches(
      { cname: [], ipv4: ["192.0.2.10", "192.0.2.11"], ipv6: [] },
      targets,
    ),
    true,
  );

  assert.equal(
    domainRoutingMatches(
      { cname: [], ipv4: ["192.0.2.10", "203.0.113.50"], ipv6: [] },
      targets,
    ),
    false,
  );
});
