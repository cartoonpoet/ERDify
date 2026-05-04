# Granular Diagram API + MCP ID-Based Write Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add atomic REST endpoints for ERD mutation (tables/columns/relationships) and fix MCP write tools to use IDs instead of names to prevent duplicate-name ambiguity.

**Architecture:** New service methods in `DiagramsService` use a shared `applySchemaCommand` helper that loads the diagram, checks editor/owner permission, applies an `@erdify/domain` command function, and saves. The REST controller gains 9 new endpoints. MCP `write-tools.ts` parameters change from name-strings to UUID strings; `add_*` tools now return the generated ID so the LLM can use it in subsequent calls.

**Tech Stack:** NestJS, `@erdify/domain` (already a dep of `@erdify/api`), class-validator, Zod (MCP), Vitest

---

## File Map

**Create:**
- `apps/api/src/modules/diagrams/dto/add-table.dto.ts`
- `apps/api/src/modules/diagrams/dto/update-table.dto.ts`
- `apps/api/src/modules/diagrams/dto/add-column.dto.ts`
- `apps/api/src/modules/diagrams/dto/update-column.dto.ts`
- `apps/api/src/modules/diagrams/dto/add-relationship.dto.ts`
- `apps/api/src/modules/diagrams/dto/update-relationship.dto.ts`

**Modify:**
- `apps/api/src/modules/diagrams/diagrams.service.ts` — add `applySchemaCommand` helper + 9 new methods
- `apps/api/src/modules/diagrams/diagrams.service.spec.ts` — tests for each new method
- `apps/api/src/modules/diagrams/diagrams.controller.ts` — 9 new endpoints
- `apps/mcp-server/src/tools/write-tools.ts` — replace name params with ID params

---

### Task 1: DTOs for granular REST endpoints

**Files:**
- Create: `apps/api/src/modules/diagrams/dto/add-table.dto.ts`
- Create: `apps/api/src/modules/diagrams/dto/update-table.dto.ts`
- Create: `apps/api/src/modules/diagrams/dto/add-column.dto.ts`
- Create: `apps/api/src/modules/diagrams/dto/update-column.dto.ts`
- Create: `apps/api/src/modules/diagrams/dto/add-relationship.dto.ts`
- Create: `apps/api/src/modules/diagrams/dto/update-relationship.dto.ts`

- [ ] **Step 1: Create add-table.dto.ts**

```typescript
// apps/api/src/modules/diagrams/dto/add-table.dto.ts
import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AddTableDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @IsOptional()
  x?: number;

  @IsNumber()
  @IsOptional()
  y?: number;
}
```

- [ ] **Step 2: Create update-table.dto.ts**

```typescript
// apps/api/src/modules/diagrams/dto/update-table.dto.ts
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateTableDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  color?: string | null;

  @IsString()
  @IsOptional()
  comment?: string | null;
}
```

- [ ] **Step 3: Create add-column.dto.ts**

```typescript
// apps/api/src/modules/diagrams/dto/add-column.dto.ts
import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class AddColumnDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  type!: string;

  @IsBoolean()
  @IsOptional()
  nullable?: boolean;

  @IsBoolean()
  @IsOptional()
  primaryKey?: boolean;

  @IsBoolean()
  @IsOptional()
  unique?: boolean;

  @IsString()
  @IsOptional()
  defaultValue?: string | null;
}
```

- [ ] **Step 4: Create update-column.dto.ts**

```typescript
// apps/api/src/modules/diagrams/dto/update-column.dto.ts
import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateColumnDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  type?: string;

  @IsBoolean()
  @IsOptional()
  nullable?: boolean;

  @IsBoolean()
  @IsOptional()
  primaryKey?: boolean;

  @IsBoolean()
  @IsOptional()
  unique?: boolean;

  @IsString()
  @IsOptional()
  defaultValue?: string | null;

  @IsString()
  @IsOptional()
  comment?: string | null;
}
```

- [ ] **Step 5: Create add-relationship.dto.ts**

```typescript
// apps/api/src/modules/diagrams/dto/add-relationship.dto.ts
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import type { ReferentialAction, RelationshipCardinality } from "@erdify/domain";

export class AddRelationshipDto {
  @IsString()
  sourceEntityId!: string;

  @IsArray()
  @IsString({ each: true })
  sourceColumnIds!: string[];

  @IsString()
  targetEntityId!: string;

  @IsArray()
  @IsString({ each: true })
  targetColumnIds!: string[];

  @IsEnum(["one-to-one", "one-to-many", "many-to-one"])
  cardinality!: RelationshipCardinality;

  @IsEnum(["cascade", "restrict", "set-null", "no-action"])
  @IsOptional()
  onDelete?: ReferentialAction;

  @IsEnum(["cascade", "restrict", "set-null", "no-action"])
  @IsOptional()
  onUpdate?: ReferentialAction;

  @IsBoolean()
  @IsOptional()
  identifying?: boolean;
}
```

