import { z } from "zod";
import {
  getFileStats,
  getMimeType,
  countLinesWordsChars,
  formatBytes,
} from "../utils/files.js";

export const analyzeFileSchema = z.object({
  path: z.string().describe("Path to the file to analyze"),
});

export type AnalyzeFileInput = z.infer<typeof analyzeFileSchema>;

export interface FileAnalysis {
  path: string;
  size: string;
  sizeBytes: number;
  mimeType: string;
  lines: number;
  words: number;
  characters: number;
  created: string;
  modified: string;
}

export async function analyzeFileTool(
  input: AnalyzeFileInput
): Promise<FileAnalysis> {
  const { path } = input;

  try {
    const stats = await getFileStats(path);

    if (stats.isDirectory) {
      throw new Error("Path is a directory, not a file");
    }

    const mimeType = getMimeType(path);
    let textStats = { lines: 0, words: 0, characters: 0 };

    // Only count lines/words for text files
    if (mimeType.startsWith("text/") || mimeType === "application/json") {
      textStats = await countLinesWordsChars(path);
    }

    return {
      path,
      size: formatBytes(stats.size),
      sizeBytes: stats.size,
      mimeType,
      lines: textStats.lines,
      words: textStats.words,
      characters: textStats.characters,
      created: stats.created,
      modified: stats.modified,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to analyze file: ${error.message}`);
    }
    throw error;
  }
}
