import Link from "next/link";
import { headers } from "next/headers";
import { SwapChat } from "@/components/swap-chat";
import { getWorkoutDay } from "@/lib/db";
import { getServerUserFromHeaders, isAuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WorkoutDayPage({
  params,
}: {
  params: Promise<{ dayId: string }>;
}) {
  const { dayId } = await params;
  let day = null;
  try {
    const user = await getServerUserFromHeaders(await headers());
    day = await getWorkoutDay(dayId, user);
  } catch (error) {
    if (!isAuthError(error)) throw error;

    return (
      <main className="page-shell">
        <section className="surface-card">
          <p className="eyebrow">Workout day</p>
          <h1 className="section-title-lg">Sign in required</h1>
          <p className="muted-copy">{error.message}</p>
          <Link className="secondary-button" href="/dashboard">
            Back to dashboard
          </Link>
        </section>
      </main>
    );
  }

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
