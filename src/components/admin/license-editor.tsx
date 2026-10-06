"use client";

import { useEffect, useState } from "react";

type LicenseScope = "WORK" | "SELECTED_STEMS" | "ALL_STEMS";
type Stem = { id: string; label: string };
type Version = {
  id: string; version: number; priceCents: number; currency: string; termsText: string;
  attributionRequired: boolean; commercialUseAllowed: boolean; derivativesAllowed: boolean;
  redistributionAllowed: boolean; seatLimit: number | null; projectLimit: number | null;
  effectiveAt: string; retiredAt: string | null;
};
type Product = {
  id: string; slug: string; name: string; summary: string | null;
  scope: LicenseScope; isActive: boolean;
  selectedStems: Array<{ stemGroupId: string }>; versions: Version[];
};
type Payload = { work: { id: string; title: string; slug: string; stemGroups: Stem[]; licenseProducts: Product[] } };

function currentVersion(product: Product) {
  return product.versions[0];
}

type LicenseDraftState = {
  name: string;
  slug: string;
  summary: string;
  scope: LicenseScope;
  priceCents: number;
  currency: string;
  termsText: string;
  attributionRequired: boolean;
  commercialUseAllowed: boolean;
  derivativesAllowed: boolean;
  redistributionAllowed: boolean;
  seatLimit: string;
  projectLimit: string;
  selectedStemGroupIds: string[];
};

function emptyDraft(): LicenseDraftState {
  return {
    name: "", slug: "", summary: "", scope: "ALL_STEMS",
    priceCents: 0, currency: "USD", termsText: "",
    attributionRequired: false, commercialUseAllowed: true,
    derivativesAllowed: true, redistributionAllowed: false,
    seatLimit: "", projectLimit: "", selectedStemGroupIds: [] as string[],
  };
}

