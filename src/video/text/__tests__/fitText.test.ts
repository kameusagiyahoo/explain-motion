import { describe, expect, it } from "vitest";
import { prepareTextForLineFitting, uniqueFontCharacters } from "../fitText";

describe("Japanese text fitting helpers", () => {
  it("creates break opportunities between Japanese graphemes and restores the text", () => {
    const prepared = prepareTextForLineFitting("長い日本語 タイトル");
    expect(prepared.measurementText).toContain("長 い 日 本 語");
    expect(prepared.restoreLine(prepared.measurementText)).toBe("長い日本語 タイトル");
  });

  it("keeps ordinary word boundaries for English", () => {
    const prepared = prepareTextForLineFitting("A clear explanation title");
    expect(prepared.measurementText).toBe("A clear explanation title");
  });

  it("deduplicates font preload characters deterministically", () => {
    expect(uniqueFontCharacters("説明を説明")).toBe("説明を");
  });
});
