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
            AI fitness coach that builds your plan, analyzes your form, and
            adapts as you improve.
          </h1>
          <p className="hero-description">
            Personalized plans, built by AI-flexible, adaptive, and easy to
            customize.
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
