import { NextResponse } from "next/server";
import { applyExerciseSwap, getAppState, getCurrentPlan } from "@/lib/db";
import { getServerUser, isAuthError, UserContext } from "@/lib/auth";
import { generateStructuredData } from "@/lib/ai";
import { retrieveSwapKnowledge } from "@/lib/knowledge-store";
import { seedExercises } from "@/lib/data/exercises";
import { muscleLabelFor, parseSwapIntent } from "@/lib/parse-swap-intent";
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

function hasTrainingRedFlag(message: string) {
  return /\b(sharp pain|chest pain|shortness of breath|dizzy|faint|numb|tingling|injury|injured|ill|sick|fever)\b/i.test(
    message,
  );
}

async function validateAdjustment(input: {
  dayId: string;
  workoutExerciseId: string;
  newExerciseId: string;
  sets: number | null;
  reps: string | null;
  message: string;
  user: UserContext;
}) {
  if (hasTrainingRedFlag(input.message)) {
    return {
      ok: false,
      reason:
        "I cannot safely adjust training around pain, illness, or injury from chat alone. Reduce intensity today and check with a qualified professional if symptoms persist.",
    };
  }

  const state = await getAppState(input.user);
  const plan = state.currentPlan;
  const day = plan?.days.find((candidate) => candidate.id === input.dayId);
  const currentExercise = day?.exercises.find(
    (candidate) => candidate.id === input.workoutExerciseId,
  );
  const nextExercise = seedExercises.find(
    (candidate) => candidate.id === input.newExerciseId,
  );

  if (!day || !currentExercise || !nextExercise) {
    return {
      ok: false,
      reason: "I could not find a valid exercise in the current plan to update.",
    };
  }

  if (nextExercise.category !== currentExercise.category) {
    return {
      ok: false,
      reason:
        "I found a possible change, but it does not match the movement pattern of the original exercise.",
    };
  }

  const hasEquipment = nextExercise.equipment.some((item) =>
    state.profile.equipment.includes(item),
  );
  if (!hasEquipment) {
    return {
      ok: false,
      reason:
        "I found a possible change, but it uses equipment that is not in your profile.",
    };
  }

  const blockedByLimitation =
    nextExercise.avoidFor.some((item) => state.profile.limitations.includes(item)) ||
    (state.profile.limitations.includes("shoulders") &&
      nextExercise.category === "push_vertical");
  if (blockedByLimitation) {
    return {
      ok: false,
      reason:
        "I found a possible change, but it conflicts with your saved limitations.",
    };
  }

  if (input.sets !== null && (input.sets < 1 || input.sets > 6)) {
    return {
      ok: false,
      reason: "I found a possible change, but the set count is outside the safe plan range.",
    };
  }

  if (input.reps !== null && input.reps.length > 20) {
    return {
      ok: false,
      reason: "I found a possible change, but the rep target is not specific enough.",
    };
  }

  return { ok: true, reason: null };
}