- [ ] **Step 6: Create update-relationship.dto.ts**

```typescript
// apps/api/src/modules/diagrams/dto/update-relationship.dto.ts
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import type { ReferentialAction, RelationshipCardinality } from "@erdify/domain";

export class UpdateRelationshipDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sourceColumnIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetColumnIds?: string[];

  @IsEnum(["one-to-one", "one-to-many", "many-to-one"])
  @IsOptional()
  cardinality?: RelationshipCardinality;

  @IsEnum(["cascade", "restrict", "set-null", "no-action"])
  @IsOptional()
  onDelete?: ReferentialAction;

  @IsEnum(["cascade", "restrict", "set-null", "no-action"])
  @IsOptional()
  onUpdate?: ReferentialAction;

  @IsBoolean()
  @IsOptional()
  identifying?: boolean;
}
```

- [ ] **Step 7: Typecheck**

```bash
cd /path/to/ERDify && pnpm --filter @erdify/api exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/diagrams/dto/add-table.dto.ts \
        apps/api/src/modules/diagrams/dto/update-table.dto.ts \
        apps/api/src/modules/diagrams/dto/add-column.dto.ts \
        apps/api/src/modules/diagrams/dto/update-column.dto.ts \
        apps/api/src/modules/diagrams/dto/add-relationship.dto.ts \
        apps/api/src/modules/diagrams/dto/update-relationship.dto.ts
git commit -m "feat(diagrams): add DTOs for granular schema mutation endpoints"
```

---

### Task 2: Service – table mutation methods

**Files:**
- Modify: `apps/api/src/modules/diagrams/diagrams.service.ts`
- Modify: `apps/api/src/modules/diagrams/diagrams.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Add to `apps/api/src/modules/diagrams/diagrams.service.spec.ts` — after the existing imports, add this helper and new describe block:

```typescript
import type { DiagramDocument } from "@erdify/domain";

const makeDoc = (overrides: Partial<DiagramDocument> = {}): DiagramDocument => ({
  format: "erdify.schema.v1",
  id: "diag-1",
  name: "ERD",
  dialect: "postgresql",
  entities: [],
  relationships: [],
  indexes: [],
  views: [],
  layout: { entityPositions: {} },
  metadata: { revision: 1, stableObjectIds: true, createdAt: "", updatedAt: "" },
  ...overrides,
});

describe("addTable", () => {
  it("adds entity and returns updated diagram", async () => {
    const diagram = makeDiagram({ content: makeDoc() as unknown as object });
    diagramRepo.findOne.mockResolvedValue(diagram);
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));
    diagramRepo.save.mockImplementation(async (d: Diagram) => d);

    const result = await service.addTable("diag-1", "user-1", { name: "users" });

    const doc = result.content as unknown as DiagramDocument;
    expect(doc.entities).toHaveLength(1);
    expect(doc.entities[0]!.name).toBe("users");
  });

  it("throws ForbiddenException for viewer", async () => {
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc() as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("viewer"));

    await expect(service.addTable("diag-1", "user-1", { name: "users" })).rejects.toThrow(ForbiddenException);
  });
});

describe("updateTable", () => {
  it("renames entity", async () => {
    const doc = makeDoc({ entities: [{ id: "ent-1", name: "old", logicalName: null, comment: null, color: null, columns: [] }] });
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));
    diagramRepo.save.mockImplementation(async (d: Diagram) => d);

    const result = await service.updateTable("diag-1", "ent-1", "user-1", { name: "new" });

    const resultDoc = result.content as unknown as DiagramDocument;
    expect(resultDoc.entities[0]!.name).toBe("new");
  });

  it("throws NotFoundException for unknown tableId", async () => {
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc() as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));

    await expect(service.updateTable("diag-1", "bad-id", "user-1", { name: "x" })).rejects.toThrow(NotFoundException);
  });
});

describe("removeTable", () => {
  it("removes entity from diagram", async () => {
    const doc = makeDoc({ entities: [{ id: "ent-1", name: "users", logicalName: null, comment: null, color: null, columns: [] }] });
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));
    diagramRepo.save.mockImplementation(async (d: Diagram) => d);

    await service.removeTable("diag-1", "ent-1", "user-1");

    expect(diagramRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.objectContaining({ entities: [] }) })
    );
  });

  it("throws NotFoundException for unknown tableId", async () => {
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc() as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));

    await expect(service.removeTable("diag-1", "bad-id", "user-1")).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @erdify/api test 2>&1 | grep -E "FAIL|addTable|updateTable|removeTable"
