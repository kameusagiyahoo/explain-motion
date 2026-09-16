import { interpolate, useCurrentFrame } from "remotion";
import type { Scene } from "@/lib/video-plan/schema";
import type { VideoTheme } from "../themes";
import { SceneFrame, sceneTitleStyle } from "./shared";

type Props = { scene: Extract<Scene, { type: "steps" }>; theme: VideoTheme };
export function StepsScene({ scene, theme }: Props) { const frame = useCurrentFrame(); return <SceneFrame theme={theme} label="PROCESS"><h2 style={{ ...sceneTitleStyle(theme), marginTop: 60 }}>{scene.headline}</h2><div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, flex: 1 }}>{scene.steps.map((step, index) => <div key={step} style={{ display: "contents" }}><div style={{ opacity: interpolate(frame, [index * 10, index * 10 + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), translate: `0 ${interpolate(frame, [index * 10, index * 10 + 12], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px`, background: theme.surface, borderRadius: 18, padding: "25px 20px", fontSize: 24, fontWeight: 700, textAlign: "center", minWidth: 175 }}>{step}</div>{index < scene.steps.length - 1 && <span style={{ color: theme.primary, fontSize: 34 }}>→</span>}</div>)}</div></SceneFrame>; }
