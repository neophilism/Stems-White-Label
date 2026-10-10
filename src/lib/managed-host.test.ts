import assert from "node:assert/strict";
import test from "node:test";

import { matchesManagedPlatformHost } from "./managed-host";

const platformHost = "stems-white-label-preview.onrender.com";

test("only the explicitly configured platform-owned hostname gets a fallback", () => {
  assert.equal(matchesManagedPlatformHost(platformHost, platformHost), true);
  assert.equal(matchesManagedPlatformHost(platformHost.toUpperCase() + ":443", platformHost), true);
  assert.equal(matchesManagedPlatformHost(platformHost + ".", platformHost), true);

  assert.equal(matchesManagedPlatformHost(platformHost, undefined), false);
  assert.equal(matchesManagedPlatformHost("other.onrender.com", platformHost), false);
  assert.equal(matchesManagedPlatformHost(platformHost + ".evil.example", platformHost), false);
  assert.equal(matchesManagedPlatformHost("evil.example, " + platformHost, platformHost), false);
  assert.equal(matchesManagedPlatformHost("https://" + platformHost, platformHost), false);
  assert.equal(matchesManagedPlatformHost(platformHost + "/admin", platformHost), false);
  assert.equal(matchesManagedPlatformHost(platformHost, "https://" + platformHost), false);
  assert.equal(matchesManagedPlatformHost("anything.com", "*"), false);
});
