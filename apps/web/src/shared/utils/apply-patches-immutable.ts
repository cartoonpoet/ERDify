import type { Patch } from "@automerge/automerge";

type PatchApplier = (doc: unknown, patch: Patch) => void;
type Container = Record<string | number, unknown>;

/**
 * Automerge 패치를 base를 건드리지 않고 적용한 새 객체를 돌려준다. 패치가 지나가는 경로의
 * 객체·배열만 얕게 복사하므로(copy-on-write) 바뀌지 않은 하위 객체는 참조가 그대로 유지된다.
 * 그래야 스토어의 updateNodes가 바뀐 테이블의 노드만 새로 만든다(#139).
 *
 * applyPatch는 지연 로드한 Automerge 모듈의 것을 받는다 — 여기서 정적 import하면
 * WASM이 메인 번들로 끌려 들어온다.
 */
export const applyPatchesImmutable = <T extends object>(
  base: T,
  patches: Patch[],
  applyPatch: PatchApplier
): T => {
  const copied = new WeakSet<object>();
  const shallowCopy = (value: object): Container => {
    const copy = (Array.isArray(value) ? [...value] : { ...value }) as Container;
    copied.add(copy);
    return copy;
  };

  const root = shallowCopy(base);
  for (const patch of patches) {
    // 마지막 키는 바뀔 값 자체라 제외한다. 문자열 안쪽(텍스트 편집 인덱스)에 닿으면 멈춘다 —
    // 문자열은 불변이라 applyPatch가 부모 객체에 새 문자열을 대입한다.
    let parent = root;
    for (const key of patch.path.slice(0, -1)) {
      const child = parent[key];
      if (child === null || typeof child !== "object") break;
      if (!copied.has(child)) parent[key] = shallowCopy(child);
      parent = parent[key] as Container;
    }
    const last = patch.path.at(-1);
    // Automerge의 applyPatch는 del을 배열·문자열 인덱스로만 처리한다 — 맵 키 삭제는 직접 한다
    if (patch.action === "del" && typeof last === "string") delete parent[last];
    else applyPatch(root, patch);
  }
  return root as T;
};
