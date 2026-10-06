import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

export default async function SignInPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/admin");
  }

  return (
    <main className="shell" style={{ padding: "72px 0" }}>
      <p className="eyebrow">Administration</p>
      <h1>Sign in</h1>
      <p style={{ color: "var(--muted)" }}>
        Authentication is configured through Auth.js. Set GITHUB_ID,
        GITHUB_SECRET, NEXTAUTH_URL, and NEXTAUTH_SECRET to activate the
        administrative sign-in flow.
      </p>
      <a href="/api/auth/signin/github">Continue with GitHub</a>
    </main>
  );
}
