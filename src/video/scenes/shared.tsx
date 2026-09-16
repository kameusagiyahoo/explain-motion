import type { PropsWithChildren } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoTheme } from "../themes";

export function SceneFrame({ children, theme, label }: PropsWithChildren<{ theme: VideoTheme; label: string }>) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: theme.background, color: theme.foreground, fontFamily: theme.fontFamily, padding: 72, opacity: interpolate(frame, [0, 12, durationInFrames - 12, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }) }}>
      <div style={{ position: "absolute", top: 36, left: 72, color: theme.primary, fontSize: 18, fontWeight: 800, letterSpacing: 3 }}>{label}</div>
      {children}
    </AbsoluteFill>
  );
}

export const sceneTitleStyle = (theme: VideoTheme) => ({ fontSize: 54, lineHeight: 1.15, letterSpacing: "-0.04em", margin: 0, color: theme.foreground, fontWeight: 800 });
