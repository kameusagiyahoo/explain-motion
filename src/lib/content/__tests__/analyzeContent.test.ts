import { describe, expect, it, vi } from "vitest";
import { analyzeContent, ContentAnalysisError } from "../analyzeContent";

const publicDns = async () => [{ address: "93.184.216.34", family: 4 }];

describe("analyzeContent", () => {
  it("normalizes text input without inventing citations", async () => {
    const analyzed = await analyzeContent({ type: "text", text: "  ブラックホールとは？   高校生向けに説明して  " });
    expect(analyzed).toMatchObject({
      inputType: "text",
      title: "ブラックホールとは",
      citations: [],
    });
    expect(analyzed.text).toBe("ブラックホールとは？ 高校生向けに説明して");
  });

  it("extracts an article and records the final page as a citation", async () => {
    const html = `<!doctype html><html><head><meta content="宇宙の記事" property="og:title"></head><body>
      <nav>メニューは抽出しない</nav><article><h1>ブラックホール</h1>
      <p>ブラックホールは非常に強い重力を持つ天体です。</p>
      <p>巨大な星が重力崩壊することで生まれ、光さえ脱出できません。</p>
      <p>その境界は事象の地平面と呼ばれ、宇宙の仕組みを理解する重要な研究対象になっています。</p>
      <script>秘密のスクリプト</script></article></body></html>`;
    const fetchUrl = vi.fn(async () => new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } }));
    const analyzed = await analyzeContent({ type: "url", url: "https://example.com/space" }, { fetchUrl, resolveHost: publicDns });
    expect(analyzed.title).toBe("宇宙の記事");
    expect(analyzed.text).toContain("光さえ脱出できません");
    expect(analyzed.text).not.toContain("メニュー");
    expect(analyzed.text).not.toContain("秘密のスクリプト");
    expect(analyzed.citations).toEqual([{ id: "source-1", title: "宇宙の記事", url: "https://example.com/space" }]);
  });

  it.each([
    ["http://localhost/admin", publicDns],
    ["http://127.0.0.1/admin", publicDns],
    ["http://[::1]/admin", publicDns],
    ["https://metadata.example/admin", async () => [{ address: "169.254.169.254", family: 4 }]],
    ["https://private.example/admin", async () => [{ address: "10.0.0.8", family: 4 }]],
    ["https://private-v6.example/admin", async () => [{ address: "fd00::1", family: 6 }]],
  ])("rejects non-public target %s", async (url, resolveHost) => {
    const fetchUrl = vi.fn();
    await expect(analyzeContent({ type: "url", url }, { fetchUrl, resolveHost })).rejects.toBeInstanceOf(ContentAnalysisError);
    expect(fetchUrl).not.toHaveBeenCalled();
  });

  it("validates every redirect target before following it", async () => {
    const fetchUrl = vi.fn(async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/internal" } }));
    await expect(analyzeContent({ type: "url", url: "https://example.com/start" }, { fetchUrl, resolveHost: publicDns }))
      .rejects.toThrow("ローカルまたはプライベート");
    expect(fetchUrl).toHaveBeenCalledTimes(1);
  });

  it("rejects unsupported content types", async () => {
    const fetchUrl = async () => new Response("%PDF", { headers: { "content-type": "application/pdf" } });
    await expect(analyzeContent({ type: "url", url: "https://example.com/file.pdf" }, { fetchUrl, resolveHost: publicDns }))
      .rejects.toThrow("HTMLまたはプレーンテキスト");
  });

  it("rejects a declared response larger than one megabyte", async () => {
    const fetchUrl = async () => new Response("large", { headers: { "content-type": "text/plain", "content-length": "1000001" } });
    await expect(analyzeContent({ type: "url", url: "https://example.com/large" }, { fetchUrl, resolveHost: publicDns }))
      .rejects.toMatchObject({ status: 413 });
  });
});
