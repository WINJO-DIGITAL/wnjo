import { describe, expect, it } from "vitest";
import { crc32, zip } from "./zip";

/** Reads a stored zip back through its central directory, the way an unzip tool does. */
function read(buf: Buffer): { name: string; text: string; crcOk: boolean }[] {
  const end = buf.length - 22;
  expect(buf.readUInt32LE(end)).toBe(0x06054b50);
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  const out: { name: string; text: string; crcOk: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    expect(buf.readUInt32LE(p)).toBe(0x02014b50);
    const crc = buf.readUInt32LE(p + 16);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const offset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    expect(buf.readUInt32LE(offset)).toBe(0x04034b50);
    const start = offset + 30 + buf.readUInt16LE(offset + 26) + buf.readUInt16LE(offset + 28);
    const data = buf.subarray(start, start + size);
    out.push({ name, text: data.toString("utf8"), crcOk: crc32(data) === crc });
    p += 46 + nameLen;
  }
  return out;
}

describe("zip", () => {
  it("matches the standard checksum", () => {
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
  });

  it("writes files that read back whole, with their names and checksums", () => {
    const files = read(zip([{ name: "README.txt", data: "Hello" }, { name: "wording/home.txt", data: "Café £50" }, { name: "empty.txt", data: "" }]));
    expect(files.map((f) => f.name)).toEqual(["README.txt", "wording/home.txt", "empty.txt"]);
    expect(files.map((f) => f.text)).toEqual(["Hello", "Café £50", ""]);
    expect(files.every((f) => f.crcOk)).toBe(true);
  });

  it("holds binary data untouched", () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    const buf = zip([{ name: "photo.bin", data: bytes }]);
    const files = read(buf);
    expect(files[0].crcOk).toBe(true);
  });
});
