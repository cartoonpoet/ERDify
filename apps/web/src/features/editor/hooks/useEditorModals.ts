import { useState } from "react";

/**
 * 에디터 상단 파일 메뉴 및 모달들의 열림 상태만 담당하는 훅.
 * 부수효과가 없는 순수 UI 토글 상태라, 데이터 로딩·실시간 협업 로직(useEditorPage)과 분리한다.
 */
export const useEditorModals = (diagramId: string | undefined) => {
  const [showInvite, setShowInvite] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showSaveCopy, setShowSaveCopy] = useState(false);

  const handleFileMenuOpen = () => setShowFileMenu(true);
  const handleFileMenuClose = () => setShowFileMenu(false);
  const handleImportOpen = () => { setShowFileMenu(false); setShowImport(true); };
  const handleExportOpen = () => { setShowFileMenu(false); setShowExport(true); };
  const handleSaveCopyOpen = () => { if (!diagramId) return; setShowFileMenu(false); setShowSaveCopy(true); };

  return {
    showInvite, setShowInvite,
    showExport, setShowExport,
    showShare, setShowShare,
    showImport, setShowImport,
    showFileMenu,
    showSaveCopy, setShowSaveCopy,
    handleFileMenuOpen, handleFileMenuClose,
    handleImportOpen, handleExportOpen, handleSaveCopyOpen,
  };
};
