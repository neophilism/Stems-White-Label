"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Theme = {
  preset: string;
  displayTypography: string;
  bodyTypography: string;
  heroStyle: string;
  navStyle: string;
  footerStyle: string;
  density: string;
  background: string;
  surface: string;
  surfaceRaised: string;
  ink: string;
  inkSoft: string;
  muted: string;
  accent: string;
  accentSoft: string;
  cornerRadiusPx: number;
  artworkAspect: string;
  motionEnabled: boolean;
  logoText: string | null;
  heroEyebrow: string | null;
  heroHeadline: string | null;
  heroSubheadline: string | null;
  footerStatement: string | null;
  logoAssetId: string | null;
  faviconAssetId: string | null;
};

type Preset = Theme & { preset: string };

type Payload = {
  theme: Theme;
  presets: Preset[];
  assetUrls: { logo: string | null; favicon: string | null };
};

type ThemeColorKey =
  | "background"
  | "surface"
  | "surfaceRaised"
  | "ink"
  | "inkSoft"
  | "muted"
  | "accent"
  | "accentSoft";

const colorFields: Array<[ThemeColorKey, string]> = [
  ["background", "Background"],
  ["surface", "Surface"],
  ["surfaceRaised", "Raised surface"],
  ["ink", "Primary text"],
  ["inkSoft", "Secondary text"],
  ["muted", "Muted text"],
  ["accent", "Accent"],
  ["accentSoft", "Soft accent"],
];

