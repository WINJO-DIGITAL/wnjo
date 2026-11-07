import { describe, expect, it } from "vitest";
import { fileAccess, MAX_FILE_BYTES, pathBelongsToProject, sanitizeFileName, storagePath, validateUpload } from "@/lib/files/rules";

const pdf = "application/pdf";

describe("validateUpload", () => {
  it("accepts an allowed type within the size limit", () => {
    expect(validateUpload({ fileName: "logo.pdf", mimeType: pdf, sizeBytes: 1000 })).toEqual({ ok: true });
  });

  it("refuses types that can run or hide code", () => {
    expect(validateUpload({ fileName: "x.html", mimeType: "text/html", sizeBytes: 10 }).ok).toBe(false);
    expect(validateUpload({ fileName: "x.svg", mimeType: "image/svg+xml", sizeBytes: 10 }).ok).toBe(false);
    expect(validateUpload({ fileName: "x.js", mimeType: "application/javascript", sizeBytes: 10 }).ok).toBe(false);
  });

  it("refuses empty and oversized files", () => {
    expect(validateUpload({ fileName: "a.pdf", mimeType: pdf, sizeBytes: 0 }).ok).toBe(false);
    expect(validateUpload({ fileName: "a.pdf", mimeType: pdf, sizeBytes: MAX_FILE_BYTES + 1 }).ok).toBe(false);
    expect(validateUpload({ fileName: "a.pdf", mimeType: pdf, sizeBytes: MAX_FILE_BYTES }).ok).toBe(true);
  });

  it("refuses a missing name and wrong-typed fields", () => {
    expect(validateUpload({ fileName: "  ", mimeType: pdf, sizeBytes: 10 }).ok).toBe(false);
    expect(validateUpload({ fileName: "a.pdf", mimeType: pdf, sizeBytes: "10" }).ok).toBe(false);
  });
});

describe("file names and paths", () => {
  it("strips folders and unusual characters from names", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("Brand guide <final>.pdf")).toBe("Brand guide _final_.pdf");
    expect(sanitizeFileName("   ")).toBe("file");
  });

  it("builds a path under the tenant and project", () => {
    expect(storagePath("t1", "p1", "u1", "Logo.pdf")).toBe("t1/p1/u1-Logo.pdf");
  });

  it("only accepts paths inside the project named at confirm time", () => {
    expect(pathBelongsToProject("t1/p1/u1-Logo.pdf", "t1", "p1")).toBe(true);
    expect(pathBelongsToProject("t1/p2/u1-Logo.pdf", "t1", "p1")).toBe(false);
    expect(pathBelongsToProject("t1/p1/../p2/x.pdf", "t1", "p1")).toBe(false);
  });
});

describe("who may upload and read", () => {
  it("lets staff upload internal and customer files and read everything", () => {
    const a = fileAccess({ isStaff: true, isClientOfProject: false, fileIsInternal: true });
    expect(a.canUpload(true)).toBe(true);
    expect(a.canUpload(false)).toBe(true);
    expect(a.canRead).toBe(true);
  });

  it("lets a client upload only customer-visible files to their own project", () => {
    const a = fileAccess({ isStaff: false, isClientOfProject: true, fileIsInternal: null });
    expect(a.canUpload(false)).toBe(true);
    expect(a.canUpload(true)).toBe(false);
  });

  it("never lets a client read an internal file, and lets them read a shared one", () => {
    expect(fileAccess({ isStaff: false, isClientOfProject: true, fileIsInternal: true }).canRead).toBe(false);
    expect(fileAccess({ isStaff: false, isClientOfProject: true, fileIsInternal: false }).canRead).toBe(true);
  });

  it("gives an outsider nothing", () => {
    const a = fileAccess({ isStaff: false, isClientOfProject: false, fileIsInternal: false });
    expect(a.canRead).toBe(false);
    expect(a.canUpload(false)).toBe(false);
  });
});
