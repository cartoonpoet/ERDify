# ERDify Phase 5: Real-time Collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time multi-user collaboration to the ERD editor using Yjs CRDT and a NestJS socket.io WebSocket gateway, with per-diagram rooms, shared document sync, and presence indicators.

**Architecture:** A NestJS WebSocket gateway (`/collaboration` namespace) manages per-diagram rooms, each backed by an in-memory `Y.Doc`. Clients connect via socket.io with a JWT token in the handshake auth, receive a full Yjs state sync on join, and broadcast incremental binary Yjs updates. Presence (selected entity per user, color) is tracked server-side and broadcast on change. The server debounces Y.Doc persistence back to the `diagrams` table every 30 seconds. No new DB columns — Yjs rooms are initialized from the existing `diagram.content` JSON on first join.

**Tech Stack:** `yjs`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` (backend); `yjs`, `socket.io-client` (frontend); `vitest` + `@nestjs/testing` for tests.

---

## File Map

**New (API):**
- `apps/api/src/modules/collaboration/collaboration.service.ts` — room management, Y.Doc lifecycle, persistence
- `apps/api/src/modules/collaboration/collaboration.service.spec.ts` — service unit tests
- `apps/api/src/modules/collaboration/collaboration.gateway.ts` — socket.io event handlers
- `apps/api/src/modules/collaboration/collaboration.gateway.spec.ts` — gateway unit tests
- `apps/api/src/modules/collaboration/collaboration.module.ts` — NestJS module wiring

**Modified (API):**
- `apps/api/src/app.module.ts` — import `CollaborationModule`
- `apps/api/src/main.ts` — configure `IoAdapter` explicitly

**New (Web):**
- `apps/web/src/features/editor/hooks/useRealtimeCollaboration.ts` — Yjs + socket.io hook
- `apps/web/src/features/editor/hooks/useRealtimeCollaboration.test.tsx` — hook unit tests
- `apps/web/src/features/editor/components/PresenceIndicator.tsx` — colored avatar presence UI
- `apps/web/src/features/editor/components/PresenceIndicator.test.tsx` — component tests

**Modified (Web):**
- `apps/web/src/features/editor/EditorPage.tsx` — integrate hook + PresenceIndicator

---

## Shared Types Reference

The `Collaborator` type is used by both the hook and the component:

```typescript
// defined in useRealtimeCollaboration.ts, imported by PresenceIndicator.tsx
export interface Collaborator {
  userId: string;
  color: string;
  selectedEntityId: string | null;
}
```

---

### Task 1: Install Backend Packages

**Files:**
- Modify: `apps/api/package.json` (via pnpm install)

- [ ] **Step 1: Install backend collaboration packages**

Run from the repo root:
```bash
pnpm --filter @erdify/api add yjs @nestjs/websockets @nestjs/platform-socket.io socket.io
pnpm --filter @erdify/api add -D @types/node
```

- [ ] **Step 2: Verify packages installed**

```bash
grep -E '"yjs|@nestjs/websockets|@nestjs/platform-socket.io|socket.io"' apps/api/package.json
```

Expected: all four packages appear in `dependencies`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore(api): add yjs and socket.io collaboration packages"
```

---

### Task 2: CollaborationService

**Files:**
- Create: `apps/api/src/modules/collaboration/collaboration.service.ts`
- Create: `apps/api/src/modules/collaboration/collaboration.service.spec.ts`

The service manages per-diagram rooms with `Y.Doc`. Key data:

```typescript
interface CollaboratorPresence {
  userId: string;
  socketId: string;
  selectedEntityId: string | null;
  color: string;
}

interface RoomState {
  ydoc: Y.Doc;
  presence: Map<string, CollaboratorPresence>; // key: userId
  persistTimer?: ReturnType<typeof setTimeout>;
}
```

`Y.Doc` structure: one `Y.Map<string>` named `'content'` with key `'data'` holding `JSON.stringify(DiagramDocument)`.

- [ ] **Step 1: Write failing service tests**

