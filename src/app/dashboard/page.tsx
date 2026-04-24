import Link from "next/link";
import { headers } from "next/headers";
import { DashboardOverview } from "@/components/dashboard-overview";
import { getDashboardSnapshot } from "@/lib/db";
import { getServerUserFromHeaders, isAuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let snapshot: Awaited<ReturnType<typeof getDashboardSnapshot>>;
  try {
    const user = await getServerUserFromHeaders(await headers());
    snapshot = await getDashboardSnapshot(user);
  } catch (error) {
    if (!isAuthError(error)) throw error;

    return (
      <main className="page-shell">
        <section className="surface-card">
          <p className="eyebrow">Dashboard</p>
          <h1 className="section-title-lg">Sign in required</h1>
          <p className="muted-copy">{error.message}</p>
          <Link className="secondary-button" href="/">
            Back to onboarding
          </Link>
        </section>
      </main>
    );
  }

  const { profile, plan, latestReadiness } = snapshot;

  if (!plan || !profile.onboardingComplete) {
    return (
      <main className="page-shell">
        <section className="surface-card">
          <p className="eyebrow">Dashboard</p>
          <h1 className="section-title-lg">No plan yet</h1>
          <p className="muted-copy">
            Finish the onboarding chat first so the app can generate your weekly
            training plan.
          </p>
          <Link className="primary-button" href="/">
            Go to onboarding
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="hero-band">
        <p className="eyebrow">Dashboard</p>
        <h1 className="section-title-xl">Your current training plan</h1>
        <p className="muted-copy">
          Review today&apos;s session, the full weekly split, and the current
          training profile driving the plan.
        </p>
        <p className="mode-banner">
          Demo mode: this web UI uses local in-memory state. Supabase-backed
          persistence is available through bearer-token API requests until login
          UI is added.
        </p>
      </section>
      <DashboardOverview plan={plan} profile={profile} latestReadiness={latestReadiness} />
    </main>
  );
}
