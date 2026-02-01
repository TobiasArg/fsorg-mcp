# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server for local file management. It provides tools for reading, writing, analyzing, searching, and organizing files without external API dependencies.

## Commands

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm build

# Run the MCP server
pnpm start

# Development mode (watch for changes)
pnpm dev
```

## Testing

```bash
# Test that tools are registered correctly
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js
```

## Architecture

```
src/
├── index.ts          # Entry point - McpServer setup and tool registration
├── tools/
│   ├── read.ts       # read_file tool
│   ├── write.ts      # write_file tool
│   ├── analyze.ts    # analyze_file tool
│   ├── organize.ts   # move_file, rename_files, organize_by_type tools
│   └── search.ts     # list_directory, search_content, find_duplicates, sort_file_content tools
└── utils/
    └── files.ts      # Shared utilities (hash, mime, stats, formatting)
```

## Available Tools

1. **read_file** - Read file contents (UTF-8 or base64)
2. **write_file** - Write/append content to files
3. **list_directory** - List files with optional recursion and glob patterns
4. **analyze_file** - Get file stats (size, MIME type, lines, words, dates)
5. **search_content** - Search for regex patterns in files
6. **find_duplicates** - Find duplicate files by MD5 hash
7. **move_file** - Move files between locations
8. **rename_files** - Batch rename files with regex patterns
9. **organize_by_type** - Organize files into folders by extension/date/size
10. **sort_file_content** - Sort file lines (asc/desc, numeric, unique)

## Key SDK imports

- `McpServer` - Main server class
- `StdioServerTransport` - For stdio-based communication
- `z` (zod) - Schema validation for tool parameters
