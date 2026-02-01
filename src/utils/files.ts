import { createHash } from "crypto";
import { readFile, stat, readdir, rmdir } from "fs/promises";
import { lookup } from "mime-types";
import { extname, dirname } from "path";

export async function getFileHash(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash("md5").update(content).digest("hex");
}

export function getMimeType(filePath: string): string {
  return lookup(filePath) || "application/octet-stream";
}

export function getExtension(filePath: string): string {
  return extname(filePath).toLowerCase();
}

export async function getFileStats(filePath: string) {
  const stats = await stat(filePath);
  return {
    size: stats.size,
    isDirectory: stats.isDirectory(),
    isFile: stats.isFile(),
    created: stats.birthtime.toISOString(),
    modified: stats.mtime.toISOString(),
    accessed: stats.atime.toISOString(),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export async function countLinesWordsChars(
  filePath: string
): Promise<{ lines: number; words: number; characters: number }> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n").length;
  const words = content.split(/\s+/).filter((w) => w.length > 0).length;
  const characters = content.length;
  return { lines, words, characters };
}

export async function isDirectoryEmpty(dirPath: string): Promise<boolean> {
  try {
    const stats = await stat(dirPath);
    if (!stats.isDirectory()) {
      return false;
    }
    const entries = await readdir(dirPath);
    return entries.length === 0;
  } catch {
    return false;
  }
}

export async function removeEmptyDirectory(dirPath: string): Promise<{
  removed: boolean;
  reason: string;
}> {
  try {
    // Verificación 1: debe existir y ser un directorio
    const stats = await stat(dirPath);
    if (!stats.isDirectory()) {
      return { removed: false, reason: "not_a_directory" };
    }

    // Verificación 2: debe estar vacío
    const entries = await readdir(dirPath);
    if (entries.length > 0) {
      return { removed: false, reason: `not_empty (${entries.length} items)` };
    }

    // Verificación 3: doble check antes de eliminar
    const entriesRecheck = await readdir(dirPath);
    if (entriesRecheck.length > 0) {
      return { removed: false, reason: "not_empty_on_recheck" };
    }

    // Solo eliminar si está vacío (rmdir fallará si no lo está)
    await rmdir(dirPath);
    return { removed: true, reason: "empty_directory_removed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return { removed: false, reason: message };
  }
}

export async function cleanupEmptyDirectories(
  sourcePath: string,
  rootBoundary: string
): Promise<{ removed: string[]; skipped: Array<{ path: string; reason: string }> }> {
  const removed: string[] = [];
  const skipped: Array<{ path: string; reason: string }> = [];
  let currentDir = sourcePath;

  // Normalizar rootBoundary para comparación consistente
  const normalizedRoot = rootBoundary.endsWith("/")
    ? rootBoundary.slice(0, -1)
    : rootBoundary;

  while (currentDir && currentDir !== "/" && currentDir !== normalizedRoot) {
    // Nunca salir del rootBoundary
    if (!currentDir.startsWith(normalizedRoot)) {
      skipped.push({ path: currentDir, reason: "outside_root_boundary" });
      break;
    }

    const result = await removeEmptyDirectory(currentDir);

    if (result.removed) {
      removed.push(currentDir);
      currentDir = dirname(currentDir);
    } else {
      skipped.push({ path: currentDir, reason: result.reason });
      break;
    }
  }

  return { removed, skipped };
}
