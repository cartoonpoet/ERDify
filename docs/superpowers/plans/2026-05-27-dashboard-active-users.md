# Dashboard Active Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드 ERD 카드에 현재 에디터에 접속 중인 사용자를 아바타 스택(최대 3개 + +N 오버플로우 + 초록 점 + N명)으로 표시한다.

**Architecture:** 백엔드는 `CollaborationService`의 in-memory rooms에서 접속자 데이터를 읽어 REST 엔드포인트로 노출한다. 프론트엔드는 TanStack Query `useQuery`로 30초마다 폴링하여 `DiagramGrid` 카드에 아바타 스택을 렌더링한다. DB 쿼리 없이 메모리 데이터만 사용하므로 서버 부담이 없다.

**Tech Stack:** NestJS, TypeScript, Vitest, axios, TanStack Query v5, Vanilla Extract

---

## File Map

| 파일 | 작업 |
|------|------|
| `packages/contracts/src/diagrams/diagram.types.ts` | `ActiveUser`, `ActiveUsersResponse` 타입 추가 |
| `packages/contracts/src/index.ts` | 새 타입 export 추가 |
| `apps/api/src/modules/collaboration/collaboration.service.ts` | `getRoomPresences` 메서드 추가 |
| `apps/api/src/modules/collaboration/collaboration.service.spec.ts` | `getRoomPresences` 테스트 추가 |
| `apps/api/src/modules/collaboration/collaboration.module.ts` | `CollaborationService` export 추가 |
| `apps/api/src/modules/diagrams/diagrams.module.ts` | `CollaborationModule` import 추가 |
| `apps/api/src/modules/diagrams/diagrams.service.ts` | `getActiveUsers` 메서드 추가 |
| `apps/api/src/modules/diagrams/diagrams.service.spec.ts` | `getActiveUsers` 테스트 추가 |
| `apps/api/src/modules/diagrams/diagrams.controller.ts` | `GET diagrams/active-users` 엔드포인트 추가 |
| `apps/web/src/shared/api/diagrams.api.ts` | `getActiveDiagramUsers` 함수 추가 |
| `apps/web/src/features/dashboard/hooks/useActiveDiagramUsers.ts` | 신규 폴링 훅 |
| `apps/web/src/features/dashboard/components/DiagramGrid.css.ts` | 아바타 스택 CSS 추가 |
| `apps/web/src/features/dashboard/components/DiagramGrid.tsx` | 훅 연결 + 아바타 스택 UI 추가 |

---

### Task 1: contracts — ActiveUser 타입 추가

**Files:**
- Modify: `packages/contracts/src/diagrams/diagram.types.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] **Step 1: `diagram.types.ts`에 타입 추가**

파일 끝에 다음을 추가한다:

```typescript
export interface ActiveUser {
  userId: string;
  email: string;
  color: string;
}

