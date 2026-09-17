import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { generateMockVideoPlan } from "../src/lib/ai/mockVideoPlan";
import { videoPlanV1Schema, type VideoPlan, type VideoPlanV1, type VideoStyle } from "../src/lib/video-plan/schema";

const projectRoot = process.cwd();
const baselineDir = path.join(projectRoot, "tests/visual/__snapshots__");
const artifactDir = path.join(projectRoot, "output/visual-regression");
const update = process.argv.includes("--update");
const styles: VideoStyle[] = ["simple", "pop", "tech"];
const maxDifferentPixelRatio = 0.01;

async function main() {
await mkdir(baselineDir, { recursive: true });
await mkdir(artifactDir, { recursive: true });

const serveUrl = await bundle({
  entryPoint: path.join(projectRoot, "src/remotion/index.ts"),
  enableCaching: true,
  onProgress: () => undefined,
  webpackOverride: (configuration) => ({
    ...configuration,
    resolve: {
      ...configuration.resolve,
      alias: { ...configuration.resolve?.alias, "@": path.join(projectRoot, "src") },
    },
  }),
});
const browser = await openBrowser("chrome", { logLevel: "warn" });
const failures: string[] = [];

try {
  for (const style of styles) {
    const source = generateMockVideoPlan({ prompt: "ブラックホールとは？", durationSeconds: 30, audience: "beginner", style, language: "ja" });
    const plan = toVersionOne(source, style);
    const inputProps = { plan };
    const composition = await selectComposition({ serveUrl, id: "ExplainMotion", inputProps, puppeteerInstance: browser, logLevel: "warn" });
    let sceneStartFrame = 0;
    for (const scene of plan.scenes) {
      const frame = sceneStartFrame + Math.max(0, scene.durationSeconds * plan.fps - 15);
      await renderCase({ name: `${style}-${scene.type}`, plan, frame, composition });
      sceneStartFrame += scene.durationSeconds * plan.fps;
    }
  }

  const captionPlan = generateMockVideoPlan({ prompt: "ブラックホールとは？", durationSeconds: 30, audience: "beginner", style: "tech", language: "ja" });
  const inputProps = { plan: captionPlan };
  const composition = await selectComposition({ serveUrl, id: "ExplainMotion", inputProps, puppeteerInstance: browser, logLevel: "warn" });
  await renderCase({ name: "tech-caption", plan: captionPlan, frame: 60, composition });
} finally {
  await browser.close({ silent: true });
}

if (failures.length > 0) {
  throw new Error(`Visual regression failed:\n${failures.join("\n")}\nReview output/visual-regression and run npm run test:visual:update to accept intentional changes.`);
}

console.log(update ? "Updated 22 visual baselines." : "22 visual regression snapshots passed.");

function toVersionOne(source: VideoPlan, style: VideoStyle): VideoPlanV1 {
  return videoPlanV1Schema.parse({
    version: 1,
    title: source.title,
    language: source.language,
    fps: source.fps,
    durationSeconds: source.durationSeconds,
    style,
    scenes: source.scenes,
  });
}

async function renderCase({ name, plan, frame, composition }: {
  name: string;
  plan: VideoPlan;
  frame: number;
  composition: Awaited<ReturnType<typeof selectComposition>>;
}) {
  const actualPath = path.join(artifactDir, `${name}.png`);
  const baselinePath = path.join(baselineDir, `${name}.png`);
  const diffPath = path.join(artifactDir, `${name}.diff.png`);
  await renderStill({
    composition,
    serveUrl,
    output: actualPath,
    inputProps: { plan },
    frame,
    imageFormat: "png",
    scale: 0.5,
    puppeteerInstance: browser,
    logLevel: "warn",
  });

  if (update) {
    await writeFile(baselinePath, await readFile(actualPath));
    return;
  }
  try {
    await access(baselinePath);
  } catch {
    failures.push(`${name}: baseline is missing`);
    return;
  }

  const expected = PNG.sync.read(await readFile(baselinePath));
  const actual = PNG.sync.read(await readFile(actualPath));
  if (expected.width !== actual.width || expected.height !== actual.height) {
    failures.push(`${name}: expected ${expected.width}x${expected.height}, received ${actual.width}x${actual.height}`);
    return;
  }
  const diff = new PNG({ width: actual.width, height: actual.height });
  const differentPixels = pixelmatch(expected.data, actual.data, diff.data, actual.width, actual.height, { threshold: 0.12, includeAA: false });
  const ratio = differentPixels / (actual.width * actual.height);
  if (ratio > maxDifferentPixelRatio) {
    await writeFile(diffPath, PNG.sync.write(diff));
    failures.push(`${name}: ${(ratio * 100).toFixed(2)}% pixels differ (limit ${(maxDifferentPixelRatio * 100).toFixed(2)}%)`);
  }
}
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