```
Expected: FAIL — `service.addTable is not a function`

- [ ] **Step 3: Add imports and applySchemaCommand helper to diagrams.service.ts**

At the top of `apps/api/src/modules/diagrams/diagrams.service.ts`, add to the existing imports:

```typescript
import {
  addEntity, renameEntity, updateEntityColor, updateEntityComment, removeEntity,
  addColumn as domainAddColumn,
  updateColumn as domainUpdateColumn,
  removeColumn as domainRemoveColumn,
  addRelationship as domainAddRelationship,
  updateRelationship as domainUpdateRelationship,
  removeRelationship as domainRemoveRelationship,
} from "@erdify/domain";
import type { DiagramColumn, DiagramDocument, DiagramRelationship } from "@erdify/domain";
import type { AddTableDto } from "./dto/add-table.dto";
import type { UpdateTableDto } from "./dto/update-table.dto";
import type { AddColumnDto } from "./dto/add-column.dto";
import type { UpdateColumnDto } from "./dto/update-column.dto";
import type { AddRelationshipDto } from "./dto/add-relationship.dto";
import type { UpdateRelationshipDto } from "./dto/update-relationship.dto";
```

Then add this private helper method inside `DiagramsService` (place before `create`):

```typescript
private async applySchemaCommand(
  diagramId: string,
  userId: string,
  fn: (doc: DiagramDocument) => DiagramDocument
): Promise<Diagram> {
  const { diagram, orgId } = await this.getDiagramWithOrg(diagramId);
  await this.requireEditorOrOwner(orgId, userId);
  diagram.content = fn(diagram.content as unknown as DiagramDocument) as unknown as object;
  return this.diagramRepo.save(diagram);
}
```

Then add these three methods at the end of `DiagramsService` (before the closing `}`):

```typescript
async addTable(diagramId: string, userId: string, dto: AddTableDto): Promise<Diagram> {
  const entityId = randomUUID();
  const position =
    dto.x !== undefined && dto.y !== undefined ? { x: dto.x, y: dto.y } : undefined;
  return this.applySchemaCommand(diagramId, userId, (doc) =>
    addEntity(doc, { id: entityId, name: dto.name, position })
  );
}

async updateTable(
  diagramId: string,
  tableId: string,
  userId: string,
  dto: UpdateTableDto
): Promise<Diagram> {
  return this.applySchemaCommand(diagramId, userId, (doc) => {
    if (!doc.entities.find((e) => e.id === tableId)) throw new NotFoundException("Table not found");
    let updated = doc;
    if (dto.name !== undefined) updated = renameEntity(updated, tableId, dto.name);
    if (dto.color !== undefined) updated = updateEntityColor(updated, tableId, dto.color ?? null);
    if (dto.comment !== undefined) updated = updateEntityComment(updated, tableId, dto.comment ?? null);
    return updated;
  });
}

async removeTable(diagramId: string, tableId: string, userId: string): Promise<void> {
  await this.applySchemaCommand(diagramId, userId, (doc) => {
    if (!doc.entities.find((e) => e.id === tableId)) throw new NotFoundException("Table not found");
    return removeEntity(doc, tableId);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @erdify/api test 2>&1 | grep -E "✓|×|addTable|updateTable|removeTable"
```
Expected: all 6 new tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/diagrams/diagrams.service.ts \
        apps/api/src/modules/diagrams/diagrams.service.spec.ts
git commit -m "feat(diagrams): add table mutation methods to DiagramsService"
```

---

### Task 3: Service – column mutation methods

**Files:**
- Modify: `apps/api/src/modules/diagrams/diagrams.service.ts`
- Modify: `apps/api/src/modules/diagrams/diagrams.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Add to `diagrams.service.spec.ts`:

```typescript
const makeEntity = (id = "ent-1", columns: DiagramDocument["entities"][number]["columns"] = []) =>
  ({ id, name: "users", logicalName: null, comment: null, color: null, columns });

const makeColumn = (id = "col-1"): DiagramDocument["entities"][number]["columns"][number] => ({
  id,
  name: "id",
  type: "uuid",
  nullable: false,
  primaryKey: true,
  unique: true,
  defaultValue: null,
  comment: null,
  ordinal: 0,
});

describe("addColumn", () => {
  it("adds column to entity", async () => {
    const doc = makeDoc({ entities: [makeEntity()] });
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));
    diagramRepo.save.mockImplementation(async (d: Diagram) => d);

    const result = await service.addColumn("diag-1", "ent-1", "user-1", {
      name: "email",
      type: "varchar",
    });

    const resultDoc = result.content as unknown as DiagramDocument;
    expect(resultDoc.entities[0]!.columns).toHaveLength(1);
    expect(resultDoc.entities[0]!.columns[0]!.name).toBe("email");
  });

  it("throws NotFoundException for unknown tableId", async () => {
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc() as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));

    await expect(
      service.addColumn("diag-1", "bad-id", "user-1", { name: "email", type: "varchar" })
    ).rejects.toThrow(NotFoundException);
  });
});

