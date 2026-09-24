import { SpringScaleIn } from "@/components/remocn/spring-scale-in";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "@/lib/video-plan/schema";
import type { VideoTheme } from "../themes";
import { AutoFitText } from "../text/AutoFitText";
import { fitTextBlock } from "../text/fitText";
import { SceneFrame } from "./shared";

type Props = { scene: Extract<Scene, { type: "number" }>; theme: VideoTheme };
export function NumberScene({ scene, theme }: Props) { const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const value = Math.round(interpolate(frame, [0, fps * 1.2], [0, scene.value], { extrapolateRight: "clamp" })); const displayValue = `${value.toLocaleString()}${scene.suffix ?? ""}`; const fitted = fitTextBlock({ text: displayValue, maxWidth: 1050, maxLines: 1, maxFontSize: 112, minFontSize: 48, fontFamily: theme.fontFamily, fontWeight: 900, letterSpacing: "-0.03em" }); return <SceneFrame theme={theme} label="KEY NUMBER"><div style={{ position: "relative", flex: 1 }}><SpringScaleIn text={fitted.text} fontSize={fitted.fontSize} fontWeight={900} color={theme.primary} staggerDelay={1} fontFamily={theme.fontFamily} maxWidth={1050} /><AutoFitText text={scene.label} maxWidth={1000} maxLines={2} maxFontSize={30} minFontSize={20} fontFamily={theme.fontFamily} fontWeight={400} lineHeight={1.35} style={{ position: "absolute", left: "50%", top: "68%", translate: "-50% 0", textAlign: "center", color: theme.muted }} /></div></SceneFrame>; }
