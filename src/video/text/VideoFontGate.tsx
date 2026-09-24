"use client";

import { useEffect, useState, type PropsWithChildren } from "react";
import { useDelayRender } from "remotion";
import { uniqueFontCharacters } from "./fitText";

const fontName = "Noto Sans JP Variable";
const fontWeights = [400, 700, 800, 900];

export function VideoFontGate({ children, text }: PropsWithChildren<{ text: string }>) {
  const [ready, setReady] = useState(false);
  const { cancelRender, continueRender, delayRender } = useDelayRender();

  useEffect(() => {
    const handle = delayRender("Loading deterministic Japanese video font");
    let active = true;
    const characters = uniqueFontCharacters(text) || "説明動画";
    Promise.all(fontWeights.map((weight) => document.fonts.load(`${weight} 16px "${fontName}"`, characters)))
      .then(() => {
        if (active) setReady(true);
        continueRender(handle);
      })
      .catch((error: unknown) => cancelRender(error));
    return () => {
      active = false;
      continueRender(handle);
    };
  }, [cancelRender, continueRender, delayRender, text]);

  return ready ? children : null;
}
