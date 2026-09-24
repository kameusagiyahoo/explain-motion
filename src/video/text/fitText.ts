import { fitTextOnNLines } from "@remotion/layout-utils";

type FitTextBlockOptions = {
  text: string;
  maxWidth: number;
  maxLines: number;
  maxFontSize: number;
  minFontSize: number;
  fontFamily: string;
  fontWeight?: number | string;
  letterSpacing?: string;
};

export type FittedTextBlock = {
  fontSize: number;
  lines: string[];
  text: string;
  truncated: boolean;
};

const japanesePattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

export function prepareTextForLineFitting(text: string): { measurementText: string; restoreLine: (line: string) => string } {
  const normalized = text.replace(/\s+/gu, " ").trim();
  if (!japanesePattern.test(normalized)) return { measurementText: normalized, restoreLine: (line) => line.trim() };
  const measurementText = Array.from(normalized.replaceAll(" ", "\u00a0")).join(" ");
  return {
    measurementText,
    restoreLine: (line) => line.replaceAll(" ", "").replaceAll("\u00a0", " ").trim(),
  };
}

export function fitTextBlock(options: FitTextBlockOptions): FittedTextBlock {
  const normalized = options.text.replace(/\s+/gu, " ").trim();
  const initial = measureCandidate(normalized, options, options.maxFontSize);
  if (initial.fontSize >= options.minFontSize) {
    return { fontSize: Math.min(options.maxFontSize, initial.fontSize), lines: initial.lines, text: normalized, truncated: false };
  }

  const graphemes = Array.from(normalized);
  let low = 0;
  let high = graphemes.length;
  let best = "…";
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = `${graphemes.slice(0, middle).join("").trimEnd()}…`;
    const measurement = measureCandidate(candidate, options, options.minFontSize);
    if (measurement.fontSize >= options.minFontSize - 0.01) {
      best = candidate;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  const fitted = measureCandidate(best, options, options.minFontSize);
  return { fontSize: options.minFontSize, lines: fitted.lines, text: best, truncated: true };
}

function measureCandidate(text: string, options: FitTextBlockOptions, maxFontSize: number) {
  const prepared = prepareTextForLineFitting(text);
  const result = fitTextOnNLines({
    text: prepared.measurementText,
    maxLines: options.maxLines,
    maxBoxWidth: options.maxWidth,
    maxFontSize,
    fontFamily: options.fontFamily,
    fontWeight: options.fontWeight,
    letterSpacing: options.letterSpacing,
    validateFontIsLoaded: true,
  });
  return { fontSize: result.fontSize, lines: result.lines.map(prepared.restoreLine) };
}

export function uniqueFontCharacters(text: string): string {
  return Array.from(new Set(Array.from(text))).join("");
}
