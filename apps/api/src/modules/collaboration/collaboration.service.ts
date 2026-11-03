import { isDeepStrictEqual } from "node:util";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Diagram } from "@erdify/db";
import type { Repository } from "typeorm";
import * as Automerge from "@automerge/automerge";
import type { DiagramDocument } from "@erdify/domain";
import { ConfigService } from "@nestjs/config";

export interface CollaboratorPresence {
  userId: string;
  email: string;
  socketId: string;
  selectedEntityId: string | null;
  color: string;
}

interface RoomState {
  /** 저장을 방마다 한 줄로 세운다 — 겹치면 먼저 뜬 스냅샷이 나중에 커밋돼 최신 편집을 덮을 수 있다 */
  persisting?: Promise<void>;
  doc: Automerge.Doc<DiagramDocument>;
  presence: Map<string, CollaboratorPresence>;
  /** socketId → userId. 같은 사용자가 탭을 여러 개 열 수 있어 presence(사용자 단위)와 따로 센다 */
  connections: Map<string, string>;
  persistTimer?: ReturnType<typeof setTimeout>;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);
  private readonly rooms = new Map<string, RoomState>();
  private shuttingDown = false;
  private readonly persistIntervalMs: number;

  constructor(
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>,
    private readonly config: ConfigService
  ) {
    this.persistIntervalMs = this.config.get<number>("app.persistIntervalMs", 30_000);
  }

  async joinRoom(diagramId: string): Promise<Uint8Array> {
    let room = this.rooms.get(diagramId);
    if (!room) {
      const diagram = await this.diagramRepo.findOne({ where: { id: diagramId } });
      if (!diagram) throw new NotFoundException("Diagram not found");
      const doc = Automerge.from(diagram.content as unknown as Record<string, unknown>) as Automerge.Doc<DiagramDocument>;
      room = { doc, presence: new Map(), connections: new Map() };
      this.rooms.set(diagramId, room);
    }
    return Automerge.save(room.doc);
  }

  applyChanges(diagramId: string, changes: Uint8Array[]): Uint8Array[] {
    const room = this.rooms.get(diagramId);
    if (!room) throw new NotFoundException("Room not found");
    const [newDoc] = Automerge.applyChanges(room.doc, changes);
    room.doc = newDoc;
    return changes;
  }

  addPresence(diagramId: string, userId: string, socketId: string, email: string): void {
    const room = this.rooms.get(diagramId);
    if (!room) return;
    room.connections.set(socketId, userId);
    if (room.presence.has(userId)) return; // 같은 사용자의 다른 탭 — 색·선택 상태는 그대로 둔다
    const colorIndex = room.presence.size % COLORS.length;
    room.presence.set(userId, {
      userId,
      email,
      socketId,
      selectedEntityId: null,
      color: COLORS[colorIndex]!
    });
  }

  updatePresence(diagramId: string, userId: string, data: { selectedEntityId: string | null }): void {
    const room = this.rooms.get(diagramId);
    if (!room) return;
    const existing = room.presence.get(userId);
    if (existing) room.presence.set(userId, { ...existing, ...data });
  }

  async leaveRoom(diagramId: string, socketId: string): Promise<void> {
    const room = this.rooms.get(diagramId);
    if (!room) return;
    const userId = room.connections.get(socketId);
    room.connections.delete(socketId);
    // 사용자 단위로 지우면 탭 하나만 닫아도 방이 사라져 남은 탭의 편집이 Room not found로 유실됐다
    if (userId && !Array.from(room.connections.values()).includes(userId)) {
      room.presence.delete(userId);
    }
    // 종료 중에는 persistAll이 방을 저장한다 — 여기서 방을 지우면 그 저장에서 빠진다
    if (this.shuttingDown) return;
    if (room.connections.size === 0) {
      clearTimeout(room.persistTimer);
      await this.persistNow(diagramId);
      // Recheck after async persist: a reconnecting client may have re-joined
      // during the DB write and added itself back to room.connections.
      if (room.connections.size === 0) {
        this.rooms.delete(diagramId);
      }
    }
  }

  getPresence(diagramId: string): CollaboratorPresence[] {
    const room = this.rooms.get(diagramId);
    if (!room) return [];
    return Array.from(room.presence.values());
  }

  getRoomPresences(diagramIds: string[]): Record<string, Array<{ userId: string; email: string; color: string }>> {
    const result: Record<string, Array<{ userId: string; email: string; color: string }>> = {};
    for (const id of diagramIds) {
      const room = this.rooms.get(id);
      result[id] = room
        ? Array.from(room.presence.values()).map((p) => ({
            userId: p.userId,
            email: p.email,
            color: p.color,
          }))
        : [];
    }
    return result;
  }

  /**
   * HTTP/MCP 등 웹소켓 밖 경로가 DB의 content를 바꿨을 때 룸의 메모리 문서를 따라잡게 한다.
   * 이게 없으면 다음 persist가 stale한 룸 문서로 DB를 덮어써 외부 변경이 되살아난다(#111).
   * 반환한 change 바이트를 룸 참여자들에게 am:change로 브로드캐스트해야 클라이언트도 동기화된다.
   * 룸이 없거나 내용이 이미 같으면 null.
   */
  syncExternalContent(diagramId: string, content: DiagramDocument): Uint8Array | null {
    const room = this.rooms.get(diagramId);
    if (!room) return null;
    if (isDeepStrictEqual(structuredClone(room.doc), structuredClone(content))) return null;
    // 최상위 키 통째 대입 — op 단위는 거칠지만(동시 편집과 충돌 시 외부 쓰기가 키 단위로 이김)
    // 외부 쓰기는 드물고, 정합성이 세밀한 병합보다 우선이다.
    const newDoc = Automerge.change(room.doc, (draft) => {
      for (const [key, value] of Object.entries(content)) {
        (draft as unknown as Record<string, unknown>)[key] = value;
      }
    });
    room.doc = newDoc;
    return Automerge.getLastLocalChange(newDoc) ?? null;
  }

  /**
   * 첫 미저장 편집 후 persistIntervalMs가 지나면 저장한다. 편집마다 타이머를 다시 거는 디바운스는
   * 누군가 계속 편집하면 저장이 끝없이 밀려, 그 사이 재시작하면 편집이 전부 사라졌다.
   */
  schedulePersist(diagramId: string): void {
    const room = this.rooms.get(diagramId);
    if (!room || room.persistTimer) return;
    room.persistTimer = setTimeout(() => {
      this.persistNow(diagramId).catch((err: Error) =>
        this.logger.error(`Failed to persist diagram ${diagramId}`, err.stack)
      );
    }, this.persistIntervalMs);
  }

  /**
   * 배포·재시작(SIGTERM) 시 게이트웨이가 소켓을 모두 끊은 뒤 부른다. 열린 방을 모두 저장하고,
   * 이후 leaveRoom은 방을 지우지 않는다.
   */
  async persistAll(): Promise<void> {
    this.shuttingDown = true;
    await Promise.all(
      Array.from(this.rooms.keys()).map((diagramId) =>
        this.persistNow(diagramId).catch((err: Error) =>
          this.logger.error(`Failed to persist diagram ${diagramId} on shutdown`, err.stack)
        )
      )
    );
  }

  async persistNow(diagramId: string): Promise<void> {
    const room = this.rooms.get(diagramId);
    if (!room) return;
    // 아래 스냅샷 이후의 편집은 다음 타이머가 저장하도록 비운다
    clearTimeout(room.persistTimer);
    delete room.persistTimer;
    // Automerge uses Proxy internally during Automerge.change() callbacks, but the
    // materialized Doc returned by Automerge.from()/applyChanges() (as stored in
    // room.doc) is a plain, non-proxied, JSON-safe object for this domain model
    // (no Automerge.Text/Counter rich types are used anywhere) — verified with
    // structuredClone against real multi-actor Automerge docs across several
    // change/delete rounds, and exercised by the passing persistNow spec below.
    const content = structuredClone(room.doc) as DiagramDocument;
    const write = (room.persisting ?? Promise.resolve()).then(async () => {
      await this.diagramRepo.update({ id: diagramId }, { content });
    });
    room.persisting = write.catch(() => undefined);
    await write;
  }
}
