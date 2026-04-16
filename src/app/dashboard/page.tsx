import Link from "next/link";
import { DashboardOverview } from "@/components/dashboard-overview";
import { getDashboardSnapshot } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { profile, plan } = await getDashboardSnapshot();

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
      </section>
      <DashboardOverview plan={plan} profile={profile} />
    </main>
  );
}
