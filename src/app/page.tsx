import { Workspace } from "@/components/editor/Workspace";
import { generateMockVideoPlan } from "@/lib/ai/mockVideoPlan";

export default function Page() {
  const initialPlan = generateMockVideoPlan({ prompt: "ブラックホールとは？", durationSeconds: 30, audience: "beginner", style: "tech", language: "ja" });
  return <Workspace initialPlan={initialPlan} />;
}
