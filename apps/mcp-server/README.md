# @erdify/mcp-server

MCP server for [ERDify](http://erdify-app.kro.kr) — lets AI assistants (Claude, Cursor, etc.) read and modify your ERD diagrams using natural language.

## Prerequisites

1. An [ERDify](http://erdify-app.kro.kr) account
2. An API key — log in → Settings → API Keys → create a new key

---

## Setup

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "erdify": {
      "command": "npx",
      "args": ["-y", "@erdify/mcp-server"],
      "env": {
        "ERDIFY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Restart Claude Desktop — the ERDify tools will appear automatically.

### Cursor

Add to `.cursor/mcp.json` in your project root (or `~/.cursor/mcp.json` globally):

```json
{
  "mcpServers": {
    "erdify": {
      "command": "npx",
      "args": ["-y", "@erdify/mcp-server"],
      "env": {
        "ERDIFY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Self-hosted ERDify

Add `ERDIFY_API_URL` to the `env` block:

```json
"env": {
  "ERDIFY_API_KEY": "your-api-key-here",
  "ERDIFY_API_URL": "https://your-server.com/api"
}
```

---

## What you can do

Once connected, just talk to your AI assistant naturally:

> "Show me all my organizations"  
> "List diagrams in the my-project project"  
> "Add a `products` table to my shop diagram with id, name, and price columns"  
> "Add a foreign key from orders to users"  
> "Generate the DDL for my current schema"  
> "Rename the `user_id` column to `owner_id`"

---

## Available Tools

### Read

| Tool | Description |
|------|-------------|
| `list_organizations` | List all accessible organizations |
| `list_projects` | List projects in an organization |
| `list_diagrams` | List diagrams in a project |
| `get_diagram` | Get tables, columns, and relationships |
| `get_ddl` | Generate DDL SQL for a diagram |

### Write

| Tool | Description |
|------|-------------|
| `add_table` | Add a new table (with optional initial columns) |
| `remove_table` | Remove a table by ID |
| `add_column` | Add a column to a table |
| `update_column` | Update column properties (name, type, constraints) |
| `remove_column` | Remove a column |
| `add_relationship` | Add a foreign key relationship between tables |
| `remove_relationship` | Remove a relationship |

---

## License

MIT
