import { interpolate, useCurrentFrame } from "remotion";
import type { Scene } from "@/lib/video-plan/schema";
import type { VideoTheme } from "../themes";
import { SceneFrame, sceneTitleStyle } from "./shared";

type Props = { scene: Extract<Scene, { type: "text" }>; theme: VideoTheme };
export function TextScene({ scene, theme }: Props) {
  const frame = useCurrentFrame();
  return <SceneFrame theme={theme} label="CONCEPT"><div style={{ margin: "auto 0", maxWidth: 1040 }}><h2 style={sceneTitleStyle(theme)}>{scene.headline}</h2><p style={{ fontSize: 38, lineHeight: 1.55, marginTop: 42, color: theme.muted, opacity: interpolate(frame, [10, 28], [0, 1], { extrapolateRight: "clamp" }) }}>{scene.body}</p><div style={{ display: "flex", gap: 14, marginTop: 34 }}>{scene.highlights.map((item) => <span key={item} style={{ background: theme.secondary, color: theme.foreground, border: `1px solid ${theme.primary}`, borderRadius: 999, padding: "10px 18px", fontSize: 22 }}>{item}</span>)}</div></div></SceneFrame>;
}
