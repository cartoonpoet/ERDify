# ERDify Editor-First MVP Design

Date: 2026-04-30
Status: Approved for implementation planning

## 1. Purpose

ERDify is a web-based ERD tool for B2B legal-system development teams. The first MVP prioritizes a usable ERD editor similar to AQueryTool: users can log in, manage organizations and projects, edit ERDs visually, collaborate in real time, save versions, and import/export SQL and schema artifacts.

The longer-term product direction is customer-specific schema customization management for SaaS and On-Premise deployments. The MVP should therefore keep stable object identities, version history, and extension points for customer variants, but it should not make variant/diff workflows the first user-facing center of the product.

## 2. Product Positioning

The selected approach is "ERD editor first."

MVP users should be able to:

- Create an account and work inside an organization.
- Create projects and ERD diagrams.
- Edit tables, columns, indexes, constraints, and relationships visually.
- Collaborate with other users in the same diagram in real time.
- Save immutable versions and restore previous versions.
- Import and export PostgreSQL and MySQL/MariaDB DDL.
- Export canonical JSON/YAML for AI and automation use.
- Share read-only links.
- Use basic B2B permissions and audit logs.
- Connect AI tools through REST/OpenAPI and read-oriented MCP surfaces.

Deferred product areas:

- Full customer variant/diff/change approval workflow.
- Complex SSO/SCIM enterprise identity.
- Multi-step approval chains.
- Direct production DB migration execution.
- Oracle/Tibero/MSSQL dialect support.
- Advanced live DB introspection and drift management.

## 3. High-Level Architecture

The repository will be a Turborepo monorepo using TypeScript across frontend and backend.

```text
apps/
  web/        React + Vite + TypeScript
  api/        NestJS + TypeScript

packages/
  domain/     ERD document model, commands, validation, serialization
  contracts/  shared API DTO/schema contracts
  db/         TypeORM migrations, seed data, DB helpers
  erd-ui/     ERD-specific canvas nodes, panels, and editor UI helpers
  config-eslint/
  config-typescript/
```

The ERD document model must not be coupled to React Flow. React Flow is the rendering and interaction layer. The persisted source is the canonical `erdify.schema.v1` document from `packages/domain`.

## 4. Technology Stack

Frontend:

- React + Vite + TypeScript
- LDS / `@lawkit/ui` as the primary design system
- `vanilla-extract` for styling
- `@tanstack/react-query` for server state
- `axios` for HTTP
- `zustand` for client/editor state
- `react-hook-form` only when form state becomes complex
- React Flow for ERD canvas interaction
- Yjs client integration for real-time collaboration

Backend:

- NestJS + TypeScript
- TypeORM
- PostgreSQL as ERDify's own metadata store
- PostgreSQL + MySQL/MariaDB as MVP target dialects
- REST API for primary application/API integration
- WebSocket gateway for collaboration
- OpenAPI for API documentation
- MCP adapter for AI-oriented schema access and limited proposal creation

## 5. Design System and UI Strategy

LDS is the default UI layer. ERDify should reuse LDS components for management surfaces and forms, including:

- `Button`, `ButtonGroup`, `IconButtonGroup`
- `DataTable`
- `TreeView`
- `Tabs`
- `Input`, `Dropdown`, `Switch`, `Checkbox`, `NumberInput`
- `Modal`, `Toast`, `Tooltip`, `Popover`

ERDify-specific components should live in `packages/erd-ui` or feature-local editor modules:

- Table node
- Column row editor
- Relationship edge label
- Canvas toolbar
- Mini map and zoom controls
- Schema object inspector
- SQL import/export panel
- Version history drawer
- Diff preview panel

The first screen after login is the usable dashboard, not a marketing landing page.

Primary navigation:

```text
Organization selection
  -> Project list
  -> ERD list
  -> ERD editor
```

## 6. Frontend Coding Convention

The frontend uses separated modules with a centralized feature structure.