Create `apps/api/src/modules/collaboration/collaboration.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Diagram } from "@erdify/db";
import { NotFoundException } from "@nestjs/common";
import { CollaborationService } from "./collaboration.service";

const mockDiagramContent = {
  format: "erdify.schema.v1",
  id: "d1",
  name: "Test",
  dialect: "postgresql",
  entities: [],
  relationships: [],
  indexes: [],
  views: [],
  layout: { entityPositions: {} },
  metadata: { revision: 1, stableObjectIds: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" }
};

const mockDiagram = { id: "d1", projectId: "p1", name: "Test", content: mockDiagramContent } as Diagram;

describe("CollaborationService", () => {
  let service: CollaborationService;
  const mockRepo = { findOne: vi.fn(), update: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CollaborationService,
        { provide: getRepositoryToken(Diagram), useValue: mockRepo }
      ]
    }).compile();
    service = module.get(CollaborationService);
  });

  describe("joinRoom", () => {
    it("throws NotFoundException if diagram not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.joinRoom("d1", "u1", "socket1")).rejects.toThrow(NotFoundException);
    });

    it("creates a Y.Doc room from DB content and returns Uint8Array", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      const update = await service.joinRoom("d1", "u1", "socket1");
      expect(update).toBeInstanceOf(Uint8Array);
      expect(update.length).toBeGreaterThan(0);
    });

    it("reuses existing room on second join", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      await service.joinRoom("d1", "u1", "socket1");
      await service.joinRoom("d1", "u2", "socket2");
      // repo called only once (room already exists)
      expect(mockRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe("applyUpdate", () => {
    it("throws NotFoundException if room does not exist", async () => {
      const fakeUpdate = new Uint8Array([1, 2, 3]);
      await expect(service.applyUpdate("nonexistent", fakeUpdate)).rejects.toThrow(NotFoundException);
    });

    it("applies update and returns Uint8Array", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      await service.joinRoom("d1", "u1", "socket1");
      const fakeUpdate = new Uint8Array([0]); // minimal valid update: Y.Doc empty state
      const result = await service.applyUpdate("d1", fakeUpdate);
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe("presence", () => {
    beforeEach(async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      await service.joinRoom("d1", "u1", "socket1");
    });

    it("getPresence returns empty array when no presence added", () => {
      expect(service.getPresence("d1")).toEqual([]);
    });

    it("addPresence adds collaborator with assigned color", () => {
      service.addPresence("d1", "u1", "socket1");
      const presence = service.getPresence("d1");
      expect(presence).toHaveLength(1);
      expect(presence[0]).toMatchObject({ userId: "u1", socketId: "socket1", selectedEntityId: null });
      expect(presence[0].color).toMatch(/^#/);
    });

    it("updatePresence updates selectedEntityId", () => {
      service.addPresence("d1", "u1", "socket1");
      service.updatePresence("d1", "u1", { selectedEntityId: "entity-1" });
      const presence = service.getPresence("d1");
      expect(presence[0].selectedEntityId).toBe("entity-1");
    });

    it("leaveRoom removes collaborator", () => {
      service.addPresence("d1", "u1", "socket1");
      service.leaveRoom("d1", "u1");
      expect(service.getPresence("d1")).toHaveLength(0);
    });

    it("leaveRoom deletes the room when last user leaves", () => {
      service.addPresence("d1", "u1", "socket1");
      service.leaveRoom("d1", "u1");
      // room gone: subsequent getPresence on unknown room returns []
      expect(service.getPresence("d1")).toEqual([]);
    });
  });

  describe("persistNow", () => {
    it("saves current Y.Doc content to DB", async () => {
      mockRepo.findOne.mockResolvedValue(mockDiagram);
      mockRepo.update.mockResolvedValue(undefined);
      await service.joinRoom("d1", "u1", "socket1");
      await service.persistNow("d1");
      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: "d1" },
        expect.objectContaining({ content: expect.any(Object) })
      );
    });

    it("does nothing if room does not exist", async () => {
      await service.persistNow("nonexistent");
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd apps/api && pnpm vitest run --reporter=verbose src/modules/collaboration/collaboration.service.spec.ts
```

Expected: FAIL — `CollaborationService` not found.

- [ ] **Step 3: Implement CollaborationService**

Create `apps/api/src/modules/collaboration/collaboration.service.ts`:

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Diagram } from "@erdify/db";
import type { Repository } from "typeorm";
import * as Y from "yjs";
import type { DiagramDocument } from "@erdify/domain";

export interface CollaboratorPresence {
  userId: string;
  socketId: string;
  selectedEntityId: string | null;
  color: string;
}

interface RoomState {
  ydoc: Y.Doc;
  presence: Map<string, CollaboratorPresence>;
  persistTimer?: ReturnType<typeof setTimeout>;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

@Injectable()
export class CollaborationService {
  private rooms = new Map<string, RoomState>();

  constructor(
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>
  ) {}

  async joinRoom(diagramId: string, userId: string, socketId: string): Promise<Uint8Array> {
    let room = this.rooms.get(diagramId);
    if (!room) {
      const diagram = await this.diagramRepo.findOne({ where: { id: diagramId } });
      if (!diagram) throw new NotFoundException("Diagram not found");

      const ydoc = new Y.Doc();
      const sharedContent = ydoc.getMap<string>("content");
      ydoc.transact(() => {
        sharedContent.set("data", JSON.stringify(diagram.content));
      });
      room = { ydoc, presence: new Map() };
      this.rooms.set(diagramId, room);
    }
    return Y.encodeStateAsUpdate(room.ydoc);
  }

  async applyUpdate(diagramId: string, update: Uint8Array): Promise<Uint8Array> {
    const room = this.rooms.get(diagramId);
    if (!room) throw new NotFoundException("Room not found");
    Y.applyUpdate(room.ydoc, update);
    return update;
  }

  addPresence(diagramId: string, userId: string, socketId: string): void {
    const room = this.rooms.get(diagramId);
    if (!room) return;
    const colorIndex = room.presence.size % COLORS.length;
    room.presence.set(userId, {
      userId,
      socketId,
      selectedEntityId: null,
      color: COLORS[colorIndex]
    });
  }

