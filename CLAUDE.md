# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

MCP (Model Context Protocol) server for local file management with safety protections. Designed to be used with Claude Desktop or other MCP-compatible clients.

## Commands

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm build

# Run the MCP server
pnpm start

# Development mode (watch)
pnpm dev
```

## Architecture

```
src/
├── index.ts              # Entry point - McpServer setup
├── tools/
│   ├── read.ts           # read_file
│   ├── write.ts          # write_file (utf8/base64)
│   ├── analyze.ts        # analyze_file
│   ├── organize.ts       # move_file, rename_files, organize_by_type, delete_file, delete_directory
│   └── search.ts         # list_directory, search_content, find_duplicates, sort_file_content
└── utils/
    ├── files.ts          # File utilities (hash, mime, stats)
    ├── config.ts         # Configuration loader (paths, protection rules)
    └── safety.ts         # Safety validations for delete operations
```

## Configuration

User config location: `~/.config/localfiles-org/config.json`

```json
{
  "allowedPaths": ["~/projects", "/tmp"],
  "additionalProtectedPaths": [],
  "additionalProtectedPatterns": []
}
```

## Available Tools (12)

1. **read_file** - Read file contents (UTF-8 or base64)
2. **write_file** - Write content (UTF-8 or base64)
3. **list_directory** - List with recursion and glob patterns
4. **analyze_file** - Stats: size, MIME, lines, words, dates
5. **search_content** - Regex search with context
6. **find_duplicates** - MD5 hash comparison
7. **move_file** - Move with optional cleanup
8. **rename_files** - Batch rename with regex
9. **organize_by_type** - Organize by extension/date/size
10. **sort_file_content** - Sort lines
11. **delete_file** - Safe delete with preview
12. **delete_directory** - Safe delete with confirmation

## Safety Features

- Configurable allowed paths
- System paths always protected
- User sensitive paths protected
- Preview mode for deletions
- Recursive deletion requires confirmation
