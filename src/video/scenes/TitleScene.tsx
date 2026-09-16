import { SoftBlurIn } from "@/components/remocn/soft-blur-in";
import type { Scene } from "@/lib/video-plan/schema";
import type { VideoTheme } from "../themes";
import { SceneFrame } from "./shared";

type Props = { scene: Extract<Scene, { type: "title" }>; theme: VideoTheme };
export function TitleScene({ scene, theme }: Props) {
  return <SceneFrame theme={theme} label="EXPLAIN MOTION"><div style={{ position: "relative", flex: 1 }}><SoftBlurIn text={scene.headline} color={theme.foreground} fontSize={82} fontWeight={800} /><div style={{ position: "absolute", left: 0, right: 0, top: "66%", textAlign: "center", color: theme.muted, fontSize: 28 }}>{scene.subheadline}</div></div></SceneFrame>;
}
