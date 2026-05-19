# @erdify/cli

Command-line interface for [ERDify](http://erdify-app.kro.kr) — manage your database schemas and ERD diagrams directly from the terminal.

## Installation

```bash
npm install -g @erdify/cli
```

## Setup

**1. Get an API key** — Log in to [ERDify](http://erdify-app.kro.kr) → Settings → API Keys

**2. Authenticate**

```bash
erdify login
# API key: <paste your key>
```

Or non-interactively:

```bash
erdify login --key YOUR_API_KEY
```

> Your key is saved to `~/.config/erdify/config.json`.  
> You can also use the `ERDIFY_API_KEY` environment variable instead.

---

## Commands

### Auth

```bash
erdify login [--key <key>] [--url <url>]   # Save API key
erdify whoami                               # Show current config
```

### List

```bash
erdify list orgs                    # List organizations
erdify list projects <orgId>        # List projects in an org
erdify list diagrams <projectId>    # List diagrams in a project
```

### Inspect

```bash
erdify get diagram <diagramId>      # Show tables, columns, and relationships
erdify get ddl <diagramId>          # Generate DDL SQL
erdify get seed <diagramId>         # Generate INSERT seed SQL
erdify get setup <diagramId>        # Generate DDL + seed combined
```

### Tables

```bash
erdify add table <diagramId> <name>
erdify remove table <diagramId> <tableId>
# alias: erdify rm table ...
```

### Columns

```bash
# Add a column
erdify add column <diagramId> <tableId> <name> \
  --type <type>              # SQL type (required) — e.g. uuid, varchar, integer, timestamp
  [--pk]                     # Primary key
  [--not-null]               # NOT NULL constraint
  [--unique]                 # UNIQUE constraint
  [--default <value>]        # Default value expression

# Update a column
erdify update column <diagramId> <tableId> <columnId> \
  [--name <name>]
  [--type <type>]
  [--pk <true|false>]
  [--not-null <true|false>]
  [--unique <true|false>]
  [--default <value>]        # Use "null" to remove the default

# Remove a column
erdify remove column <diagramId> <tableId> <columnId>
```

### Relationships

```bash
erdify add rel <diagramId> <srcTableId> <tgtTableId> <cardinality>
# cardinality: one-to-one | one-to-many | many-to-one

erdify remove rel <diagramId> <relationshipId>
# alias: erdify rm rel ...
```

---

## Example

```bash
# Find your diagram
erdify list orgs
#   my-org  (id: org_abc)

erdify list projects org_abc
#   my-project  (id: proj_xyz)

erdify list diagrams proj_xyz
#   main-erd  (id: diag_123, updated: 2026-05-01T...)

# Inspect the current schema
erdify get diagram diag_123
#   Diagram: "main-erd" (postgresql)
#   Tables (1):
#     users [tableId: tbl_aaa]
#       - id [columnId: col_1]: uuid PK NOT NULL
#       - email [columnId: col_2]: varchar NOT NULL UNIQUE

# Add a new table
erdify add table diag_123 orders
#   Table "orders" added. tableId=tbl_bbb

erdify add column diag_123 tbl_bbb id    --type uuid         --pk --not-null
erdify add column diag_123 tbl_bbb user_id --type uuid       --not-null
erdify add column diag_123 tbl_bbb total   --type "decimal(10,2)" --not-null
erdify add column diag_123 tbl_bbb created_at --type timestamptz --not-null

# Add a foreign key relationship
erdify add rel diag_123 tbl_bbb tbl_aaa many-to-one
#   Relationship added: "orders" → "users" (many-to-one)

# Generate DDL and pipe into Postgres
erdify get setup diag_123 | psql -U postgres -d mydb
```

---

## Self-hosted ERDify

```bash
erdify login --key YOUR_KEY --url https://your-server.com/api
# or
export ERDIFY_API_URL=https://your-server.com/api
```

---

## License

MIT
