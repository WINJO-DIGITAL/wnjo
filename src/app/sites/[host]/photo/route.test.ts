import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { site: { host: string; site: { files: { path: string; type: string }[] } } | null; stored: Buffer | null; downloaded: string[] } = { site: null, stored: null, downloaded: [] };

vi.mock("@/lib/site-template/live-request", () => ({ liveSiteForRequest: async () => state.site }));
vi.mock("@/lib/site-template/live", async (original) => ({
  ...(await original<typeof import("@/lib/site-template/live")>()),
  publicSiteClient: () => ({
    storage: {
      from: () => ({
        download: async (path: string) => (state.downloaded.push(path), state.stored ? { data: new Blob([new Uint8Array(state.stored)]), error: null } : { data: null, error: { message: "missing" } }),
      }),
    },
  }),
}));

import { GET } from "./route";

const get = (query: string) => GET(new Request(`https://hartley.co.uk/photo?${query}`) as never, { params: Promise.resolve({ host: "hartley.co.uk" }) });
const widthOf = async (res: Response) => (await sharp(Buffer.from(await res.arrayBuffer())).metadata()).width;
const png = (width: number) => sharp({ create: { width, height: Math.round(width / 2), channels: 3, background: "#456" } }).png().toBuffer();

beforeEach(async () => {
  state.site = { host: "hartley.co.uk", site: { files: [{ path: "drafts/x/a.png", type: "image/png" }, { path: "drafts/x/m.svg", type: "image/svg+xml" }, { path: "drafts/x/doc.pdf", type: "application/pdf" }] } };
  state.stored = await png(1000);
  state.downloaded = [];
});

describe("the live photo route", () => {
  it("sends the website's own photo resized to the width asked, as WebP, kept for good", async () => {
    const res = await get("f=drafts%2Fx%2Fa.png&w=300");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(await widthOf(res)).toBe(300);
  });
  it("never enlarges a photo, and caps the width", async () => {
    expect(await widthOf(await get("f=drafts%2Fx%2Fa.png&w=1800"))).toBe(1000);
    expect(await widthOf(await get("f=drafts%2Fx%2Fa.png&w=99999"))).toBe(1000);
    expect(await widthOf(await get("f=drafts%2Fx%2Fa.png&w=10"))).toBe(200);
    expect(await widthOf(await get("f=drafts%2Fx%2Fa.png"))).toBe(1000);
  });
  it("serves nothing for a file that isn't this website's own, and never reads it from storage", async () => {
    expect((await get("f=drafts%2Fother%2Fsecret.png&w=900")).status).toBe(404);
    expect((await get("f=..%2F..%2Fetc%2Fpasswd")).status).toBe(404);
    expect((await get("")).status).toBe(404);
    expect(state.downloaded).toEqual([]);
  });
  it("serves nothing for a document, only pictures", async () => {
    expect((await get("f=drafts%2Fx%2Fdoc.pdf")).status).toBe(404);
  });
  it("serves nothing when there is no live site on that address", async () => {
    state.site = null;
    expect((await get("f=drafts%2Fx%2Fa.png")).status).toBe(404);
  });
  it("serves nothing when the file is gone from storage, or isn't a picture", async () => {
    state.stored = null;
    expect((await get("f=drafts%2Fx%2Fa.png")).status).toBe(404);
    state.stored = Buffer.from("this is not an image");
    expect((await get("f=drafts%2Fx%2Fa.png")).status).toBe(404);
  });
  it("sends a vector logo as it is, sandboxed so nothing in it can run", async () => {
    state.stored = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>');
    const res = await get("f=drafts%2Fx%2Fm.svg");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/svg+xml");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