Example:

```text
src/
  app/
  pages/
  features/
    editor/
      components/
      hooks/
      services/
      stores/
      types/
        diagram.type.ts
        table.type.ts
        column.type.ts
        relation.type.ts
        index.ts
      utils/
      index.ts
  shared/
    api/
    components/
    hooks/
    stores/
    types/
    styles/
```

Rules:

- Custom hooks follow single responsibility.
- Types are split by concern and re-exported through `types/index.ts`.
- Feature modules expose a small public surface through `index.ts`.
- API calls use `axios` through shared API clients.
- Server state lives in TanStack Query.
- Editor/session state lives in Zustand.
- Styling uses LDS tokens and `vanilla-extract`.
- React Hook Form is introduced for complex create/edit forms, not for every input.

Example editor hooks:

```text
useDiagramDocument.ts
useDiagramSelection.ts
useTableCommands.ts
useColumnCommands.ts
useRelationshipCommands.ts
useRealtimeCollaboration.ts
useDiagramAutosave.ts
```

## 7. Backend Coding Convention

The backend uses NestJS modules with TypeORM and explicit role separation.

Example:

```text
src/
  modules/
    auth/
      dto/
      entities/
      guards/
      strategies/
      auth.controller.ts
      auth.service.ts
      auth.module.ts
    diagrams/
      dto/
      entities/
      repositories/
      diagrams.controller.ts
      diagrams.service.ts
      diagrams.module.ts
    collaboration/
      dto/
      gateways/
      services/
      entities/
      collaboration.module.ts
```

Rules:

- DTO, Entity, Controller, Service, Module, Guard, and Gateway responsibilities stay separate.
- TypeORM migrations are the source of database schema changes.
- Entity classes represent persistence. Domain behavior stays in services or `packages/domain`.
- Request/response DTOs use `class-validator` and `class-transformer`.
- REST DTOs and WebSocket message DTOs are separate.
- Audit logging is explicit in service workflows.

## 8. Canonical ERD Document

All editor state, exports, AI access, and future diff features flow through `erdify.schema.v1`.

Minimal shape:

```json
{
  "format": "erdify.schema.v1",
  "dialect": "postgresql",
  "entities": [],
  "relationships": [],
  "indexes": [],
  "views": [],
  "metadata": {
    "revision": 1,
    "stableObjectIds": true
  }
}
```

Important rules:

- Every table, column, relationship, index, and constraint has a stable id.
- Rename must remain distinguishable from drop-and-add.
- Physical database metadata and logical descriptions can coexist.
- React Flow node/edge data is derived from this model, not stored as the domain source.
- The model remains dialect-aware but avoids binding all domain semantics to a single SQL dialect.

## 9. ERD Editor UX

Editor layout:

```text
Top bar:
  project/diagram name, save status, version save, share, export

Left panel:
  table list, search, group/module filters

Center:
  React Flow ERD canvas

Right panel:
  selected table/column/relation inspector

Bottom drawer:
  SQL import/export, version history, diff preview
```

MVP interactions:

- Add, rename, duplicate, and delete tables.
- Add, edit, reorder, and delete columns.
- Mark primary key, foreign key, nullable, unique, default, and comments.
- Create and delete relationships.
- Edit relationship cardinality and delete/update rules.
- Search and focus table.
- Zoom, fit view, pan, and mini map.
- Inline edit common names.
- Use inspector for full properties.
- Autosave active working state.
- Save immutable version explicitly.

## 10. Real-Time Collaboration

Real-time collaboration is in MVP.

Recommended model:

```text
client command / Yjs update
  -> NestJS collaboration gateway
  -> shared Yjs document/session
  -> periodic persisted snapshot
  -> explicit immutable version on user action
```

Core capabilities:

- Multiple users can open and edit the same diagram.
- Presence shows connected users.
- Selection and cursor/editing state are visible to collaborators.
- Table moves, property edits, column changes, and relationship changes sync in real time.
- The server persists snapshots periodically or after meaningful changes.
- Explicit "save version" stores the current document as an immutable `diagram_versions` record.

