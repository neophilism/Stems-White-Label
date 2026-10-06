"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function NewWorkForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug }),
      });
      const payload = (await response.json()) as {
        work?: { id: string };
        error?: string;
      };

      if (!response.ok || !payload.work) {
        throw new Error(payload.error || "Unable to create Work.");
      }

      router.push("/admin/catalog/works/" + payload.work.id);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create Work.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="cms-form cms-form--narrow" onSubmit={submit}>
      <label className="cms-field">
        <span>Work title</span>
        <input
          autoFocus
          maxLength={180}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          required
          value={title}
        />
      </label>

      <label className="cms-field">
        <span>Slug <small>optional</small></span>
        <input
          maxLength={120}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="generated-from-title"
          value={slug}
        />
      </label>

      {error ? <p className="cms-error">{error}</p> : null}

      <button className="cms-primary-button" disabled={saving} type="submit">
        {saving ? "Creating…" : "Create Work"}
      </button>
    </form>
  );
}
