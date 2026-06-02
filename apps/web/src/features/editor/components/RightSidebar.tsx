import { Search } from "lucide-react";
import { useEditorStore } from "@/features/editor/store/useEditorStore";
import { AIChatTabPanel } from "./AIChatTabPanel";
import { HistoryTabPanel } from "./HistoryTabPanel";
import { SearchTabPanel } from "./SearchTabPanel";
import * as css from "./right-sidebar.css";

type TabId = 0 | 1 | 2;

interface RightSidebarProps {
  diagramId: string;
}

export const RightSidebar = ({ diagramId }: RightSidebarProps) => {
  const activeTab = useEditorStore((s) => s.rightSidebarActiveTab);
  const panelOpen = useEditorStore((s) => s.rightSidebarPanelOpen);
  const setActiveTab = useEditorStore((s) => s.setRightSidebarActiveTab);
  const setPanelOpen = useEditorStore((s) => s.setRightSidebarPanelOpen);

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
    }
  };

  return (
    <div className={css.container}>
      <div className={[css.panel, panelOpen ? "" : css.panelClosed].join(" ")}>
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
      </div>
    </div>
  );
};