Implementation preference:

- Yjs-based CRDT for shared document state.
- NestJS WebSocket gateway as the server-side transport and authorization boundary.
- PostgreSQL JSONB snapshots as durable storage.

Audit logs should not store every node movement. They should record meaningful events such as diagram creation, version save, import, export, share link creation, major object changes, and proposal creation.

## 11. Backend Data Model

MVP tables:

```text
users
organizations
organization_members
projects
diagrams
diagram_versions
diagram_collaboration_sessions
share_links
audit_logs
api_tokens
```

Role model:

```text
Owner       organization/project/permission management
Editor      ERD create/edit/version/export
Viewer      read/export
ShareViewer read-only shared-link access
```

`diagrams` stores metadata and latest editable snapshot. `diagram_versions` stores immutable versions.

Future customer-variant fields should be reserved or planned for:

```text
project_type: standard | customer
base_diagram_id
base_version_id
customer_key
```

## 12. API Design

REST endpoints:

```text
POST   /auth/login
POST   /auth/register
GET    /me

GET    /organizations
POST   /organizations
GET    /organizations/:organizationId/projects

GET    /projects/:projectId/diagrams
POST   /projects/:projectId/diagrams

GET    /diagrams/:diagramId
PATCH  /diagrams/:diagramId
POST   /diagrams/:diagramId/versions
GET    /diagrams/:diagramId/versions
GET    /diagrams/:diagramId/versions/:versionId

POST   /diagrams/:diagramId/import/sql
GET    /diagrams/:diagramId/export/json
GET    /diagrams/:diagramId/export/yaml
GET    /diagrams/:diagramId/export/sql?dialect=postgresql
GET    /diagrams/:diagramId/export/sql?dialect=mysql

POST   /diagrams/:diagramId/share-links
GET    /share/:token

GET    /diagrams/:diagramId/schema/entities/:entityId
POST   /diagrams/:diagramId/proposals
POST   /diagrams/:diagramId/proposals/:proposalId/validate
```

WebSocket namespace:

```text
/collaboration/diagrams/:diagramId
```

Events:

```text
join
leave
presence:update
yjs:update
snapshot:request
snapshot:saved
```

## 13. Import and Export

MVP exports:

- `erdify.schema.v1.json`
- `erdify.schema.v1.yaml`
- PostgreSQL DDL
- MySQL DDL
- MariaDB DDL

MVP imports:

- PostgreSQL DDL import
- MySQL/MariaDB DDL import

The import parser should report unsupported SQL syntax clearly and avoid silently dropping important constraints.

## 14. AI, API, and MCP

AI integration is included in MVP with a read-first, proposal-only-write rule.

REST/OpenAPI is the primary integration contract.

MCP resources are read-only:

```text
erdify://diagrams/{diagramId}/schema
erdify://diagrams/{diagramId}/entities
erdify://diagrams/{diagramId}/relationships
erdify://diagrams/{diagramId}/ddl/postgresql
erdify://diagrams/{diagramId}/ddl/mysql
```

MCP tools:

```text
search_schema
get_entity_context
analyze_change_impact
validate_schema_proposal
create_migration_proposal
```

MCP tools that read schema context are read-only. `create_migration_proposal` is the only MVP MCP tool that may create server-side data, and it requires the `proposal:create` scope. AI tools may create proposals but must not directly apply schema changes.

Proposal shape:

```json
{
  "baseRevision": 12,
  "intent": "contracts table needs contract status",
  "operations": [
    {
      "op": "add_column",
      "entityId": "ent_contracts",
      "column": {
        "name": "contract_status",
        "type": "varchar",
        "length": 30,
        "nullable": false,
        "default": "draft"
      }
    }
  ],
  "rationale": "Needed for contract lifecycle search and reporting"
}
```

