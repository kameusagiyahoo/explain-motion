import type { CSSProperties } from "react";
import { fitTextBlock } from "./fitText";

type Props = {
  text: string;
  maxWidth: number;
  maxLines: number;
  maxFontSize: number;
  minFontSize: number;
  fontFamily: string;
  fontWeight?: number | string;
  letterSpacing?: string;
  lineHeight?: number;
  style?: CSSProperties;
};

export function AutoFitText({ text, maxWidth, maxLines, maxFontSize, minFontSize, fontFamily, fontWeight, letterSpacing, lineHeight = 1.25, style }: Props) {
  const fitted = fitTextBlock({ text, maxWidth, maxLines, maxFontSize, minFontSize, fontFamily, fontWeight, letterSpacing });
  return <div aria-label={text} data-truncated={fitted.truncated || undefined} style={{ ...style, width: "100%", maxWidth, overflow: "hidden", fontFamily, fontSize: fitted.fontSize, fontWeight, letterSpacing, lineHeight }}>
    {fitted.lines.map((line, index) => <span key={`${line}-${index}`} style={{ display: "block" }}>{line}</span>)}
  </div>;
}