  updatePresence(diagramId: string, userId: string, data: { selectedEntityId: string | null }): void {
    const room = this.rooms.get(diagramId);
    if (!room) return;
    const existing = room.presence.get(userId);
    if (existing) room.presence.set(userId, { ...existing, ...data });
  }

  leaveRoom(diagramId: string, userId: string): void {
    const room = this.rooms.get(diagramId);
    if (!room) return;
    room.presence.delete(userId);
    if (room.presence.size === 0) {
      clearTimeout(room.persistTimer);
      this.rooms.delete(diagramId);
    }
  }

  getPresence(diagramId: string): CollaboratorPresence[] {
    const room = this.rooms.get(diagramId);
    if (!room) return [];
    return Array.from(room.presence.values());
  }

  schedulePersist(diagramId: string): void {
    const room = this.rooms.get(diagramId);
    if (!room) return;
    clearTimeout(room.persistTimer);
    room.persistTimer = setTimeout(() => void this.persistNow(diagramId), 30_000);
  }

  async persistNow(diagramId: string): Promise<void> {
    const room = this.rooms.get(diagramId);
    if (!room) return;
    const sharedContent = room.ydoc.getMap<string>("content");
    const data = sharedContent.get("data");
    if (!data) return;
    const content = JSON.parse(data) as DiagramDocument;
    await this.diagramRepo.update({ id: diagramId }, { content });
  }
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd apps/api && pnpm vitest run --reporter=verbose src/modules/collaboration/collaboration.service.spec.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/collaboration/collaboration.service.ts \
        apps/api/src/modules/collaboration/collaboration.service.spec.ts
git commit -m "feat(collaboration): add CollaborationService with Y.Doc room management"
```

---

### Task 3: CollaborationGateway

**Files:**
- Create: `apps/api/src/modules/collaboration/collaboration.gateway.ts`
- Create: `apps/api/src/modules/collaboration/collaboration.gateway.spec.ts`

The gateway uses `@WebSocketGateway({ namespace: '/collaboration' })`. JWT validation happens in `handleConnection` — invalid tokens disconnect immediately. The `client.data` object carries `{ userId, diagramId }` across events.

- [ ] **Step 1: Write failing gateway tests**

Create `apps/api/src/modules/collaboration/collaboration.gateway.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { CollaborationGateway } from "./collaboration.gateway";
import { CollaborationService } from "./collaboration.service";
import type { Socket, Server } from "socket.io";

function makeSocket(overrides: Partial<Socket> = {}): Socket {
  return {
    id: "socket-1",
    data: {},
    handshake: { auth: { token: "Bearer valid-token" } },
    join: vi.fn(),
    emit: vi.fn(),
    to: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
    ...overrides
  } as unknown as Socket;
}

describe("CollaborationGateway", () => {
  let gateway: CollaborationGateway;
  const mockService: Record<string, ReturnType<typeof vi.fn>> = {
    joinRoom: vi.fn(),
    applyUpdate: vi.fn(),
    addPresence: vi.fn(),
    updatePresence: vi.fn(),
    leaveRoom: vi.fn(),
    getPresence: vi.fn(),
    schedulePersist: vi.fn(),
    persistNow: vi.fn()
  };
  const mockJwt = { verify: vi.fn() };
  const mockServer = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as unknown as Server;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CollaborationGateway,
        { provide: CollaborationService, useValue: mockService },
        { provide: JwtService, useValue: mockJwt }
      ]
    }).compile();
    gateway = module.get(CollaborationGateway);
    gateway.server = mockServer;
  });

  describe("handleConnection", () => {
    it("disconnects if no token provided", async () => {
      const client = makeSocket({ handshake: { auth: {} } } as Partial<Socket>);
      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it("disconnects if token is invalid", async () => {
      mockJwt.verify.mockImplementation(() => { throw new Error("invalid"); });
      const client = makeSocket();
      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it("sets userId on client.data when token is valid", async () => {
      mockJwt.verify.mockReturnValue({ sub: "user-1", email: "a@b.com" });
      const client = makeSocket();
      await gateway.handleConnection(client);
      expect(client.data.userId).toBe("user-1");
      expect(client.disconnect).not.toHaveBeenCalled();
    });
  });

  describe("handleJoin", () => {
    it("joins socket room, emits yjs:sync, broadcasts presence:state", async () => {
      const stateUpdate = new Uint8Array([1, 0]);
      mockService.joinRoom.mockResolvedValue(stateUpdate);
      mockService.getPresence.mockReturnValue([]);
      const client = makeSocket();
      client.data.userId = "user-1";

      await gateway.handleJoin(client, { diagramId: "d1" });

      expect(client.join).toHaveBeenCalledWith("d1");
      expect(client.data.diagramId).toBe("d1");
      expect(client.emit).toHaveBeenCalledWith("yjs:sync", stateUpdate);
      expect(mockService.addPresence).toHaveBeenCalledWith("d1", "user-1", "socket-1");
      expect(mockServer.to).toHaveBeenCalledWith("d1");
    });
  });

  describe("handleYjsUpdate", () => {
    it("applies update, broadcasts to room, schedules persist", async () => {
      const update = new Uint8Array([2, 0]);
      mockService.applyUpdate.mockResolvedValue(update);
      const client = makeSocket();
      client.data = { userId: "user-1", diagramId: "d1" };

      await gateway.handleYjsUpdate(client, update);

      expect(mockService.applyUpdate).toHaveBeenCalledWith("d1", update);
      expect(client.to).toHaveBeenCalledWith("d1");
      expect(mockService.schedulePersist).toHaveBeenCalledWith("d1");
    });
  });

  describe("handlePresenceUpdate", () => {
    it("updates presence and broadcasts presence:state to room", async () => {
      mockService.getPresence.mockReturnValue([]);
      const client = makeSocket();
      client.data = { userId: "user-1", diagramId: "d1" };

      await gateway.handlePresenceUpdate(client, { selectedEntityId: "e1" });

      expect(mockService.updatePresence).toHaveBeenCalledWith("d1", "user-1", { selectedEntityId: "e1" });
      expect(client.to).toHaveBeenCalledWith("d1");
    });
  });

  describe("handleDisconnect", () => {
    it("leaves room and broadcasts updated presence", async () => {
      mockService.getPresence.mockReturnValue([]);
      const client = makeSocket();
      client.data = { userId: "user-1", diagramId: "d1" };

      await gateway.handleDisconnect(client);

      expect(mockService.leaveRoom).toHaveBeenCalledWith("d1", "user-1");
      expect(mockServer.to).toHaveBeenCalledWith("d1");
    });

    it("does nothing if client never joined a diagram", async () => {
      const client = makeSocket();
      client.data = {};
      await gateway.handleDisconnect(client);
      expect(mockService.leaveRoom).not.toHaveBeenCalled();
    });
  });

  describe("handleSnapshotRequest", () => {
    it("persists and emits snapshot:saved to requester", async () => {
      mockService.persistNow.mockResolvedValue(undefined);
      const client = makeSocket();
      client.data = { userId: "user-1", diagramId: "d1" };

      await gateway.handleSnapshotRequest(client);

      expect(mockService.persistNow).toHaveBeenCalledWith("d1");
      expect(client.emit).toHaveBeenCalledWith("snapshot:saved");
    });
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd apps/api && pnpm vitest run --reporter=verbose src/modules/collaboration/collaboration.gateway.spec.ts
```

Expected: FAIL — `CollaborationGateway` not found.

- [ ] **Step 3: Implement CollaborationGateway**

Create `apps/api/src/modules/collaboration/collaboration.gateway.ts`:

```typescript
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import type { Server, Socket } from "socket.io";
import type { JwtPayload } from "../auth/strategies/jwt.strategy";
import { CollaborationService } from "./collaboration.service";

@WebSocketGateway({ namespace: "/collaboration", cors: { origin: true, credentials: true } })
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly jwtService: JwtService
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const raw: string | undefined = client.handshake.auth?.token;
      if (!raw) throw new Error("no token");
      const token = raw.replace("Bearer ", "");
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const { diagramId, userId } = client.data as { diagramId?: string; userId?: string };
    if (!diagramId || !userId) return;
    this.collaborationService.leaveRoom(diagramId, userId);
    const presence = this.collaborationService.getPresence(diagramId);
    this.server.to(diagramId).emit("presence:state", presence);
  }

  @SubscribeMessage("join")
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { diagramId: string }
  ): Promise<void> {
    const { diagramId } = payload;
    client.data.diagramId = diagramId;
    client.join(diagramId);

    const stateUpdate = await this.collaborationService.joinRoom(diagramId, client.data.userId, client.id);
    client.emit("yjs:sync", stateUpdate);

    this.collaborationService.addPresence(diagramId, client.data.userId, client.id);
    const presence = this.collaborationService.getPresence(diagramId);
    this.server.to(diagramId).emit("presence:state", presence);
  }

  @SubscribeMessage("yjs:update")
  async handleYjsUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() update: Uint8Array
  ): Promise<void> {
    const { diagramId } = client.data as { diagramId: string };
    const broadcastUpdate = await this.collaborationService.applyUpdate(diagramId, update);
    client.to(diagramId).emit("yjs:update", broadcastUpdate);
    this.collaborationService.schedulePersist(diagramId);
  }

  @SubscribeMessage("presence:update")
  async handlePresenceUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { selectedEntityId: string | null }
  ): Promise<void> {
    const { diagramId, userId } = client.data as { diagramId: string; userId: string };
    this.collaborationService.updatePresence(diagramId, userId, data);
    const presence = this.collaborationService.getPresence(diagramId);
    client.to(diagramId).emit("presence:state", presence);
  }

  @SubscribeMessage("snapshot:request")
  async handleSnapshotRequest(@ConnectedSocket() client: Socket): Promise<void> {
    const { diagramId } = client.data as { diagramId: string };
    await this.collaborationService.persistNow(diagramId);
    client.emit("snapshot:saved");
  }
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd apps/api && pnpm vitest run --reporter=verbose src/modules/collaboration/collaboration.gateway.spec.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/collaboration/collaboration.gateway.ts \
        apps/api/src/modules/collaboration/collaboration.gateway.spec.ts
git commit -m "feat(collaboration): add CollaborationGateway with socket.io event handlers"
```

---

### Task 4: CollaborationModule + AppModule Wiring

**Files:**
- Create: `apps/api/src/modules/collaboration/collaboration.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Create CollaborationModule**

Create `apps/api/src/modules/collaboration/collaboration.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Diagram } from "@erdify/db";
import { CollaborationService } from "./collaboration.service";
import { CollaborationGateway } from "./collaboration.gateway";

@Module({
  imports: [
    TypeOrmModule.forFeature([Diagram]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET")
      })
    })
  ],
  providers: [CollaborationService, CollaborationGateway]
})
export class CollaborationModule {}
```

- [ ] **Step 2: Register CollaborationModule in AppModule**

Edit `apps/api/src/app.module.ts` — add the import:

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { DatabaseModule } from "./modules/database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { DiagramsModule } from "./modules/diagrams/diagrams.module";
import { OrganizationModule } from "./modules/organization/organization.module";
import { ProjectModule } from "./modules/project/project.module";
import { CollaborationModule } from "./modules/collaboration/collaboration.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    OrganizationModule,
    ProjectModule,
    DiagramsModule,
    CollaborationModule,
    HealthModule
  ]
})
export class AppModule {}
```

- [ ] **Step 3: Configure IoAdapter in main.ts**

Edit `apps/api/src/main.ts`:

```typescript
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useWebSocketAdapter(new IoAdapter(app));

  app.enableCors({
    origin: true,
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const port = Number(process.env["API_PORT"] ?? 4000);
  await app.listen(port);
}

void bootstrap();
```

- [ ] **Step 4: Run all API tests to confirm nothing broken**

```bash
cd apps/api && pnpm vitest run
```

Expected: all existing tests plus new collaboration tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/collaboration/collaboration.module.ts \
        apps/api/src/app.module.ts \
        apps/api/src/main.ts
git commit -m "feat(collaboration): wire CollaborationModule into AppModule with IoAdapter"
```

---

### Task 5: Install Frontend Packages

**Files:**
- Modify: `apps/web/package.json` (via pnpm install)

- [ ] **Step 1: Install frontend packages**

```bash
pnpm --filter @erdify/web add yjs socket.io-client
```

- [ ] **Step 2: Verify**

```bash
grep -E '"yjs|socket.io-client"' apps/web/package.json
```

Expected: both packages appear in `dependencies`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): add yjs and socket.io-client packages"
```

---

### Task 6: useRealtimeCollaboration Hook

**Files:**
- Create: `apps/web/src/features/editor/hooks/useRealtimeCollaboration.ts`
- Create: `apps/web/src/features/editor/hooks/useRealtimeCollaboration.test.tsx`

The hook:
1. Connects to `/collaboration` namespace with JWT from `useAuthStore`
2. On `yjs:sync`: applies state to Y.Doc → reads `content.data` → calls `setDocument`
3. On `yjs:update`: same
4. On `presence:state`: updates `collaborators`
5. Watches `document` in Zustand — when changed and not from remote, encodes diff update → sends `yjs:update`
6. Watches `selectedEntityId` — sends `presence:update`

The `isApplyingRemote` ref prevents echo loops.

- [ ] **Step 1: Write failing hook tests**

Create `apps/web/src/features/editor/hooks/useRealtimeCollaboration.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as Y from "yjs";

