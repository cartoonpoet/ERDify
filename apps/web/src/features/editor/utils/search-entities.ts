import type { DiagramEntity } from "@erdify/domain";

export type SearchResult =
  | { type: "table"; entityId: string; entityName: string; columnCount: number }
  | { type: "column"; entityId: string; entityName: string; columnId: string; columnName: string };

const matches = (value: string, query: string): boolean =>
  value.toLowerCase().includes(query.toLowerCase());

/**
 * 테이블명/코멘트/컬럼명을 부분일치·대소문자무시로 매칭해 통합 검색 결과를 반환하는 순수 함수.
 * query가 비어 있으면 전체 테이블(table 결과)만 반환한다.
 */
export const searchEntities = (entities: DiagramEntity[], query: string): SearchResult[] => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return entities.map((entity) => ({
      type: "table",
      entityId: entity.id,
      entityName: entity.name,
      columnCount: entity.columns.length,
    }));
  }

  const results: SearchResult[] = [];

  for (const entity of entities) {
    const isTableMatch =
      matches(entity.name, trimmedQuery) || matches(entity.comment ?? "", trimmedQuery);

    if (isTableMatch) {
      results.push({
        type: "table",
        entityId: entity.id,
        entityName: entity.name,
        columnCount: entity.columns.length,
      });
    }

    for (const column of entity.columns) {
      if (matches(column.name, trimmedQuery)) {
        results.push({
          type: "column",
          entityId: entity.id,
          entityName: entity.name,
          columnId: column.id,
          columnName: column.name,
        });
      }
    }
  }

  return results;
};
