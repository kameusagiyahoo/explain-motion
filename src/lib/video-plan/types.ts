export type {
  Audience,
  GeneratePlanRequest,
  Scene,
  VideoPlan,
  VideoStyle,
} from "./schema";

export type SceneType = import("./schema").Scene["type"];
export const VIDEO_PLAN_VERSION = 1 as const;
