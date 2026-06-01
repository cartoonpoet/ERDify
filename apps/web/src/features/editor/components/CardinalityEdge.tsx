import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import type { RelationshipCardinality } from "@erdify/domain";
import * as css from "./cardinality-edge.css";

type CardinalityEdgeData = {
  cardinality: RelationshipCardinality;
  identifying: boolean;
};

const getLabels = (cardinality: RelationshipCardinality): { source: string; target: string } => {
  switch (cardinality) {
    case "one-to-one":   return { source: "1", target: "1" };
    case "one-to-many":  return { source: "1", target: "N" };
    case "many-to-one":  return { source: "N", target: "1" };
  }
};

export const CardinalityEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
  selected,
}: EdgeProps & { data: CardinalityEdgeData }) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { source: sourceLabel, target: targetLabel } = getLabels(data.cardinality);

  const edgeStyle: React.CSSProperties = {
    stroke: selected ? "#4f46e5" : "#6366f1",
    strokeWidth: selected ? 2.5 : 1.5,
    ...(!data.identifying ? { strokeDasharray: "6 3" } : {}),
    ...(selected ? { filter: "drop-shadow(0 0 5px rgba(99,102,241,0.55))" } : {}),
    ...(style ?? {}),
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        {...(markerEnd !== undefined ? { markerEnd } : {})}
      />
      <EdgeLabelRenderer>
        <div
          className={`${selected ? css.edgeLabelSelected : css.edgeLabel} nodrag nopan`}
          style={{ transform: `translate(${sourceX + 8}px, ${sourceY - 16}px)` }}
        >
          {sourceLabel}
        </div>
        <div
          className={`${selected ? css.edgeLabelSelected : css.edgeLabel} nodrag nopan`}
          style={{ transform: `translate(${targetX - 20}px, ${targetY - 16}px)` }}
        >
          {targetLabel}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