describe("updateColumn", () => {
  it("updates column properties", async () => {
    const col = makeColumn();
    const doc = makeDoc({ entities: [makeEntity("ent-1", [col])] });
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));
    diagramRepo.save.mockImplementation(async (d: Diagram) => d);

    const result = await service.updateColumn("diag-1", "ent-1", "col-1", "user-1", {
      name: "user_id",
    });

    const resultDoc = result.content as unknown as DiagramDocument;
    expect(resultDoc.entities[0]!.columns[0]!.name).toBe("user_id");
  });

  it("throws NotFoundException for unknown columnId", async () => {
    const doc = makeDoc({ entities: [makeEntity("ent-1", [])] });
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));

    await expect(
      service.updateColumn("diag-1", "ent-1", "bad-col", "user-1", { name: "x" })
    ).rejects.toThrow(NotFoundException);
  });
});

describe("removeColumn", () => {
  it("removes column from entity", async () => {
    const col = makeColumn();
    const doc = makeDoc({ entities: [makeEntity("ent-1", [col])] });
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));
    diagramRepo.save.mockImplementation(async (d: Diagram) => d);

    await service.removeColumn("diag-1", "ent-1", "col-1", "user-1");

    expect(diagramRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          entities: [expect.objectContaining({ columns: [] })],
        }),
      })
    );
  });

  it("throws NotFoundException for unknown columnId", async () => {
    const doc = makeDoc({ entities: [makeEntity("ent-1", [])] });
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));

    await expect(service.removeColumn("diag-1", "ent-1", "bad-col", "user-1")).rejects.toThrow(
      NotFoundException
    );
  });
});
```

Note: add `import type { DiagramDocument } from "@erdify/domain";` to the spec file imports if not already present from Task 2.

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @erdify/api test 2>&1 | grep -E "FAIL|addColumn|updateColumn|removeColumn"
```
Expected: FAIL — `service.addColumn is not a function`

- [ ] **Step 3: Add column methods to diagrams.service.ts**

Add these three methods to `DiagramsService` (after `removeTable`):

```typescript
async addColumn(
  diagramId: string,
  tableId: string,
  userId: string,
  dto: AddColumnDto
): Promise<Diagram> {
  return this.applySchemaCommand(diagramId, userId, (doc) => {
    const entity = doc.entities.find((e) => e.id === tableId);
    if (!entity) throw new NotFoundException("Table not found");
    const column: DiagramColumn = {
      id: randomUUID(),
      name: dto.name,
      type: dto.type,
      nullable: dto.nullable ?? true,
      primaryKey: dto.primaryKey ?? false,
      unique: dto.unique ?? false,
      defaultValue: dto.defaultValue ?? null,
      comment: null,
      ordinal: entity.columns.length,
    };
    return domainAddColumn(doc, tableId, column);
  });
}

async updateColumn(
  diagramId: string,
  tableId: string,
  columnId: string,
  userId: string,
  dto: UpdateColumnDto
): Promise<Diagram> {
  return this.applySchemaCommand(diagramId, userId, (doc) => {
    const entity = doc.entities.find((e) => e.id === tableId);
    if (!entity) throw new NotFoundException("Table not found");
    if (!entity.columns.find((c) => c.id === columnId)) throw new NotFoundException("Column not found");
    return domainUpdateColumn(doc, tableId, columnId, dto);
  });
}

async removeColumn(
  diagramId: string,
  tableId: string,
  columnId: string,
  userId: string
): Promise<void> {
  await this.applySchemaCommand(diagramId, userId, (doc) => {
    const entity = doc.entities.find((e) => e.id === tableId);
    if (!entity) throw new NotFoundException("Table not found");
    if (!entity.columns.find((c) => c.id === columnId)) throw new NotFoundException("Column not found");
    return domainRemoveColumn(doc, tableId, columnId);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @erdify/api test 2>&1 | grep -E "✓|×|addColumn|updateColumn|removeColumn"
```
Expected: all 6 new tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/diagrams/diagrams.service.ts \
        apps/api/src/modules/diagrams/diagrams.service.spec.ts
