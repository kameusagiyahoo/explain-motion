"use client";
import { Player, type PlayerRef } from "@remotion/player";
import type { RefObject } from "react";
import type { VideoPlan } from "@/lib/video-plan/schema";
import { ExplainVideo } from "@/video/ExplainVideo";

export function VideoPlayer({ plan, playerRef }: { plan: VideoPlan; playerRef: RefObject<PlayerRef | null> }) {
  return <div style={{ aspectRatio: "16 / 9", width: "100%" }}><Player ref={playerRef} component={ExplainVideo} inputProps={{ plan }} durationInFrames={plan.durationSeconds * plan.fps} compositionWidth={1280} compositionHeight={720} fps={plan.fps} controls style={{ width: "100%", height: "100%", borderRadius: 14 }} acknowledgeRemotionLicense /></div>;
}
