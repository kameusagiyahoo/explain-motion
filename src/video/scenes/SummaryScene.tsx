import { interpolate, useCurrentFrame } from "remotion";
import type { Scene } from "@/lib/video-plan/schema";
import type { VideoTheme } from "../themes";
import { SceneFrame, sceneTitleStyle } from "./shared";

type Props = { scene: Extract<Scene, { type: "summary" }>; theme: VideoTheme };
export function SummaryScene({ scene, theme }: Props) { const frame = useCurrentFrame(); return <SceneFrame theme={theme} label="SUMMARY"><h2 style={{ ...sceneTitleStyle(theme), marginTop: 70 }}>{scene.headline}</h2><div style={{ display: "grid", gap: 20, margin: "auto 0" }}>{scene.points.map((point, index) => <div key={point} style={{ background: theme.surface, borderLeft: `8px solid ${theme.primary}`, borderRadius: 14, padding: "20px 28px", fontSize: 30, opacity: interpolate(frame, [index * 12, index * 12 + 14], [0, 1], { extrapolateRight: "clamp" }) }}>✓ {point}</div>)}</div></SceneFrame>; }
