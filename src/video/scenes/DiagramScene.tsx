import { interpolate, useCurrentFrame } from "remotion";
import type { Scene } from "@/lib/video-plan/schema";
import type { VideoTheme } from "../themes";
import { SceneFrame, sceneTitleStyle } from "./shared";

type Props = { scene: Extract<Scene, { type: "diagram" }>; theme: VideoTheme };
export function DiagramScene({ scene, theme }: Props) { const frame = useCurrentFrame(); return <SceneFrame theme={theme} label="DIAGRAM"><h2 style={{ ...sceneTitleStyle(theme), marginTop: 60 }}>{scene.headline}</h2><div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flex: 1 }}>{scene.nodes.map((node, index) => <div key={node.id} style={{ display: "contents" }}><div style={{ width: 230, minHeight: 150, borderRadius: 80, border: `3px solid ${theme.primary}`, background: theme.surface, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", padding: 20, opacity: interpolate(frame, [index * 12, index * 12 + 15], [0, 1], { extrapolateRight: "clamp" }) }}><strong style={{ fontSize: 28 }}>{node.label}</strong><span style={{ color: theme.muted, fontSize: 20, marginTop: 10 }}>{node.detail}</span></div>{index < scene.nodes.length - 1 && <div style={{ color: theme.primary, fontSize: 38 }}>⟶<div style={{ fontSize: 16, textAlign: "center" }}>{scene.edges[index]?.label}</div></div>}</div>)}</div></SceneFrame>; }