function title(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ThemeEditor() {
  const [data, setData] = useState<Payload | null>(null);
  const [draft, setDraft] = useState<Theme | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/theme", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load theme.");
    setData(payload);
    setDraft(payload.theme);
  }

  useEffect(() => {
    void load().catch((loadError) =>
      setError(loadError instanceof Error ? loadError.message : "Unable to load theme."),
    );
  }, []);

  const previewStyle = useMemo(() => {
    if (!draft) return {};
    return {
      "--preview-bg": draft.background,
      "--preview-surface": draft.surface,
      "--preview-ink": draft.ink,
      "--preview-muted": draft.muted,
      "--preview-accent": draft.accent,
      "--preview-radius": draft.cornerRadiusPx + "px",
    } as CSSProperties;
  }, [draft]);

  async function applyPreset(preset: string) {
    setBusy("preset");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply-preset", preset }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to apply preset.");
      await load();
      setMessage(title(preset) + " preset applied.");
    } catch (presetError) {
      setError(presetError instanceof Error ? presetError.message : "Unable to apply preset.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!draft) return;
    setBusy("save");
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save theme.");
      await load();
      setMessage("Custom theme saved across the tenant storefront.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save theme.");
    } finally {
      setBusy(null);
    }
  }

  async function upload(kind: "LOGO" | "FAVICON", file: File) {
    setBusy(kind);
    setMessage(null);
    setError(null);

    try {
      const intentResponse = await fetch("/api/admin/theme/assets/upload-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          fileName: file.name,
          mimeType: file.type || (kind === "FAVICON" ? "image/x-icon" : ""),
          sizeBytes: file.size,
        }),
      });
      const intent = await intentResponse.json();
      if (!intentResponse.ok) throw new Error(intent.error || "Unable to start upload.");

      const uploadResponse = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: intent.requiredHeaders,
        body: file,
      });
      if (!uploadResponse.ok) throw new Error("Object storage rejected the upload.");

      const completeResponse = await fetch(
        "/api/admin/theme/assets/" + intent.assetId + "/complete",
        { method: "POST" },
      );
      const completed = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completed.error || "Unable to activate brand asset.");

      await load();
      setMessage(kind === "LOGO" ? "Logo updated." : "Favicon updated.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload asset.");
    } finally {
      setBusy(null);
    }
  }

  if (!data || !draft) return <p className="cms-loading">Loading theme engine…</p>;

  return (
    <div className="theme-editor">
      <section className="cms-panel">
        <div className="cms-panel__heading">
          <p className="eyebrow">Theme presets</p>
          <h2>Start from a visual system.</h2>
          <p>
            Presets change the complete storefront token system. Manual edits
            preserve those values as a Custom theme.
          </p>
        </div>
        <div className="theme-preset-grid">
          {data.presets.map((preset) => (
            <button
              className={
                "theme-preset" +
                (draft.preset === preset.preset ? " theme-preset--active" : "")
              }
              disabled={busy !== null}
              key={preset.preset}
              onClick={() => void applyPreset(preset.preset)}
              style={{
                background: preset.background,
                color: preset.ink,
                borderColor: preset.accentSoft,
              }}
              type="button"
            >
              <span style={{ color: preset.accent }}>{title(preset.preset)}</span>
              <strong>{preset.heroHeadline}</strong>
              <small>{title(preset.heroStyle)} · {title(preset.density)}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="theme-editor__columns">
        <div>
          <section className="cms-panel">
            <div className="cms-panel__heading">
              <p className="eyebrow">Typography & composition</p>
              <h2>Presentation system</h2>
            </div>
            <div className="cms-grid cms-grid--2">
              <label className="cms-field">
                <span>Display typography</span>
                <select
                  value={draft.displayTypography}
                  onChange={(event) =>
                    setDraft({ ...draft, displayTypography: event.target.value })
                  }
                >
                  {["EDITORIAL","CLASSIC","MODERN","HUMANIST","MONO"].map((value) => (
                    <option key={value} value={value}>{title(value)}</option>
                  ))}
                </select>
              </label>
              <label className="cms-field">
                <span>Body typography</span>
                <select
                  value={draft.bodyTypography}
                  onChange={(event) =>
                    setDraft({ ...draft, bodyTypography: event.target.value })
                  }
                >
                  {["EDITORIAL","CLASSIC","MODERN","HUMANIST","MONO"].map((value) => (
                    <option key={value} value={value}>{title(value)}</option>
                  ))}
                </select>
              </label>
              <label className="cms-field">
                <span>Hero treatment</span>
                <select value={draft.heroStyle} onChange={(event) => setDraft({ ...draft, heroStyle: event.target.value })}>
                  {["DISPLAY_CASE","TYPOGRAPHIC","SPLIT","IMMERSIVE","MINIMAL"].map((value) => (
                    <option key={value} value={value}>{title(value)}</option>
                  ))}
                </select>
              </label>
              <label className="cms-field">
                <span>Navigation</span>
                <select value={draft.navStyle} onChange={(event) => setDraft({ ...draft, navStyle: event.target.value })}>
                  {["BORDERED","FLOATING","MINIMAL"].map((value) => (
                    <option key={value} value={value}>{title(value)}</option>
                  ))}
                </select>
              </label>
              <label className="cms-field">
                <span>Footer</span>
                <select value={draft.footerStyle} onChange={(event) => setDraft({ ...draft, footerStyle: event.target.value })}>
                  {["EDITORIAL","COMPACT","MINIMAL"].map((value) => (
                    <option key={value} value={value}>{title(value)}</option>
                  ))}
                </select>
              </label>
              <label className="cms-field">
                <span>Density</span>
                <select value={draft.density} onChange={(event) => setDraft({ ...draft, density: event.target.value })}>
                  {["AIRY","BALANCED","COMPACT"].map((value) => (
                    <option key={value} value={value}>{title(value)}</option>
                  ))}
                </select>
              </label>
              <label className="cms-field">
                <span>Artwork proportion</span>
                <select value={draft.artworkAspect} onChange={(event) => setDraft({ ...draft, artworkAspect: event.target.value })}>
                  {["1 / 1","4 / 5","3 / 4","16 / 10","16 / 9"].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="cms-field">
                <span>Corner radius</span>
                <input
                  max={40}
                  min={0}
                  type="number"
                  value={draft.cornerRadiusPx}
                  onChange={(event) =>
                    setDraft({ ...draft, cornerRadiusPx: Number(event.target.value) })
                  }
                />
              </label>
              <label className="cms-check cms-check--standalone">
                <input
                  checked={draft.motionEnabled}
                  onChange={(event) =>
                    setDraft({ ...draft, motionEnabled: event.target.checked })
                  }
                  type="checkbox"
                />
                Enable restrained motion
              </label>
            </div>
          </section>

          <section className="cms-panel">
            <div className="cms-panel__heading">
              <p className="eyebrow">Palette</p>
              <h2>Color tokens</h2>
            </div>
            <div className="theme-color-grid">
              {colorFields.map(([key, label]) => (
                <label key={String(key)}>
                  <span>{label}</span>
                  <div>
                    <input
                      type="color"
                      value={String(draft[key])}
                      onChange={(event) =>
                        setDraft({ ...draft, [key]: event.target.value })
                      }
                    />
                    <input
                      value={String(draft[key])}
                      onChange={(event) =>
                        setDraft({ ...draft, [key]: event.target.value })
                      }
                    />
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="cms-panel">
            <div className="cms-panel__heading">
              <p className="eyebrow">Language</p>
              <h2>Brand voice</h2>
            </div>
            <div className="cms-grid cms-grid--2">
              <label className="cms-field">
                <span>Fallback logo mark</span>
                <input maxLength={16} value={draft.logoText ?? ""} onChange={(event)=>setDraft({...draft,logoText:event.target.value})}/>
              </label>
              <label className="cms-field">
                <span>Hero eyebrow</span>
                <input value={draft.heroEyebrow ?? ""} onChange={(event)=>setDraft({...draft,heroEyebrow:event.target.value})}/>
              </label>
              <label className="cms-field cms-field--wide">
                <span>Hero headline</span>
                <input value={draft.heroHeadline ?? ""} onChange={(event)=>setDraft({...draft,heroHeadline:event.target.value})}/>
              </label>
              <label className="cms-field cms-field--wide">
                <span>Hero second line</span>
                <input value={draft.heroSubheadline ?? ""} onChange={(event)=>setDraft({...draft,heroSubheadline:event.target.value})}/>
              </label>
              <label className="cms-field cms-field--wide">
                <span>Footer statement</span>
                <textarea rows={4} value={draft.footerStatement ?? ""} onChange={(event)=>setDraft({...draft,footerStatement:event.target.value})}/>
              </label>
            </div>
          </section>

          <section className="cms-panel">
            <div className="cms-panel__heading">
              <p className="eyebrow">Brand assets</p>
              <h2>Logo & favicon</h2>
              <p>
                Assets upload directly to the private object store. Only the active
                tenant logo/favicon is publicly retrievable through the application.
              </p>
            </div>
            <div className="theme-asset-grid">
              <label className="theme-asset-upload">
                <span>Logo</span>
                {data.assetUrls.logo ? <img alt="Current logo" src={data.assetUrls.logo + "?v=" + Date.now()} /> : <strong>{draft.logoText || "Logo"}</strong>}
                <small>PNG, JPEG, or WebP · max 5 MB</small>
                <input
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload("LOGO", file);
                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
              <label className="theme-asset-upload">
                <span>Favicon</span>
                {data.assetUrls.favicon ? <img alt="Current favicon" src={data.assetUrls.favicon + "?v=" + Date.now()} /> : <strong>ICON</strong>}
                <small>PNG, ICO, or WebP · max 1 MB</small>
                <input
                  accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/webp,.ico"
                  disabled={busy !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload("FAVICON", file);
                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
            </div>
          </section>

          <div className="cms-publish-actions">
            <button className="cms-primary-button" disabled={busy !== null} onClick={() => void save()} type="button">
              {busy === "save" ? "Saving…" : "Save custom theme"}
            </button>
          </div>
          {message ? <p className="cms-message">{message}</p> : null}
          {error ? <p className="cms-error">{error}</p> : null}
        </div>

        <aside className="theme-preview" style={previewStyle}>
          <p>Live token preview</p>
          <div className="theme-preview__nav">
            <span>{draft.logoText || "BRAND"}</span>
            <span>Archive · Collections · Licensing</span>
          </div>
          <div className="theme-preview__hero">
            <small>{draft.heroEyebrow}</small>
            <strong>{draft.heroHeadline}</strong>
            <em>{draft.heroSubheadline}</em>
          </div>
          <div className="theme-preview__object">
            <span>SOURCE</span>
          </div>
          <p>{draft.footerStatement}</p>
        </aside>
      </div>
    </div>
  );
}
