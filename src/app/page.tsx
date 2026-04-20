import Link from "next/link";
import { OnboardingChat } from "@/components/onboarding-chat";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Train Train(T2ai)</p>
          <h1 className="section-title-xl">
            Tell me what I should do today.
          </h1>
          <p className="hero-description">
            A local-first AI strength coach for plans, swaps, and daily
            adjustments. Squat form analysis is the next golden demo, not the
            first screen.
          </p>
          <p className="mode-banner">
            Demo mode uses local memory. Connect with a Supabase bearer token
            for persisted API state.
          </p>
          <Link className="text-link" href="/dashboard">
            Go to Dashboard
          </Link>
        </div>

        <OnboardingChat />
      </section>
    </main>
  );
}