// Mock socket.io-client before importing the hook
const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
  id: "socket-1"
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket)
}));

// Mock useAuthStore
vi.mock("../../../shared/stores/useAuthStore", () => ({
  useAuthStore: vi.fn((selector: (s: { token: string | null }) => unknown) =>
    selector({ token: "test-token" })
  )
}));

// Track Zustand store state
let storeDoc: object | null = null;
let storeSelectedEntityId: string | null = null;
const mockSetDocument = vi.fn((doc: object) => { storeDoc = doc; });

vi.mock("./useEditorStore", () => ({
  useEditorStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      document: storeDoc,
      setDocument: mockSetDocument,
      selectedEntityId: storeSelectedEntityId
    })
  )
}));

// Import after mocks
import { useRealtimeCollaboration } from "./useRealtimeCollaboration";
import { io } from "socket.io-client";

describe("useRealtimeCollaboration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeDoc = null;
    storeSelectedEntityId = null;
    mockSocket.connected = false;
  });

  it("calls io with the collaboration namespace URL on mount", () => {
    renderHook(() => useRealtimeCollaboration("d1"));
    expect(io).toHaveBeenCalledWith(
      expect.stringContaining("/collaboration"),
      expect.objectContaining({ auth: { token: "Bearer test-token" } })
    );
  });

  it("disconnects socket on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeCollaboration("d1"));
    unmount();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it("returns isConnected false initially", () => {
    const { result } = renderHook(() => useRealtimeCollaboration("d1"));
    expect(result.current.isConnected).toBe(false);
  });

  it("registers yjs:sync, yjs:update, presence:state, connect, disconnect event handlers", () => {
    renderHook(() => useRealtimeCollaboration("d1"));
    const registeredEvents = mockSocket.on.mock.calls.map((c: unknown[]) => c[0]);
    expect(registeredEvents).toContain("connect");
    expect(registeredEvents).toContain("disconnect");
    expect(registeredEvents).toContain("yjs:sync");
    expect(registeredEvents).toContain("yjs:update");
    expect(registeredEvents).toContain("presence:state");
  });

  it("applies yjs:sync and calls setDocument with parsed content", () => {
    renderHook(() => useRealtimeCollaboration("d1"));

    const diagramContent = { entities: [], format: "erdify.schema.v1" };

    // Build a real Y.Doc state update that contains the content
    const ydoc = new Y.Doc();
    const sharedContent = ydoc.getMap<string>("content");
    ydoc.transact(() => {
      sharedContent.set("data", JSON.stringify(diagramContent));
    });
    const stateUpdate = Y.encodeStateAsUpdate(ydoc);

    // Find the yjs:sync handler and call it
    const syncCall = mockSocket.on.mock.calls.find((c: unknown[]) => c[0] === "yjs:sync");
    expect(syncCall).toBeTruthy();
    act(() => {
      (syncCall![1] as (u: Uint8Array) => void)(stateUpdate);
    });

    expect(mockSetDocument).toHaveBeenCalledWith(diagramContent);
  });

  it("applies yjs:update and calls setDocument", () => {
    renderHook(() => useRealtimeCollaboration("d1"));

    const diagramContent = { entities: [{ id: "e1" }], format: "erdify.schema.v1" };
    const ydoc = new Y.Doc();
    const sharedContent = ydoc.getMap<string>("content");
    ydoc.transact(() => {
      sharedContent.set("data", JSON.stringify(diagramContent));
    });
    const stateUpdate = Y.encodeStateAsUpdate(ydoc);

    const updateCall = mockSocket.on.mock.calls.find((c: unknown[]) => c[0] === "yjs:update");
    act(() => {
      (updateCall![1] as (u: Uint8Array) => void)(stateUpdate);
    });

    expect(mockSetDocument).toHaveBeenCalledWith(diagramContent);
  });

  it("returns collaborators from presence:state event", () => {
    const { result } = renderHook(() => useRealtimeCollaboration("d1"));

    const collaborators = [{ userId: "u1", color: "#ef4444", selectedEntityId: null }];
    const presenceCall = mockSocket.on.mock.calls.find((c: unknown[]) => c[0] === "presence:state");
    act(() => {
      (presenceCall![1] as (p: typeof collaborators) => void)(collaborators);
    });

    expect(result.current.collaborators).toEqual(collaborators);
  });

  it("emits join on connect", () => {
    renderHook(() => useRealtimeCollaboration("d1"));
    const connectCall = mockSocket.on.mock.calls.find((c: unknown[]) => c[0] === "connect");
    act(() => {
      (connectCall![1] as () => void)();
    });
    expect(mockSocket.emit).toHaveBeenCalledWith("join", { diagramId: "d1" });
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd apps/web && pnpm vitest run --reporter=verbose src/features/editor/hooks/useRealtimeCollaboration.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement useRealtimeCollaboration**

Create `apps/web/src/features/editor/hooks/useRealtimeCollaboration.ts`:

```typescript
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import * as Y from "yjs";
import { useEditorStore } from "../stores/useEditorStore";
import { useAuthStore } from "../../../shared/stores/useAuthStore";
import type { DiagramDocument } from "@erdify/domain";

export interface Collaborator {
  userId: string;
  color: string;
  selectedEntityId: string | null;
}

export interface UseRealtimeCollaborationResult {
  collaborators: Collaborator[];
  isConnected: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export function useRealtimeCollaboration(diagramId: string): UseRealtimeCollaborationResult {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const isApplyingRemote = useRef(false);

  const token = useAuthStore((s) => s.token);
  const document = useEditorStore((s) => s.document);
  const setDocument = useEditorStore((s) => s.setDocument);
  const selectedEntityId = useEditorStore((s) => s.selectedEntityId);

  // Connect once per diagramId+token combination
  useEffect(() => {
    if (!diagramId || !token) return;

    const ydoc = ydocRef.current;
    const sharedContent = ydoc.getMap<string>("content");

    const socket = io(`${API_BASE}/collaboration`, {
      auth: { token: `Bearer ${token}` },
      transports: ["websocket"]
    });
    socketRef.current = socket;

    function applyYjsUpdate(update: Uint8Array) {
      isApplyingRemote.current = true;
      Y.applyUpdate(ydoc, update);
      const data = sharedContent.get("data");
      if (data) setDocument(JSON.parse(data) as DiagramDocument);
      isApplyingRemote.current = false;
    }

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join", { diagramId });
    });
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("yjs:sync", applyYjsUpdate);
    socket.on("yjs:update", applyYjsUpdate);
    socket.on("presence:state", (presence: Collaborator[]) => setCollaborators(presence));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [diagramId, token, setDocument]);

  // Send local document changes as Yjs updates
  const prevDocRef = useRef<string | null>(null);
  useEffect(() => {
    if (!document || !socketRef.current?.connected || isApplyingRemote.current) return;

    const ydoc = ydocRef.current;
    const sharedContent = ydoc.getMap<string>("content");
    const newData = JSON.stringify(document);

    if (prevDocRef.current === newData) return;
    prevDocRef.current = newData;

    const stateBefore = Y.encodeStateVector(ydoc);
    ydoc.transact(() => {
      sharedContent.set("data", newData);
    });
    const update = Y.encodeStateAsUpdate(ydoc, stateBefore);
    socketRef.current.emit("yjs:update", update);
  }, [document]);

  // Send presence updates when selection changes
  useEffect(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("presence:update", { selectedEntityId });
  }, [selectedEntityId]);

  return { collaborators, isConnected };
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd apps/web && pnpm vitest run --reporter=verbose src/features/editor/hooks/useRealtimeCollaboration.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/editor/hooks/useRealtimeCollaboration.ts \
        apps/web/src/features/editor/hooks/useRealtimeCollaboration.test.tsx
git commit -m "feat(web): add useRealtimeCollaboration hook with Yjs + socket.io"
```

---

### Task 7: PresenceIndicator Component

**Files:**
- Create: `apps/web/src/features/editor/components/PresenceIndicator.tsx`
- Create: `apps/web/src/features/editor/components/PresenceIndicator.test.tsx`

Renders a row of colored circular avatars. Each shows the first character of `userId`. Tooltip is the full `userId`.

- [ ] **Step 1: Write failing component tests**

Create `apps/web/src/features/editor/components/PresenceIndicator.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PresenceIndicator } from "./PresenceIndicator";
import type { Collaborator } from "../hooks/useRealtimeCollaboration";

describe("PresenceIndicator", () => {
  it("renders nothing when collaborators list is empty", () => {
    const { container } = render(<PresenceIndicator collaborators={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one avatar per collaborator", () => {
    const collaborators: Collaborator[] = [
      { userId: "alice@example.com", color: "#ef4444", selectedEntityId: null },
      { userId: "bob@example.com", color: "#3b82f6", selectedEntityId: null }
    ];
    render(<PresenceIndicator collaborators={collaborators} />);
    // avatars show first character of userId
    expect(screen.getByTitle("alice@example.com")).toBeTruthy();
    expect(screen.getByTitle("bob@example.com")).toBeTruthy();
  });

  it("applies collaborator color as background", () => {
    const collaborators: Collaborator[] = [
      { userId: "carol@example.com", color: "#22c55e", selectedEntityId: null }
    ];
    render(<PresenceIndicator collaborators={collaborators} />);
    const avatar = screen.getByTitle("carol@example.com");
    expect(avatar.style.background).toBe("rgb(34, 197, 94)"); // #22c55e
  });

  it("shows ring highlight when collaborator has a selected entity", () => {
    const collaborators: Collaborator[] = [
      { userId: "dave@example.com", color: "#8b5cf6", selectedEntityId: "entity-1" }
    ];
    render(<PresenceIndicator collaborators={collaborators} />);
    const avatar = screen.getByTitle("dave@example.com");
    // active collaborators have an outline
    expect(avatar.style.outline).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd apps/web && pnpm vitest run --reporter=verbose src/features/editor/components/PresenceIndicator.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement PresenceIndicator**

Create `apps/web/src/features/editor/components/PresenceIndicator.tsx`:

```typescript
import type { Collaborator } from "../hooks/useRealtimeCollaboration";

interface Props {
  collaborators: Collaborator[];
}

export function PresenceIndicator({ collaborators }: Props) {
  if (collaborators.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {collaborators.map((c) => (
        <div
          key={c.userId}
          title={c.userId}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: c.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "default",
            flexShrink: 0,
            outline: c.selectedEntityId ? `2px solid ${c.color}` : "none",
            outlineOffset: 2
          }}
        >
          {c.userId.charAt(0).toUpperCase()}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd apps/web && pnpm vitest run --reporter=verbose src/features/editor/components/PresenceIndicator.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/editor/components/PresenceIndicator.tsx \
        apps/web/src/features/editor/components/PresenceIndicator.test.tsx
git commit -m "feat(web): add PresenceIndicator component for real-time collaborators"
```

---

### Task 8: EditorPage Integration

**Files:**
- Modify: `apps/web/src/features/editor/EditorPage.tsx`

Add `useRealtimeCollaboration` and render `PresenceIndicator` in the toolbar between the diagram name and the autosave status. Show a green "실시간" (connected) or grey "오프라인" badge based on `isConnected`. The snapshot request button calls `socket.emit('snapshot:request')` — but since the hook doesn't expose the socket directly, we'll wire the "버전 저장" button to also trigger the existing REST `saveVersion` (unchanged) and separately the socket snapshot event isn't needed in the UI layer (server auto-persists).

The integration is: call `useRealtimeCollaboration(diagramId ?? "")` and render `<PresenceIndicator collaborators={collaborators} />` in the toolbar.

- [ ] **Step 1: Update EditorPage**

Replace the contents of `apps/web/src/features/editor/EditorPage.tsx`:

```typescript
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { addEntity } from "@erdify/domain";
import { getDiagram } from "../../shared/api/diagrams.api";
import { useEditorStore } from "./stores/useEditorStore";
import { EditorCanvas } from "./components/EditorCanvas";
import { VersionHistoryDrawer } from "./components/VersionHistoryDrawer";
import { PresenceIndicator } from "./components/PresenceIndicator";
import { useDiagramAutosave } from "./hooks/useDiagramAutosave";
import { useVersionHistory } from "./hooks/useVersionHistory";
import { useRealtimeCollaboration } from "./hooks/useRealtimeCollaboration";

export function EditorPage() {
  const { diagramId } = useParams<{ diagramId: string }>();
  const [showHistory, setShowHistory] = useState(false);
  const { document, isDirty, setDocument, applyCommand } = useEditorStore();

  const { data, isLoading } = useQuery({
    queryKey: ["diagram", diagramId],
    queryFn: () => getDiagram(diagramId!),
    enabled: !!diagramId
  });

  useEffect(() => {
    if (data) setDocument(data.content);
  }, [data, setDocument]);

  useDiagramAutosave(diagramId ?? "");

  const { saveVersion, isSavingVersion } = useVersionHistory(diagramId ?? "");
  const { collaborators, isConnected } = useRealtimeCollaboration(diagramId ?? "");

  function handleAddTable() {
    applyCommand((doc) =>
      addEntity(doc, {
        id: crypto.randomUUID(),
        name: `Table_${doc.entities.length + 1}`
      })
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        Loading...
      </div>
    );
  }

  const saveStatus = isDirty ? "수정됨" : "저장됨";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "#ffffff"
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>{data?.name}</span>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{saveStatus}</span>
        <span
          style={{
            fontSize: 11,
            color: isConnected ? "#059669" : "#9ca3af",
            padding: "1px 6px",
            borderRadius: 10,
            background: isConnected ? "#d1fae5" : "#f3f4f6"
          }}
        >
          {isConnected ? "실시간" : "오프라인"}
        </span>
        <PresenceIndicator collaborators={collaborators} />
        <div style={{ flex: 1 }} />
        <button
          onClick={handleAddTable}
          style={{
            padding: "4px 12px",
            background: "#374151",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13
          }}
        >
          + 테이블
        </button>
        <button
          onClick={() => saveVersion()}
          disabled={isSavingVersion}
          style={{
            padding: "4px 12px",
            background: isSavingVersion ? "#9ca3af" : "#059669",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: isSavingVersion ? "not-allowed" : "pointer",
            fontSize: 13
          }}
        >
          버전 저장
        </button>
        <button
          onClick={() => setShowHistory((v) => !v)}
          style={{
            padding: "4px 12px",
            background: showHistory ? "#2563eb" : "#f3f4f6",
            color: showHistory ? "#fff" : "#374151",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13
          }}
        >
          기록
        </button>
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <EditorCanvas />
        {showHistory && diagramId && (
          <VersionHistoryDrawer diagramId={diagramId} onClose={() => setShowHistory(false)} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run all web tests**

```bash
cd apps/web && pnpm vitest run
```

Expected: all tests PASS (no regressions).

- [ ] **Step 3: Run full monorepo test suite**

```bash
cd /path/to/ERDify && pnpm turbo run test
```

Expected: all tasks pass across all packages.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/editor/EditorPage.tsx
git commit -m "feat(web): integrate real-time collaboration into EditorPage"
```

---

## Self-Review

**Spec coverage:**
- ✅ Yjs CRDT document model — Y.Doc with Y.Map per room
- ✅ NestJS WebSocket gateway — `/collaboration` namespace with `@nestjs/platform-socket.io`
- ✅ Presence — `CollaboratorPresence` tracked server-side, broadcast on change
- ✅ Shared edits relayed between clients — `yjs:update` broadcast to room
- ✅ Periodic snapshot persistence — `schedulePersist` with 30s debounce, persists to `diagrams` table
- ✅ JWT auth on WebSocket connection — validated in `handleConnection`
- ✅ `PresenceIndicator` component — colored avatars with selection highlight
- ✅ Connection status badge — "실시간" / "오프라인"

**Type consistency:**
- `Collaborator` interface defined in `useRealtimeCollaboration.ts`, imported by `PresenceIndicator.tsx`
- `CollaboratorPresence` defined in `collaboration.service.ts`, emitted by gateway as `presence:state`
- Both share the same shape: `{ userId, color, selectedEntityId }`
- `Y.Doc` structure consistent: `ydoc.getMap<string>("content")` with key `"data"` on both server and client

**No placeholders:** All steps have complete code blocks and exact commands.
