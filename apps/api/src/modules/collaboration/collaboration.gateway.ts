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
import { DiagramsService } from "../diagrams/diagrams.service";

@WebSocketGateway({ namespace: "/collaboration", cors: { origin: true, credentials: true } })
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly jwtService: JwtService,
    private readonly diagramsService: DiagramsService
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
    await this.collaborationService.leaveRoom(diagramId, userId);
    const presence = this.collaborationService.getPresence(diagramId);
    this.server.to(diagramId).emit("presence:state", presence);
  }

  @SubscribeMessage("join")
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { diagramId: string }
  ): Promise<void> {
    if (!client.data.userId) { client.disconnect(); return; }
    const { diagramId } = payload;

    // Check membership before allowing access
    const permitted = await this.diagramsService.canAccessDiagram(diagramId, client.data.userId as string);
    if (!permitted) {
      client.emit("error", { message: "Forbidden" });
      client.disconnect();
      return;
    }

    try {
      client.data.diagramId = diagramId;
      client.join(diagramId);

      const stateUpdate = await this.collaborationService.joinRoom(diagramId);
      client.emit("yjs:sync", stateUpdate);

      this.collaborationService.addPresence(diagramId, client.data.userId as string, client.id);
      const presence = this.collaborationService.getPresence(diagramId);
      this.server.to(diagramId).emit("presence:state", presence);
    } catch (err) {
      client.emit("error", { message: "Failed to join diagram" });
      client.disconnect();
    }
  }

  @SubscribeMessage("yjs:update")
  async handleYjsUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() update: Uint8Array
  ): Promise<void> {
    const { diagramId, userId } = client.data as { diagramId?: string; userId?: string };
    if (!diagramId || !userId) return;
    const broadcastUpdate = await this.collaborationService.applyUpdate(diagramId, update);
    client.to(diagramId).emit("yjs:update", broadcastUpdate);
    this.collaborationService.schedulePersist(diagramId);
  }

  @SubscribeMessage("presence:update")
  async handlePresenceUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { selectedEntityId: string | null }
  ): Promise<void> {
    const { diagramId, userId } = client.data as { diagramId?: string; userId?: string };
    if (!diagramId || !userId) return;
    this.collaborationService.updatePresence(diagramId, userId, data);
    const presence = this.collaborationService.getPresence(diagramId);
    this.server.to(diagramId).emit("presence:state", presence);
  }

  @SubscribeMessage("snapshot:request")
  async handleSnapshotRequest(@ConnectedSocket() client: Socket): Promise<void> {
    const { diagramId } = client.data as { diagramId?: string };
    if (!diagramId) return;
    await this.collaborationService.persistNow(diagramId);
    client.emit("snapshot:saved");
  }
}
