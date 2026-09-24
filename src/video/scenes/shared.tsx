import type { PropsWithChildren } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoTheme } from "../themes";
import { AutoFitText } from "../text/AutoFitText";

export function SceneFrame({ children, theme, label }: PropsWithChildren<{ theme: VideoTheme; label: string }>) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: theme.background, color: theme.foreground, fontFamily: theme.fontFamily, padding: 72, overflow: "hidden", opacity: interpolate(frame, [0, 12, durationInFrames - 12, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }) }}>
      <div style={{ position: "absolute", top: 36, left: 72, color: theme.primary, fontSize: 18, fontWeight: 800, letterSpacing: 3 }}>{label}</div>
      {children}
    </AbsoluteFill>
  );
}

export function SceneTitle({ text, theme, marginTop = 60 }: { text: string; theme: VideoTheme; marginTop?: number }) {
  return <AutoFitText text={text} maxWidth={1136} maxLines={2} maxFontSize={54} minFontSize={34} fontFamily={theme.fontFamily} fontWeight={800} letterSpacing="-0.04em" lineHeight={1.15} style={{ marginTop, color: theme.foreground }} />;
}
