"use client";

import { useState } from "react";

const workoutGoals = ["Fat loss", "Hypertrophy", "Strength", "General fitness"];
const workoutDays = ["2", "3", "4", "5", "6"];
const equipmentOptions = [
  "Bodyweight",
  "Dumbbells",
  "Barbell",
  "Gym machines",
  "Resistance bands",
];
const durations = ["30", "45", "60", "75"];
const experienceLevels = ["Beginner", "Intermediate", "Advanced"];
const limitations = [
  "Knees",
  "Shoulders",
  "Lower back",
  "Wrists",
  "None",
];

const todayWorkout = [
  "Goblet squat: 4 x 10",
  "Romanian deadlift: 3 x 8",
  "Incline dumbbell press: 4 x 10",
  "Chest-supported row: 3 x 12",
  "Dead bug: 3 x 12 each side",
];

const weeklySplit = [
  { day: "Mon", focus: "Lower body + core" },
  { day: "Tue", focus: "Upper push + pull" },
  { day: "Thu", focus: "Lower body strength" },
  { day: "Sat", focus: "Upper hypertrophy" },
];

const formFeedback = [
  "Squat: knees tracking better, depth still inconsistent on reps 7-9.",
  "RDL: hinge pattern looks solid, keep bar closer to the body.",
  "Push-up: shoulder position improved after reducing range slightly.",
];

const progressSummary = [
  "Workout completion: 87% this month",
  "Average session time: 48 minutes",
  "Most improved lift: Romanian deadlift +15 lb",
];

export default function Home() {
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([
    "Dumbbells",
    "Gym machines",
  ]);

  function toggleEquipment(option: string) {
    setSelectedEquipment((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  }

  return (
    <main className="page-shell">
      <section className="content-wrap">
        <div className="hero-copy">
          <p className="label">Personalized Fitness Web App</p>
          <h1 className="hero-title">
            Generate a workout plan, upload a set video, and improve over time.
          </h1>
          <p className="hero-description">
            Generate a personalized workout plan, upload a set video, get form
            feedback, and update your plan over time.
          </p>
        </div>

        <div className="builder-panel">
          <div className="panel-header">
            <div>
              <p className="chat-heading">Plan setup</p>
              <p className="chat-subheading">
                Set your goal, training schedule, equipment, and limitations.
              </p>
            </div>
            <button className="primary-button" type="button">
              Generate plan
            </button>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field-label">Workout goal</span>
              <select className="field-input" defaultValue="Hypertrophy">
                {workoutGoals.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Days per week</span>
              <select className="field-input" defaultValue="4">
                {workoutDays.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Workout duration</span>
              <select className="field-input" defaultValue="45">
                {durations.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration} min
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Experience level</span>
              <select className="field-input" defaultValue="Intermediate">
                {experienceLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Movement limitations</span>
              <select className="field-input" defaultValue="None">
                {limitations.map((limitation) => (
                  <option key={limitation} value={limitation}>
                    {limitation}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Optional body photo</span>
              <input
                className="field-input"
                type="file"
                accept="image/*"
              />
            </label>
          </div>

          <div className="equipment-group">
            <p className="field-label">Available equipment</p>
            <div className="chip-row">
              {equipmentOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`chip ${selectedEquipment.includes(option) ? "chip-active" : ""}`}
                  onClick={() => toggleEquipment(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-card">
            <p className="section-title">Today&apos;s workout</p>
            <ul className="simple-list">
              {todayWorkout.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button className="secondary-button" type="button">
              Open workout day
            </button>
          </section>

          <section className="dashboard-card">
            <p className="section-title">Weekly split</p>
            <ul className="split-list">
              {weeklySplit.map((item) => (
                <li key={item.day}>
                  <span>{item.day}</span>
                  <span>{item.focus}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="dashboard-card">
            <p className="section-title">Recent form feedback</p>
            <ul className="simple-list">
              {formFeedback.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="dashboard-card">
            <p className="section-title">Progress summary</p>
            <ul className="simple-list">
              {progressSummary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
