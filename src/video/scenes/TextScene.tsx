import { interpolate, useCurrentFrame } from "remotion";
import type { Scene } from "@/lib/video-plan/schema";
import type { VideoTheme } from "../themes";
import { AutoFitText } from "../text/AutoFitText";
import { SceneFrame, SceneTitle } from "./shared";

type Props = { scene: Extract<Scene, { type: "text" }>; theme: VideoTheme };
export function TextScene({ scene, theme }: Props) {
  const frame = useCurrentFrame();
  return <SceneFrame theme={theme} label="CONCEPT"><div style={{ margin: "auto 0", maxWidth: 1040 }}><SceneTitle text={scene.headline} theme={theme} marginTop={0} /><AutoFitText text={scene.body} maxWidth={1040} maxLines={3} maxFontSize={38} minFontSize={25} fontFamily={theme.fontFamily} fontWeight={400} lineHeight={1.5} style={{ marginTop: 34, color: theme.muted, opacity: interpolate(frame, [10, 28], [0, 1], { extrapolateRight: "clamp" }) }} /><div style={{ display: "flex", gap: 14, marginTop: 28 }}>{scene.highlights.map((item) => <div key={item} style={{ flex: "1 1 0", minWidth: 0, background: theme.secondary, color: theme.foreground, border: `1px solid ${theme.primary}`, borderRadius: 24, padding: "10px 14px", display: "flex", alignItems: "center" }}><AutoFitText text={item} maxWidth={300} maxLines={2} maxFontSize={22} minFontSize={16} fontFamily={theme.fontFamily} fontWeight={700} lineHeight={1.25} style={{ textAlign: "center" }} /></div>)}</div></div></SceneFrame>;
}
