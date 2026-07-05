import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal, Button } from "@/components";
import { duplicateDiagram, moveDiagram } from "@/shared/api/diagrams.api";
import type { DiagramListItem } from "@/shared/api/diagrams.api";
import { listProjects } from "@/shared/api/projects.api";
import { queryKeys } from "@/shared/lib/queryKeys";
import { form, footer, selectInput } from "./modal-form.css";

type MoveOrCopyMode = "move" | "copy";

interface MoveOrCopyDiagramModalProps {
  open: boolean;
  mode: MoveOrCopyMode;
  diagram: DiagramListItem;
  onClose: () => void;
}

const TITLE_BY_MODE: Record<MoveOrCopyMode, string> = {
  move: "다른 프로젝트로 이동",
  copy: "다른 프로젝트로 복사",
};

const CONFIRM_LABEL_BY_MODE: Record<MoveOrCopyMode, string> = {
  move: "이동",
  copy: "복사",
};

const LOADING_LABEL_BY_MODE: Record<MoveOrCopyMode, string> = {
  move: "이동 중...",
  copy: "복사 중...",
};

const getErrorMessage = (mode: MoveOrCopyMode): string =>
  mode === "move" ? "이동에 실패했습니다." : "복사에 실패했습니다.";

export const MoveOrCopyDiagramModal = ({ open, mode, diagram, onClose }: MoveOrCopyDiagramModalProps) => {
  const { orgId } = useParams<{ orgId: string }>();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: queryKeys.projects(orgId!),
    queryFn: () => listProjects(orgId!),
    enabled: !!orgId,
  });

  const candidates = projects.filter((p) => p.id !== diagram.projectId);
  const firstCandidateId = candidates[0]?.id ?? "";

  const [targetProjectId, setTargetProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTargetProjectId = targetProjectId || firstCandidateId;
  const hasCandidates = candidates.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTargetProjectId) return;

    setLoading(true);
    setError(null);
    try {
      if (mode === "move") {
        await moveDiagram(diagram.id, selectedTargetProjectId);
        queryClient.invalidateQueries({ queryKey: queryKeys.diagrams(diagram.projectId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.diagrams(selectedTargetProjectId) });
      } else {
        await duplicateDiagram(diagram.id, { targetProjectId: selectedTargetProjectId });
        queryClient.invalidateQueries({ queryKey: queryKeys.diagrams(selectedTargetProjectId) });
      }

      onClose();
    } catch {
      setError(getErrorMessage(mode));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={TITLE_BY_MODE[mode]}>
      <form className={form} onSubmit={handleSubmit}>
        {isProjectsLoading && <p style={{ fontSize: "14px", color: "inherit" }}>프로젝트 목록을 불러오는 중...</p>}
        {!isProjectsLoading && hasCandidates && (
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
              대상 프로젝트
            </label>
            <select
              className={selectInput}
              value={selectedTargetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value)}
            >
              {candidates.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {!isProjectsLoading && !hasCandidates && (
          <p style={{ fontSize: "14px", color: "inherit" }}>이동/복사할 수 있는 다른 프로젝트가 없습니다.</p>
        )}
        {error && (
          <p style={{ fontSize: "12px", color: "#dc2626" }}>{error}</p>
        )}
        <div className={footer}>
          <Button variant="secondary" size="md" type="button" onClick={onClose}>취소</Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={loading || isProjectsLoading || !hasCandidates}
          >
            {loading ? LOADING_LABEL_BY_MODE[mode] : CONFIRM_LABEL_BY_MODE[mode]}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
