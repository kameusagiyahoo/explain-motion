import { interpolate, useCurrentFrame } from "remotion";
import type { Scene } from "@/lib/video-plan/schema";
import type { VideoTheme } from "../themes";
import { AutoFitText } from "../text/AutoFitText";
import { SceneFrame, SceneTitle } from "./shared";

type Props = { scene: Extract<Scene, { type: "summary" }>; theme: VideoTheme };
export function SummaryScene({ scene, theme }: Props) { const frame = useCurrentFrame(); return <SceneFrame theme={theme} label="SUMMARY"><SceneTitle text={scene.headline} theme={theme} marginTop={50} /><div style={{ display: "grid", gap: 12, margin: "auto 0" }}>{scene.points.map((point, index) => <div key={`${point}-${index}`} style={{ background: theme.surface, borderLeft: `8px solid ${theme.primary}`, borderRadius: 14, padding: "14px 24px", minHeight: 66, display: "flex", alignItems: "center", gap: 12, opacity: interpolate(frame, [index * 12, index * 12 + 14], [0, 1], { extrapolateRight: "clamp" }) }}><span style={{ color: theme.primary, fontSize: 28, flexShrink: 0 }}>✓</span><AutoFitText text={point} maxWidth={1030} maxLines={2} maxFontSize={28} minFontSize={18} fontFamily={theme.fontFamily} fontWeight={400} lineHeight={1.3} /></div>)}</div></SceneFrame>; }
