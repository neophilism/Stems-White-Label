"use client";

import { useMemo, useState } from "react";

type Theme = {
  key: string;
  name: string;
  description: string;
  vars: {
    background: string;
    surface: string;
    ink: string;
    muted: string;
    accent: string;
  };
};

type Experience = {
  tenant: {
    name: string;
    slug: string;
    theme: {
      heroEyebrow: string | null;
      heroHeadline: string | null;
      heroSubheadline: string | null;
      footerStatement: string | null;
    } | null;
  };
  collections: Array<{
    id: string;
    title: string;
    description: string | null;
    works: Array<{
      id: string;
      slug: string;
      title: string;
      subtitle: string | null;
      artist: string | null;
      stemGroups: string[];
      licenses: Array<{ name: string; priceCents: number; currency: string }>;
    }>;
  }>;
};

type Feature = { eyebrow: string; title: string; body: string };
type Price = {
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: readonly string[];
  featured?: boolean;
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function DemoExperience({
  experience,
  features,
  pricing,
  themes,
}: {
  experience: Experience;
  features: readonly Feature[];
  pricing: readonly Price[];
  themes: readonly Theme[];
}) {
  const [themeKey, setThemeKey] = useState(themes[0]?.key ?? "");
  const [featureIndex, setFeatureIndex] = useState(0);
  const theme = useMemo(
    () => themes.find((entry) => entry.key === themeKey) ?? themes[0]!,
    [themeKey, themes],
  );

  const style = {
    "--demo-bg": theme.vars.background,
    "--demo-surface": theme.vars.surface,
    "--demo-ink": theme.vars.ink,
    "--demo-muted": theme.vars.muted,
    "--demo-accent": theme.vars.accent,
  } as React.CSSProperties;

  return (
    <main className="demo-shell" style={style}>
      <header className="demo-nav">
        <div>
          <span className="demo-mark">SW</span>
          <strong>Stems White Label</strong>
        </div>
        <nav>
          <a href="#storefront">Storefront</a>
          <a href="#features">Platform</a>
          <a href="#pricing">Pricing</a>
        </nav>
      </header>

      <section className="demo-hero">
        <div>
          <p className="eyebrow">White-label source commerce</p>
          <h1>One engine. A completely different artist world.</h1>
          <p>
            A presentation environment for prospective artists and labels:
            storefront, catalog, licensing, teams, analytics, domains, billing,
            and platform operations in one product.
          </p>
          <div className="demo-actions">
            <a className="demo-primary" href="#storefront">Enter sample tenant</a>
            <a className="demo-secondary" href="#pricing">See SaaS plans</a>
          </div>
        </div>
        <aside>
          <span>Operating model</span>
          <strong>One</strong>
          <small>white-label platform from storefront to operations</small>
        </aside>
      </section>

      <section className="demo-section" id="storefront">
        <div className="demo-section-heading">
          <div>
            <p className="eyebrow">Sample tenant</p>
            <h2>{experience.tenant.name}</h2>
            <p>
              A fictional tenant used only to demonstrate how the same platform
              can become an artist-specific presentation.
            </p>
          </div>
          <div className="demo-theme-picker" aria-label="Theme demonstration">
            {themes.map((entry) => (
              <button
                className={entry.key === theme.key ? "is-active" : ""}
                key={entry.key}
                onClick={() => setThemeKey(entry.key)}
                type="button"
              >
                <span>{entry.name}</span>
                <small>{entry.description}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="demo-storefront">
          <header>
            <span>{experience.tenant.theme?.heroEyebrow ?? experience.tenant.name}</span>
            <strong>{experience.tenant.theme?.heroHeadline ?? "Inside the record."}</strong>
            <p>{experience.tenant.theme?.heroSubheadline}</p>
          </header>

          {experience.collections.map((collection) => (
            <section key={collection.id}>
              <div className="demo-collection-heading">
                <div>
                  <span>Collection</span>
                  <h3>{collection.title}</h3>
                </div>
                <p>{collection.description}</p>
              </div>
              <div className="demo-work-grid">
                {collection.works.map((work, index) => (
                  <article key={work.id}>
                    <div className="demo-jacket">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{work.title.slice(0, 2).toUpperCase()}</strong>
                      <small>Source Edition</small>
                    </div>
                    <div className="demo-work-copy">
                      <span>{work.artist}</span>
                      <h4>{work.title}</h4>
                      <p>{work.subtitle}</p>
                      <ul>
                        {work.stemGroups.slice(0, 4).map((group) => <li key={group}>{group}</li>)}
                      </ul>
                      {work.licenses[0] ? (
                        <div className="demo-license">
                          <span>{work.licenses[0].name}</span>
                          <strong>
                            {money(work.licenses[0].priceCents, work.licenses[0].currency)}
                          </strong>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="demo-section" id="features">
        <div className="demo-section-heading">
          <div>
            <p className="eyebrow">Platform tour</p>
            <h2>From presentation to operations.</h2>
          </div>
        </div>
        <div className="demo-feature-tour">
          <div className="demo-feature-index">
            {features.map((feature, index) => (
              <button
                className={index === featureIndex ? "is-active" : ""}
                key={feature.eyebrow}
                onClick={() => setFeatureIndex(index)}
                type="button"
              >
                {feature.eyebrow}
              </button>
            ))}
          </div>
          <article>
            <span>{features[featureIndex]?.eyebrow}</span>
            <h3>{features[featureIndex]?.title}</h3>
            <p>{features[featureIndex]?.body}</p>
          </article>
        </div>
      </section>

      <section className="demo-section" id="pricing">
        <div className="demo-section-heading">
          <div>
            <p className="eyebrow">SaaS pricing</p>
            <h2>Scale the operating envelope.</h2>
            <p>
              Presentation pricing for demonstration. Production billing remains
              controlled by the subscription billing plan metadata configured by the operator.
            </p>
          </div>
        </div>
        <div className="demo-price-grid">
          {pricing.map((plan) => (
            <article className={plan.featured ? "is-featured" : ""} key={plan.name}>
              <span>{plan.name}</span>
              <strong>{plan.price}<small>{plan.cadence}</small></strong>
              <p>{plan.description}</p>
              <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <button type="button">Request access</button>
            </article>
          ))}
        </div>
      </section>

      <section className="demo-onboarding">
        <p className="eyebrow">Onboarding</p>
        <h2>Brand. Catalog. Commerce. Launch.</h2>
        <div>
          {[
            ["01", "Identity", "Choose tenant name, visual system, and storefront voice."],
            ["02", "Catalog", "Create Works, source groups, editorial context, and collections."],
            ["03", "Commerce", "Connect payouts, define versioned licenses, and select a SaaS plan."],
            ["04", "Launch", "Connect the domain, invite the team, publish, and measure engagement."],
          ].map(([number, title, body]) => (
            <article key={number}>
              <span>{number}</span>
              <strong>{title}</strong>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="demo-footer">
        <strong>Stems White Label</strong>
        <span>{experience.tenant.theme?.footerStatement}</span>
      </footer>
    </main>
  );
}
