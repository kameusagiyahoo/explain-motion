import { videoPlanSchema, type VideoPlan } from "./schema";

const distributeSeconds = (weights: number[], target: number, minimum = 2) => {
  const remaining = target - minimum * weights.length;
  if (remaining < 0) {
    throw new Error("VideoPlan has too many scenes for the requested duration.");
  }
  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
  const exact = weights.map((weight) => (weight / totalWeight) * remaining);
  const allocated = exact.map(Math.floor);
  const spare = remaining - allocated.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let index = 0; index < spare; index += 1) {
    allocated[order[index % order.length].index] += 1;
  }
  return allocated.map((value) => value + minimum);
};

export function normalizeVideoPlan(input: unknown): VideoPlan {
  const parsed = videoPlanSchema.parse(input);
  const durations = distributeSeconds(
    parsed.scenes.map((scene) => scene.durationSeconds),
    parsed.durationSeconds,
  );

  return videoPlanSchema.parse({
    ...parsed,
    scenes: parsed.scenes.map((scene, index) => ({
      ...scene,
      durationSeconds: durations[index],
    })),
  });
}

export const durationOfScenes = (plan: VideoPlan) =>
  plan.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);

export const durationInFrames = (plan: VideoPlan) =>
  Math.round(plan.durationSeconds * plan.fps);
