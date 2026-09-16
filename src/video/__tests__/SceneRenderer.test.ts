import { describe, expect, it } from "vitest";
import { sceneRegistry } from "../SceneRenderer";

describe("sceneRegistry", () => { it("registers every MVP scene", () => { expect(Object.keys(sceneRegistry).sort()).toEqual(["comparison", "diagram", "number", "steps", "summary", "text", "title"]); }); });
