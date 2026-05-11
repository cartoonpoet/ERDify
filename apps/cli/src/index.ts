import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { Command } from "commander";
import {
  addColumn,
  addEntity,
  addRelationship,
  generateDdl,
  generateSeedSql,
  generateSetupSql,
  removeColumn,
  removeEntity,
  removeRelationship,
  updateColumn,
} from "@erdify/domain";
import type { DiagramColumn, DiagramDocument, DiagramRelationship, RelationshipCardinality } from "@erdify/domain";
import { client } from "./client.js";
import { getApiKey, getApiUrl, readConfig, writeConfig } from "./config.js";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDiagram(name: string, doc: DiagramDocument): string {
  const lines: string[] = [`Diagram: "${name}" (${doc.dialect})`, ""];
  lines.push(`Tables (${doc.entities.length}):`);
  for (const entity of doc.entities) {
    lines.push(`  ${entity.name} [tableId: ${entity.id}]`);
    for (const col of [...entity.columns].sort((a, b) => a.ordinal - b.ordinal)) {
      const flags = [col.primaryKey ? "PK" : null, !col.nullable ? "NOT NULL" : null, col.unique ? "UNIQUE" : null]
        .filter(Boolean)
        .join(" ");
      lines.push(`    - ${col.name} [columnId: ${col.id}]: ${col.type}${flags ? " " + flags : ""}`);
    }
  }
  if (doc.relationships.length > 0) {
    lines.push("", `Relationships (${doc.relationships.length}):`);
    for (const rel of doc.relationships) {
      const src = doc.entities.find((e) => e.id === rel.sourceEntityId)?.name ?? rel.sourceEntityId;
      const tgt = doc.entities.find((e) => e.id === rel.targetEntityId)?.name ?? rel.targetEntityId;
      lines.push(`  ${src} → ${tgt} (${rel.cardinality}) [relationshipId: ${rel.id}]`);
    }
  }
  return lines.join("\n");
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function parseBoolFlag(value: string | boolean | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  return value !== "false" && value !== "0";
}

function handleError(err: unknown): never {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

// ── program ───────────────────────────────────────────────────────────────────

const program = new Command();
program.name("erdify").description("ERDify CLI").version("0.0.0");

// ── login / whoami ────────────────────────────────────────────────────────────

program
  .command("login")
  .description("Save API key to config file")
  .option("--key <key>", "API key (skips interactive prompt)")
  .option("--url <url>", "API URL (optional, uses default if omitted)")
  .action(async (opts: { key?: string; url?: string }) => {
    const key = opts.key ?? (await prompt("API key: "));
    if (!key) {
      console.error("API key is required");
      process.exit(1);
    }
    writeConfig({ apiKey: key, ...(opts.url ? { apiUrl: opts.url } : {}) });
    console.log("Saved.");
  });

program
  .command("whoami")
  .description("Show current config")
  .action(() => {
    const key = getApiKey();
    const url = getApiUrl();
    console.log(`API URL: ${url}`);
    console.log(`API key: ${key ? key.slice(0, 8) + "..." : "(not set)"}`);
    const cfg = readConfig();
    console.log(`Config source: ${cfg.apiKey ? "config file" : "env var"}`);
  });

// ── list ──────────────────────────────────────────────────────────────────────

const list = program.command("list").description("List resources");

list
  .command("orgs")
  .description("List organizations")
  .action(async () => {
    const orgs = await client.getOrganizations().catch(handleError);
    if (orgs.length === 0) {
      console.log("No organizations found.");
      return;
    }
    for (const o of orgs) console.log(`${o.name}  (id: ${o.id})`);
  });

list
  .command("projects <orgId>")
  .description("List projects in an organization")
  .action(async (orgId: string) => {
    const projects = await client.getProjects(orgId).catch(handleError);
    if (projects.length === 0) {
      console.log("No projects found.");
      return;
    }
    for (const p of projects) console.log(`${p.name}  (id: ${p.id})`);
  });

list
  .command("diagrams <projectId>")
  .description("List diagrams in a project")
  .action(async (projectId: string) => {
    const diagrams = await client.getDiagrams(projectId).catch(handleError);
    if (diagrams.length === 0) {
      console.log("No diagrams found.");
      return;
    }
    for (const d of diagrams)
      console.log(`${d.name}  (id: ${d.id}, updated: ${d.updatedAt})`);
  });

// ── get ───────────────────────────────────────────────────────────────────────

const get = program.command("get").description("Get diagram info");

get
  .command("diagram <diagramId>")
  .description("Show tables, columns, and relationships")
  .action(async (diagramId: string) => {
    const diagram = await client.getDiagram(diagramId).catch(handleError);
    console.log(formatDiagram(diagram.name, diagram.content));
  });

get
  .command("ddl <diagramId>")
  .description("Generate DDL SQL for a diagram")
  .action(async (diagramId: string) => {
    const diagram = await client.getDiagram(diagramId).catch(handleError);
    const ddl = generateDdl(diagram.content).trim() || "-- No tables defined";
    console.log(ddl);
  });

get
  .command("seed <diagramId>")
  .description("Generate INSERT seed SQL for a diagram")
  .action(async (diagramId: string) => {
    const diagram = await client.getDiagram(diagramId).catch(handleError);
    const sql = generateSeedSql(diagram.content).trim() || "-- No seed data defined";
    console.log(sql);
  });

get
  .command("setup <diagramId>")
  .description("Generate DDL + seed SQL (ready to pipe into your DB)")
  .action(async (diagramId: string) => {
    const diagram = await client.getDiagram(diagramId).catch(handleError);
    const sql = generateSetupSql(diagram.content).trim() || "-- Nothing to generate";
    console.log(sql);
  });

// ── add ───────────────────────────────────────────────────────────────────────

const add = program.command("add").description("Add resources");

add
  .command("table <diagramId> <name>")
  .description("Add a table to a diagram")
  .action(async (diagramId: string, name: string) => {
    const { content: doc } = await client.getDiagram(diagramId).catch(handleError);
    const entityId = randomUUID();
    const updated = addEntity(doc, { id: entityId, name });
    await client.updateDiagram(diagramId, updated).catch(handleError);
    console.log(`Table "${name}" added. tableId=${entityId}`);
  });

add
  .command("column <diagramId> <tableId> <name>")
  .description("Add a column to a table")
  .requiredOption("--type <type>", "SQL type (e.g. varchar, uuid, integer)")
  .option("--pk", "Primary key")
  .option("--not-null", "NOT NULL constraint")
  .option("--unique", "UNIQUE constraint")
  .option("--default <value>", "Default value")
  .action(
    async (
      diagramId: string,
      tableId: string,
      name: string,
      opts: { type: string; pk?: boolean; notNull?: boolean; unique?: boolean; default?: string }
    ) => {
      const { content: doc } = await client.getDiagram(diagramId).catch(handleError);
      const entity = doc.entities.find((e) => e.id === tableId);
      if (!entity) {
        console.error(`Table ID "${tableId}" not found`);
        process.exit(1);
      }
      const column: DiagramColumn = {
        id: randomUUID(),
        name,
        type: opts.type,
        nullable: !opts.notNull,
        primaryKey: opts.pk ?? false,
        unique: opts.unique ?? false,
        defaultValue: opts.default ?? null,
        comment: null,
        ordinal: entity.columns.length,
      };
      const updated = addColumn(doc, tableId, column);
      await client.updateDiagram(diagramId, updated).catch(handleError);
      console.log(`Column "${name}" added to table "${entity.name}". columnId=${column.id}`);
    }
  );

add
  .command("rel <diagramId> <srcTableId> <tgtTableId> <cardinality>")
  .description("Add a relationship (cardinality: one-to-one | one-to-many | many-to-one)")
  .action(async (diagramId: string, srcTableId: string, tgtTableId: string, cardinality: string) => {
    const validCardinalities = ["one-to-one", "one-to-many", "many-to-one"];
    if (!validCardinalities.includes(cardinality)) {
      console.error(`Invalid cardinality. Use: ${validCardinalities.join(" | ")}`);
      process.exit(1);
    }
    const { content: doc } = await client.getDiagram(diagramId).catch(handleError);
    const src = doc.entities.find((e) => e.id === srcTableId);
    const tgt = doc.entities.find((e) => e.id === tgtTableId);
    if (!src) { console.error(`Source table ID "${srcTableId}" not found`); process.exit(1); }
    if (!tgt) { console.error(`Target table ID "${tgtTableId}" not found`); process.exit(1); }

    const relationship: DiagramRelationship = {
      id: randomUUID(),
      name: "",
      sourceEntityId: srcTableId,
      sourceColumnIds: [],
      targetEntityId: tgtTableId,
      targetColumnIds: [],
      cardinality: cardinality as RelationshipCardinality,
      onDelete: "no-action",
      onUpdate: "no-action",
      identifying: false,
    };
    const updated = addRelationship(doc, relationship);
    await client.updateDiagram(diagramId, updated).catch(handleError);
    console.log(`Relationship added: "${src.name}" → "${tgt.name}" (${cardinality}). relationshipId=${relationship.id}`);
  });

// ── update ────────────────────────────────────────────────────────────────────

const update = program.command("update").description("Update resources");

update
  .command("column <diagramId> <tableId> <columnId>")
  .description("Update column properties")
  .option("--name <name>", "New column name")
  .option("--type <type>", "New SQL type")
  .option("--pk [bool]", "Primary key: true or false")
  .option("--not-null [bool]", "NOT NULL: true or false")
  .option("--unique [bool]", "UNIQUE: true or false")
  .option("--default <value>", "Default value (use 'null' to remove)")
  .action(
    async (
      diagramId: string,
      tableId: string,
      columnId: string,
      opts: {
        name?: string;
        type?: string;
        pk?: string | boolean;
        notNull?: string | boolean;
        unique?: string | boolean;
        default?: string;
      }
    ) => {
      const { content: doc } = await client.getDiagram(diagramId).catch(handleError);
      const entity = doc.entities.find((e) => e.id === tableId);
      if (!entity) { console.error(`Table ID "${tableId}" not found`); process.exit(1); }
      const col = entity.columns.find((c) => c.id === columnId);
      if (!col) { console.error(`Column ID "${columnId}" not found`); process.exit(1); }

      const changes: Partial<Omit<DiagramColumn, "id">> = {};
      if (opts.name !== undefined) changes.name = opts.name;
      if (opts.type !== undefined) changes.type = opts.type;
      const pk = parseBoolFlag(opts.pk);
      if (pk !== undefined) changes.primaryKey = pk;
      const notNull = parseBoolFlag(opts.notNull);
      if (notNull !== undefined) changes.nullable = !notNull;
      const unique = parseBoolFlag(opts.unique);
      if (unique !== undefined) changes.unique = unique;
      if (opts.default !== undefined) changes.defaultValue = opts.default === "null" ? null : opts.default;

      const updated = updateColumn(doc, tableId, columnId, changes);
      await client.updateDiagram(diagramId, updated).catch(handleError);
      console.log(`Column "${col.name}" (${columnId}) updated.`);
    }
  );

// ── remove ────────────────────────────────────────────────────────────────────

const remove = program.command("remove").alias("rm").description("Remove resources");

remove
  .command("table <diagramId> <tableId>")
  .description("Remove a table from a diagram")
  .action(async (diagramId: string, tableId: string) => {
    const { content: doc } = await client.getDiagram(diagramId).catch(handleError);
    const entity = doc.entities.find((e) => e.id === tableId);
    if (!entity) { console.error(`Table ID "${tableId}" not found`); process.exit(1); }
    const updated = removeEntity(doc, tableId);
    await client.updateDiagram(diagramId, updated).catch(handleError);
    console.log(`Table "${entity.name}" (${tableId}) removed.`);
  });

remove
  .command("column <diagramId> <tableId> <columnId>")
  .description("Remove a column from a table")
  .action(async (diagramId: string, tableId: string, columnId: string) => {
    const { content: doc } = await client.getDiagram(diagramId).catch(handleError);
    const entity = doc.entities.find((e) => e.id === tableId);
    if (!entity) { console.error(`Table ID "${tableId}" not found`); process.exit(1); }
    const col = entity.columns.find((c) => c.id === columnId);
    if (!col) { console.error(`Column ID "${columnId}" not found`); process.exit(1); }
    const updated = removeColumn(doc, tableId, columnId);
    await client.updateDiagram(diagramId, updated).catch(handleError);
    console.log(`Column "${col.name}" (${columnId}) removed from table "${entity.name}".`);
  });

remove
  .command("rel <diagramId> <relationshipId>")
  .description("Remove a relationship")
  .action(async (diagramId: string, relationshipId: string) => {
    const { content: doc } = await client.getDiagram(diagramId).catch(handleError);
    const rel = doc.relationships.find((r) => r.id === relationshipId);
    if (!rel) { console.error(`Relationship ID "${relationshipId}" not found`); process.exit(1); }
    const src = doc.entities.find((e) => e.id === rel.sourceEntityId)?.name ?? rel.sourceEntityId;
    const tgt = doc.entities.find((e) => e.id === rel.targetEntityId)?.name ?? rel.targetEntityId;
    const updated = removeRelationship(doc, relationshipId);
    await client.updateDiagram(diagramId, updated).catch(handleError);
    console.log(`Relationship "${src} → ${tgt}" (${relationshipId}) removed.`);
  });

// ── run ───────────────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch(handleError);
