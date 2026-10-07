import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { AcceptTeamInvitation } from "@/components/auth/accept-team-invitation";
import { authOptions } from "@/lib/auth";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function AcceptTeamInvitationPage({
  searchParams,
}: PageProps) {
  const [session, params] = await Promise.all([
    getServerSession(authOptions),
    searchParams,
  ]);
  const token = typeof params.token === "string" ? params.token : "";

  if (!token) {
    return (
      <main className="storefront-shell invitation-accept">
        <p className="micro-label">Team invitation</p>
        <h1>Invitation link unavailable.</h1>
        <p>This invitation link is missing its acceptance token.</p>
      </main>
    );
  }

  if (!session?.user?.id) {
    const callback = "/team/accept?token=" + encodeURIComponent(token);
    redirect("/auth/sign-in?callbackUrl=" + encodeURIComponent(callback));
  }

  return (
    <main className="storefront-shell invitation-accept">
      <p className="micro-label">Team invitation</p>
      <h1>Join the tenant workspace.</h1>
      <p>
        Signed in as {session.user?.email ?? session.user?.name}. Accepting
        creates only the tenant-scoped role specified by the invitation.
      </p>
      <AcceptTeamInvitation token={token} />
    </main>
  );
}
