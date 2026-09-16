"use client";
import type { PlayerRef } from "@remotion/player";
import type { RefObject } from "react";
import type { VideoPlan } from "@/lib/video-plan/schema";

export function Storyboard({ plan, playerRef, selected, onSelect }: { plan: VideoPlan; playerRef: RefObject<PlayerRef | null>; selected: number; onSelect: (index: number) => void }) {
  const starts = plan.scenes.map((_, index) => plan.scenes.slice(0, index).reduce((sum, scene) => sum + scene.durationSeconds, 0));
  return <section className="storyboard"><div className="section-heading"><span>Storyboard</span><small>{plan.scenes.length} scenes · {plan.durationSeconds} sec</small></div><div className="storyboard-track">{plan.scenes.map((scene, index) => { const start = starts[index]; const end = start + scene.durationSeconds; return <button type="button" className={`story-card ${selected === index ? "active" : ""}`} key={scene.id} onClick={() => { onSelect(index); playerRef.current?.seekTo(Math.round(start * plan.fps)); }}><span className="story-index">{String(index + 1).padStart(2, "0")}</span><strong>{scene.type}</strong><small>{start}–{end} sec</small></button>; })}</div></section>;
}
