import { useRef } from "react";
import type { Doc } from "@automerge/automerge";
import type { Socket } from "socket.io-client";
import type { DiagramDocument } from "@erdify/domain";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { applyDiff } from "@/shared/utils/collaboration-diff";
import { useCollaborationSocket } from "./useCollaborationSocket";
import { usePresence } from "./usePresence";

export type { Collaborator } from "@/features/editor/store/useEditorStore";

// Kick off the WASM download lazily — doesn't block EditorPage from rendering
let _amPromise: Promise<typeof import("@automerge/automerge")> | null = null;
function loadAutomerge() {
  _amPromise ??= import("@automerge/automerge");
  return _amPromise;
}

export const useRealtimeCollaboration = (diagramId: string) => {
  const amDocRef = useRef<Doc<DiagramDocument> | null>(null);
  const isRemoteRef = useRef(false);

  const setDocument = useEditorStore((s) => s.setDocument);
  const setCollaborators = useEditorStore((s) => s.setCollaborators);
  const setCollaborating = useEditorStore((s) => s.setCollaborating);

  const socketRef = useCollaborationSocket(diagramId, {
    onInit: async (bytes) => {
      // 협업 룸 합류 완료 → 이제부터 지속성은 협업 레이어가 담당(HTTP 자동저장 비활성화)
      setCollaborating(true);
      const Automerge = await loadAutomerge();
      const serverDoc = Automerge.load<DiagramDocument>(Uint8Array.from(bytes));
      const { isDirty, document: localDoc, baselineDocument } = useEditorStore.getState();
      if (isDirty && localDoc) {
        // base는 "내 편집이 시작된 기준 문서"여야 한다. 서버 문서를 base로 쓰면
        // 내가 안 건드린 항목의 서버측 삭제/추가가 전부 내 변경으로 오인되어
        // 지운 테이블이 부활하거나 남이 추가한 테이블이 소실된다(#111).
        const baseDoc = amDocRef.current
          ? (structuredClone(amDocRef.current) as DiagramDocument)
          : (baselineDocument ?? (structuredClone(serverDoc) as DiagramDocument));
        const mergedDoc = Automerge.change(serverDoc, (draft) => {
          applyDiff(draft as DiagramDocument, baseDoc, localDoc);
        });
        const pendingChange = Automerge.getLastLocalChange(mergedDoc);
        amDocRef.current = mergedDoc;
        if (pendingChange && socketRef.current?.connected) {
          socketRef.current.emit("am:change", Array.from(pendingChange));
        }
        // 병합 결과를 로컬 UI에도 반영한다. 서버는 발신자에게 echo하지 않으므로
        // 이걸 빼면 병합에서 걸러진 항목(예: 부활 방지된 삭제 테이블)이 화면에 남고,
        // 그 항목을 편집하면 공유 문서에 없어서 조용히 유실된다.
        isRemoteRef.current = true;
        setDocument(structuredClone(mergedDoc) as DiagramDocument);
        isRemoteRef.current = false;
        return;
      }
      amDocRef.current = serverDoc;
      isRemoteRef.current = true;
      setDocument(structuredClone(serverDoc) as DiagramDocument);
      isRemoteRef.current = false;
    },

    onChange: async (change) => {
      if (!amDocRef.current) return;
      const Automerge = await loadAutomerge();
      const [newDoc] = Automerge.applyChanges(amDocRef.current, [Uint8Array.from(change)]);
      amDocRef.current = newDoc;
      const wasDirty = useEditorStore.getState().isDirty;
      isRemoteRef.current = true;
      setDocument(structuredClone(newDoc) as DiagramDocument);
      isRemoteRef.current = false;
      if (wasDirty) useEditorStore.setState({ isDirty: true });
    },

    onPresenceState: (presence) => setCollaborators(presence),

    onOutgoingChange: (socket: Socket) =>
      useEditorStore.subscribe(async (state, prevState) => {
        if (state.document === prevState.document) return;
        const newDoc = state.document;
        const prevDoc = prevState.document;
        if (isRemoteRef.current || !newDoc || !prevDoc || !amDocRef.current || !socket.connected) return;
        const Automerge = await loadAutomerge();
        const newAmDoc = Automerge.change(amDocRef.current, (draft) => {
          applyDiff(draft as DiagramDocument, prevDoc, newDoc);
        });
        const change = Automerge.getLastLocalChange(newAmDoc);
        if (change) {
          amDocRef.current = newAmDoc;
          socket.emit("am:change", Array.from(change));
        }
      }),

    onDisconnect: () => {
      amDocRef.current = null;
      setCollaborators([]);
      // 협업 끊김 → HTTP 자동저장을 백업 지속성 경로로 다시 활성화
      setCollaborating(false);
    },
  });

  usePresence(socketRef);
};
