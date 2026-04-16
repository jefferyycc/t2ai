import Link from "next/link";
import { SwapChat } from "@/components/swap-chat";
import { getWorkoutDay } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function WorkoutDayPage({
  params,
}: {
  params: Promise<{ dayId: string }>;
}) {
  const { dayId } = await params;
  const day = await getWorkoutDay(dayId);

  if (!day) {
    return (
      <main className="page-shell">
        <section className="surface-card">
          <p className="eyebrow">Workout day</p>
          <h1 className="section-title-lg">Workout not found</h1>
          <p className="muted-copy">
            The requested workout day does not exist in the current mock plan.
          </p>
          <Link className="secondary-button" href="/dashboard">
            Back to dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-actions">
        <Link className="text-link" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
      <SwapChat day={day} />
    </main>
  );
}
