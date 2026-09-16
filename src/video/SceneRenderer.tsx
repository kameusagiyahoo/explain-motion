import type { ComponentType } from "react";
import type { Scene } from "@/lib/video-plan/schema";
import type { VideoTheme } from "./themes";
import { ComparisonScene } from "./scenes/ComparisonScene";
import { DiagramScene } from "./scenes/DiagramScene";
import { NumberScene } from "./scenes/NumberScene";
import { StepsScene } from "./scenes/StepsScene";
import { SummaryScene } from "./scenes/SummaryScene";
import { TextScene } from "./scenes/TextScene";
import { TitleScene } from "./scenes/TitleScene";

type SceneComponent = ComponentType<{ scene: never; theme: VideoTheme }>;
export const sceneRegistry = { title: TitleScene, text: TextScene, comparison: ComparisonScene, steps: StepsScene, diagram: DiagramScene, number: NumberScene, summary: SummaryScene } satisfies Record<Scene["type"], ComponentType<never>>;
export function SceneRenderer({ scene, theme }: { scene: Scene; theme: VideoTheme }) { const Component = sceneRegistry[scene.type] as SceneComponent; return <Component scene={scene as never} theme={theme} />; }
