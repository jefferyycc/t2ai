import Link from "next/link";
import { Profile, WorkoutPlan } from "@/lib/types";
import { PlanSummaryChat } from "./plan-summary-chat";

type DashboardOverviewProps = {
  profile: Profile;
  plan: WorkoutPlan;
};

function formatGoal(goal: Profile["workoutGoal"]) {
  switch (goal) {
    case "fat_loss":
      return "Fat loss";
    case "hypertrophy":
      return "Hypertrophy";
    case "strength":
      return "Strength";
    default:
      return "General fitness";
  }
}

export function DashboardOverview({
  profile,
  plan,
}: DashboardOverviewProps) {
  const today = plan.days[0];

  return (
    <div className="dashboard-grid">
      <section className="surface-card">
        <p className="eyebrow">Profile</p>
        <h2 className="section-title">Current training profile</h2>
        <div className="profile-grid">
          <div>
            <span className="meta-label">Goal</span>
            <p>{formatGoal(profile.workoutGoal)}</p>
          </div>
          <div>
            <span className="meta-label">Days / week</span>
            <p>{profile.workoutDaysPerWeek}</p>
          </div>
          <div>
            <span className="meta-label">Duration</span>
            <p>{profile.workoutDurationMinutes} min</p>
          </div>
          <div>
            <span className="meta-label">Experience</span>
            <p>{profile.experienceLevel}</p>
          </div>
        </div>
      </section>

      <section className="surface-card">
        <p className="eyebrow">Today</p>
        <h2 className="section-title">{today.title}</h2>
        <p className="muted-copy">{today.focus}</p>
        <div className="mt-4 mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 italic text-sm">
          {plan.summary}
        </div>
        <ul className="stack-list">
          {today.exercises.map((exercise) => (
            <li key={exercise.id}>
              <Link 
                href={`/${exercise.exerciseId}`}
                className="flex-1 group"
              >
                <div className="flex items-center gap-2">
                  <span className={`group-hover:text-blue-600 transition-colors ${exercise.isUpdated ? "text-green-600 font-medium" : ""}`}>
                    {exercise.name}
                  </span>
                  {exercise.isUpdated && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 animate-pulse">
                      ADJUSTED
                    </span>
                  )}
                </div>
              </Link>
              <span className={exercise.isUpdated ? "text-green-600 font-medium" : ""}>
                {exercise.sets} x {exercise.reps}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card">
        <p className="eyebrow">Weekly split</p>
        <h2 className="section-title">{plan.splitLabel}</h2>
        <ul className="stack-list">
          {plan.days.map((day) => (
            <li key={day.id}>
              <span>{day.title}</span>
              <span>{day.focus}</span>
            </li>
          ))}
        </ul>
      </section>

      <PlanSummaryChat planId={plan.id} />
    </div>
  );
}
