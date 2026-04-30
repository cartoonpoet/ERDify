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
