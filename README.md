# Local Files MCP Server

A Model Context Protocol (MCP) server for managing local files. Provides tools for reading, writing, analyzing, searching, and organizing files with built-in safety protections.

## Features

- 📖 **Read/Write files** - UTF-8 and base64 support
- 📂 **Directory operations** - List, organize, search
- 🔍 **Content search** - Regex pattern matching
- 🔎 **Find duplicates** - MD5 hash comparison
- 📊 **File analysis** - Size, MIME type, line counts
- 🛡️ **Safety protections** - Configurable allowed/protected paths
- 🖥️ **Cross-platform** - macOS, Linux, Windows

## Installation

### Claude Desktop Setup (Recommended)

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "local-files": {
      "command": "npx",
      "args": ["-y", "fso"]
    }
  }
}
```

That's it! Claude Desktop will automatically download and run the MCP server via npx.

### Alternative: Install from source

```bash
git clone https://github.com/argtobias/fso.git
cd fso
pnpm install
pnpm build
```

Then configure Claude Desktop:

```json
{
  "mcpServers": {
    "local-files": {
      "command": "node",
      "args": ["/path/to/fso/dist/index.js"]
    }
  }
}
```

### Safety Configuration

Create a config file at:
- **macOS/Linux**: `~/.config/fso/config.json`
- **Windows**: `%LOCALAPPDATA%\fso\config.json`

```json
{
  "allowedPaths": [
    "~/projects",
    "~/Development",
    "~/workspace",
    "/tmp"
  ],
  "additionalProtectedPaths": [
    "~/my-important-folder"
  ],
  "additionalProtectedPatterns": [
    "^backup",
    "\\.bak$"
  ]
}
```

#### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `allowedPaths` | Paths where delete operations are permitted | `~/projects`, `~/dev`, etc. |
| `additionalProtectedPaths` | Extra paths to protect from deletion | `[]` |
| `additionalProtectedPatterns` | Regex patterns for protected file names | `[]` |

#### Always Protected (cannot be overridden)

- **System paths**: `/`, `/etc`, `/usr`, `/bin`, `/System`, etc.
- **User paths**: `~`, `~/Documents`, `~/Desktop`, `~/Downloads`, `~/.ssh`
- **Patterns**: `.git`, `.env`, `.ssh`, credentials, secrets

## Available Tools

### File Operations

| Tool | Description |
|------|-------------|
| `read_file` | Read file contents (UTF-8 or base64) |
| `write_file` | Write content to file (UTF-8 or base64) |
| `delete_file` | Safely delete a file with protection checks |
| `move_file` | Move file with optional empty directory cleanup |
| `analyze_file` | Get file stats (size, MIME, lines, words) |

### Directory Operations

| Tool | Description |
|------|-------------|
| `list_directory` | List files with optional recursion and glob patterns |
| `delete_directory` | Safely delete directory (requires confirmation for recursive) |
| `organize_by_type` | Organize files into folders by extension/date/size |

### Search Operations

| Tool | Description |
|------|-------------|
| `search_content` | Search for regex patterns in file contents |
| `find_duplicates` | Find duplicate files by MD5 hash |
| `sort_file_content` | Sort lines in a file |

### Batch Operations

| Tool | Description |
|------|-------------|
| `rename_files` | Batch rename files using regex patterns |

## Usage Examples

### Read a file
```json
{
  "tool": "read_file",
  "arguments": {
    "path": "~/projects/myfile.txt"
  }
}
```

### Find and delete duplicates
```json
{
  "tool": "find_duplicates",
  "arguments": {
    "path": "~/projects/images",
    "recursive": true
  }
}
```

### Safely delete with preview
```json
{
  "tool": "delete_file",
  "arguments": {
    "path": "~/projects/temp/old-file.txt",
    "preview": true
  }
}
```

### Organize files by extension
```json
{
  "tool": "organize_by_type",
  "arguments": {
    "source": "~/Downloads/unsorted",
    "destination": "~/Downloads/sorted",
    "criteria": "extension"
  }
}
```

## Safety Features

### Delete Protection

All delete operations include:

1. **Scope validation** - Only works within configured `allowedPaths`
2. **Protected path check** - Cannot delete system or user-critical paths
3. **Pattern matching** - Blocks deletion of files matching protected patterns
4. **Preview mode** - See what will be deleted before executing
5. **Recursive confirmation** - Requires explicit `confirmRecursive: true`

### Example Safety Response

```json
{
  "executed": false,
  "message": "BLOCKED: OUTSIDE_ALLOWED_SCOPE - Path is outside allowed paths",
  "safetyChecks": {
    "withinScope": false,
    "notProtected": true,
    "allowedPaths": ["~/projects", "~/dev"]
  }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Development mode (watch)
pnpm dev

# Test tools
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js
```

## License

ISC

## Contributing

Contributions welcome! Please read the safety guidelines before submitting PRs that modify delete functionality.