git commit -m "feat(diagrams): add column mutation methods to DiagramsService"
```

---

### Task 4: Service – relationship mutation methods

**Files:**
- Modify: `apps/api/src/modules/diagrams/diagrams.service.ts`
- Modify: `apps/api/src/modules/diagrams/diagrams.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Add to `diagrams.service.spec.ts`:

```typescript
const makeRelationship = (id = "rel-1") => ({
  id,
  name: "",
  sourceEntityId: "ent-1",
  sourceColumnIds: [],
  targetEntityId: "ent-2",
  targetColumnIds: [],
  cardinality: "one-to-many" as const,
  onDelete: "no-action" as const,
  onUpdate: "no-action" as const,
  identifying: false,
});

describe("addRelationship", () => {
  it("adds relationship to diagram", async () => {
    const doc = makeDoc({
      entities: [
        makeEntity("ent-1"),
        makeEntity("ent-2"),
      ],
    });
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));
    diagramRepo.save.mockImplementation(async (d: Diagram) => d);

    const result = await service.addRelationship("diag-1", "user-1", {
      sourceEntityId: "ent-1",
      sourceColumnIds: [],
      targetEntityId: "ent-2",
      targetColumnIds: [],
      cardinality: "one-to-many",
    });

    const resultDoc = result.content as unknown as DiagramDocument;
    expect(resultDoc.relationships).toHaveLength(1);
    expect(resultDoc.relationships[0]!.cardinality).toBe("one-to-many");
  });

  it("throws ForbiddenException for viewer", async () => {
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc() as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("viewer"));

    await expect(
      service.addRelationship("diag-1", "user-1", {
        sourceEntityId: "ent-1",
        sourceColumnIds: [],
        targetEntityId: "ent-2",
        targetColumnIds: [],
        cardinality: "one-to-many",
      })
    ).rejects.toThrow(ForbiddenException);
  });
});

describe("updateRelationship", () => {
  it("updates cardinality", async () => {
    const doc = makeDoc({ relationships: [makeRelationship()] });
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));
    diagramRepo.save.mockImplementation(async (d: Diagram) => d);

    const result = await service.updateRelationship("diag-1", "rel-1", "user-1", {
      cardinality: "one-to-one",
    });

    const resultDoc = result.content as unknown as DiagramDocument;
    expect(resultDoc.relationships[0]!.cardinality).toBe("one-to-one");
  });

  it("throws NotFoundException for unknown relationshipId", async () => {
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc() as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));

    await expect(
      service.updateRelationship("diag-1", "bad-id", "user-1", { cardinality: "one-to-one" })
    ).rejects.toThrow(NotFoundException);
  });
});

describe("removeRelationship", () => {
  it("removes relationship", async () => {
    const doc = makeDoc({ relationships: [makeRelationship()] });
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));
    diagramRepo.save.mockImplementation(async (d: Diagram) => d);

    await service.removeRelationship("diag-1", "rel-1", "user-1");

    expect(diagramRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ relationships: [] }),
      })
    );
  });

  it("throws NotFoundException for unknown relationshipId", async () => {
    diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc() as unknown as object }));
    projectRepo.findOne.mockResolvedValue(makeProject());
    memberRepo.findOne.mockResolvedValue(makeMember("editor"));

    await expect(service.removeRelationship("diag-1", "bad-id", "user-1")).rejects.toThrow(
      NotFoundException
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @erdify/api test 2>&1 | grep -E "FAIL|addRelationship|updateRelationship|removeRelationship"
```
Expected: FAIL — `service.addRelationship is not a function`

- [ ] **Step 3: Add relationship methods to diagrams.service.ts**

Add these three methods to `DiagramsService` (after `removeColumn`):

```typescript
async addRelationship(
  diagramId: string,
  userId: string,
  dto: AddRelationshipDto
): Promise<Diagram> {
  const relationship: DiagramRelationship = {
    id: randomUUID(),
    name: "",
    sourceEntityId: dto.sourceEntityId,
    sourceColumnIds: dto.sourceColumnIds,
    targetEntityId: dto.targetEntityId,
    targetColumnIds: dto.targetColumnIds,
    cardinality: dto.cardinality,
    onDelete: dto.onDelete ?? "no-action",
    onUpdate: dto.onUpdate ?? "no-action",
    identifying: dto.identifying ?? false,
  };
  return this.applySchemaCommand(diagramId, userId, (doc) =>
    domainAddRelationship(doc, relationship)
  );
}

async updateRelationship(
  diagramId: string,
  relId: string,
  userId: string,
  dto: UpdateRelationshipDto
): Promise<Diagram> {
  return this.applySchemaCommand(diagramId, userId, (doc) => {
    if (!doc.relationships.find((r) => r.id === relId))
      throw new NotFoundException("Relationship not found");
    return domainUpdateRelationship(doc, relId, dto);
  });
}

async removeRelationship(diagramId: string, relId: string, userId: string): Promise<void> {
  await this.applySchemaCommand(diagramId, userId, (doc) => {
    if (!doc.relationships.find((r) => r.id === relId))
      throw new NotFoundException("Relationship not found");
    return domainRemoveRelationship(doc, relId);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @erdify/api test 2>&1 | grep -E "✓|×|addRelationship|updateRelationship|removeRelationship"
```
Expected: all 6 new tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/diagrams/diagrams.service.ts \
        apps/api/src/modules/diagrams/diagrams.service.spec.ts
