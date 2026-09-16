import { SpringScaleIn } from "@/components/remocn/spring-scale-in";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "@/lib/video-plan/schema";
import type { VideoTheme } from "../themes";
import { SceneFrame } from "./shared";

type Props = { scene: Extract<Scene, { type: "number" }>; theme: VideoTheme };
export function NumberScene({ scene, theme }: Props) { const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const value = Math.round(interpolate(frame, [0, fps * 1.2], [0, scene.value], { extrapolateRight: "clamp" })); return <SceneFrame theme={theme} label="KEY NUMBER"><div style={{ position: "relative", flex: 1 }}><SpringScaleIn text={`${value.toLocaleString()}${scene.suffix ?? ""}`} fontSize={112} fontWeight={900} color={theme.primary} staggerDelay={1} /><div style={{ position: "absolute", left: 0, right: 0, top: "68%", textAlign: "center", fontSize: 30, color: theme.muted }}>{scene.label}</div></div></SceneFrame>; }
