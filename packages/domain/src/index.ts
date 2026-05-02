export { createEmptyDiagram } from "./schema/create-empty-diagram.js";
export { validateDiagram } from "./validation/validate-diagram.js";
export { addEntity, renameEntity, removeEntity, updateEntityColor } from "./commands/entity-commands.js";
export { addColumn, updateColumn, removeColumn } from "./commands/column-commands.js";
export { addRelationship, removeRelationship, updateRelationship } from "./commands/relationship-commands.js";
export { updateEntityPosition } from "./commands/layout-commands.js";
export { addIndex, removeIndex, updateIndex } from "./commands/index-commands.js";
export type {
  DiagramColumn,
  DiagramDialect,
  DiagramDocument,
  DiagramEntity,
  DiagramIndex,
  DiagramLayout,
  DiagramMetadata,
  DiagramRelationship,
  DiagramValidationResult,
  EntityPosition,
  ReferentialAction,
  RelationshipCardinality
} from "./types/index.js";
export { generateDdl } from "./utils/ddl-generator.js";