git commit -m "feat(diagrams): add relationship mutation methods to DiagramsService"
```

---

### Task 5: Controller – 9 new REST endpoints

**Files:**
- Modify: `apps/api/src/modules/diagrams/diagrams.controller.ts`

- [ ] **Step 1: Add imports to diagrams.controller.ts**

Add to the existing import block at the top of `apps/api/src/modules/diagrams/diagrams.controller.ts`:

```typescript
import type { AddTableDto } from "./dto/add-table.dto";
import type { UpdateTableDto } from "./dto/update-table.dto";
import type { AddColumnDto } from "./dto/add-column.dto";
import type { UpdateColumnDto } from "./dto/update-column.dto";
import type { AddRelationshipDto } from "./dto/add-relationship.dto";
import type { UpdateRelationshipDto } from "./dto/update-relationship.dto";
```

Also add `HttpStatus` to the existing `@nestjs/common` import if not already present (it already is, check the file).

- [ ] **Step 2: Add 9 endpoints to DiagramsController**

Append these methods inside `DiagramsController` (before the closing `}`):

```typescript
// Tables
@Post("diagrams/:id/tables")
@HttpCode(HttpStatus.CREATED)
addTable(
  @CurrentUser() user: JwtPayload,
  @Param("id") id: string,
  @Body() dto: AddTableDto
) {
  return this.diagramsService.addTable(id, user.sub, dto);
}

@Patch("diagrams/:id/tables/:tableId")
updateTable(
  @CurrentUser() user: JwtPayload,
  @Param("id") id: string,
  @Param("tableId") tableId: string,
  @Body() dto: UpdateTableDto
) {
  return this.diagramsService.updateTable(id, tableId, user.sub, dto);
}

@Delete("diagrams/:id/tables/:tableId")
@HttpCode(HttpStatus.NO_CONTENT)
removeTable(
  @CurrentUser() user: JwtPayload,
  @Param("id") id: string,
  @Param("tableId") tableId: string
) {
  return this.diagramsService.removeTable(id, tableId, user.sub);
}

// Columns
@Post("diagrams/:id/tables/:tableId/columns")
@HttpCode(HttpStatus.CREATED)
addColumn(
  @CurrentUser() user: JwtPayload,
  @Param("id") id: string,
  @Param("tableId") tableId: string,
  @Body() dto: AddColumnDto
) {
  return this.diagramsService.addColumn(id, tableId, user.sub, dto);
}

@Patch("diagrams/:id/tables/:tableId/columns/:columnId")
updateColumn(
  @CurrentUser() user: JwtPayload,
  @Param("id") id: string,
  @Param("tableId") tableId: string,
  @Param("columnId") columnId: string,
  @Body() dto: UpdateColumnDto
) {
  return this.diagramsService.updateColumn(id, tableId, columnId, user.sub, dto);
}

@Delete("diagrams/:id/tables/:tableId/columns/:columnId")
@HttpCode(HttpStatus.NO_CONTENT)
removeColumn(
  @CurrentUser() user: JwtPayload,
  @Param("id") id: string,
  @Param("tableId") tableId: string,
  @Param("columnId") columnId: string
) {
  return this.diagramsService.removeColumn(id, tableId, columnId, user.sub);
}

// Relationships
@Post("diagrams/:id/relationships")
@HttpCode(HttpStatus.CREATED)
addRelationship(
  @CurrentUser() user: JwtPayload,
  @Param("id") id: string,
  @Body() dto: AddRelationshipDto
) {
  return this.diagramsService.addRelationship(id, user.sub, dto);
}

@Patch("diagrams/:id/relationships/:relId")
updateRelationship(
  @CurrentUser() user: JwtPayload,
  @Param("id") id: string,
  @Param("relId") relId: string,
  @Body() dto: UpdateRelationshipDto
) {
  return this.diagramsService.updateRelationship(id, relId, user.sub, dto);
}

