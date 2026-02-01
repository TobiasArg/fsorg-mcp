import { z } from "zod";
import { writeFile, appendFile, mkdir } from "fs/promises";
import { dirname } from "path";

export const writeFileSchema = z.object({
  path: z.string().describe("Path to the file to write"),
  content: z.string().describe("Content to write to the file"),
  encoding: z
    .enum(["utf8", "base64"])
    .optional()
    .default("utf8")
    .describe("Encoding of the content: utf8 (default) or base64"),
  mode: z
    .enum(["overwrite", "append"])
    .optional()
    .default("overwrite")
    .describe("Write mode: overwrite or append"),
});

export type WriteFileInput = z.infer<typeof writeFileSchema>;

export async function writeFileTool(input: WriteFileInput): Promise<string> {
  const { path, content, encoding, mode } = input;

  try {
    // Ensure directory exists
    await mkdir(dirname(path), { recursive: true });

    // Decode content if base64
    const finalContent = encoding === "base64"
      ? Buffer.from(content, "base64")
      : content;

    const bytesWritten = encoding === "base64"
      ? (finalContent as Buffer).length
      : content.length;

    if (mode === "append") {
      await appendFile(path, finalContent);
      return `Successfully appended ${bytesWritten} bytes to ${path}`;
    }

    await writeFile(path, finalContent);
    return `Successfully wrote ${bytesWritten} bytes to ${path}`;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
    throw error;
  }
}
