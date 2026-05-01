# Backlog

## Open

- **Weekly muscle-group balance radar chart.** Show distribution across the 6 user-facing groups (back, legs, arms, shoulders, core, chest) on the dashboard or plan-summary page. Computed as weekly volume (sets × mid-reps) per group via a `categoryToMuscleGroup()` helper. Recharts `RadarChart` is already available. Note: the catalog has no arm-isolation movements, so "arms" reads as 0 unless we (a) add curls/triceps work + a new `arms_isolation` category, or (b) score arms as 0.5× secondary stimulus from horizontal pulls (biceps) and presses (triceps). Decide before implementing.
