import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import type { RelationshipCardinality } from "@erdify/domain";

type CardinalityEdgeData = {
  cardinality: RelationshipCardinality;
  identifying: boolean;
};

function getLabels(cardinality: RelationshipCardinality): { source: string; target: string } {
  switch (cardinality) {
    case "one-to-one":   return { source: "1", target: "1" };
    case "one-to-many":  return { source: "1", target: "N" };
    case "many-to-one":  return { source: "N", target: "1" };
  }
}

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
    stroke: "#6366f1",
    strokeWidth: 1.5,
    ...(!data.identifying ? { strokeDasharray: "6 3" } : {}),
    ...(style ?? {}),
  };

  const labelStyle: React.CSSProperties = {
    position: "absolute",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "monospace",
    color: "#6366f1",
    background: "#ffffff",
    padding: "1px 3px",
    borderRadius: 3,
    pointerEvents: "none",
    lineHeight: 1,
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
          className="nodrag nopan"
          style={{
            ...labelStyle,
            transform: `translate(${sourceX + 8}px, ${sourceY - 16}px)`,
          }}
        >
          {sourceLabel}
        </div>
        <div
          className="nodrag nopan"
          style={{
            ...labelStyle,
            transform: `translate(${targetX - 20}px, ${targetY - 16}px)`,
          }}
        >
          {targetLabel}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