export function LicenseEditor({ workId }: { workId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/works/" + workId + "/licenses", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load licenses.");
    setData(payload);
  }

  useEffect(() => { void load().catch((e) => setError(e.message)); }, [workId]);

  function edit(product: Product) {
    const version = currentVersion(product);
    if (!version) return;
    setEditingId(product.id);
    setDraft({
      name: product.name, slug: product.slug, summary: product.summary ?? "", scope: product.scope,
      priceCents: version.priceCents, currency: version.currency, termsText: version.termsText,
      attributionRequired: version.attributionRequired,
      commercialUseAllowed: version.commercialUseAllowed,
      derivativesAllowed: version.derivativesAllowed,
      redistributionAllowed: version.redistributionAllowed,
      seatLimit: version.seatLimit == null ? "" : String(version.seatLimit),
      projectLimit: version.projectLimit == null ? "" : String(version.projectLimit),
      selectedStemGroupIds: product.selectedStems.map((stem) => stem.stemGroupId),
    });
    setMessage(null); setError(null);
  }

  async function save() {
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch(
        editingId ? "/api/admin/licenses/" + editingId : "/api/admin/works/" + workId + "/licenses",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...draft,
            seatLimit: draft.seatLimit,
            projectLimit: draft.projectLimit,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save license.");
      await load();
      setMessage(editingId ? "License saved. Legal/price changes create a new immutable version." : "License created.");
      setEditingId(null); setDraft(emptyDraft());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save license.");
    } finally { setBusy(false); }
  }

  async function toggle(product: Product) {
    const response = await fetch("/api/admin/licenses/" + product.id, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: product.isActive ? "deactivate" : "activate" }),
    });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error || "Unable to change license status.");
      return;
    }
    await load();
  }

  if (!data) return <div className="cms-loading">Loading licensing…</div>;

  return (
    <div className="license-admin">
      <header className="cms-editor__header">
        <div>
          <p className="eyebrow">Licensing Engine</p>
          <h1>{data.work.title}</h1>
          <p>Define commercial offerings without hard-coding plan names. Price and legal changes create immutable versions.</p>
        </div>
      </header>

      <section className="cms-panel">
        <div className="cms-panel__heading"><div><p className="eyebrow">{editingId ? "Edit license" : "New license"}</p><h2>{editingId ? draft.name : "Create an offering"}</h2></div></div>
        <div className="cms-grid cms-grid--2">
          <label><span>Name</span><input value={draft.name} onChange={(e)=>setDraft({...draft,name:e.target.value})}/></label>
          <label><span>Slug</span><input value={draft.slug} onChange={(e)=>setDraft({...draft,slug:e.target.value})}/></label>
          <label><span>Price (cents)</span><input type="number" min="0" value={draft.priceCents} onChange={(e)=>setDraft({...draft,priceCents:Number(e.target.value)})}/></label>
          <label><span>Currency</span><input maxLength={3} value={draft.currency} onChange={(e)=>setDraft({...draft,currency:e.target.value.toUpperCase()})}/></label>
          <label><span>Scope</span><select value={draft.scope} onChange={(e)=>setDraft({...draft,scope:e.target.value as LicenseScope,selectedStemGroupIds:[]})}><option value="WORK">Work</option><option value="ALL_STEMS">All source groups</option><option value="SELECTED_STEMS">Selected source groups</option></select></label>
          <label><span>Project limit</span><input type="number" min="1" value={draft.projectLimit} onChange={(e)=>setDraft({...draft,projectLimit:e.target.value})}/></label>
          <label><span>Seat limit</span><input type="number" min="1" value={draft.seatLimit} onChange={(e)=>setDraft({...draft,seatLimit:e.target.value})}/></label>
        </div>
        <label><span>Summary</span><textarea rows={3} value={draft.summary} onChange={(e)=>setDraft({...draft,summary:e.target.value})}/></label>
        {draft.scope === "SELECTED_STEMS" ? (
          <div className="cms-check-grid">
            {data.work.stemGroups.map((stem) => (
              <label className="cms-check-card" key={stem.id}>
                <input type="checkbox" checked={draft.selectedStemGroupIds.includes(stem.id)}
                  onChange={(e)=>setDraft({...draft,selectedStemGroupIds:e.target.checked?[...draft.selectedStemGroupIds,stem.id]:draft.selectedStemGroupIds.filter((id)=>id!==stem.id)})}/>
                <span><strong>{stem.label}</strong></span>
              </label>
            ))}
          </div>
        ) : null}
        <div className="cms-check-grid">
          <label className="cms-check-card"><input type="checkbox" checked={draft.commercialUseAllowed} onChange={(e)=>setDraft({...draft,commercialUseAllowed:e.target.checked})}/><span><strong>Commercial use</strong></span></label>
          <label className="cms-check-card"><input type="checkbox" checked={draft.derivativesAllowed} onChange={(e)=>setDraft({...draft,derivativesAllowed:e.target.checked})}/><span><strong>Derivatives</strong></span></label>
          <label className="cms-check-card"><input type="checkbox" checked={draft.attributionRequired} onChange={(e)=>setDraft({...draft,attributionRequired:e.target.checked})}/><span><strong>Attribution required</strong></span></label>
          <label className="cms-check-card"><input type="checkbox" checked={draft.redistributionAllowed} onChange={(e)=>setDraft({...draft,redistributionAllowed:e.target.checked})}/><span><strong>Redistribution</strong></span></label>
        </div>
        <label><span>License terms</span><textarea rows={12} value={draft.termsText} onChange={(e)=>setDraft({...draft,termsText:e.target.value})}/></label>
        <div className="cms-publish-actions">
          <button className="cms-primary-button" disabled={busy} onClick={()=>void save()} type="button">{busy?"Saving…":editingId?"Save license":"Create license"}</button>
          {editingId ? <button className="cms-secondary-button" onClick={()=>{setEditingId(null);setDraft(emptyDraft());}} type="button">Cancel</button> : null}
        </div>
        {message ? <p className="cms-message">{message}</p> : null}
        {error ? <p className="cms-error">{error}</p> : null}
      </section>

      <section className="cms-panel">
        <div className="cms-panel__heading"><div><p className="eyebrow">Offerings</p><h2>License products</h2></div></div>
        <div className="license-admin__list">
          {data.work.licenseProducts.map((product) => {
            const version=currentVersion(product);
            return <article className="license-admin__row" key={product.id}>
              <div><strong>{product.name}</strong><span>{product.scope.replaceAll("_"," ")} · v{version?.version ?? "—"} · {product.isActive?"Active":"Inactive"}</span></div>
              <div><strong>{version ? (version.priceCents/100).toLocaleString(undefined,{style:"currency",currency:version.currency}) : "—"}</strong><span>{product.versions.length} immutable version{product.versions.length===1?"":"s"}</span></div>
              <div className="license-admin__actions"><button onClick={()=>edit(product)} type="button">Edit</button><button onClick={()=>void toggle(product)} type="button">{product.isActive?"Deactivate":"Activate"}</button></div>
            </article>;
          })}
          {!data.work.licenseProducts.length ? <p className="cms-empty">No license products yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
