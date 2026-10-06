import assert from "node:assert/strict";
import test from "node:test";

import {
  packageFileName,
  renderLicenseDocument,
  safeDownloadName,
} from "./download-delivery";

test("download names strip path traversal and unsafe filename characters", () => {
  assert.equal(safeDownloadName("../../Horn:Section?.wav"), "Horn_Section_.wav");
});

test("package names remain human readable and end in zip", () => {
  assert.equal(
    packageFileName("Night Session", "Full Stems"),
    "Night Session - Full Stems.zip",
  );
});

test("license document preserves exact accepted terms", () => {
  const text = renderLicenseDocument({
    orderId: "order-1",
    purchaseLicenseId: "license-1",
    acceptedAt: new Date("2026-10-06T00:00:00.000Z"),
    customerEmail: "buyer@example.com",
    workTitle: "Night Session",
    licenseName: "Commercial",
    licenseVersionNumber: 3,
    priceCents: 12500,
    currency: "USD",
    termsText: "Exact accepted terms.",
    attributionRequired: true,
    commercialUseAllowed: true,
    derivativesAllowed: true,
    redistributionAllowed: false,
    seatLimit: 2,
    projectLimit: 1,
    selectedStemLabels: ["Horn Section"],
  });

  assert.match(text, /License version 3/);
  assert.match(text, /Exact accepted terms\./);
  assert.match(text, /Horn Section/);
});
