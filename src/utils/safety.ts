import { stat, readdir } from "fs/promises";
import { join, resolve, dirname } from "path";
import {
  getAllowedPaths,
  getProtectedPaths,
  getProtectedPatterns,
  expandPath,
} from "./config.js";

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
  details?: string;
}

export function isPathProtected(targetPath: string): SafetyCheckResult {
  const normalizedPath = resolve(targetPath);
  const protectedPaths = getProtectedPaths();

  // Verificar rutas protegidas exactas
  for (const protectedPath of protectedPaths) {
    const normalizedProtected = resolve(expandPath(protectedPath));

    if (normalizedPath === normalizedProtected) {
      return {
        safe: false,
        reason: "PROTECTED_PATH",
        details: `"${normalizedPath}" is a protected path and cannot be deleted.`,
      };
    }
  }

  // Verificar si es padre de rutas protegidas
  for (const protectedPath of protectedPaths) {
    const normalizedProtected = resolve(expandPath(protectedPath));

    if (normalizedProtected.startsWith(normalizedPath + "/") ||
      normalizedProtected.startsWith(normalizedPath + "\\")) {
      return {
        safe: false,
        reason: "PARENT_OF_PROTECTED",
        details: `"${normalizedPath}" contains protected paths and cannot be deleted.`,
      };
    }
  }

  return { safe: true };
}

export function isWithinAllowedScope(targetPath: string): SafetyCheckResult {
  const normalizedPath = resolve(targetPath);
  const allowedPaths = getAllowedPaths();

  // Si no hay rutas permitidas configuradas, bloquear todo
  if (allowedPaths.length === 0) {
    return {
      safe: false,
      reason: "NO_ALLOWED_PATHS",
      details: `No allowed paths configured. Please configure allowedPaths in your config file.`,
    };
  }

  for (const allowedBase of allowedPaths) {
    const normalizedAllowed = resolve(expandPath(allowedBase));

    // Verificar si está dentro de una ruta permitida
    if (normalizedPath.startsWith(normalizedAllowed + "/") ||
      normalizedPath.startsWith(normalizedAllowed + "\\") ||
      normalizedPath === normalizedAllowed) {
      return { safe: true };
    }
  }

  return {
    safe: false,
    reason: "OUTSIDE_ALLOWED_SCOPE",
    details: `"${normalizedPath}" is outside allowed paths. Allowed: ${allowedPaths.join(", ")}`,
  };
}

export function isNameProtected(name: string): SafetyCheckResult {
  const patterns = getProtectedPatterns();

  for (const pattern of patterns) {
    if (pattern.test(name)) {
      return {
        safe: false,
        reason: "PROTECTED_NAME",
        details: `"${name}" matches a protected pattern and cannot be deleted.`,
      };
    }
  }

  return { safe: true };
}

export function validateDeletion(targetPath: string): SafetyCheckResult {
  const normalizedPath = resolve(targetPath);
  const name = normalizedPath.split(/[/\\]/).pop() || "";

  // Check 1: Is within allowed scope?
  const scopeCheck = isWithinAllowedScope(normalizedPath);
  if (!scopeCheck.safe) {
    return scopeCheck;
  }

  // Check 2: Is path protected?
  const protectedCheck = isPathProtected(normalizedPath);
  if (!protectedCheck.safe) {
    return protectedCheck;
  }

  // Check 3: Is name protected?
  const nameCheck = isNameProtected(name);
  if (!nameCheck.safe) {
    return nameCheck;
  }

  return { safe: true };
}

export interface PreviewItem {
  path: string;
  type: "file" | "directory";
  size?: number;
}

export async function previewDeletion(
  targetPath: string,
  recursive: boolean = false
): Promise<PreviewItem[]> {
  const items: PreviewItem[] = [];
  const normalizedPath = resolve(targetPath);

  try {
    const stats = await stat(normalizedPath);

    if (stats.isFile()) {
      items.push({
        path: normalizedPath,
        type: "file",
        size: stats.size,
      });
    } else if (stats.isDirectory()) {
      if (recursive) {
        await collectItems(normalizedPath, items);
      }
      items.push({
        path: normalizedPath,
        type: "directory",
      });
    }
  } catch {
    // Path doesn't exist or can't be accessed
  }

  return items;
}

async function collectItems(dirPath: string, items: PreviewItem[]): Promise<void> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await collectItems(fullPath, items);
        items.push({ path: fullPath, type: "directory" });
      } else if (entry.isFile()) {
        const stats = await stat(fullPath);
        items.push({ path: fullPath, type: "file", size: stats.size });
      }
    }
  } catch {
    // Skip inaccessible directories
  }
}

// Re-export for convenience
export { getAllowedPaths, getProtectedPaths } from "./config.js";
