import { createTikTokStyleCaptions, type Caption, type TikTokPage } from "@remotion/captions";
import { useMemo } from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoPlanV2 } from "@/lib/video-plan/schema";
import type { VideoTheme } from "@/video/themes";

export function CaptionOverlay({ plan, theme }: { plan: VideoPlanV2; theme: VideoTheme }) {
  const pages = useMemo(() => createTikTokStyleCaptions({
    captions: plan.captions.cues.map(({ text, startMs, endMs, timestampMs, confidence, pageBreakAfter }) => ({ text, startMs, endMs, timestampMs, confidence, pageBreakAfter } satisfies Caption)),
    combineTokensWithinMilliseconds: 1600,
  }).pages, [plan.captions.cues]);

  if (!plan.captions.enabled) return null;
  return <AbsoluteFill style={{ pointerEvents: "none", justifyContent: "flex-end", alignItems: "center", padding: "0 80px 42px" }}>
    {pages.map((page, index) => {
      const from = Math.round(page.startMs / 1000 * plan.fps);
      const durationInFrames = Math.max(1, Math.round(page.durationMs / 1000 * plan.fps));
      return <Sequence key={`${page.startMs}-${index}`} from={from} durationInFrames={durationInFrames} layout="none">
        <CaptionPage page={page} preset={plan.captions.preset} theme={theme} />
      </Sequence>;
    })}
  </AbsoluteFill>;
}

function CaptionPage({ page, preset, theme }: { page: TikTokPage; preset: VideoPlanV2["captions"]["preset"]; theme: VideoTheme }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const absoluteTimeMs = page.startMs + frame / fps * 1000;
  return <div style={{
    maxWidth: 1000,
    borderRadius: 18,
    backgroundColor: `${theme.background}e6`,
    border: `1px solid ${theme.primary}55`,
    color: theme.foreground,
    fontFamily: theme.fontFamily,
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1.45,
    padding: "14px 24px",
    textAlign: "center",
    opacity: interpolate(frame, [0, Math.min(6, page.durationMs / 1000 * fps / 3)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  }}>
    {page.tokens.map((token, index) => <span key={`${token.fromMs}-${index}`} style={{ color: preset === "highlight" && token.fromMs <= absoluteTimeMs && token.toMs > absoluteTimeMs ? theme.primary : theme.foreground, whiteSpace: "pre-wrap" }}>{token.text}</span>)}
  </div>;
}
