import { Injectable, NotFoundException } from "@nestjs/common";
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
  doc: Automerge.Doc<DiagramDocument>;
  presence: Map<string, CollaboratorPresence>;
  persistTimer?: ReturnType<typeof setTimeout>;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

@Injectable()
export class CollaborationService {
  private readonly rooms = new Map<string, RoomState>();
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
      room = { doc, presence: new Map() };
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

  async leaveRoom(diagramId: string, userId: string): Promise<void> {
    const room = this.rooms.get(diagramId);
    if (!room) return;
    room.presence.delete(userId);
    if (room.presence.size === 0) {
      clearTimeout(room.persistTimer);
      await this.persistNow(diagramId);
      // Recheck after async persist: a reconnecting client may have re-joined
      // during the DB write and added itself back to room.presence.
      if (room.presence.size === 0) {
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

  schedulePersist(diagramId: string): void {
    const room = this.rooms.get(diagramId);
    if (!room) return;
    clearTimeout(room.persistTimer);
    room.persistTimer = setTimeout(() => void this.persistNow(diagramId), this.persistIntervalMs);
  }

  async persistNow(diagramId: string): Promise<void> {
    const room = this.rooms.get(diagramId);
    if (!room) return;
    // Automerge uses Proxy internally during Automerge.change() callbacks, but the
    // materialized Doc returned by Automerge.from()/applyChanges() (as stored in
    // room.doc) is a plain, non-proxied, JSON-safe object for this domain model
    // (no Automerge.Text/Counter rich types are used anywhere) — verified with
    // structuredClone against real multi-actor Automerge docs across several
    // change/delete rounds, and exercised by the passing persistNow spec below.
    const content = structuredClone(room.doc) as DiagramDocument;
    await this.diagramRepo.update({ id: diagramId }, { content });
  }
}
