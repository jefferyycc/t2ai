import { NextResponse } from "next/server";
import { applyExerciseSwap, getCurrentPlan } from "@/lib/db";
import { generateStructuredData } from "@/lib/ai";
import { seedExercises } from "@/lib/data/exercises";
import { z } from "zod";

const adjustmentSchema = z.object({
  assistantMessage: z.string().describe("A concise conversational reply (max 3 short sentences) explaining the change made or why it couldn't be done."),
  hasAdjustment: z.boolean().describe("Whether you understood the request and found a valid swap."),
  dayId: z.string().nullable().describe("The ID of the WorkoutDay being modified."),
  workoutExerciseId: z.string().nullable().describe("The ID of the WorkoutExercise being replaced."),
  newExerciseId: z.string().nullable().describe("The ID of the new Exercise to use."),
  targetMuscle: z.string().nullable().describe("The primary muscle group targeted by the new exercise, e.g. 'Quads', 'Chest', 'Lats'"),
  sets: z.number().nullable().describe("The new number of sets, if an adjustment was requested or is appropriate."),
  reps: z.string().nullable().describe("The new reps string (e.g. '8-10'), if an adjustment was requested or is appropriate."),
});

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    const plan = getCurrentPlan();
    
    if (!plan) {
      return NextResponse.json({ error: "No active plan found." }, { status: 400 });
    }

    const available = seedExercises.map(e => ({
      id: e.id,
      name: e.name,
      category: e.category,
      equipment: e.equipment,
      avoidFor: e.avoidFor
    }));

    // Simplify the plan for the prompt to save tokens and improve reliability
    const simplifiedPlan = plan.days.map(day => ({
      dayId: day.id,
      title: day.title,
      exercises: day.exercises.map(ex => ({
        workoutExerciseId: ex.id,
        name: ex.name,
        category: ex.category,
        sets: ex.sets,
        reps: ex.reps
      }))
    }));

    const systemPrompt = `You are a helpful AI fitness coach. The user wants to modify their current workout plan.
Analyze their request, locate the appropriate exercise in their plan, and find a suitable replacement from the available exercises list.
You can also adjust the sets and reps if the user asks for more/less volume or intensity.
Only suggest replacements that make sense biomechanically (e.g. swap a squat for another squat) and respect their request.`;

    const userPrompt = `User request: ${message}

Current Plan:
${JSON.stringify(simplifiedPlan, null, 2)}

Available Exercises to choose from (only use 'id' for newExerciseId):
${JSON.stringify(available, null, 2)}

Determine if an adjustment is possible. If so, return hasAdjustment: true and provide the exact dayId, workoutExerciseId (from the Current Plan), and the newExerciseId (from the Available Exercises list). 
Also provide the targetMuscle group for the new exercise, and the updated sets/reps if appropriate.
Provide a very brief, friendly assistantMessage (max 3 short sentences) confirming the swap or explaining why it couldn't be done.`;

    const adjustment = await generateStructuredData({
      system: systemPrompt,
      prompt: userPrompt,
      schema: adjustmentSchema,
    });

    console.log('LLM Adjustment Decision:', adjustment);

    if (adjustment.hasAdjustment && adjustment.dayId && adjustment.workoutExerciseId && adjustment.newExerciseId) {
      const nextEx = seedExercises.find(e => e.id === adjustment.newExerciseId);
      const newName = nextEx ? `${nextEx.name} (${adjustment.targetMuscle || 'Muscle Group'})` : undefined;

      const result = applyExerciseSwap({
        dayId: adjustment.dayId,
        workoutExerciseId: adjustment.workoutExerciseId,
        newExerciseId: adjustment.newExerciseId,
        reason: message,
        newName: newName,
        sets: adjustment.sets ?? undefined,
        reps: adjustment.reps ?? undefined,
      });

      console.log('Swap Result:', result ? 'Success' : 'Failed (ID mismatch)');

      return NextResponse.json({
        assistantMessage: adjustment.assistantMessage,
        updatedPlan: getCurrentPlan(),
      });
    }

    return NextResponse.json({
      assistantMessage: adjustment.assistantMessage || "I couldn't figure out exactly what to swap. Could you clarify?",
      updatedPlan: null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to process adjustment. Please try again." },
      { status: 500 }
    );
  }
}