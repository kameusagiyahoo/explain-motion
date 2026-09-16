import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import type { VideoPlan } from "@/lib/video-plan/schema";
import { SceneRenderer } from "./SceneRenderer";
import { themes } from "./themes";

export function ExplainVideo({ plan }: { plan: VideoPlan }) {
  const transitionFrames = 12;
  return <TransitionSeries>{plan.scenes.flatMap((scene, index) => {
    const sequence = <TransitionSeries.Sequence key={`scene-${scene.id}`} durationInFrames={scene.durationSeconds * plan.fps + (index === 0 ? 0 : transitionFrames)} name={`${index + 1}. ${scene.type}`}><SceneRenderer scene={scene} theme={themes[plan.style]} /></TransitionSeries.Sequence>;
    if (index === 0) return [sequence];
    const presentation = plan.style === "tech" && index % 2 === 1 ? slide({ direction: "from-right" }) : fade();
    return [<TransitionSeries.Transition key={`transition-${scene.id}`} presentation={presentation} timing={linearTiming({ durationInFrames: transitionFrames })} />, sequence];
  })}</TransitionSeries>;
}
