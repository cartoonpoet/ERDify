import { type MouseEvent as ReactMouseEvent, type KeyboardEvent as ReactKeyboardEvent, useCallback, useRef, useState } from "react";
import { Database, Search } from "lucide-react";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { AIChatTabPanel } from "./AIChatTabPanel";
import { HistoryTabPanel } from "./HistoryTabPanel";
import { ObjectsTabPanel } from "./ObjectsTabPanel";
import { SearchTabPanel } from "./SearchTabPanel";
import * as css from "./right-sidebar.css";

type TabId = 0 | 1 | 2 | 3;

interface RightSidebarProps {
  diagramId: string;
}

export const RightSidebar = ({ diagramId }: RightSidebarProps) => {
  const activeTab = useEditorStore((s) => s.rightSidebarActiveTab);
  const panelOpen = useEditorStore((s) => s.rightSidebarPanelOpen);
  const panelWidth = useEditorStore((s) => s.rightSidebarWidth);
  const setActiveTab = useEditorStore((s) => s.setRightSidebarActiveTab);
  const setPanelOpen = useEditorStore((s) => s.setRightSidebarPanelOpen);
  const setPanelWidth = useEditorStore((s) => s.setRightSidebarWidth);

  const [resizing, setResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleResizeStart = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startWidth: panelWidth };
      setResizing(true);

      const handleMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        // 핸들이 패널 왼쪽에 있으므로, 왼쪽으로 끌수록 패널이 넓어진다.
        const delta = dragRef.current.startX - ev.clientX;
        setPanelWidth(dragRef.current.startWidth + delta);
      };

      const handleUp = () => {
        dragRef.current = null;
        setResizing(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [panelWidth, setPanelWidth],
  );

  const RESIZE_STEP = 20;

  const handleResizeKeyDown = (e: ReactKeyboardEvent) => {
    // 핸들이 패널 왼쪽에 있으므로, 왼쪽 화살표로 넓히고 오른쪽 화살표로 좁힌다(드래그와 동일한 방향).
    if (e.key === "ArrowLeft") { e.preventDefault(); setPanelWidth(panelWidth + RESIZE_STEP); }
    if (e.key === "ArrowRight") { e.preventDefault(); setPanelWidth(panelWidth - RESIZE_STEP); }
  };

  const handleTabClick = (tabId: number) => {
    if (panelOpen && activeTab === tabId) {
      setPanelOpen(false);
    } else {
      setActiveTab(tabId);
      setPanelOpen(true);
    }
  };

  const renderPanel = (tabId: TabId) => {
    switch (tabId) {
      case 0:
        return <AIChatTabPanel diagramId={diagramId} />;
      case 1:
        return <SearchTabPanel />;
      case 2:
        return <HistoryTabPanel diagramId={diagramId} />;
      case 3:
        return <ObjectsTabPanel diagramId={diagramId} />;
    }
  };

  return (
    <div className={css.container}>
      {panelOpen && (
        <div
          className={[css.resizeHandle, resizing ? css.resizeHandleActive : ""].join(" ")}
          onMouseDown={handleResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="패널 크기 조절"
          aria-valuenow={panelWidth}
          aria-valuemin={240}
          aria-valuemax={720}
          tabIndex={0}
          onKeyDown={handleResizeKeyDown}
        />
      )}
      <div
        className={[
          css.panel,
          resizing ? css.panelResizing : "",
          panelOpen ? "" : css.panelClosed,
        ].join(" ")}
        style={panelOpen ? { width: panelWidth } : undefined}
      >
        <div className={css.panelBody}>
          {renderPanel(activeTab as TabId)}
        </div>
      </div>

      <div className={css.tabBar}>
        <button
          className={css.tabBtn[panelOpen && activeTab === 0 ? "active" : "default"]}
          onClick={() => handleTabClick(0)}
          aria-label="AI"
          title="AI 채팅"
        >
          <span className={css.tabIcon}>✦</span>
          <span className={css.tabLabel}>AI</span>
        </button>
        <button
          className={css.tabBtn[panelOpen && activeTab === 1 ? "active" : "default"]}
          onClick={() => handleTabClick(1)}
          aria-label="검색"
          title="검색"
        >
          <Search size={14} className={css.tabIcon} />
          <span className={css.tabLabel}>검색</span>
        </button>
        <div className={css.tabSep} />
        <button
          className={css.tabBtn[panelOpen && activeTab === 2 ? "active" : "default"]}
          onClick={() => handleTabClick(2)}
          aria-label="기록"
          title="활동 기록"
        >
          <span className={css.tabIcon}>⏱</span>
          <span className={css.tabLabel}>기록</span>
        </button>
        <button
          className={css.tabBtn[panelOpen && activeTab === 3 ? "active" : "default"]}
          onClick={() => handleTabClick(3)}
          aria-label="객체"
          title="SQL 객체"
        >
          <Database size={14} className={css.tabIcon} />
          <span className={css.tabLabel}>객체</span>
        </button>
      </div>
    </div>
  );
};
