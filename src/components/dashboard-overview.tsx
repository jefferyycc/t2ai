import Link from "next/link";
import { Profile, WorkoutPlan } from "@/lib/types";

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
        <ul className="stack-list">
          {today.exercises.slice(0, 4).map((exercise) => (
            <li key={exercise.id}>
              <span>{exercise.name}</span>
              <span>
                {exercise.sets} x {exercise.reps}
              </span>
            </li>
          ))}
        </ul>
        <Link className="secondary-button" href={`/workouts/${today.id}`}>
          Open workout day
        </Link>
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

      <section className="surface-card">
        <p className="eyebrow">Plan summary</p>
        <h2 className="section-title">Why this plan fits</h2>
        <p className="muted-copy">{plan.summary}</p>
      </section>
    </div>
  );
}
