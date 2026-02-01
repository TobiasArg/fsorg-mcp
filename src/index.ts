#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { readFileSchema, readFileTool } from "./tools/read.js";
import { writeFileSchema, writeFileTool } from "./tools/write.js";
import { analyzeFileSchema, analyzeFileTool } from "./tools/analyze.js";
import {
  moveFileSchema,
  moveFileTool,
  renameFilesSchema,
  renameFilesTool,
  organizeByTypeSchema,
  organizeByTypeTool,
  deleteFileSchema,
  deleteFileTool,
  deleteDirectorySchema,
  deleteDirectoryTool,
} from "./tools/organize.js";
import {
  listDirectorySchema,
  listDirectoryTool,
  searchContentSchema,
  searchContentTool,
  findDuplicatesSchema,
  findDuplicatesTool,
  sortFileContentSchema,
  sortFileContentTool,
} from "./tools/search.js";

const server = new McpServer({
  name: "local-files",
  version: "1.0.0",
});

// Tool: read_file
server.tool(
  "read_file",
  "Read the contents of a file. Can read as UTF-8 text or base64 encoded. Optionally read only the first N lines.",
  readFileSchema.shape,
  async (args) => {
    const result = await readFileTool(readFileSchema.parse(args));
    return {
      content: [{ type: "text", text: result }],
    };
  }
);

// Tool: write_file
server.tool(
  "write_file",
  "Write content to a file. Supports UTF-8 or base64 encoding. Can overwrite or append. Creates parent directories if needed.",
  writeFileSchema.shape,
  async (args) => {
    const result = await writeFileTool(writeFileSchema.parse(args));
    return {
      content: [{ type: "text", text: result }],
    };
  }
);

// Tool: list_directory
server.tool(
  "list_directory",
  "List files and directories in a path. Supports recursive listing and glob pattern filtering.",
  listDirectorySchema.shape,
  async (args) => {
    const result = await listDirectoryTool(listDirectorySchema.parse(args));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Tool: analyze_file
server.tool(
  "analyze_file",
  "Analyze a file and return statistics: size, MIME type, line/word/character counts, and dates.",
  analyzeFileSchema.shape,
  async (args) => {
    const result = await analyzeFileTool(analyzeFileSchema.parse(args));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Tool: search_content
server.tool(
  "search_content",
  "Search for a pattern (regex) in file contents. Returns matches with line numbers and context.",
  searchContentSchema.shape,
  async (args) => {
    const result = await searchContentTool(searchContentSchema.parse(args));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Tool: find_duplicates
server.tool(
  "find_duplicates",
  "Find duplicate files by comparing MD5 hashes. Returns groups of identical files.",
  findDuplicatesSchema.shape,
  async (args) => {
    const result = await findDuplicatesTool(findDuplicatesSchema.parse(args));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Tool: move_file
server.tool(
  "move_file",
  "Move a file from source to destination. Creates parent directories if needed. Optionally cleans up empty parent directories.",
  moveFileSchema.shape,
  async (args) => {
    const result = await moveFileTool(moveFileSchema.parse(args));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Tool: rename_files
server.tool(
  "rename_files",
  "Batch rename files in a directory using regex pattern matching. Supports preview mode.",
  renameFilesSchema.shape,
  async (args) => {
    const result = await renameFilesTool(renameFilesSchema.parse(args));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Tool: organize_by_type
server.tool(
  "organize_by_type",
  "Organize files into subdirectories by extension, date, or size category. Automatically cleans up empty source directory.",
  organizeByTypeSchema.shape,
  async (args) => {
    const result = await organizeByTypeTool(organizeByTypeSchema.parse(args));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Tool: sort_file_content
server.tool(
  "sort_file_content",
  "Sort the lines of a file. Supports ascending/descending, numeric sorting, and duplicate removal.",
  sortFileContentSchema.shape,
  async (args) => {
    const result = await sortFileContentTool(sortFileContentSchema.parse(args));
    return {
      content: [{ type: "text", text: result }],
    };
  }
);

// Tool: delete_file
server.tool(
  "delete_file",
  "Safely delete a file with protection checks. Only works within allowed paths. Use preview=true to see what will be deleted first.",
  deleteFileSchema.shape,
  async (args) => {
    const result = await deleteFileTool(deleteFileSchema.parse(args));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Tool: delete_directory
server.tool(
  "delete_directory",
  "Safely delete a directory with protection checks. Only works within allowed paths. Recursive deletion requires confirmRecursive=true. Use preview=true to see what will be deleted first.",
  deleteDirectorySchema.shape,
  async (args) => {
    const result = await deleteDirectoryTool(deleteDirectorySchema.parse(args));
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Local Files MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
