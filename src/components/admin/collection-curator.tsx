"use client";

import { useEffect, useMemo, useState } from "react";

type Work = {
  id: string;
  title: string;
  slug: string;
  status: string;
};

type Collection = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  works: Array<{ position: number; work: Work }>;
};

type Payload = {
  collections: Collection[];
  works: Work[];
};

type Draft = {
  title: string;
  slug: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  orderedWorkIds: string[];
};

function blankDraft(): Draft {
  return {
    title: "",
    slug: "",
    description: "",
    status: "DRAFT",
    orderedWorkIds: [],
  };
}

function move<T>(items: T[], index: number, delta: number) {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function CollectionCurator() {
  const [data, setData] = useState<Payload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(preferId?: string | null) {
    const response = await fetch("/api/admin/collections", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load Collections.");
    setData(payload);

    const targetId = preferId ?? selectedId;
    const selected = targetId
      ? payload.collections.find((collection: Collection) => collection.id === targetId)
      : null;

    if (selected) {
      setSelectedId(selected.id);
      setDraft({
        title: selected.title,
        slug: selected.slug,
        description: selected.description ?? "",
        status: selected.status,
        orderedWorkIds: selected.works.map((entry: Collection["works"][number]) => entry.work.id),
      });
    }
  }

  useEffect(() => {
    void load().catch((loadError) =>
      setError(loadError instanceof Error ? loadError.message : "Unable to load Collections."),
    );
  }, []);

  const workById = useMemo(
    () => new Map((data?.works ?? []).map((work) => [work.id, work])),
    [data],
  );
  const availableWorks = (data?.works ?? []).filter(
    (work) => !draft.orderedWorkIds.includes(work.id),
  );

  function selectCollection(collection: Collection) {
    setSelectedId(collection.id);
    setDraft({
      title: collection.title,
      slug: collection.slug,
      description: collection.description ?? "",
      status: collection.status,
      orderedWorkIds: collection.works.map((entry) => entry.work.id),
    });
    setMessage(null);
    setError(null);
  }

  function newCollection() {
    setSelectedId(null);
    setDraft(blankDraft());
    setMessage(null);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        selectedId ? "/api/admin/collections/" + selectedId : "/api/admin/collections",
        {
          method: selectedId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save Collection.");

      setSelectedId(payload.collection.id);
      await load(payload.collection.id);
      setMessage("Collection saved. Public ordering now matches this sequence.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save Collection.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <p className="cms-loading">Loading Collection curator…</p>;

  return (
    <div className="collection-curator">
      <aside className="collection-curator__rail">
        <div className="collection-curator__rail-head">
          <div>
            <p className="eyebrow">Archive rooms</p>
            <h2>Collections</h2>
          </div>
          <button className="cms-secondary-button" onClick={newCollection} type="button">
            + New
          </button>
        </div>

        <div className="collection-curator__list">
          {data.collections.map((collection) => (
            <button
              className={
                "collection-curator__collection" +
                (selectedId === collection.id ? " collection-curator__collection--active" : "")
              }
              key={collection.id}
              onClick={() => selectCollection(collection)}
              type="button"
            >
              <strong>{collection.title}</strong>
              <span>{collection.status} · {collection.works.length} Works</span>
            </button>
          ))}
          {!data.collections.length ? (
            <p className="cms-empty">No Collections yet.</p>
          ) : null}
        </div>
      </aside>

      <section className="cms-panel collection-curator__editor">
        <div className="cms-panel__heading">
          <p className="eyebrow">{selectedId ? "Edit room" : "New room"}</p>
          <h2>{draft.title || "Untitled Collection"}</h2>
          <p>
            The Work sequence below is the public editorial order. Search never
            replaces this authored path through the Collection.
          </p>
        </div>

        <div className="cms-grid cms-grid--2">
          <label className="cms-field">
            <span>Title</span>
            <input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </label>
          <label className="cms-field">
            <span>Slug</span>
            <input
              value={draft.slug}
              onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
              placeholder="generated from title if blank"
            />
          </label>
          <label className="cms-field">
            <span>Status</span>
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  status: event.target.value as Draft["status"],
                })
              }
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <label className="cms-field cms-field--wide">
            <span>Description</span>
            <textarea
              rows={5}
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
            />
          </label>
        </div>

        <div className="collection-curator__sequence">
          <div className="cms-panel__heading cms-panel__heading--actions">
            <div>
              <p className="eyebrow">Editorial sequence</p>
              <h3>Works in this room</h3>
            </div>
          </div>

          {draft.orderedWorkIds.map((workId, index) => {
            const work = workById.get(workId);
            if (!work) return null;

            return (
              <article className="collection-curator__work" key={workId}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{work.title}</strong>
                  <small>{work.status} · {work.slug}</small>
                </div>
                <div>
                  <button
                    disabled={index === 0}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        orderedWorkIds: move(draft.orderedWorkIds, index, -1),
                      })
                    }
                    type="button"
                  >
                    ↑
                  </button>
                  <button
                    disabled={index === draft.orderedWorkIds.length - 1}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        orderedWorkIds: move(draft.orderedWorkIds, index, 1),
                      })
                    }
                    type="button"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() =>
                      setDraft({
                        ...draft,
                        orderedWorkIds: draft.orderedWorkIds.filter((id) => id !== workId),
                      })
                    }
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}

          {!draft.orderedWorkIds.length ? (
            <p className="cms-empty">No Works assigned yet.</p>
          ) : null}
        </div>

        {availableWorks.length ? (
          <div className="collection-curator__available">
            <p className="eyebrow">Add Work</p>
            <div>
              {availableWorks.map((work) => (
                <button
                  key={work.id}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      orderedWorkIds: [...draft.orderedWorkIds, work.id],
                    })
                  }
                  type="button"
                >
                  + {work.title} <span>{work.status}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="cms-publish-actions">
          <button
            className="cms-primary-button"
            disabled={busy}
            onClick={() => void save()}
            type="button"
          >
            {busy ? "Saving…" : "Save Collection"}
          </button>
        </div>
        {message ? <p className="cms-message">{message}</p> : null}
        {error ? <p className="cms-error">{error}</p> : null}
      </section>
    </div>
  );
}
