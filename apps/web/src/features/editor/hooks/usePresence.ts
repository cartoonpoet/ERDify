import { useEffect } from "react";
import type { RefObject } from "react";
import type { Socket } from "socket.io-client";
import { useEditorStore } from "../stores/useEditorStore";

export const usePresence = (socketRef: RefObject<Socket | null>): void => {
  useEffect(() => {
    const unsub = useEditorStore.subscribe((state, prevState) => {
      if (
        state.selectedEntityId !== prevState.selectedEntityId &&
        socketRef.current?.connected
      ) {
        socketRef.current.emit("presence:update", {
          selectedEntityId: state.selectedEntityId,
        });
      }
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
};
