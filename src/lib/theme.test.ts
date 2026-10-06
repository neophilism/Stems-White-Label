import assert from "node:assert/strict";
import test from "node:test";

import {
  availableThemePresets,
  getThemePreset,
  normalizeThemeDraft,
  themeCssVariables,
} from "./theme";

test("all seven public presets resolve through one token model", () => {
  assert.deepEqual(
    availableThemePresets().map((entry) => entry.preset),
    ["UNSEALED","ATELIER","ARCHIVE","MINIMAL","BRUTALIST","GALLERY","CINEMATIC"],
  );
});

test("Unsealed remains the flagship default", () => {
  const theme = getThemePreset("UNSEALED");
  assert.equal(theme.heroStyle, "DISPLAY_CASE");
  assert.equal(theme.background, "#070706");
  assert.equal(theme.logoText, "UR");
});

test("manual overrides switch a named preset to CUSTOM", () => {
  const theme = normalizeThemeDraft({
    preset: "GALLERY",
    accent: "#123456",
  });
  assert.equal(theme.preset, "CUSTOM");
  assert.equal(theme.accent, "#123456");
});

test("theme input rejects CSS injection surfaces", () => {
  assert.throws(() =>
    normalizeThemeDraft({
      background: "red; background:url(javascript:alert(1))",
    }),
  );
  assert.throws(() =>
    normalizeThemeDraft({
      artworkAspect: "1 / 1; display:none",
    }),
  );
});

test("theme CSS only emits controlled variables", () => {
  const theme = {
    ...getThemePreset("ATELIER"),
    logoAssetId: null,
    faviconAssetId: null,
  };
  const css = themeCssVariables(theme);
  assert.equal(css["--background"], "#f4f0e8");
  assert.match(css["--serif"], /Didot/);
});
