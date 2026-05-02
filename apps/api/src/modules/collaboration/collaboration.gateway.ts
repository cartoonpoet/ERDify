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

@WebSocketGateway({
  namespace: "/collaboration",
  cors: {
    origin: process.env["NODE_ENV"] === "production"
      ? (process.env["CORS_ORIGINS"]?.split(",") ?? [])
      : true,
    credentials: true,
  },
})
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly jwtService: JwtService,
    private readonly diagramsService: DiagramsService
  ) {}

  private extractToken(client: Socket): string | null {
    // 쿠키 우선 (웹 브라우저), Bearer 폴백 (MCP/API key)
    const cookieHeader = client.handshake.headers.cookie ?? "";
    const cookieMatch = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
    if (cookieMatch?.[1]) return cookieMatch[1];

    const bearer = client.handshake.auth?.token as string | undefined;
    return bearer ? bearer.replace("Bearer ", "") : null;
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) throw new Error("no token");
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data.userId = payload.sub;
      client.data.email = payload.email;
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

    const permitted = await this.diagramsService.canAccessDiagram(diagramId, client.data.userId as string);
    if (!permitted) {
      client.emit("error", { message: "Forbidden" });
      client.disconnect();
      return;
    }

    try {
      client.data.diagramId = diagramId;
      client.join(diagramId);

      const docBytes = await this.collaborationService.joinRoom(diagramId);
      client.emit("am:init", Array.from(docBytes));

      this.collaborationService.addPresence(
        diagramId,
        client.data.userId as string,
        client.id,
        client.data.email as string
      );
      const presence = this.collaborationService.getPresence(diagramId);
      this.server.to(diagramId).emit("presence:state", presence);
    } catch {
      client.emit("error", { message: "Failed to join diagram" });
      client.disconnect();
    }
  }

  @SubscribeMessage("am:change")
  handleChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() change: number[]
  ): void {
    const { diagramId, userId } = client.data as { diagramId?: string; userId?: string };
    if (!diagramId || !userId) return;

    const changeBytes = Uint8Array.from(change);
    this.collaborationService.applyChanges(diagramId, [changeBytes]);
    client.to(diagramId).emit("am:change", change);
    this.collaborationService.schedulePersist(diagramId);
  }

  @SubscribeMessage("presence:update")
  handlePresenceUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { selectedEntityId: string | null }
  ): void {
    const { diagramId, userId } = client.data as { diagramId?: string; userId?: string };
    if (!diagramId || !userId) return;
    this.collaborationService.updatePresence(diagramId, userId, data);
    const presence = this.collaborationService.getPresence(diagramId);
    this.server.to(diagramId).emit("presence:state", presence);
  }
}