Validation checks:

- Base revision conflict.
- Invalid object references.
- Breaking changes.
- Drop, rename, and type narrowing risk.
- PostgreSQL/MySQL/MariaDB DDL generation viability.
- Generated SQL preview.
- Permission and audit log recording.

## 15. On-Premise Considerations

On-Premise customers may have restricted networks and strict data policies.

MVP support:

- JSON/YAML/SQL export files.
- ZIP export bundle.
- API token scopes.
- Read-only MCP server option for local or internal-network usage.
- Audit logs.
- No automatic sample data export.
- No direct production DB migration execution.

## 16. Security and Permission Requirements

MVP security requirements:

- Organization isolation.
- Project-level access checks.
- Role-based permission checks.
- Read-only share links.
- API token scopes: `schema:read`, `export:read`, `proposal:create`.
- Audit logs for create, update, import, export, version save, share link creation, and proposal actions.
- Shared link expiration should be supported even if default links do not expire.

## 17. Testing and Quality

Monorepo quality gate:

```text
turbo run lint
turbo run typecheck
turbo run test
turbo run build
```

Frontend tests:

- `packages/domain` unit tests for commands, validation, serialization.
- React Testing Library for UI components.
- Zustand store action tests.
- TanStack Query hook tests with API mocks.
- Playwright for critical editor flows.
- Yjs integration tests for two-client collaboration.

Backend tests:

- NestJS service unit tests.
- DTO validation tests.
- TypeORM integration tests.
- Supertest e2e tests.
- WebSocket collaboration gateway tests.
- Import/export parser tests.
- Proposal validation tests.

Required permission tests:

- User outside organization cannot access diagram.
- Viewer cannot mutate diagrams.
- Shared link is read-only.
- API token without scope receives 403.
- Audit log is written for major actions.

Core e2e flow:

```text
login
  -> create project
  -> create ERD
  -> add table
  -> add column
  -> connect relationship
  -> save version
  -> export SQL
```

## 18. Development Phases

Phase 1: Monorepo and foundations

- Turborepo
- React/Vite app
- NestJS API
- TypeORM and PostgreSQL connection
- LDS setup
- Shared TypeScript configs

Phase 2: Auth, organizations, projects

- Register/login
- Organization membership
- Project CRUD
- Role checks

Phase 3: ERD domain and editor

- Canonical schema model
- React Flow editor
- Table/column/relationship editing
- Zustand editor state

Phase 4: Persistence and versions

- Diagram snapshots
- Autosave
- Immutable version save/restore

Phase 5: Real-time collaboration

- Yjs document model
- NestJS WebSocket gateway
- Presence
- Shared edits
- Snapshot persistence

Phase 6: Import/export

- JSON/YAML export
- PostgreSQL/MySQL/MariaDB DDL export
- SQL import MVP

Phase 7: AI/MCP/proposals

- OpenAPI
- Read-only MCP resources
- Proposal create/validate
- Audit logs

Phase 8: Sharing and operational polish

- Read-only share links
- Export bundle
- Basic logging and monitoring

## 19. Open Follow-Up Decisions

These decisions remain for implementation planning:

- Whether LDS will be installed as a package or vendored/linked from the LDS repository during development.
- Exact Yjs provider package and server persistence strategy.
- SQL parser library choice for PostgreSQL and MySQL/MariaDB.
- Authentication method for MVP: email/password only, OAuth, or both.
- Whether share links should expire by default.
- How much of proposal review UI is included in the first implementation slice.

## 20. References

- LDS Storybook: https://lds-storybook.vercel.app/
- LDS repository: https://github.com/cartoonpoet/LDS
- AQueryTool reference: https://aquerytool.com/
- Turborepo repository structure: https://turborepo.com/docs/crafting-your-repository/structuring-a-repository
- NestJS modules: https://docs.nestjs.com/modules
- React Flow: https://reactflow.dev/learn
