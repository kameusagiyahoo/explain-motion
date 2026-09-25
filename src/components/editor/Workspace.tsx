"use client";
import { useRef, useState } from "react";
import type { PlayerRef } from "@remotion/player";
import { normalizeVideoPlan } from "@/lib/video-plan/normalize";
import type { Audience, Scene, VideoPlan, VideoStyle } from "@/lib/video-plan/schema";
import { isVideoPlanV2, narrationTextForScene, updateNarrationForScene } from "@/lib/video-plan/timing";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { Storyboard } from "@/components/storyboard/Storyboard";
import { SceneEditor } from "./SceneEditor";
import type { PublicContentSource } from "@/lib/content/schema";

const samples = ["ブラックホールとは？", "ニューラルネットワークとは？", "インフレとは？", "DNAとは？", "TCP/IPとは？"];
const loadingSteps = ["Analyzing topic...", "Planning story...", "Designing scenes..."];
type AiMode = "mock" | "openai";
type InputMode = "text" | "url";

export function Workspace({ initialPlan }: { initialPlan: VideoPlan }) {
  const [prompt, setPrompt] = useState("ブラックホールとは何か、高校生にも分かるように説明して");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [url, setUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState<30 | 60 | 90>(30);
  const [audience, setAudience] = useState<Audience>("beginner");
  const [style, setStyle] = useState<VideoStyle>("tech");
  const [plan, setPlan] = useState(initialPlan);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AiMode>("mock");
  const [source, setSource] = useState<PublicContentSource | null>(null);
  const playerRef = useRef<PlayerRef>(null);

  async function generate() {
    if (inputMode === "text" && prompt.trim().length < 3) return setError("説明したい内容を3文字以上で入力してください。");
    if (inputMode === "url") {
      try { new URL(url); } catch { return setError("有効なURLを入力してください。"); }
    }
    setLoading(true); setError(null); setSelected(0);
    const timer = window.setInterval(() => setLoadingStep((value) => (value + 1) % loadingSteps.length), 1100);
    try {
      const input = inputMode === "text" ? { type: "text" as const, text: prompt } : { type: "url" as const, url };
      const response = await fetch("/api/generate-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input, durationSeconds, audience, style, language: "ja" }) });
      const body: { plan?: VideoPlan; mode?: AiMode; source?: PublicContentSource; error?: string } = await response.json();
      if (!response.ok || !body.plan) throw new Error(body.error || "VideoPlanを生成できませんでした。");
      setPlan(body.plan); setMode(body.mode ?? "mock"); setSource(body.source ?? null); playerRef.current?.seekTo(0);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "生成中にエラーが発生しました。"); }
    finally { window.clearInterval(timer); setLoading(false); setLoadingStep(0); }
  }

  async function regenerateSelectedScene() {
    setRegenerating(true); setError(null);
    try {
      const regenerationPrompt = source?.inputType === "url" ? `${source.title}\n${source.excerpt}` : prompt;
      const response = await fetch("/api/regenerate-scene", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: regenerationPrompt, audience, plan, sceneIndex: selected }) });
      const body: { scene?: Scene; mode?: AiMode; error?: string } = await response.json();
      if (!response.ok || !body.scene) throw new Error(body.error || "Sceneを再生成できませんでした。");
      const replacedPlan = normalizeVideoPlan({ ...plan, scenes: plan.scenes.map((scene, index) => index === selected ? body.scene : scene) });
      const nextPlan = isVideoPlanV2(replacedPlan) ? updateNarrationForScene(replacedPlan, body.scene.id, narrationTextForScene(body.scene)) : replacedPlan;
      setPlan(nextPlan); setMode(body.mode ?? "mock");
      const start = nextPlan.scenes.slice(0, selected).reduce((sum, scene) => sum + scene.durationSeconds, 0);
      playerRef.current?.seekTo(start * nextPlan.fps);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Scene再生成中にエラーが発生しました。"); }
    finally { setRegenerating(false); }
  }

  function updateScene(nextScene: Scene) {
    try {
      const replacedPlan = normalizeVideoPlan({ ...plan, scenes: plan.scenes.map((scene, index) => index === selected ? nextScene : scene) });
      setPlan(isVideoPlanV2(replacedPlan) ? updateNarrationForScene(replacedPlan, nextScene.id, narrationTextForScene(nextScene)) : replacedPlan);
      setError(null);
    }
    catch { setError("Sceneの値を確認してください。空の項目や短すぎるdurationは保存できません。"); }
  }

  return <main className="workspace"><header className="topbar"><div><span className="brand-mark">EM</span><strong>ExplainMotion</strong></div><span className={`mode-badge ${mode}`}>{mode === "mock" ? "Mock AI" : "OpenAI"}</span></header><div className="work-grid"><section className="input-panel"><div className="panel-label">Input</div><h1>何を動画で説明しますか？</h1><p className="lead">AIがストーリーをVideoPlanに変換し、映像エンジンが描画します。</p><div className="input-tabs" role="tablist" aria-label="入力形式"><button type="button" role="tab" aria-selected={inputMode === "text"} onClick={() => setInputMode("text")}>Text</button><button type="button" role="tab" aria-selected={inputMode === "url"} onClick={() => setInputMode("url")}>URL</button></div>{inputMode === "text" ? <><label>説明したい内容<textarea className="prompt" value={prompt} maxLength={4000} onChange={(event) => setPrompt(event.target.value)} /></label><div className="samples">{samples.map((sample) => <button type="button" key={sample} onClick={() => setPrompt(sample)}>{sample}</button>)}</div></> : <label>説明したいページのURL<input type="url" value={url} maxLength={2048} placeholder="https://example.com/article" onChange={(event) => setUrl(event.target.value)} /><small className="input-hint">公開HTML・テキストページのみ。本文はサーバー側で安全に取得します。</small></label>}<div className="settings"><label>Duration<select value={durationSeconds} onChange={(event) => setDurationSeconds(Number(event.target.value) as 30 | 60 | 90)}><option value={30}>30 sec</option><option value={60}>60 sec</option><option value={90}>90 sec</option></select></label><label>Audience<select value={audience} onChange={(event) => setAudience(event.target.value as Audience)}><option value="beginner">Beginner</option><option value="general">General</option><option value="expert">Expert</option></select></label><label>Style<select value={style} onChange={(event) => setStyle(event.target.value as VideoStyle)}><option value="simple">Simple</option><option value="pop">Pop</option><option value="tech">Tech</option></select></label></div><button className="generate" type="button" disabled={loading || regenerating} onClick={generate}>{loading ? loadingSteps[loadingStep] : inputMode === "url" ? "Generate from URL" : "Generate video plan"}</button>{source?.citations.length ? <div className="source-card"><span>Source</span>{source.citations.map((citation) => <a key={citation.id} href={citation.url} target="_blank" rel="noreferrer">{citation.title}</a>)}</div> : null}{error && <div className="error" role="alert">{error}</div>}</section><section className="preview-panel"><div className="panel-heading"><div><span className="panel-label">Video preview</span><h2>{plan.title}</h2></div><span>{plan.durationSeconds}s · {plan.fps} fps</span></div><VideoPlayer plan={plan} playerRef={playerRef} /></section></div><Storyboard plan={plan} playerRef={playerRef} selected={selected} onSelect={setSelected} /><SceneEditor scene={plan.scenes[selected]} onChange={updateScene} onRegenerate={regenerateSelectedScene} regenerating={regenerating} /></main>;
}
