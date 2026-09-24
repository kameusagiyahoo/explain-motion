import { SoftBlurIn } from "@/components/remocn/soft-blur-in";
import type { Scene } from "@/lib/video-plan/schema";
import type { VideoTheme } from "../themes";
import { AutoFitText } from "../text/AutoFitText";
import { fitTextBlock } from "../text/fitText";
import { SceneFrame } from "./shared";

type Props = { scene: Extract<Scene, { type: "title" }>; theme: VideoTheme };
export function TitleScene({ scene, theme }: Props) {
  const headline = fitTextBlock({ text: scene.headline, maxWidth: 1050, maxLines: 2, maxFontSize: 82, minFontSize: 44, fontFamily: theme.fontFamily, fontWeight: 800, letterSpacing: "-0.05em" });
  return <SceneFrame theme={theme} label="EXPLAIN MOTION"><div style={{ position: "relative", flex: 1 }}><SoftBlurIn text={headline.lines.join("\n")} color={theme.foreground} fontSize={headline.fontSize} fontWeight={800} fontFamily={theme.fontFamily} maxWidth={1050} />{scene.subheadline && <AutoFitText text={scene.subheadline} maxWidth={960} maxLines={2} maxFontSize={28} minFontSize={20} fontFamily={theme.fontFamily} fontWeight={400} lineHeight={1.35} style={{ position: "absolute", left: "50%", top: "66%", translate: "-50% 0", textAlign: "center", color: theme.muted }} />}</div></SceneFrame>;
}
