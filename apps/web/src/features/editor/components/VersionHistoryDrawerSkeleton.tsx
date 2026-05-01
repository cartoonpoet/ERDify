import { Skeleton } from "../../../design-system/Skeleton";

export const VersionHistoryDrawerSkeleton = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} height={56} />
    ))}
  </div>
);
