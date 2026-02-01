import { z } from "zod";
import { writeFile, appendFile, mkdir } from "fs/promises";
import { dirname } from "path";

export const writeFileSchema = z.object({
  path: z.string().describe("Path to the file to write"),
  content: z.string().describe("Content to write to the file"),
  mode: z
    .enum(["overwrite", "append"])
    .optional()
    .default("overwrite")
    .describe("Write mode: overwrite or append"),
});

export type WriteFileInput = z.infer<typeof writeFileSchema>;

export async function writeFileTool(input: WriteFileInput): Promise<string> {
  const { path, content, mode } = input;

  try {
    // Ensure directory exists
    await mkdir(dirname(path), { recursive: true });

    if (mode === "append") {
      await appendFile(path, content, "utf-8");
      return `Successfully appended ${content.length} characters to ${path}`;
    }

    await writeFile(path, content, "utf-8");
    return `Successfully wrote ${content.length} characters to ${path}`;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
    throw error;
  }
}
