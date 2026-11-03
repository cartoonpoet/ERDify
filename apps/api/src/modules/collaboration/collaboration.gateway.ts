import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { OnEvent } from "@nestjs/event-emitter";
import { JwtService } from "@nestjs/jwt";
import type { Server, Socket } from "socket.io";
import type { MemberRole } from "@erdify/db";
import type { JwtPayload } from "../auth/strategies/jwt.strategy";
import { Role } from "../../common/enums/role.enum";
import { CollaborationService } from "./collaboration.service";
import { DiagramsService } from "../diagrams/diagrams.service";

const ACCESS_RECHECK_MS = 30_000;

/**
 * Automerge 바이트를 숫자 배열(JSON)로 보내면 원래 크기의 약 3.6배다(#143). join에 encoding: "base64"를
 * 보낸 소켓엔 base64 문자열(약 1.33배)로, 그 전 버전 웹(열려 있던 탭)엔 숫자 배열로 보낸다.
 * Socket.IO 바이너리는 메시지 하나가 프레임 2개로 나뉘어 200명 동시 편집에서 지연이 2배 넘게 늘어서 쓰지 않는다.
 */
const base64Room = (diagramId: string) => `${diagramId}:am-base64`;
const legacyRoom = (diagramId: string) => `${diagramId}:am-legacy`;
const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");

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
  private readonly logger = new Logger(CollaborationGateway.name);

  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly jwtService: JwtService,
    private readonly diagramsService: DiagramsService
  ) {}

  private extractToken(client: Socket): string | null {
    // 쿠키 우선 (웹 브라우저), Bearer 폴백 (MCP/API key)
    const cookieHeader = client.handshake.headers?.cookie ?? "";
    const cookieMatch = /(?:^|;\s*)access_token=([^;]+)/.exec(cookieHeader);
    if (cookieMatch?.[1]) return cookieMatch[1];

    const bearer = client.handshake.auth?.token as string | undefined;
    return bearer ? bearer.replace("Bearer ", "") : null;
  }

  /**
   * am:change는 1인당 초당 여러 번 들어오므로 매번 DB로 권한을 확인하면 200명부터 전달이 수 초씩 밀린다.
   * 소켓·다이어그램 단위로 확인한 역할을 ACCESS_RECHECK_MS 동안 재사용한다 — 멤버에서 빠지거나
   * 보기 권한으로 바뀐 사용자는 최대 그 시간만큼 더 편집할 수 있다. 멤버가 아니면 null.
   */
  private async getAccessRole(client: Socket, diagramId: string, userId: string): Promise<MemberRole | null> {
    const cached = client.data.access as { diagramId: string; role: MemberRole; until: number } | undefined;
    if (cached?.diagramId === diagramId && cached.until > Date.now()) return cached.role;

    const role = await this.diagramsService.getDiagramRole(diagramId, userId);
    client.data.access = role ? { diagramId, role, until: Date.now() + ACCESS_RECHECK_MS } : undefined;
    return role;
  }

  handleConnection(client: Socket): void {
    try {
      const token = this.extractToken(client);
      if (!token) throw new Error("no token");
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data.userId = payload.sub;
      client.data.email = payload.email;
    } catch (err) {
      this.logger.error("WebSocket connection rejected", (err as Error).message);
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
    @MessageBody() payload: { diagramId: string; encoding?: "base64" }
  ): Promise<void> {
    if (!client.data.userId) { client.disconnect(); return; }
    const { diagramId } = payload;

    // 입장은 항상 DB로 새로 확인하고, 그 결과로 편집용 캐시를 채운다
    client.data.access = undefined;
    const role = await this.getAccessRole(client, diagramId, client.data.userId as string);
    if (!role) {
      client.emit("error", { message: "Forbidden" });
      client.disconnect();
      return;
    }

    try {
      const base64 = payload.encoding === "base64";
      client.data.diagramId = diagramId;
      await client.join([diagramId, base64 ? base64Room(diagramId) : legacyRoom(diagramId)]);

      const docBytes = await this.collaborationService.joinRoom(diagramId);
      client.emit("am:init", base64 ? toBase64(docBytes) : Array.from(docBytes));

      this.collaborationService.addPresence(
        diagramId,
        client.data.userId as string,
        client.id,
        client.data.email as string
      );
      const presence = this.collaborationService.getPresence(diagramId);
      this.server.to(diagramId).emit("presence:state", presence);
    } catch (err) {
      this.logger.error("Failed to join diagram", (err as Error).stack);
      client.emit("error", { message: "Failed to join diagram" });
      client.disconnect();
    }
  }

  @SubscribeMessage("am:change")
  async handleChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() change: string | number[]
  ): Promise<void> {
    const { diagramId, userId } = client.data as { diagramId?: string; userId?: string };
    if (!diagramId || !userId) return;

    const role = await this.getAccessRole(client, diagramId, userId);
    if (!role) {
      client.emit("error", { message: "Forbidden" });
      client.disconnect();
      return;
    }
    // 보기 권한은 실시간 화면은 계속 봐야 하므로 연결은 두고 편집만 버린다(REST 수정과 같은 기준)
    if (role === Role.Viewer) {
      client.emit("error", { message: "Forbidden" });
      return;
    }

    const changeBytes = typeof change === "string" ? Buffer.from(change, "base64") : Uint8Array.from(change);
    this.collaborationService.applyChanges(diagramId, [changeBytes]);
    client.to(base64Room(diagramId)).emit("am:change", typeof change === "string" ? change : toBase64(changeBytes));
    client.to(legacyRoom(diagramId)).emit("am:change", Array.isArray(change) ? change : Array.from(changeBytes));
    this.collaborationService.schedulePersist(diagramId);
  }

  /**
   * HTTP/MCP 쓰기 경로가 DB content를 바꿨을 때 발행되는 이벤트.
   * 활성 룸의 메모리 문서를 따라잡게 하고(안 하면 다음 persist가 stale 문서로
   * DB를 덮어써 외부 변경이 되살아난다, #111), 참여자들에게도 브로드캐스트한다.
   */
  @OnEvent("diagram.content.updated", { async: false })
  handleDiagramContentUpdated(payload: { diagramId: string; content: object }): void {
    const change = this.collaborationService.syncExternalContent(
      payload.diagramId,
      payload.content as never
    );
    if (change) {
      this.server.to(base64Room(payload.diagramId)).emit("am:change", toBase64(change));
      this.server.to(legacyRoom(payload.diagramId)).emit("am:change", Array.from(change));
    }
  }

  @OnEvent("mcp.tool_call.recorded", { async: false })
  broadcastMcpActivity(data: {
    diagramId: string;
    sessionId: string;
    summary: string;
    toolCall: { tool: string; summary: string };
  }): void {
    this.server.to(data.diagramId).emit("mcp_activity", {
      type: "mcp_activity",
      ...data,
    });
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
