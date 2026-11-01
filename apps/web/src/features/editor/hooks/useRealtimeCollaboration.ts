import { useRef } from "react";
import type { Doc, Patch } from "@automerge/automerge";
import type { Socket } from "socket.io-client";
import type { DiagramDocument } from "@erdify/domain";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { applyDiff } from "@/shared/utils/collaboration-diff";
import { applyPatchesImmutable } from "@/shared/utils/apply-patches-immutable";
import { useCollaborationSocket } from "./useCollaborationSocket";
import { usePresence } from "./usePresence";

export type { Collaborator } from "@/features/editor/store/useEditorStore";

// Kick off the WASM download lazily — doesn't block EditorPage from rendering
let _amPromise: Promise<typeof import("@automerge/automerge")> | null = null;
function loadAutomerge() {
  _amPromise ??= import("@automerge/automerge");
  return _amPromise;
}

// 원격 변경을 이 간격으로 모아 한 번에 적용한다. 변경마다 문서 전체를 복사·재렌더하면
// 초당 수백 건이 들어올 때 탭이 멈췄다(#137). 백그라운드 탭에서는 브라우저가 타이머를
// 1초 단위로 늦추므로 그만큼 더 크게 묶인다.
const REMOTE_FLUSH_MS = 50;

export const useRealtimeCollaboration = (diagramId: string) => {
  const amDocRef = useRef<Doc<DiagramDocument> | null>(null);
  const isRemoteRef = useRef(false);
  const pendingRemoteRef = useRef<Uint8Array[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // amDocRef와 항상 같은 내용의 일반 객체 사본. Automerge 패치로만 갱신해 바뀌지 않은 부분의
  // 참조를 유지한다 — 스토어가 바뀐 테이블의 노드만 새로 만들 수 있게(#139)
  const mirrorRef = useRef<DiagramDocument | null>(null);

  const setDocument = useEditorStore((s) => s.setDocument);
  const applyRemoteDocument = useEditorStore((s) => s.applyRemoteDocument);
  const setCollaborators = useEditorStore((s) => s.setCollaborators);
  const setCollaborating = useEditorStore((s) => s.setCollaborating);

  const clearPendingRemote = () => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
    pendingRemoteRef.current = [];
  };

  const flushRemoteChanges = async () => {
    flushTimerRef.current = null;
    const changes = pendingRemoteRef.current;
    pendingRemoteRef.current = [];
    if (changes.length === 0) return;
    const Automerge = await loadAutomerge();
    if (!amDocRef.current) return;
    let patches: Patch[] = [];
    const [newDoc] = Automerge.applyChanges(amDocRef.current, changes, {
      patchCallback: (p) => { patches = p; },
    });
    amDocRef.current = newDoc;
    mirrorRef.current = mirrorRef.current
      ? applyPatchesImmutable(mirrorRef.current, patches, Automerge.applyPatch)
      : (structuredClone(newDoc) as DiagramDocument);
    isRemoteRef.current = true;
    applyRemoteDocument(mirrorRef.current);
    isRemoteRef.current = false;
  };

  const replaceDocument = (doc: Doc<DiagramDocument>) => {
    amDocRef.current = doc;
    mirrorRef.current = structuredClone(doc) as DiagramDocument;
    isRemoteRef.current = true;
    setDocument(mirrorRef.current);
    isRemoteRef.current = false;
  };

  const socketRef = useCollaborationSocket(diagramId, {
    onInit: async (bytes) => {
      // 서버 문서가 이전 세션의 원격 변경까지 담고 있으므로 쌓여 있던 것은 버린다
      clearPendingRemote();
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
        if (pendingChange && socketRef.current?.connected) {
          socketRef.current.emit("am:change", Array.from(pendingChange));
        }
        // 병합 결과를 로컬 UI에도 반영한다. 서버는 발신자에게 echo하지 않으므로
        // 이걸 빼면 병합에서 걸러진 항목(예: 부활 방지된 삭제 테이블)이 화면에 남고,
        // 그 항목을 편집하면 공유 문서에 없어서 조용히 유실된다.
        replaceDocument(mergedDoc);
        return;
      }
      replaceDocument(serverDoc);
    },

    onChange: (change) => {
      if (!amDocRef.current) return;
      pendingRemoteRef.current.push(Uint8Array.from(change));
      flushTimerRef.current ??= setTimeout(() => void flushRemoteChanges(), REMOTE_FLUSH_MS);
    },

    onPresenceState: (presence) => setCollaborators(presence),

    onOutgoingChange: (socket: Socket) =>
      useEditorStore.subscribe(async (state, prevState) => {
        if (state.document === prevState.document) return;
        const newDoc = state.document;
        const prevDoc = prevState.document;
        if (isRemoteRef.current || !newDoc || !prevDoc || !amDocRef.current || !socket.connected) return;
        const Automerge = await loadAutomerge();
        let patches: Patch[] = [];
        const newAmDoc = Automerge.change(amDocRef.current, { patchCallback: (p) => { patches = p; } }, (draft) => {
          applyDiff(draft as DiagramDocument, prevDoc, newDoc);
        });
        const change = Automerge.getLastLocalChange(newAmDoc);
        if (change) {
          amDocRef.current = newAmDoc;
          if (mirrorRef.current) mirrorRef.current = applyPatchesImmutable(mirrorRef.current, patches, Automerge.applyPatch);
          socket.emit("am:change", Array.from(change));
        }
      }),

    onDisconnect: () => {
      clearPendingRemote();
      amDocRef.current = null;
      mirrorRef.current = null;
      setCollaborators([]);
      // 협업 끊김 → HTTP 자동저장을 백업 지속성 경로로 다시 활성화
      setCollaborating(false);
    },
  });

  usePresence(socketRef);
};