@Delete("diagrams/:id/relationships/:relId")
@HttpCode(HttpStatus.NO_CONTENT)
removeRelationship(
  @CurrentUser() user: JwtPayload,
  @Param("id") id: string,
  @Param("relId") relId: string
) {
  return this.diagramsService.removeRelationship(id, relId, user.sub);
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @erdify/api exec tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/diagrams/diagrams.controller.ts
git commit -m "feat(diagrams): add 9 granular schema mutation REST endpoints"
```

---

### Task 6: MCP write-tools – replace name params with ID params

**Files:**
- Modify: `apps/mcp-server/src/tools/write-tools.ts`

- [ ] **Step 1: Replace write-tools.ts with ID-based implementation**

Replace the entire contents of `apps/mcp-server/src/tools/write-tools.ts` with:

```typescript
import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  addEntity,
  removeEntity,
  addColumn,
  updateColumn,
  removeColumn,
  addRelationship,
  removeRelationship,
} from "@erdify/domain";
import type { DiagramColumn, DiagramRelationship, RelationshipCardinality } from "@erdify/domain";
import { client } from "../client.js";

const columnInputSchema = z.object({
  name: z.string().describe("Column name"),
  type: z.string().describe("SQL type, e.g. varchar, uuid, integer, timestamp"),
  nullable: z.boolean().optional().describe("Defaults to true"),
  primaryKey: z.boolean().optional().describe("Defaults to false"),
  unique: z.boolean().optional().describe("Defaults to false"),
  defaultValue: z
    .string()
    .nullable()
    .optional()
    .describe("SQL default expression, set to null to remove"),
});

type ColumnInput = z.infer<typeof columnInputSchema>;

function buildColumn(input: ColumnInput, ordinal: number): DiagramColumn {
  return {
    id: randomUUID(),
    name: input.name,
    type: input.type,
    nullable: input.nullable ?? true,
    primaryKey: input.primaryKey ?? false,
    unique: input.unique ?? false,
    defaultValue: input.defaultValue ?? null,
    comment: null,
    ordinal,
  };
}

