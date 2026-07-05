import { useState, useEffect } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listDiagrams } from "@/shared/api/diagrams.api";
import { listProjects } from "@/shared/api/projects.api";
import { getMe } from "@/shared/api/auth.api";
import { queryKeys } from "@/shared/lib/queryKeys";
import type { DiagramListItem } from "@/shared/api/diagrams.api";
import type { DashboardOutletContext } from "../pages/DashboardPage";
import { useActiveDiagramUsers } from "./useActiveDiagramUsers";
import { getErrorStatus } from "@/shared/utils/queryErrorContent";
import { reportError } from "@/shared/services/errorReporter";

type FilterType = "all" | "recent" | "mine";

const applyFilter = (
  diagrams: DiagramListItem[],
  filter: FilterType,
  userId: string | null,
  filterQuery?: string,
): DiagramListItem[] => {
  let result = diagrams;
  if (filter === "recent") {
    result = [...result].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } else if (filter === "mine") {
    result = result.filter((d) => d.createdBy !== null && d.createdBy === userId);
  }
  if (filterQuery) {
    const q = filterQuery.toLowerCase();
    result = result.filter((d) => d.name.toLowerCase().includes(q));
  }
  return result;
};

export const useDiagramGrid = () => {
  const { orgId, projectId } = useParams<{ orgId: string; projectId?: string }>();
  const { onCreateDiagram, onImportDiagram, onDeleteDiagram, searchQuery } =
    useOutletContext<DashboardOutletContext>();

  const { data: me } = useQuery({ queryKey: queryKeys.me(), queryFn: getMe });
  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects(orgId!),
    queryFn: () => listProjects(orgId!),
    enabled: !!orgId,
  });
  const { data: diagrams = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.diagrams(projectId!),
    queryFn: () => listDiagrams(projectId!),
    enabled: !!projectId,
    throwOnError: false,
  });

  const projectName = projects.find((p) => p.id === projectId)?.name;
  const currentUserId = me?.id ?? null;
  const diagramIds = diagrams.map((d) => d.id);
  const activeUsers = useActiveDiagramUsers(diagramIds);

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [shareDiagramItem, setShareDiagramItem] = useState<DiagramListItem | null>(null);
  const [editDiagramItem, setEditDiagramItem] = useState<DiagramListItem | null>(null);
  const [moveOrCopyItem, setMoveOrCopyItem] = useState<{ diagram: DiagramListItem; mode: "move" | "copy" } | null>(
    null,
  );

  const filtered = applyFilter(diagrams, activeFilter, currentUserId, searchQuery || undefined);
  const errorStatus = isError ? getErrorStatus(error) : null;
  const isPermissionError = errorStatus === 403;

  const handleMenuClose = () => setMenuOpenId(null);
  const handleEditDiagram = (diagram: DiagramListItem) => () => { setEditDiagramItem(diagram); setMenuOpenId(null); };
  const handleShareDiagram = (diagram: DiagramListItem) => () => { setShareDiagramItem(diagram); setMenuOpenId(null); };
  const handleMoveDiagram = (diagram: DiagramListItem) => () => {
    setMoveOrCopyItem({ diagram, mode: "move" });
    setMenuOpenId(null);
  };
  const handleCopyDiagram = (diagram: DiagramListItem) => () => {
    setMoveOrCopyItem({ diagram, mode: "copy" });
    setMenuOpenId(null);
  };
  const handleDeleteDiagram = (diagram: DiagramListItem) => () => {
    if (window.confirm(`"${diagram.name}" ERD를 삭제하시겠습니까?`)) onDeleteDiagram(diagram.id);
    setMenuOpenId(null);
  };
  const handleMenuToggle = (id: string) => (e: ReactMouseEvent) => {
    e.preventDefault();
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  useEffect(() => {
    if (isError && error) {
      const path = (error as { config?: { url?: string } })?.config?.url ?? `/api/diagrams/${projectId}`;
      reportError(error, { path, url: window.location.href });
    }
  }, [isError, error, projectId]);

  return {
    orgId,
    projectId,
    projectName,
    currentUserId,
    diagrams,
    isLoading,
    isError,
    error,
    refetch,
    activeUsers,
    activeFilter,
    setActiveFilter,
    menuOpenId,
    setMenuOpenId,
    shareDiagramItem,
    setShareDiagramItem,
    editDiagramItem,
    setEditDiagramItem,
    moveOrCopyItem,
    setMoveOrCopyItem,
    filtered,
    errorStatus,
    isPermissionError,
    onCreateDiagram,
    onImportDiagram,
    onDeleteDiagram,
    handleMenuClose,
    handleEditDiagram,
    handleShareDiagram,
    handleMoveDiagram,
    handleCopyDiagram,
    handleDeleteDiagram,
    handleMenuToggle,
  };
};
