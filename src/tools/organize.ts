import { z } from "zod";
import { rename, mkdir, readdir, stat, unlink, rm } from "fs/promises";
import { dirname, join, resolve } from "path";
import {
  getExtension,
  cleanupEmptyDirectories,
} from "../utils/files.js";
import {
  validateDeletion,
  previewDeletion,
  getAllowedPaths,
  PreviewItem,
} from "../utils/safety.js";

// Move file tool
export const moveFileSchema = z.object({
  source: z.string().describe("Source file path"),
  destination: z.string().describe("Destination file path"),
  cleanupEmpty: z
    .boolean()
    .optional()
    .default(false)
    .describe("Remove empty parent directories after moving"),
});

export type MoveFileInput = z.infer<typeof moveFileSchema>;

export interface MoveFileResult {
  message: string;
  cleanedDirectories: string[];
  skippedDirectories: Array<{ path: string; reason: string }>;
}

export async function moveFileTool(input: MoveFileInput): Promise<MoveFileResult> {
  const { source, destination, cleanupEmpty } = input;

  try {
    // Guardar el directorio raíz antes de mover (padre del directorio del archivo)
    const sourceDir = dirname(source);
    const rootBoundary = dirname(sourceDir);

    await mkdir(dirname(destination), { recursive: true });
    await rename(source, destination);

    let cleanedDirectories: string[] = [];
    let skippedDirectories: Array<{ path: string; reason: string }> = [];

    if (cleanupEmpty) {
      const result = await cleanupEmptyDirectories(sourceDir, rootBoundary);
      cleanedDirectories = result.removed;
      skippedDirectories = result.skipped;
    }

    return {
      message: `Successfully moved ${source} to ${destination}`,
      cleanedDirectories,
      skippedDirectories,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to move file: ${error.message}`);
    }
    throw error;
  }
}

// Rename files tool
export const renameFilesSchema = z.object({
  path: z.string().describe("Directory path containing files to rename"),
  pattern: z.string().describe("Pattern to search for (regex)"),
  replacement: z.string().describe("Replacement string"),
  preview: z
    .boolean()
    .optional()
    .default(true)
    .describe("Preview changes without applying"),
});

export type RenameFilesInput = z.infer<typeof renameFilesSchema>;

export interface RenameResult {
  original: string;
  renamed: string;
}

export async function renameFilesTool(
  input: RenameFilesInput
): Promise<{ previewed: boolean; changes: RenameResult[] }> {
  const { path, pattern, replacement, preview } = input;

  try {
    const regex = new RegExp(pattern);
    const entries = await readdir(path);
    const changes: RenameResult[] = [];

    for (const entry of entries) {
      const fullPath = join(path, entry);
      const stats = await stat(fullPath);

      if (stats.isFile() && regex.test(entry)) {
        const newName = entry.replace(regex, replacement);
        if (newName !== entry) {
          changes.push({
            original: entry,
            renamed: newName,
          });

          if (!preview) {
            await rename(fullPath, join(path, newName));
          }
        }
      }
    }

    return { previewed: preview, changes };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to rename files: ${error.message}`);
    }
    throw error;
  }
}

// Organize by type tool
export const organizeByTypeSchema = z.object({
  source: z.string().describe("Source directory"),
  destination: z.string().describe("Destination directory"),
  criteria: z
    .enum(["extension", "date", "size"])
    .describe("Criteria for organizing files"),
  cleanupEmpty: z
    .boolean()
    .optional()
    .default(true)
    .describe("Remove source directory if empty after organizing"),
});

export type OrganizeByTypeInput = z.infer<typeof organizeByTypeSchema>;

export interface OrganizeResult {
  file: string;
  movedTo: string;
}

export interface OrganizeByTypeResult {
  files: OrganizeResult[];
  cleanedDirectories: string[];
  skippedDirectories: Array<{ path: string; reason: string }>;
}