export async function POST(request: Request) {
  try {
    const user = await getServerUser(request);
    const { message } = await request.json();
    const plan = await getCurrentPlan(user);
    
    if (!plan) {
      return NextResponse.json({ error: "No active plan found." }, { status: 400 });
    }

    // Deterministic intent parsing: if the user named both the exercise to
    // replace and the target replacement, we resolve the IDs ourselves and
    // skip the LLM's selection step entirely. The LLM stays in the loop for
    // ambiguous requests ("give me an easier core move") but never overrides
    // an explicit user choice.
    const intent = parseSwapIntent(message, plan, seedExercises);

    if (intent.kind === "ambiguous-target") {
      const candidates = intent.toCandidateIds
        .map((id) => seedExercises.find((e) => e.id === id))
        .filter((e): e is typeof seedExercises[number] => Boolean(e));

      const namedList =
        candidates.length === 2
          ? `${candidates[0].name} or ${candidates[1].name}`
          : candidates
              .map((e, i) =>
                i === candidates.length - 1 ? `or ${e.name}` : e.name,
              )
              .join(", ");

      return NextResponse.json({
        assistantMessage: `Did you mean ${namedList}? Tell me which one and I'll make the swap.`,
        updatedPlan: null,
      });
    }

    if (intent.kind === "explicit") {
      const fromExercise = seedExercises.find((e) => e.id === intent.fromExerciseId);
      const toExercise = seedExercises.find((e) => e.id === intent.toExerciseId);

      if (!toExercise) {
        return NextResponse.json({
          assistantMessage: "I couldn't find that exercise in the catalog.",
          updatedPlan: null,
        });
      }

      // Surface a category-mismatch rejection with the actual movement
      // patterns named, instead of the validator's generic message.
      if (fromExercise && fromExercise.category !== toExercise.category) {
        return NextResponse.json({
          assistantMessage:
            `${fromExercise.name} is a ${fromExercise.category.replace(/_/g, " ")} movement and ` +
            `${toExercise.name} is a ${toExercise.category.replace(/_/g, " ")} movement, so ` +
            `I can't swap them directly. Want a different ${fromExercise.category.replace(/_/g, " ")} option instead?`,
          updatedPlan: null,
        });
      }

      const validation = await validateAdjustment({
        dayId: intent.dayId,
        workoutExerciseId: intent.workoutExerciseId,
        newExerciseId: intent.toExerciseId,
        sets: null,
        reps: null,
        message,
        user,
      });

      if (!validation.ok) {
        return NextResponse.json({
          assistantMessage: validation.reason,
          updatedPlan: null,
        });
      }

      const newName = `${toExercise.name} (${muscleLabelFor(toExercise.category)})`;
      const result = await applyExerciseSwap(
        {
          dayId: intent.dayId,
          workoutExerciseId: intent.workoutExerciseId,
          newExerciseId: intent.toExerciseId,
          reason: message,
          newName,
        },
        user,
      );

      const fromName = fromExercise?.name ?? "the exercise";
      return NextResponse.json({
        assistantMessage: result
          ? `Swapped ${fromName} for ${toExercise.name}.`
          : "I could not safely apply that change to the current plan.",
        updatedPlan: result ? await getCurrentPlan(user) : null,
      });
    }

    // Build a hint string for partial parses so the LLM doesn't free-select
    // a different exercise than the user named.
    const pinnedTarget =
      intent.kind === "to-only"
        ? seedExercises.find((e) => e.id === intent.toExerciseId)
        : null;
    const pinnedSource =
      intent.kind === "from-only" ? intent : null;

    const intentHint = pinnedTarget
      ? `\n\nIMPORTANT: The user explicitly named "${pinnedTarget.name}" as the replacement. You MUST set newExerciseId to "${pinnedTarget.id}" and not substitute a different exercise.`
      : pinnedSource
        ? `\n\nIMPORTANT: The user explicitly named the exercise to replace. You MUST set dayId to "${pinnedSource.dayId}" and workoutExerciseId to "${pinnedSource.workoutExerciseId}".`
        : "";

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

    // Retrieve relevant coaching knowledge from RAG if available
    const ragContext = await retrieveSwapKnowledge("plan adjustment", message);
    const ragSection = ragContext
      ? `\nRelevant coaching knowledge:\n${ragContext}\n`
      : "";

    const systemPrompt = `You are a helpful AI fitness coach. The user wants to modify their current workout plan.
Analyze their request, locate the appropriate exercise in their plan, and find a suitable replacement from the available exercises list.
You can also adjust the sets and reps if the user asks for more/less volume or intensity.
Only suggest replacements that make sense biomechanically (e.g. swap a squat for another squat) and respect their request.
If the user names a specific replacement exercise, you MUST use that exact exercise. If the named exercise is a different movement pattern (different category) than the original, set hasAdjustment: false and explain the mismatch in assistantMessage. Do NOT silently substitute a different exercise.
If coaching knowledge is provided, use it to ground your explanation.`;

    const userPrompt = `User request: ${message}

Current Plan:
${JSON.stringify(simplifiedPlan, null, 2)}

Available Exercises to choose from (only use 'id' for newExerciseId):
${JSON.stringify(available, null, 2)}${ragSection}${intentHint}

Determine if an adjustment is possible. If so, return hasAdjustment: true and provide the exact dayId, workoutExerciseId (from the Current Plan), and the newExerciseId (from the Available Exercises list).
Also provide the targetMuscle group for the new exercise, and the updated sets/reps if appropriate.
Provide a very brief, friendly assistantMessage (max 3 short sentences) confirming the swap or explaining why it couldn't be done.`;

    const adjustment = await generateStructuredData({
      system: systemPrompt,
      prompt: userPrompt,
      schema: adjustmentSchema,
    });

    if (adjustment.hasAdjustment && adjustment.dayId && adjustment.workoutExerciseId && adjustment.newExerciseId) {
      const validation = await validateAdjustment({
        dayId: adjustment.dayId,
        workoutExerciseId: adjustment.workoutExerciseId,
        newExerciseId: adjustment.newExerciseId,
        sets: adjustment.sets,
        reps: adjustment.reps,
        message,
        user,
      });

      if (!validation.ok) {
        return NextResponse.json({
          assistantMessage: validation.reason,
          updatedPlan: null,
        });
      }

      const nextEx = seedExercises.find(e => e.id === adjustment.newExerciseId);
      const newName = nextEx ? `${nextEx.name} (${adjustment.targetMuscle || 'Muscle Group'})` : undefined;

      const result = await applyExerciseSwap(
        {
          dayId: adjustment.dayId,
          workoutExerciseId: adjustment.workoutExerciseId,
          newExerciseId: adjustment.newExerciseId,
          reason: message,
          newName: newName,
          sets: adjustment.sets ?? undefined,
          reps: adjustment.reps ?? undefined,
        },
        user,
      );

      return NextResponse.json({
        assistantMessage: result
          ? adjustment.assistantMessage
          : "I could not safely apply that change to the current plan.",
        updatedPlan: result ? await getCurrentPlan(user) : null,
      });
    }

    return NextResponse.json({
      assistantMessage: adjustment.assistantMessage || "I couldn't figure out exactly what to swap. Could you clarify?",
      updatedPlan: null,
    });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to process adjustment", error);
    return NextResponse.json(
      { error: "Failed to process adjustment. Please try again." },
      { status: 500 }
    );
  }
}
