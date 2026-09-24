import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { generateMockVideoPlan } from "../src/lib/ai/mockVideoPlan";
import { videoPlanV1Schema, type Scene, type VideoPlan, type VideoPlanV1, type VideoStyle } from "../src/lib/video-plan/schema";

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
let renderedCases = 0;

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

  const overflowPlan = createOverflowPlan();
  const overflowProps = { plan: overflowPlan };
  const overflowComposition = await selectComposition({ serveUrl, id: "ExplainMotion", inputProps: overflowProps, puppeteerInstance: browser, logLevel: "warn" });
  let overflowStartFrame = 0;
  for (const scene of overflowPlan.scenes) {
    const frame = overflowStartFrame + Math.max(0, scene.durationSeconds * overflowPlan.fps - 15);
    await renderCase({ name: `overflow-${scene.type}`, plan: overflowPlan, frame, composition: overflowComposition });
    overflowStartFrame += scene.durationSeconds * overflowPlan.fps;
  }
} finally {
  await browser.close({ silent: true });
}

if (failures.length > 0) {
  throw new Error(`Visual regression failed:\n${failures.join("\n")}\nReview output/visual-regression and run npm run test:visual:update to accept intentional changes.`);
}

console.log(update ? `Updated ${renderedCases} visual baselines.` : `${renderedCases} visual regression snapshots passed.`);

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

function createOverflowPlan(): VideoPlanV1 {
  const base = toVersionOne(generateMockVideoPlan({ prompt: "日本語の長文レイアウト検証", durationSeconds: 30, audience: "expert", style: "tech", language: "ja" }), "tech");
  const long = (seed: string, length: number) => Array.from(seed.repeat(Math.ceil(length / Array.from(seed).length))).slice(0, length).join("");
  const scenes: Scene[] = base.scenes.map((scene) => {
    switch (scene.type) {
      case "title": return { ...scene, headline: long("非常に長い日本語タイトルを安全に表示する", 80), subheadline: long("補足説明も画面からはみ出さず読みやすい大きさへ自動調整します", 120) };
      case "text": return { ...scene, headline: long("重要な概念を長い見出しでも整理する", 80), body: long("本文が長くなった場合にも必要な情報を限られた表示領域へ収めながら視認性を維持するための説明です。", 180), highlights: [long("最重要ポイント", 40), long("決定的な文字計測", 40), long("安全な省略処理", 40)] };
      case "comparison": return { ...scene, headline: long("二つの考え方を詳しく比較して違いを明確にする", 80), left: { title: long("従来方式の長い名称", 50), body: long("固定サイズの文字は入力が長くなると表示領域の外へはみ出してしまいます。", 100) }, right: { title: long("自動調整方式の長い名称", 50), body: long("計測結果に基づき文字サイズと行数を調整し必要な場合だけ安全に省略します。", 100) } };
      case "steps": return { ...scene, headline: long("多数の処理ステップを長い説明付きで順番に表示する", 80), steps: Array.from({ length: 6 }, (_, index) => long(`${index + 1}番目の処理内容を詳しく説明する`, 50)) };
      case "diagram": return { ...scene, headline: long("多数のノードを含む概念図を限られた横幅へ配置する", 80), nodes: Array.from({ length: 6 }, (_, index) => ({ id: `node-${index}`, label: long(`${index + 1}番目の概念`, 50), detail: long("詳細な補足情報を表示", 80) })), edges: Array.from({ length: 5 }, (_, index) => ({ from: `node-${index}`, to: `node-${index + 1}`, label: long("関係", 40) })) };
      case "number": return { ...scene, value: 999999999999999, suffix: long("単位情報", 20), label: long("非常に大きな数値と長い説明文を組み合わせても安全に表示します", 100) };
      case "summary": return { ...scene, headline: long("最後のまとめを長い見出しでも明確に伝える", 80), points: Array.from({ length: 4 }, (_, index) => long(`${index + 1}番目の重要なまとめポイントを具体的に説明します`, 80)) };
    }
  });
  return videoPlanV1Schema.parse({ ...base, scenes });
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
  renderedCases++;

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
