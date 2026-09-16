import { SpringScaleIn } from "@/components/remocn/spring-scale-in";
import type { Scene } from "@/lib/video-plan/schema";
import type { VideoTheme } from "../themes";
import { SceneFrame, sceneTitleStyle } from "./shared";

type Props = { scene: Extract<Scene, { type: "comparison" }>; theme: VideoTheme };
export function ComparisonScene({ scene, theme }: Props) {
  return <SceneFrame theme={theme} label="COMPARE"><h2 style={{ ...sceneTitleStyle(theme), marginTop: 60 }}>{scene.headline}</h2><div style={{ display: "grid", gridTemplateColumns: "1fr 90px 1fr", alignItems: "center", flex: 1 }}><Card title={scene.left.title} body={scene.left.body} theme={theme} /><div style={{ position: "relative", height: 90 }}><SpringScaleIn text="VS" fontSize={40} color={theme.primary} /></div><Card title={scene.right.title} body={scene.right.body} theme={theme} /></div></SceneFrame>;
}
function Card({ title, body, theme }: { title: string; body: string; theme: VideoTheme }) { return <div style={{ background: theme.surface, border: `2px solid ${theme.primary}`, borderRadius: 24, padding: 38, minHeight: 220 }}><strong style={{ fontSize: 36 }}>{title}</strong><p style={{ color: theme.muted, fontSize: 27, lineHeight: 1.45, marginTop: 26 }}>{body}</p></div>; }
