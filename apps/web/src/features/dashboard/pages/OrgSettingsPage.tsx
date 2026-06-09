import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/shared/api/auth.api";
import { queryKeys } from "@/shared/lib/queryKeys";
import { useMembers } from "@/features/dashboard/hooks/useMembers";
import { AISettingsPanel } from "./AISettingsPanel";
import * as css from "./org-settings-page.css";

export const OrgSettingsPage = () => {
  const { orgId = "" } = useParams<{ orgId: string }>();
  const { data: me } = useQuery({ queryKey: queryKeys.me(), queryFn: getMe });
  const { members } = useMembers(orgId);

  const isOwner = members.find((m) => m.userId === me?.id)?.role === "owner";

  return (
    <div className={css.page}>
      <div className={css.header}>
        <h1 className={css.title}>조직 설정</h1>
      </div>
      <AISettingsPanel orgId={orgId} isOwner={isOwner} />
    </div>
  );
};
