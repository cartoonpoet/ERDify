import type { HTMLAttributes } from "react";
import { skeleton } from "./skeleton.css";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
}

export const Skeleton = ({ width, height, style, className, ...props }: SkeletonProps) => (
  <div
    className={[skeleton, className].filter(Boolean).join(" ")}
    style={{ width, height, ...(style ?? {}) }}
    {...props}
    aria-hidden="true"
  />
);
