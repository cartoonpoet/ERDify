import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Diagram, DiagramVersion, OrganizationMember, Project } from "@erdify/db";
import type { Repository } from "typeorm";
import { DiagramsService, _setDomainModuleForTest } from "./diagrams.service";
import type { DiagramDocument } from "@erdify/domain";
import * as erdifyDomain from "@erdify/domain";

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

type MockRepo<_T> = {
  findOne: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

const makeProject = (o: Partial<Project> = {}): Project =>
  ({ id: "proj-1", organizationId: "org-1", ...o }) as Project;

const makeDiagram = (o: Partial<Diagram> = {}): Diagram =>
  ({ id: "diag-1", projectId: "proj-1", name: "ERD", content: {} as object, ...o }) as Diagram;

const makeVersion = (o: Partial<DiagramVersion> = {}): DiagramVersion =>
  ({ id: "v1", diagramId: "diag-1", revision: 1, ...o }) as DiagramVersion;

const makeMember = (role = "editor"): OrganizationMember =>
  ({ organizationId: "org-1", userId: "user-1", role }) as OrganizationMember;

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

describe("DiagramsService", () => {
  let service: DiagramsService;
  let diagramRepo: MockRepo<Diagram>;
  let versionRepo: MockRepo<DiagramVersion>;
  let projectRepo: MockRepo<Project>;
  let memberRepo: MockRepo<OrganizationMember>;

  beforeEach(() => {
    diagramRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn() };
    versionRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn() };
    projectRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn() };
    memberRepo = { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), save: vi.fn() };
    service = new DiagramsService(
      diagramRepo as unknown as Repository<Diagram>,
      versionRepo as unknown as Repository<DiagramVersion>,
      projectRepo as unknown as Repository<Project>,
      memberRepo as unknown as Repository<OrganizationMember>
    );
    _setDomainModuleForTest(erdifyDomain);
  });

  describe("create", () => {
    it("throws ForbiddenException for viewer", async () => {
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("viewer"));
      await expect(
        service.create("proj-1", "user-1", { name: "ERD", dialect: "postgresql" })
      ).rejects.toThrow(ForbiddenException);
    });

    it("creates and returns diagram", async () => {
      const diagram = makeDiagram();
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("owner"));
      diagramRepo.create.mockReturnValue(diagram);
      diagramRepo.save.mockResolvedValue(diagram);
      const result = await service.create("proj-1", "user-1", { name: "ERD", dialect: "postgresql" });
      expect(result).toEqual(diagram);
    });
  });

  describe("findAll", () => {
    it("throws ForbiddenException if not member", async () => {
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.findAll("proj-1", "user-1")).rejects.toThrow(ForbiddenException);
    });

    it("returns diagrams for member", async () => {
      const diagrams = [makeDiagram()];
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember());
      diagramRepo.find.mockResolvedValue(diagrams);
      expect(await service.findAll("proj-1", "user-1")).toEqual(diagrams);
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException for unknown diagram", async () => {
      diagramRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne("x", "user-1")).rejects.toThrow(NotFoundException);
    });

    it("returns diagram for member", async () => {
      const diagram = makeDiagram();
      diagramRepo.findOne.mockResolvedValue(diagram);
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember());
      expect(await service.findOne("diag-1", "user-1")).toEqual({
        ...diagram,
        organizationId: "org-1",
        myRole: "editor",
      });
    });
  });

  describe("saveVersion", () => {
    it("increments revision from last version", async () => {
      const diagram = makeDiagram();
      diagramRepo.findOne.mockResolvedValue(diagram);
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("owner"));
      versionRepo.findOne.mockResolvedValue(makeVersion({ revision: 3 }));
      const version = makeVersion({ revision: 4 });
      versionRepo.create.mockReturnValue(version);
      versionRepo.save.mockResolvedValue(version);
      const result = await service.saveVersion("diag-1", "user-1");
      expect(result.revision).toBe(4);
    });

    it("starts at revision 1 when no prior versions", async () => {
      const diagram = makeDiagram();
      diagramRepo.findOne.mockResolvedValue(diagram);
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      versionRepo.findOne.mockResolvedValue(null);
      const version = makeVersion({ revision: 1 });
      versionRepo.create.mockReturnValue(version);
      versionRepo.save.mockResolvedValue(version);
      const result = await service.saveVersion("diag-1", "user-1");
      expect(result.revision).toBe(1);
    });
  });

  describe("restoreVersion", () => {
    it("throws NotFoundException when diagram does not exist", async () => {
      diagramRepo.findOne.mockResolvedValue(null);

      await expect(service.restoreVersion("missing-diag", "v1", "user-1")).rejects.toThrow(
        NotFoundException
      );
    });

    it("restores version content to current diagram", async () => {
      const version = makeVersion({ content: { restored: true } as unknown as object });
      const diagram = makeDiagram();
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.findOne.mockResolvedValue(diagram);
      versionRepo.findOne.mockResolvedValue(version);
      diagramRepo.save.mockImplementation((d: Diagram) => Promise.resolve(d));

      const result = await service.restoreVersion("diag-1", "v1", "user-1");

      expect(result.content).toEqual({ restored: true });
      expect(diagramRepo.save).toHaveBeenCalled();
    });

    it("throws NotFoundException when version does not exist", async () => {
      const diagram = makeDiagram();
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.findOne.mockResolvedValue(diagram);
      versionRepo.findOne.mockResolvedValue(null);

      await expect(service.restoreVersion("diag-1", "missing", "user-1")).rejects.toThrow(
        NotFoundException
      );
    });

    it("throws ForbiddenException for viewer role", async () => {
      const diagram = makeDiagram();
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("viewer"));
      diagramRepo.findOne.mockResolvedValue(diagram);

      await expect(service.restoreVersion("diag-1", "v1", "user-1")).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe("generateShareLink", () => {
    it("generates shareToken and expiresAt for editor", async () => {
      const diagram = makeDiagram({ shareToken: null, shareExpiresAt: null });
      projectRepo.findOne.mockResolvedValue(makeProject());
      diagramRepo.findOne.mockResolvedValue(diagram);
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.generateShareLink("diag-1", "user-1", "1d");

      expect(result.shareToken).toHaveLength(36);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("throws ForbiddenException for viewer", async () => {
      projectRepo.findOne.mockResolvedValue(makeProject());
      diagramRepo.findOne.mockResolvedValue(makeDiagram());
      memberRepo.findOne.mockResolvedValue(makeMember("viewer"));

      await expect(service.generateShareLink("diag-1", "user-1", "1d")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("revokeShareLink", () => {
    it("clears shareToken and shareExpiresAt", async () => {
      const diagram = makeDiagram({ shareToken: "tok-abc", shareExpiresAt: new Date() });
      projectRepo.findOne.mockResolvedValue(makeProject());
      diagramRepo.findOne.mockResolvedValue(diagram);
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      await service.revokeShareLink("diag-1", "user-1");

      expect(diagramRepo.save).toHaveBeenCalledWith(expect.objectContaining({ shareToken: null, shareExpiresAt: null }));
    });
  });

  describe("getPublicDiagram", () => {
    it("returns id, name, content for valid token", async () => {
      const future = new Date(Date.now() + 86400000);
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ shareToken: "tok-abc", shareExpiresAt: future, name: "ERD" }));

      const result = await service.getPublicDiagram("tok-abc");

      expect(result).toEqual({ id: "diag-1", name: "ERD", content: {} });
    });

    it("throws NotFoundException for unknown token", async () => {
      diagramRepo.findOne.mockResolvedValue(null);

      await expect(service.getPublicDiagram("bad-tok")).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException for expired token", async () => {
      const past = new Date(Date.now() - 1000);
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ shareToken: "tok-abc", shareExpiresAt: past }));

      await expect(service.getPublicDiagram("tok-abc")).rejects.toThrow(ForbiddenException);
    });
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

    it("sets entity position when x and y are provided", async () => {
      const diagram = makeDiagram({ content: makeDoc() as unknown as object });
      diagramRepo.findOne.mockResolvedValue(diagram);
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.addTable("diag-1", "user-1", { name: "users", x: 100, y: 200 });

      const doc = result.content as unknown as DiagramDocument;
      const entityId = doc.entities[0]!.id;
      expect(doc.layout.entityPositions[entityId]).toEqual({ x: 100, y: 200 });
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

    it("updates entity color and comment", async () => {
      const doc = makeDoc({ entities: [{ id: "ent-1", name: "users", logicalName: null, comment: null, color: null, columns: [] }] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.updateTable("diag-1", "ent-1", "user-1", { color: "#ff0000", comment: "main table" });

      const resultDoc = result.content as unknown as DiagramDocument;
      expect(resultDoc.entities[0]!.color).toBe("#ff0000");
      expect(resultDoc.entities[0]!.comment).toBe("main table");
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

    it("throws ForbiddenException for viewer", async () => {
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: makeDoc({ entities: [makeEntity()] }) as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("viewer"));

      await expect(
        service.addColumn("diag-1", "ent-1", "user-1", { name: "email", type: "varchar" })
      ).rejects.toThrow(ForbiddenException);
    });

    it("applies defaults for nullable, primaryKey, unique, defaultValue", async () => {
      const doc = makeDoc({ entities: [makeEntity()] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.addColumn("diag-1", "ent-1", "user-1", { name: "email", type: "varchar" });

      const resultDoc = result.content as unknown as DiagramDocument;
      const col = resultDoc.entities[0]!.columns[0]!;
      expect(col.nullable).toBe(true);
      expect(col.primaryKey).toBe(false);
      expect(col.unique).toBe(false);
      expect(col.defaultValue).toBeNull();
      expect(col.comment).toBeNull();
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

    it("preserves unchanged fields (merge semantics)", async () => {
      const col = makeColumn();
      const doc = makeDoc({ entities: [makeEntity("ent-1", [col])] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.updateColumn("diag-1", "ent-1", "col-1", "user-1", { name: "user_id" });

      const resultDoc = result.content as unknown as DiagramDocument;
      const updated = resultDoc.entities[0]!.columns[0]!;
      expect(updated.name).toBe("user_id");
      expect(updated.type).toBe("uuid");       // unchanged
      expect(updated.primaryKey).toBe(true);   // unchanged
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

  describe("addRelationship", () => {
    it("adds relationship to diagram", async () => {
      const doc = makeDoc({
        entities: [makeEntity("ent-1"), makeEntity("ent-2")],
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

    it("preserves unchanged fields (merge semantics)", async () => {
      const doc = makeDoc({ relationships: [makeRelationship()] });
      diagramRepo.findOne.mockResolvedValue(makeDiagram({ content: doc as unknown as object }));
      projectRepo.findOne.mockResolvedValue(makeProject());
      memberRepo.findOne.mockResolvedValue(makeMember("editor"));
      diagramRepo.save.mockImplementation(async (d: Diagram) => d);

      const result = await service.updateRelationship("diag-1", "rel-1", "user-1", {
        cardinality: "one-to-one",
      });

      const resultDoc = result.content as unknown as DiagramDocument;
      const rel = resultDoc.relationships[0]!;
      expect(rel.cardinality).toBe("one-to-one");
      expect(rel.onDelete).toBe("no-action");   // unchanged
      expect(rel.identifying).toBe(false);       // unchanged
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
});
