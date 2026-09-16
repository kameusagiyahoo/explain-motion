"use client";
import { useRef, useState } from "react";
import type { RenderJob } from "@/lib/render-jobs/schema";
import type { VideoPlan } from "@/lib/video-plan/schema";

const activeStatuses = new Set(["queued", "bundling", "rendering"]);
const statusLabels: Record<RenderJob["status"], string> = {
  queued: "Queued", bundling: "Preparing video", rendering: "Rendering MP4",
  completed: "MP4 ready", failed: "Render failed", cancelled: "Cancelled",
};

export function RenderExport({ plan }: { plan: VideoPlan }) {
  const [job, setJob] = useState<RenderJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollGeneration = useRef(0);
  const active = job ? activeStatuses.has(job.status) : false;

  async function start() {
    const generation = ++pollGeneration.current;
    setError(null);
    try {
      const created = await requestJob("/api/render-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      setJob(created);
      await poll(created.id, generation);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "MP4を書き出せませんでした。"); }
  }

  async function poll(id: string, generation: number) {
    while (generation === pollGeneration.current) {
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
      if (generation !== pollGeneration.current) return;
      const next = await requestJob(`/api/render-jobs/${id}`);
      setJob(next);
      if (!activeStatuses.has(next.status)) {
        if (next.status === "failed") setError(next.error || "MP4レンダーに失敗しました。");
        return;
      }
    }
  }

  async function cancel() {
    if (!job) return;
    ++pollGeneration.current;
    setError(null);
    try { setJob(await requestJob(`/api/render-jobs/${job.id}`, { method: "DELETE" })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "レンダーをキャンセルできませんでした。"); }
  }

  return <div className="render-export">
    <div className="render-export-actions">
      <button type="button" className="export-button" onClick={start} disabled={active}>{active ? statusLabels[job!.status] : "Export MP4"}</button>
      {active && <button type="button" className="cancel-render" onClick={cancel}>Cancel</button>}
      {job?.status === "completed" && job.downloadAvailable && <a className="download-render" href={`/api/render-jobs/${job.id}/download`}>Download MP4</a>}
    </div>
    {job && <div className="render-progress" aria-live="polite"><div><span>{statusLabels[job.status]}</span><span>{Math.round(job.progress * 100)}%</span></div><progress max={1} value={job.progress} />{job.expiresAt && job.status === "completed" && <small>一時ファイルは {new Date(job.expiresAt).toLocaleTimeString("ja-JP")} まで保存されます。</small>}</div>}
    {error && <div className="render-error" role="alert">{error}</div>}
  </div>;
}

async function requestJob(url: string, init?: RequestInit): Promise<RenderJob> {
  const response = await fetch(url, init);
  const body: { job?: RenderJob; error?: string } = await response.json();
  if (!response.ok || !body.job) throw new Error(body.error || "レンダーサービスから正しい応答がありませんでした。");
  return body.job;
}
