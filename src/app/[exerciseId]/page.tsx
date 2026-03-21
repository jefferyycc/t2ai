import Link from "next/link";
import { seedExercises } from "@/lib/data/exercises";

export const dynamic = "force-dynamic";

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  
  // The exerciseId might sometimes contain extra info if the LLM concatenated it incorrectly,
  // though typically it should be the raw ID. Let's find the base ID.
  const baseId = exerciseId.split(' ')[0]; 
  const exercise = seedExercises.find((ex) => ex.id === exerciseId || ex.id === baseId);

  if (!exercise) {
    return (
      <main className="page-shell">
        <section className="surface-card">
          <p className="eyebrow">Exercise Detail</p>
          <h1 className="section-title-lg">Exercise not found</h1>
          <p className="muted-copy">
            The requested exercise could not be found in our database.
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

      <section className="surface-card">
        <p className="eyebrow">{exercise.category.replace("_", " ")}</p>
        <h1 className="section-title-lg">{exercise.name}</h1>
        
        <div className="mt-8 space-y-6">
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500">Equipment Needed</h3>
            <div className="flex gap-2 mt-2">
              {exercise.equipment.map(item => (
                <span key={item} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                  {item.replace("_", " ")}
                </span>
              ))}
            </div>
          </div>

          {exercise.avoidFor.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500">Caution For</h3>
              <div className="flex gap-2 mt-2">
                {exercise.avoidFor.map(limitation => (
                  <span key={limitation} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                    {limitation.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {exercise.notes && (
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500">Coach&apos;s Notes</h3>
              <p className="mt-2 text-gray-700 leading-relaxed">
                {exercise.notes}
              </p>
            </div>
          )}
          
          <div className="pt-6 border-t border-gray-100">
             <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
               {exercise.demoSupported ? "Instructional Video Placeholder" : "Video demonstration currently unavailable"}
             </div>
          </div>
        </div>
      </section>
    </main>
  );
}