export type ActiveUsersResponse = Record<string, ActiveUser[]>;
```

- [ ] **Step 2: `index.ts`에 export 추가**

`index.ts`의 기존 `diagram.types` export 블록을 찾아 두 타입을 추가한다:

```typescript
export type {
  DiagramResponse,
  DiagramListItem,
  DiagramVersionResponse,
  ShareLinkResponse,
  PublicDiagramResponse,
  SharePreset,
  ActiveUser,           // 추가
  ActiveUsersResponse,  // 추가
} from "./diagrams/diagram.types";
```

- [ ] **Step 3: 빌드 확인**

```bash
cd /path/to/repo && pnpm --filter @erdify/contracts build
```

Expected: 에러 없이 빌드 성공

- [ ] **Step 4: 커밋**

```bash
git add packages/contracts/src/diagrams/diagram.types.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): add ActiveUser and ActiveUsersResponse types"
```

---

### Task 2: CollaborationService — getRoomPresences 추가

**Files:**
- Modify: `apps/api/src/modules/collaboration/collaboration.service.ts`
- Modify: `apps/api/src/modules/collaboration/collaboration.service.spec.ts`

- [ ] **Step 1: 테스트 작성 (실패 확인용)**

`collaboration.service.spec.ts`의 기존 `describe("CollaborationService", ...)` 블록 안에 다음 describe를 추가한다:

```typescript
describe("getRoomPresences", () => {
  it("returns empty arrays for diagramIds with no active room", () => {
    const result = service.getRoomPresences(["no-room-1", "no-room-2"]);
    expect(result).toEqual({ "no-room-1": [], "no-room-2": [] });
  });

  it("returns presence list for active rooms", async () => {
    mockRepo.findOne.mockResolvedValue(mockDiagram);
    await service.joinRoom("d1");
    service.addPresence("d1", "user-1", "socket-1", "kim@example.com");

    const result = service.getRoomPresences(["d1"]);

    expect(result["d1"]).toHaveLength(1);
    expect(result["d1"][0]).toMatchObject({
      userId: "user-1",
      email: "kim@example.com",
    });
    expect(result["d1"][0].color).toBeDefined();
  });

  it("mixes empty and populated rooms correctly", async () => {
    mockRepo.findOne.mockResolvedValue(mockDiagram);
    await service.joinRoom("d1");
    service.addPresence("d1", "user-1", "socket-1", "kim@example.com");

    const result = service.getRoomPresences(["d1", "no-room"]);

    expect(result["d1"]).toHaveLength(1);
    expect(result["no-room"]).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm --filter api vitest run collaboration.service.spec.ts
```

Expected: `getRoomPresences is not a function` 에러로 FAIL

- [ ] **Step 3: `collaboration.service.ts`에 메서드 구현**

파일 내 `CollaborationService` 클래스에서 `getPresence` 메서드 근처에 다음을 추가한다:

```typescript
getRoomPresences(diagramIds: string[]): Record<string, Array<{ userId: string; email: string; color: string }>> {
  const result: Record<string, Array<{ userId: string; email: string; color: string }>> = {};
  for (const id of diagramIds) {
    const room = this.rooms.get(id);
    result[id] = room
      ? Array.from(room.presence.values()).map((p) => ({
          userId: p.userId,
          email: p.email,
          color: p.color,
        }))
      : [];
  }
  return result;
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
pnpm --filter api vitest run collaboration.service.spec.ts
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/modules/collaboration/collaboration.service.ts \
        apps/api/src/modules/collaboration/collaboration.service.spec.ts
git commit -m "feat(collaboration): expose getRoomPresences method"
```

---

### Task 3: 모듈 의존성 연결

**Files:**
- Modify: `apps/api/src/modules/collaboration/collaboration.module.ts`
- Modify: `apps/api/src/modules/diagrams/diagrams.module.ts`

- [ ] **Step 1: `collaboration.module.ts`에 `CollaborationService` export 추가**

현재 `exports: [CollaborationGateway]`를 찾아 `CollaborationService`를 추가한다:

```typescript
exports: [CollaborationGateway, CollaborationService],
```

- [ ] **Step 2: `diagrams.module.ts`에 `CollaborationModule` import 추가**

파일 상단 import에 추가:
```typescript
import { CollaborationModule } from "../collaboration/collaboration.module";
```

`@Module` imports 배열에 추가:
```typescript
imports: [
  TypeOrmModule.forFeature([Diagram, DiagramVersion, McpSession, Organization, Project, User]),
  AuthModule,
  CommonModule,
  CollaborationModule,  // 추가
],
```

- [ ] **Step 3: 순환 의존성 없는지 확인**

`CollaborationModule`은 이미 `DiagramsModule`을 import하고 있다. 상호 import가 되면 순환 참조가 발생한다.

`collaboration.module.ts`를 열어서 `DiagramsModule` import 여부를 확인한다:
```bash
grep "DiagramsModule" apps/api/src/modules/collaboration/collaboration.module.ts
```

만약 `DiagramsModule`을 import하고 있다면, `CollaborationService`를 직접 import하는 대신 `forwardRef`를 사용한다:

```typescript
// diagrams.module.ts
import { forwardRef } from "@nestjs/common";
import { CollaborationModule } from "../collaboration/collaboration.module";

// imports 배열:
forwardRef(() => CollaborationModule),
```

```typescript
// collaboration.module.ts
import { forwardRef } from "@nestjs/common";
import { DiagramsModule } from "../diagrams/diagrams.module";

// imports 배열:
forwardRef(() => DiagramsModule),
```

그리고 `diagrams.service.ts`에서 `CollaborationService`를 주입할 때:
```typescript
@Inject(forwardRef(() => CollaborationService))
private readonly collaborationService: CollaborationService,
```

- [ ] **Step 4: 앱 기동 확인**

```bash
pnpm --filter api dev
```

Expected: 순환 의존성 에러 없이 서버 기동

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/modules/collaboration/collaboration.module.ts \
        apps/api/src/modules/diagrams/diagrams.module.ts
git commit -m "feat(diagrams): import CollaborationModule for active users feature"
```

---

### Task 4: DiagramsService — getActiveUsers 추가

**Files:**
- Modify: `apps/api/src/modules/diagrams/diagrams.service.ts`
- Modify: `apps/api/src/modules/diagrams/diagrams.service.spec.ts`

- [ ] **Step 1: 테스트 작성 (실패 확인용)**

`diagrams.service.spec.ts`에서 mock setup 부분을 찾아 `CollaborationService` mock을 추가하고, `getActiveUsers` describe를 추가한다.

파일 상단 imports에 추가:
```typescript
import { CollaborationService } from "../collaboration/collaboration.service";
```

mock 선언부에 추가 (기존 mock 선언들 옆에):
```typescript
const mockCollaborationService = {
  getRoomPresences: vi.fn(),
};
```

`Test.createTestingModule` providers에 추가:
```typescript
{ provide: CollaborationService, useValue: mockCollaborationService },
```

테스트 케이스 추가 (기존 describe 블록 안에):
```typescript
describe("getActiveUsers", () => {
  const diagramIds = ["diag-1", "diag-2"];

  beforeEach(() => {
    mockCollaborationService.getRoomPresences.mockReturnValue({
      "diag-1": [{ userId: "user-1", email: "kim@example.com", color: "#ef4444" }],
      "diag-2": [],
    });
  });

  it("returns presence data for accessible diagrams", async () => {
    // canAccessDiagram returns true for accessible diagrams
    // (mock it to return true for diag-1, true for diag-2)
    // This test verifies the service passes through presence data correctly
    const mockDiag1 = makeDiagram({ id: "diag-1" });
    const mockProject = makeProject();
    const mockMember = makeMember("editor");
    mockDiagramRepo.findOne.mockResolvedValue({ ...mockDiag1, project: { ...mockProject, organization: { members: [{ ...mockMember, userId: "user-1" }] } } });

    const result = await service.getActiveUsers(diagramIds, "user-1");

    expect(mockCollaborationService.getRoomPresences).toHaveBeenCalledWith(diagramIds);
    expect(result["diag-1"]).toHaveLength(1);
    expect(result["diag-1"][0]).toMatchObject({ userId: "user-1", email: "kim@example.com", color: "#ef4444" });
    expect(result["diag-2"]).toEqual([]);
  });

  it("filters out diagramIds the user cannot access", async () => {
    // canAccessDiagram returns false for diag-2
    mockDiagramRepo.findOne.mockImplementation(({ where: { id } }: { where: { id: string } }) => {
      if (id === "diag-1") {
        const mockDiag = makeDiagram({ id: "diag-1" });
        return Promise.resolve({ ...mockDiag, project: { ...makeProject(), organization: { members: [{ ...makeMember("editor"), userId: "user-1" }] } } });
      }
      return Promise.resolve(null); // diag-2 not found = no access
    });

    const result = await service.getActiveUsers(diagramIds, "user-1");

    expect(result["diag-1"]).toBeDefined();
    expect(result["diag-2"]).toBeUndefined();
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pnpm --filter api vitest run diagrams.service.spec.ts
```

Expected: `getActiveUsers is not a function`으로 FAIL

- [ ] **Step 3: `diagrams.service.ts`에 `CollaborationService` 주입 및 메서드 구현**

파일 상단 imports에 추가 (Task 3에서 forwardRef가 필요했다면 그것도 포함):
```typescript
import type { CollaborationService } from "../collaboration/collaboration.service";
import type { ActiveUsersResponse } from "@erdify/contracts";
```

생성자에 추가:
```typescript
constructor(
  // 기존 파라미터들...
  private readonly collaborationService: CollaborationService,
) {}
```

클래스 내에 메서드 추가:
```typescript
async getActiveUsers(diagramIds: string[], userId: string): Promise<ActiveUsersResponse> {
  const accessChecks = await Promise.all(
    diagramIds.map(async (id) => ({
      id,
      allowed: await this.canAccessDiagram(id, userId),
    }))
  );
  const allowedIds = accessChecks.filter((c) => c.allowed).map((c) => c.id);
  return this.collaborationService.getRoomPresences(allowedIds);
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
pnpm --filter api vitest run diagrams.service.spec.ts
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/modules/diagrams/diagrams.service.ts \
        apps/api/src/modules/diagrams/diagrams.service.spec.ts
git commit -m "feat(diagrams): add getActiveUsers with permission filtering"
```

---

### Task 5: DiagramsController — GET /diagrams/active-users 엔드포인트 추가

**Files:**
- Modify: `apps/api/src/modules/diagrams/diagrams.controller.ts`

- [ ] **Step 1: `Query` 데코레이터 import 추가**

파일 상단 `@nestjs/common` import에 `Query`를 추가한다:

```typescript
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
```

- [ ] **Step 2: 엔드포인트 추가**

컨트롤러 클래스 안의 기존 `@Get("diagrams/:id")` 엔드포인트보다 **위에** 추가한다 (`:id` 와일드카드가 `active-users`를 가로채지 않도록):

```typescript
@Get("diagrams/active-users")
getActiveUsers(
  @CurrentUser() user: JwtPayload,
  @Query("diagramIds") diagramIds: string,
): Promise<ActiveUsersResponse> {
  const ids = diagramIds ? diagramIds.split(",").filter(Boolean).slice(0, 50) : [];
  if (ids.length === 0) return Promise.resolve({});
  return this.diagramsService.getActiveUsers(ids, user.sub);
}
```

파일 상단에 import 추가:
```typescript
import type { ActiveUsersResponse } from "@erdify/contracts";
```

- [ ] **Step 3: 서버 재기동 후 엔드포인트 동작 확인**

```bash
pnpm --filter api dev
# 별도 터미널에서:
curl -b "access_token=<your_jwt>" \
  "http://localhost:3000/diagrams/active-users?diagramIds=some-id"
```

Expected: `{}` 또는 접속자 있으면 `{"some-id": [...]}`

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/modules/diagrams/diagrams.controller.ts
git commit -m "feat(diagrams): add GET /diagrams/active-users endpoint"
```

---

### Task 6: 프론트엔드 API 함수 추가

**Files:**
- Modify: `apps/web/src/shared/api/diagrams.api.ts`

- [ ] **Step 1: 타입 import 추가**

파일 상단 기존 `@erdify/contracts` import에 타입을 추가한다:

```typescript
import type {
  // 기존 타입들...
  ActiveUsersResponse,
} from "@erdify/contracts";
```

- [ ] **Step 2: API 함수 추가**

파일 끝에 추가:

```typescript
export const getActiveDiagramUsers = (diagramIds: string[]): Promise<ActiveUsersResponse> => {
  if (diagramIds.length === 0) return Promise.resolve({});
  return httpClient
    .get<ActiveUsersResponse>(`/diagrams/active-users?diagramIds=${diagramIds.join(",")}`)
    .then((r) => r.data);
};
```

- [ ] **Step 3: TypeScript 타입 체크**

```bash
pnpm --filter web tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/shared/api/diagrams.api.ts
git commit -m "feat(dashboard): add getActiveDiagramUsers API function"
```

---

### Task 7: useActiveDiagramUsers 훅 작성

**Files:**
- Create: `apps/web/src/features/dashboard/hooks/useActiveDiagramUsers.ts`

- [ ] **Step 1: 훅 파일 생성**

```typescript
import { useQuery } from "@tanstack/react-query";
import { getActiveDiagramUsers } from "@/shared/api/diagrams.api";
import type { ActiveUser } from "@erdify/contracts";

export const useActiveDiagramUsers = (
  diagramIds: string[]
): Record<string, ActiveUser[]> => {
  const { data } = useQuery({
    queryKey: ["active-diagram-users", diagramIds],
    queryFn: () => getActiveDiagramUsers(diagramIds),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    enabled: diagramIds.length > 0,
    throwOnError: false,
  });

  return data ?? {};
};
```

- [ ] **Step 2: TypeScript 타입 체크**

```bash
pnpm --filter web tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/features/dashboard/hooks/useActiveDiagramUsers.ts
git commit -m "feat(dashboard): add useActiveDiagramUsers polling hook"
```

---

### Task 8: DiagramGrid CSS 추가

**Files:**
- Modify: `apps/web/src/features/dashboard/components/DiagramGrid.css.ts`

- [ ] **Step 1: 아바타 스택 스타일 추가**

`DiagramGrid.css.ts` 파일 끝에 추가한다:

```typescript
export const activeUsersRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: vars.space["2"],
});

export const avatarStack = style({
  display: "flex",
  alignItems: "center",
});

export const avatar = style({
  width: "22px",
  height: "22px",
  borderRadius: "50%",
  border: `2px solid ${vars.color.surface}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: vars.color.surface,
  fontSize: "9px",
  fontWeight: "700",
  flexShrink: 0,
  selectors: {
    "& + &": { marginLeft: "-7px" },
  },
});

export const avatarOverflow = style({
  width: "22px",
  height: "22px",
  borderRadius: "50%",
  border: `2px solid ${vars.color.border}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: vars.color.surfaceSecondary,
  color: vars.color.textSecondary,
  fontSize: "8px",
  fontWeight: "700",
  flexShrink: 0,
  marginLeft: "-7px",
});

export const activeUsersBadge = style({
  display: "flex",
  alignItems: "center",
  gap: "3px",
});

export const activeDot = style({
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: vars.color.success,
  flexShrink: 0,
});

export const activeUsersCount = style({
  fontSize: "10px",
  color: vars.color.success,
  fontWeight: "600",
});
```

- [ ] **Step 2: TypeScript 타입 체크**

```bash
pnpm --filter web tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/features/dashboard/components/DiagramGrid.css.ts
git commit -m "feat(dashboard): add avatar stack styles for active users"
```

---

### Task 9: DiagramGrid UI 업데이트

**Files:**
- Modify: `apps/web/src/features/dashboard/components/DiagramGrid.tsx`

- [ ] **Step 1: import 추가**

파일 상단의 CSS import 줄을 찾아 새 스타일들을 추가한다:

```typescript
import {
  mainArea, mainHeader, mainTitle, filterRow, filterChip, filterChipVariants,
  grid, diagramCardWrapper, diagramCard, cardPreview,
  miniTable, miniTableHeader, miniField, cardBody, cardName, cardMeta,
  dialectBadge, newCard, newCardIcon,
  ctxBtn, ctxMenu, ctxItem, ctxItemDanger, ctxDivider,
  filterRowDisabled, sectionError, sectionErrorIcon, sectionErrorTitle, sectionErrorDesc, sectionErrorBtn, sectionErrorGuide,
  activeUsersRow, avatarStack, avatar, avatarOverflow, activeUsersBadge, activeDot, activeUsersCount, // 추가
} from "./DiagramGrid.css";
import { useActiveDiagramUsers } from "../hooks/useActiveDiagramUsers"; // 추가
import type { ActiveUser } from "@erdify/contracts"; // 추가
```

- [ ] **Step 2: 훅 호출 추가**

`DiagramGrid` 컴포넌트 내부에서 `diagrams` 데이터가 준비된 이후 (`const { data: diagrams = [] } = useQuery(...)` 아래)에 훅을 호출한다:

```typescript
const diagramIds = diagrams.map((d) => d.id);
const activeUsers = useActiveDiagramUsers(diagramIds);
```

- [ ] **Step 3: 아바타 스택 헬퍼 컴포넌트 추가**

파일 상단의 `DiagramCardPreview` 컴포넌트 근처에 추가한다:

```typescript
const ActiveUsersIndicator = ({ users }: { users: ActiveUser[] }) => {
  if (users.length === 0) return null;
  const displayed = users.slice(0, 3);
  const overflow = users.length - displayed.length;
  return (
    <div className={activeUsersRow}>
      <div className={avatarStack}>
        {displayed.map((u) => (
          <div key={u.userId} className={avatar} style={{ background: u.color }}>
            {u.email[0].toUpperCase()}
          </div>
        ))}
        {overflow > 0 && <div className={avatarOverflow}>+{overflow}</div>}
      </div>
      <div className={activeUsersBadge}>
        <div className={activeDot} />
        <span className={activeUsersCount}>{users.length}명</span>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: 카드 JSX에 컴포넌트 삽입**

카드 body 부분을 찾아 `cardMeta` div 뒤에 `ActiveUsersIndicator`를 추가한다:

```tsx
<div className={cardBody}>
  <div className={cardName}>{diagram.name}</div>
  <div className={cardMeta}>
    <span className={dialectBadge}>{diagram.dialect}</span>
    {formatDistanceToNow(new Date(diagram.updatedAt), { addSuffix: true, locale: ko })}
  </div>
  <ActiveUsersIndicator users={activeUsers[diagram.id] ?? []} />  {/* 추가 */}
</div>
```

- [ ] **Step 5: TypeScript 타입 체크**

```bash
pnpm --filter web tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 6: 브라우저에서 동작 확인**

1. 개발 서버 기동: `pnpm dev`
2. 대시보드 접속
3. 다른 탭에서 동일 ERD 에디터 열기
4. 대시보드로 돌아오면 해당 카드에 아바타가 표시되는지 확인
5. 30초 후 에디터 탭 닫고 31초 뒤 대시보드에서 아바타 사라지는지 확인

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src/features/dashboard/components/DiagramGrid.tsx
git commit -m "feat(dashboard): show active users on diagram cards"
```
