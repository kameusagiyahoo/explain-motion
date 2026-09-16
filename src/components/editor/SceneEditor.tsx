"use client";
import type { Scene } from "@/lib/video-plan/schema";

type Props = {
  scene: Scene;
  onChange: (scene: Scene) => void;
  onRegenerate: () => void;
  regenerating: boolean;
};

export function SceneEditor({ scene, onChange, onRegenerate, regenerating }: Props) {
  const set = (patch: Partial<Scene>) => onChange({ ...scene, ...patch } as Scene);
  return <section className="scene-editor"><div className="section-heading"><span>Edit scene</span><div className="editor-actions"><small>{scene.type}</small><button type="button" className="regenerate-scene" disabled={regenerating} onClick={onRegenerate}>{regenerating ? "Regenerating..." : "Regenerate scene"}</button></div></div><label>Duration (sec)<input type="number" min={2} max={30} value={scene.durationSeconds} onChange={(event) => set({ durationSeconds: Number(event.target.value) })} /></label>{"headline" in scene && <label>Headline<input value={scene.headline} maxLength={80} onChange={(event) => set({ headline: event.target.value })} /></label>}{"body" in scene && <label>Body<textarea rows={3} value={scene.body} maxLength={180} onChange={(event) => set({ body: event.target.value })} /></label>}{scene.type === "summary" && <label>Points<textarea rows={4} value={scene.points.join("\n")} onChange={(event) => set({ points: event.target.value.split("\n").filter(Boolean).slice(0, 4) })} /></label>}{scene.type === "steps" && <label>Steps<textarea rows={5} value={scene.steps.join("\n")} onChange={(event) => set({ steps: event.target.value.split("\n").filter(Boolean).slice(0, 6) })} /></label>}</section>;
}
