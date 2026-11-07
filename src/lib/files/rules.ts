/**
 * Project file rules: which types and sizes may be uploaded, how a file is named in storage, and who may upload
 * or download. Pure, so the rules are tested without a database or storage.
 */

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Only document and image types clients and staff actually send. Scripts, pages and archives of code are refused. */
export const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/zip": "zip",
};

export function validateUpload(input: { fileName: unknown; mimeType: unknown; sizeBytes: unknown }): { ok: true } | { ok: false; reason: string } {
  if (typeof input.fileName !== "string" || input.fileName.trim().length === 0) return { ok: false, reason: "Choose a file." };
  if (input.fileName.length > 255) return { ok: false, reason: "The file name is too long." };
  if (typeof input.mimeType !== "string" || !(input.mimeType in ALLOWED_TYPES)) {
    return { ok: false, reason: "That file type isn't accepted. Use PDF, images, Word, Excel, CSV, text or ZIP." };
  }
  if (typeof input.sizeBytes !== "number" || !Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    return { ok: false, reason: "The file is empty." };
  }
  if (input.sizeBytes > MAX_FILE_BYTES) return { ok: false, reason: "Files can be up to 50 MB." };
  return { ok: true };
}

/** A safe display and storage name: no paths, no control characters, no unusual symbols, a sensible length. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[^A-Za-z0-9._ -]+/g, "_").replace(/\s+/g, " ").trim();
  const trimmed = cleaned.slice(-120);
  return trimmed.length > 0 ? trimmed : "file";
}

/** tenant/project/uuid-name: the prefix ties a file to its project, so a confirm can't attach it elsewhere. */
export function storagePath(tenantId: string, projectId: string, uniqueId: string, fileName: string): string {
  return `${tenantId}/${projectId}/${uniqueId}-${sanitizeFileName(fileName)}`;
}

export function pathBelongsToProject(path: string, tenantId: string, projectId: string): boolean {
  return path.startsWith(`${tenantId}/${projectId}/`) && !path.includes("..");
}

/**
 * Who may do what with a file. Staff of the agency see everything. A client sees only customer-visible files on
 * their own organisation's projects, and may upload only customer-visible files there.
 */
export function fileAccess(input: { isStaff: boolean; isClientOfProject: boolean; fileIsInternal: boolean | null }): {
  canUpload: (internal: boolean) => boolean;
  canRead: boolean;
} {
  const canRead = input.isStaff || (input.isClientOfProject && input.fileIsInternal === false);
  return {
    canRead,
    canUpload: (internal: boolean) => input.isStaff || (input.isClientOfProject && !internal),
  };
}
