import { z } from "zod";
import { readFile, readdir, stat } from "fs/promises";
import { join } from "path";
import { getFileHash } from "../utils/files.js";
import { glob } from "glob";

// List directory tool
export const listDirectorySchema = z.object({
  path: z.string().describe("Directory path to list"),
  recursive: z
    .boolean()
    .optional()
    .default(false)
    .describe("List recursively"),
  pattern: z
    .string()
    .optional()
    .describe("Glob pattern to filter files"),
});

export type ListDirectoryInput = z.infer<typeof listDirectorySchema>;

export interface DirectoryEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
}

export async function listDirectoryTool(
  input: ListDirectoryInput
): Promise<DirectoryEntry[]> {
  const { path, recursive, pattern } = input;

  try {
    if (pattern) {
      const globPattern = recursive
        ? join(path, "**", pattern)
        : join(path, pattern);
      const matches = await glob(globPattern, { nodir: false });

      const results: DirectoryEntry[] = [];
      for (const match of matches) {
        const stats = await stat(match);
        results.push({
          name: match.split("/").pop() || match,
          path: match,
          type: stats.isDirectory() ? "directory" : "file",
          size: stats.isFile() ? stats.size : undefined,
          modified: stats.mtime.toISOString(),
        });
      }
      return results;
    }

    const entries = await readdir(path, { withFileTypes: true });
    const results: DirectoryEntry[] = [];

    for (const entry of entries) {
      const fullPath = join(path, entry.name);
      const stats = await stat(fullPath);

      results.push({
        name: entry.name,
        path: fullPath,
        type: entry.isDirectory() ? "directory" : "file",
        size: entry.isFile() ? stats.size : undefined,
        modified: stats.mtime.toISOString(),
      });

      if (recursive && entry.isDirectory()) {
        const subEntries = await listDirectoryTool({
          path: fullPath,
          recursive: true,
        });
        results.push(...subEntries);
      }
    }

    return results;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
    throw error;
  }
}

// Search content tool
export const searchContentSchema = z.object({
  path: z.string().describe("File or directory path to search"),
  pattern: z.string().describe("Pattern to search for (regex)"),
  recursive: z
    .boolean()
    .optional()
    .default(false)
    .describe("Search recursively in directories"),
});

export type SearchContentInput = z.infer<typeof searchContentSchema>;

export interface SearchMatch {
  file: string;
  line: number;
  content: string;
  context: string;
}

export async function searchContentTool(
  input: SearchContentInput
): Promise<SearchMatch[]> {
  const { path, pattern, recursive } = input;

  try {
    const regex = new RegExp(pattern, "gi");
    const matches: SearchMatch[] = [];

    async function searchFile(filePath: string) {
      try {
        const content = await readFile(filePath, "utf-8");
        const lines = content.split("\n");

        lines.forEach((line, index) => {
          if (regex.test(line)) {
            const contextStart = Math.max(0, index - 1);
            const contextEnd = Math.min(lines.length, index + 2);
            const context = lines.slice(contextStart, contextEnd).join("\n");

            matches.push({
              file: filePath,
              line: index + 1,
              content: line.trim(),
              context,
            });
          }
          // Reset regex state for global regex
          regex.lastIndex = 0;
        });
      } catch {
        // Skip files that can't be read as text
      }
    }

    const stats = await stat(path);

    if (stats.isFile()) {
      await searchFile(path);
    } else if (stats.isDirectory()) {
      const entries = await listDirectoryTool({ path, recursive });
      for (const entry of entries) {
        if (entry.type === "file") {
          await searchFile(entry.path);
        }
      }
    }

    return matches;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search content: ${error.message}`);
    }
    throw error;
  }
}

// Find duplicates tool
export const findDuplicatesSchema = z.object({
  path: z.string().describe("Directory path to search for duplicates"),
  recursive: z
    .boolean()
    .optional()
    .default(true)
    .describe("Search recursively"),
});

export type FindDuplicatesInput = z.infer<typeof findDuplicatesSchema>;

export interface DuplicateGroup {
  hash: string;
  files: string[];
  size: number;
}

export async function findDuplicatesTool(
  input: FindDuplicatesInput
): Promise<DuplicateGroup[]> {
  const { path, recursive } = input;

  try {
    const entries = await listDirectoryTool({ path, recursive });
    const hashMap = new Map<string, { files: string[]; size: number }>();

    for (const entry of entries) {
      if (entry.type === "file") {
        try {
          const hash = await getFileHash(entry.path);
          const existing = hashMap.get(hash);

          if (existing) {
            existing.files.push(entry.path);
          } else {
            hashMap.set(hash, {
              files: [entry.path],
              size: entry.size || 0,
            });
          }
        } catch {
          // Skip files that can't be hashed
        }
      }
    }

    // Filter to only duplicates (more than one file with same hash)
    const duplicates: DuplicateGroup[] = [];
    for (const [hash, data] of hashMap) {
      if (data.files.length > 1) {
        duplicates.push({
          hash,
          files: data.files,
          size: data.size,
        });
      }
    }

    return duplicates;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to find duplicates: ${error.message}`);
    }
    throw error;
  }
}

// Sort file content tool
export const sortFileContentSchema = z.object({
  path: z.string().describe("Path to the file to sort"),
  order: z.enum(["asc", "desc"]).default("asc").describe("Sort order"),
  numeric: z
    .boolean()
    .optional()
    .default(false)
    .describe("Sort numerically instead of alphabetically"),
  unique: z
    .boolean()
    .optional()
    .default(false)
    .describe("Remove duplicate lines"),
});

export type SortFileContentInput = z.infer<typeof sortFileContentSchema>;

export async function sortFileContentTool(
  input: SortFileContentInput
): Promise<string> {
  const { path, order, numeric, unique } = input;

  try {
    const content = await readFile(path, "utf-8");
    let lines = content.split("\n");

    // Remove empty trailing line if exists
    if (lines[lines.length - 1] === "") {
      lines.pop();
    }

    if (unique) {
      lines = [...new Set(lines)];
    }

    lines.sort((a, b) => {
      if (numeric) {
        const numA = parseFloat(a) || 0;
        const numB = parseFloat(b) || 0;
        return order === "asc" ? numA - numB : numB - numA;
      }
      return order === "asc" ? a.localeCompare(b) : b.localeCompare(a);
    });

    return lines.join("\n");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to sort file content: ${error.message}`);
    }
    throw error;
  }
}
