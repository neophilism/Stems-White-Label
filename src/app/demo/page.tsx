import { notFound } from "next/navigation";

import { DemoExperience } from "@/components/demo/demo-experience";
import {
  DEMO_FEATURES,
  DEMO_PRICING,
  DEMO_THEMES,
  demoModeEnabled,
  getDemoExperience,
} from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  if (!demoModeEnabled()) notFound();

  const experience = await getDemoExperience();
  if (!experience) {
    return (
      <main className="demo-shell">
        <section className="demo-missing">
          <p className="eyebrow">Presentation mode</p>
          <h1>Demo tenant is not seeded.</h1>
          <p>Run the demo seed command for this environment, then reload this page.</p>
        </section>
      </main>
    );
  }

  return (
    <DemoExperience
      experience={experience}
      features={DEMO_FEATURES}
      pricing={DEMO_PRICING}
      themes={DEMO_THEMES}
    />
  );
}
