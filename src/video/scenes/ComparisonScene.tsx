import { SpringScaleIn } from "@/components/remocn/spring-scale-in";
import type { Scene } from "@/lib/video-plan/schema";
import type { VideoTheme } from "../themes";
import { AutoFitText } from "../text/AutoFitText";
import { SceneFrame, SceneTitle } from "./shared";

type Props = { scene: Extract<Scene, { type: "comparison" }>; theme: VideoTheme };
export function ComparisonScene({ scene, theme }: Props) {
  return <SceneFrame theme={theme} label="COMPARE"><SceneTitle text={scene.headline} theme={theme} /><div style={{ display: "grid", gridTemplateColumns: "1fr 90px 1fr", alignItems: "center", flex: 1 }}><Card title={scene.left.title} body={scene.left.body} theme={theme} /><div style={{ position: "relative", height: 90 }}><SpringScaleIn text="VS" fontSize={40} color={theme.primary} fontFamily={theme.fontFamily} /></div><Card title={scene.right.title} body={scene.right.body} theme={theme} /></div></SceneFrame>;
}
function Card({ title, body, theme }: { title: string; body: string; theme: VideoTheme }) { return <div style={{ background: theme.surface, border: `2px solid ${theme.primary}`, borderRadius: 24, padding: 32, height: 250, overflow: "hidden" }}><AutoFitText text={title} maxWidth={445} maxLines={2} maxFontSize={36} minFontSize={24} fontFamily={theme.fontFamily} fontWeight={800} lineHeight={1.2} /><AutoFitText text={body} maxWidth={445} maxLines={3} maxFontSize={27} minFontSize={18} fontFamily={theme.fontFamily} fontWeight={400} lineHeight={1.4} style={{ color: theme.muted, marginTop: 20 }} /></div>; }