export async function organizeByTypeTool(
  input: OrganizeByTypeInput
): Promise<OrganizeByTypeResult> {
  const { source, destination, criteria, cleanupEmpty } = input;

  try {
    // Guardar el directorio raíz (padre del source) como límite
    const rootBoundary = dirname(source);

    const entries = await readdir(source);
    const files: OrganizeResult[] = [];

    for (const entry of entries) {
      const fullPath = join(source, entry);
      const stats = await stat(fullPath);

      if (!stats.isFile()) continue;

      let subFolder: string;

      switch (criteria) {
        case "extension": {
          const ext = getExtension(fullPath);
          subFolder = ext ? ext.slice(1).toUpperCase() : "NO_EXTENSION";
          break;
        }
        case "date": {
          const date = stats.mtime;
          subFolder = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
        }
        case "size": {
          const size = stats.size;
          if (size < 1024) subFolder = "tiny";
          else if (size < 1024 * 1024) subFolder = "small";
          else if (size < 1024 * 1024 * 100) subFolder = "medium";
          else subFolder = "large";
          break;
        }
      }

      const destFolder = join(destination, subFolder);
      await mkdir(destFolder, { recursive: true });

      const destPath = join(destFolder, entry);
      await rename(fullPath, destPath);

      files.push({
        file: entry,
        movedTo: destPath,
      });
    }

    let cleanedDirectories: string[] = [];
    let skippedDirectories: Array<{ path: string; reason: string }> = [];

    if (cleanupEmpty) {
      const result = await cleanupEmptyDirectories(source, rootBoundary);
      cleanedDirectories = result.removed;
      skippedDirectories = result.skipped;
    }

    return { files, cleanedDirectories, skippedDirectories };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to organize files: ${error.message}`);
    }
    throw error;
  }
}

// Delete file tool
export const deleteFileSchema = z.object({
  path: z.string().describe("Path to the file to delete"),
  preview: z
    .boolean()
    .optional()
    .default(false)
    .describe("Preview what will be deleted without actually deleting"),
  cleanupEmpty: z
    .boolean()
    .optional()
    .default(false)
    .describe("Remove empty parent directories after deleting"),
});

export type DeleteFileInput = z.infer<typeof deleteFileSchema>;

export interface DeleteFileResult {
  executed: boolean;
  message: string;
  deletedFile?: string;
  cleanedDirectories: string[];
  safetyChecks: {
    withinScope: boolean;
    notProtected: boolean;
    allowedPaths: string[];
  };
  preview?: PreviewItem[];
}

export async function deleteFileTool(input: DeleteFileInput): Promise<DeleteFileResult> {
  const { path: inputPath, preview, cleanupEmpty } = input;
  const normalizedPath = resolve(inputPath);

  // SAFETY CHECK 1: Validate deletion is safe
  const safetyCheck = validateDeletion(normalizedPath);
  const allowedPaths = getAllowedPaths();

  if (!safetyCheck.safe) {
    return {
      executed: false,
      message: `BLOCKED: ${safetyCheck.reason} - ${safetyCheck.details}`,
      cleanedDirectories: [],
      safetyChecks: {
        withinScope: safetyCheck.reason !== "OUTSIDE_ALLOWED_SCOPE",
        notProtected: safetyCheck.reason !== "PROTECTED_PATH" && safetyCheck.reason !== "PROTECTED_NAME",
        allowedPaths,
      },
    };
  }

  try {
    // Verificar que existe y es un archivo
    const stats = await stat(normalizedPath);
    if (!stats.isFile()) {
      throw new Error("Path is not a file");
    }

    // PREVIEW MODE: Show what would be deleted
    if (preview) {
      const previewItems = await previewDeletion(normalizedPath, false);
      return {
        executed: false,
        message: `PREVIEW: Would delete file "${normalizedPath}" (${stats.size} bytes)`,
        cleanedDirectories: [],
        safetyChecks: {
          withinScope: true,
          notProtected: true,
          allowedPaths,
        },
        preview: previewItems,
      };
    }

    const sourceDir = dirname(normalizedPath);
    const rootBoundary = dirname(sourceDir);

    // Eliminar el archivo
    await unlink(normalizedPath);

    let cleanedDirectories: string[] = [];

    if (cleanupEmpty) {
      const result = await cleanupEmptyDirectories(sourceDir, rootBoundary);
      cleanedDirectories = result.removed;
    }

    return {
      executed: true,
      message: `Successfully deleted ${normalizedPath}`,
      deletedFile: normalizedPath,
      cleanedDirectories,
      safetyChecks: {
        withinScope: true,
        notProtected: true,
        allowedPaths,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
    throw error;
  }
}

// Delete directory tool
export const deleteDirectorySchema = z.object({
  path: z.string().describe("Path to the directory to delete"),
  preview: z
    .boolean()
    .optional()
    .default(false)
    .describe("Preview what will be deleted without actually deleting"),
  recursive: z
    .boolean()
    .optional()
    .default(false)
    .describe("Delete directory and all its contents recursively (REQUIRES CONFIRMATION)"),
  confirmRecursive: z
    .boolean()
    .optional()
    .default(false)
    .describe("Explicit confirmation required when recursive=true"),
});

export type DeleteDirectoryInput = z.infer<typeof deleteDirectorySchema>;

export interface DeleteDirectoryResult {
  executed: boolean;
  message: string;
  deletedPath?: string;
  wasRecursive: boolean;
  itemsDeleted?: number;
  safetyChecks: {
    withinScope: boolean;
    notProtected: boolean;
    allowedPaths: string[];
  };
  preview?: PreviewItem[];
}

export async function deleteDirectoryTool(input: DeleteDirectoryInput): Promise<DeleteDirectoryResult> {
  const { path: inputPath, preview, recursive, confirmRecursive } = input;
  const normalizedPath = resolve(inputPath);

  // SAFETY CHECK 1: Validate deletion is safe
  const safetyCheck = validateDeletion(normalizedPath);
  const allowedPaths = getAllowedPaths();

  if (!safetyCheck.safe) {
    return {
      executed: false,
      message: `BLOCKED: ${safetyCheck.reason} - ${safetyCheck.details}`,
      wasRecursive: recursive,
      safetyChecks: {
        withinScope: safetyCheck.reason !== "OUTSIDE_ALLOWED_SCOPE",
        notProtected: safetyCheck.reason !== "PROTECTED_PATH" && safetyCheck.reason !== "PROTECTED_NAME",
        allowedPaths,
      },
    };
  }

  // SAFETY CHECK 2: Recursive requires explicit confirmation
  if (recursive && !confirmRecursive) {
    return {
      executed: false,
      message: `BLOCKED: Recursive deletion requires confirmRecursive=true as explicit confirmation`,
      wasRecursive: recursive,
      safetyChecks: {
        withinScope: true,
        notProtected: true,
        allowedPaths,
      },
    };
  }

  try {
    // Verificar que existe y es un directorio
    const stats = await stat(normalizedPath);
    if (!stats.isDirectory()) {
      throw new Error("Path is not a directory");
    }

    // Get preview of what will be deleted
    const previewItems = await previewDeletion(normalizedPath, recursive);

    // PREVIEW MODE: Show what would be deleted
    if (preview) {
      const fileCount = previewItems.filter(i => i.type === "file").length;
      const dirCount = previewItems.filter(i => i.type === "directory").length;
      const totalSize = previewItems.reduce((sum, i) => sum + (i.size || 0), 0);

      return {
        executed: false,
        message: `PREVIEW: Would delete ${fileCount} files and ${dirCount} directories (${totalSize} bytes total)`,
        wasRecursive: recursive,
        safetyChecks: {
          withinScope: true,
          notProtected: true,
          allowedPaths,
        },
        preview: previewItems,
      };
    }

    // Verificar si está vacío (si no es recursivo)
    if (!recursive) {
      const entries = await readdir(normalizedPath);
      if (entries.length > 0) {
        throw new Error(`Directory is not empty (${entries.length} items). Use recursive=true and confirmRecursive=true to delete anyway.`);
      }
    }

    // Eliminar el directorio
    await rm(normalizedPath, { recursive, force: false });

    return {
      executed: true,
      message: `Successfully deleted directory ${normalizedPath}`,
      deletedPath: normalizedPath,
      wasRecursive: recursive,
      itemsDeleted: previewItems.length,
      safetyChecks: {
        withinScope: true,
        notProtected: true,
        allowedPaths,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete directory: ${error.message}`);
    }
    throw error;
  }
}
