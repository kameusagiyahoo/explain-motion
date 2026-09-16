import { Composition } from "remotion";
import { generateMockVideoPlan } from "@/lib/ai/mockVideoPlan";
import { normalizeVideoPlan } from "@/lib/video-plan/normalize";
import { ExplainVideo } from "@/video/ExplainVideo";

const samplePlan = generateMockVideoPlan({ prompt: "ブラックホールとは？", durationSeconds: 30, audience: "beginner", style: "tech", language: "ja" });
export function RemotionRoot() {
  return <Composition id="ExplainMotion" component={ExplainVideo} width={1280} height={720} fps={30} durationInFrames={900} defaultProps={{ plan: samplePlan }} calculateMetadata={({ props }) => { const plan = normalizeVideoPlan(props.plan); return { durationInFrames: plan.durationSeconds * plan.fps, props: { plan } }; }} />;
}