export const registerWriteTools = (server: McpServer): void => {
  server.tool(
    "add_table",
    "Add a new table to a diagram. Returns the new table's ID — save it to use in add_column and other calls.",
    {
      diagramId: z.string(),
      name: z.string().describe("Table name"),
      columns: z.array(columnInputSchema).optional().describe("Initial columns"),
    },
    async ({ diagramId, name, columns }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entityId = randomUUID();
      let updated = addEntity(doc, { id: entityId, name });
      const columnIds: string[] = [];
      if (columns) {
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i]!;
          const built = buildColumn(col, i);
          columnIds.push(built.id);
          updated = addColumn(updated, entityId, built);
        }
      }
      await client.updateDiagram(diagramId, updated);
      const colInfo =
        columnIds.length > 0 ? ` Columns: ${columnIds.join(", ")}` : "";
      return {
        content: [
          {
            type: "text",
            text: `Table "${name}" added. tableId=${entityId}.${colInfo}`,
          },
        ],
      };
    }
  );

  server.tool(
    "remove_table",
    "Remove a table from a diagram by its ID",
    {
      diagramId: z.string(),
      tableId: z.string().describe("ID of the table to remove (from get_diagram)"),
    },
    async ({ diagramId, tableId }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      if (!doc.entities.find((e) => e.id === tableId)) {
        throw new Error(`Table ID "${tableId}" not found in diagram`);
      }
      const updated = removeEntity(doc, tableId);
      await client.updateDiagram(diagramId, updated);
      return { content: [{ type: "text", text: `Table ${tableId} removed.` }] };
    }
  );

  server.tool(
    "add_column",
    "Add a column to an existing table. Returns the new column's ID.",
    {
      diagramId: z.string(),
      tableId: z.string().describe("ID of the table (from get_diagram or add_table)"),
      column: columnInputSchema,
    },
    async ({ diagramId, tableId, column }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entity = doc.entities.find((e) => e.id === tableId);
      if (!entity) throw new Error(`Table ID "${tableId}" not found in diagram`);
      const built = buildColumn(column, entity.columns.length);
      const updated = addColumn(doc, tableId, built);
      await client.updateDiagram(diagramId, updated);
      return {
        content: [
          {
            type: "text",
            text: `Column "${column.name}" added to table ${tableId}. columnId=${built.id}.`,
          },
        ],
      };
    }
  );

  server.tool(
    "update_column",
    "Update properties of an existing column",
    {
      diagramId: z.string(),
      tableId: z.string().describe("ID of the table (from get_diagram)"),
      columnId: z.string().describe("ID of the column (from get_diagram)"),
      updates: columnInputSchema.partial(),
    },
    async ({ diagramId, tableId, columnId, updates }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entity = doc.entities.find((e) => e.id === tableId);
      if (!entity) throw new Error(`Table ID "${tableId}" not found`);
      const col = entity.columns.find((c) => c.id === columnId);
      if (!col) throw new Error(`Column ID "${columnId}" not found in table ${tableId}`);
      const changes: Partial<Omit<DiagramColumn, "id">> = {};
      if (updates.name !== undefined) changes.name = updates.name;
      if (updates.type !== undefined) changes.type = updates.type;
      if (updates.nullable !== undefined) changes.nullable = updates.nullable;
      if (updates.primaryKey !== undefined) changes.primaryKey = updates.primaryKey;
      if (updates.unique !== undefined) changes.unique = updates.unique;
      if (updates.defaultValue !== undefined) changes.defaultValue = updates.defaultValue;
      const updated = updateColumn(doc, tableId, columnId, changes);
      await client.updateDiagram(diagramId, updated);
      return { content: [{ type: "text", text: `Column ${columnId} updated.` }] };
    }
  );

  server.tool(
    "remove_column",
    "Remove a column from a table",
    {
      diagramId: z.string(),
      tableId: z.string().describe("ID of the table (from get_diagram)"),
      columnId: z.string().describe("ID of the column (from get_diagram)"),
    },
    async ({ diagramId, tableId, columnId }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      const entity = doc.entities.find((e) => e.id === tableId);
      if (!entity) throw new Error(`Table ID "${tableId}" not found`);
      if (!entity.columns.find((c) => c.id === columnId)) {
        throw new Error(`Column ID "${columnId}" not found in table ${tableId}`);
      }
      const updated = removeColumn(doc, tableId, columnId);
      await client.updateDiagram(diagramId, updated);
      return { content: [{ type: "text", text: `Column ${columnId} removed from table ${tableId}.` }] };
    }
  );

  server.tool(
    "add_relationship",
    "Add a foreign key relationship between two tables. Returns the new relationship ID.",
    {
      diagramId: z.string(),
      sourceTableId: z
        .string()
        .describe("ID of the table that holds the foreign key (from get_diagram)"),
      targetTableId: z
        .string()
        .describe("ID of the table being referenced (from get_diagram)"),
      cardinality: z
        .enum(["one-to-one", "one-to-many", "many-to-one"])
        .describe("Relationship cardinality"),
    },
    async ({ diagramId, sourceTableId, targetTableId, cardinality }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      if (!doc.entities.find((e) => e.id === sourceTableId)) {
        throw new Error(`Source table ID "${sourceTableId}" not found`);
      }
      if (!doc.entities.find((e) => e.id === targetTableId)) {
        throw new Error(`Target table ID "${targetTableId}" not found`);
      }
      const relationship: DiagramRelationship = {
        id: randomUUID(),
        name: "",
        sourceEntityId: sourceTableId,
        sourceColumnIds: [],
        targetEntityId: targetTableId,
        targetColumnIds: [],
        cardinality: cardinality as RelationshipCardinality,
        onDelete: "no-action",
        onUpdate: "no-action",
        identifying: false,
      };
      const updated = addRelationship(doc, relationship);
      await client.updateDiagram(diagramId, updated);
      return {
        content: [
          {
            type: "text",
            text: `Relationship added: ${sourceTableId} → ${targetTableId} (${cardinality}). relationshipId=${relationship.id}.`,
          },
        ],
      };
    }
  );

  server.tool(
    "remove_relationship",
    "Remove a relationship by its ID",
    {
      diagramId: z.string(),
      relationshipId: z
        .string()
        .describe("ID of the relationship to remove (from get_diagram)"),
    },
    async ({ diagramId, relationshipId }) => {
      const { content: doc } = await client.getDiagram(diagramId);
      if (!doc.relationships.find((r) => r.id === relationshipId)) {
        throw new Error(`Relationship ID "${relationshipId}" not found`);
      }
      const updated = removeRelationship(doc, relationshipId);
      await client.updateDiagram(diagramId, updated);
      return {
        content: [{ type: "text", text: `Relationship ${relationshipId} removed.` }],
      };
    }
  );
};
```

- [ ] **Step 2: Typecheck mcp-server**

```bash
pnpm --filter @erdify/mcp-server exec tsc --noEmit 2>&1
```
Expected: no errors (or check package name with `cat apps/mcp-server/package.json | grep '"name"'`)

- [ ] **Step 3: Run all tests**

```bash
pnpm --filter @erdify/api test 2>&1 | tail -20
```
Expected: previous passing tests still pass; no regressions

- [ ] **Step 4: Commit**

```bash
git add apps/mcp-server/src/tools/write-tools.ts
git commit -m "fix(mcp): replace name-based params with ID-based params in write tools"
```
