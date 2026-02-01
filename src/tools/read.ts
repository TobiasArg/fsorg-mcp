import { z } from "zod";
import { readFile } from "fs/promises";

export const readFileSchema = z.object({
  path: z.string().describe("Path to the file to read"),
  encoding: z
    .enum(["utf8", "base64"])
    .optional()
    .default("utf8")
    .describe("Encoding to use when reading the file"),
  lines: z
    .number()
    .positive()
    .optional()
    .describe("Read only the first N lines"),
});

export type ReadFileInput = z.infer<typeof readFileSchema>;

export async function readFileTool(input: ReadFileInput): Promise<string> {
  const { path, encoding, lines } = input;

  try {
    if (encoding === "base64") {
      const buffer = await readFile(path);
      return buffer.toString("base64");
    }

    const content = await readFile(path, "utf-8");

    if (lines) {
      const allLines = content.split("\n");
      return allLines.slice(0, lines).join("\n");
    }

    return content;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
    throw error;
  }
}
