# ERDify Backend Refactoring Design

**Date:** 2026-05-09  
**Scope:** `apps/api/src` 전체  
**Strategy:** 카테고리별 순서 (A → B → C → D)

---

## 개요

ERDify 백엔드는 기능적으로 완성도 있지만 아키텍처, 성능, 에러 처리, 타입/설정 4개 영역에서 리팩토링이 필요하다. 컨트롤러 외부 인터페이스는 변경하지 않으며, 내부 구조를 개선한다.

---

## A. 아키텍처 개선

### A-1. `AuthorizationService` 추출

**문제:** `diagrams.service.ts`와 `project.service.ts`에 동일한 `requireMember` / `requireEditorOrOwner` 메서드가 중복 구현되어 있다.

**변경:**
- `src/common/services/authorization.service.ts` 신규 생성
- `memberRepo`를 주입받아 두 메서드 제공
- `DiagramsService`, `ProjectService`에서 `AuthorizationService` 주입받아 사용
- `AppModule` 또는 `CommonModule`에 등록

```
src/common/
  services/
    authorization.service.ts   ← 신규
  enums/
    role.enum.ts               ← 기존 유지
```

**`AuthorizationService` 인터페이스:**
```typescript
requireMember(orgId: string, userId: string): Promise<Member>
requireEditorOrOwner(orgId: string, userId: string): Promise<Member>
```

### A-2. `DiagramsService` 분할

**문제:** `diagrams.service.ts` 383줄, 단일 책임 원칙 위반. CRUD, 스키마 조작, 버전 관리, 공유 링크, 접근 제어가 혼재.

**변경:**
```
modules/diagrams/
  services/
    diagrams-crud.service.ts      ← create / findAll / findOne / update / remove
    diagrams-schema.service.ts    ← addTable / updateTable / removeTable
                                     addColumn / updateColumn / removeColumn
                                     addRelationship / updateRelationship / removeRelationship
    diagrams-version.service.ts   ← saveVersion / findVersions / restoreVersion
    diagrams-share.service.ts     ← generateShareLink / revokeShareLink / getPublicDiagram
  diagrams.service.ts             ← 파사드: 위 4개 서비스 통합, 컨트롤러 인터페이스 유지
```

컨트롤러는 여전히 `DiagramsService`만 바라보므로 외부 인터페이스 변경 없음. 공통 헬퍼 (`getDiagramWithOrg`, `toDiagramDocument`, `withDiagramDoc`)는 파사드 또는 별도 헬퍼 파일에 위치.

### A-3. `new Function()` 동적 import 제거

**문제:** `diagrams.service.ts` 19-33줄의 `new Function("specifier", "return import(specifier)")` 패턴이 번들러 정적 분석을 막고 테스트에서 해킹을 강제함.

**변경:**
```typescript
// 변경 후
async function loadDomainModule(): Promise<DomainModule> {
  return import("@erdify/domain");
}
```

`_setDomainModuleForTest()` 함수 제거. 테스트는 Vitest의 `vi.mock("@erdify/domain")`으로 대체.

---

## B. 성능 개선

### B-1. N+1 쿼리 제거 — `organization.service.ts`

**문제:** `findOne(orgId, userId)` 메서드에서 권한 검증 쿼리 + 조직 조회 쿼리 = 2회 DB 호출.

**변경:** JOIN으로 1회에 해결.
```typescript
const org = await this.orgRepo.findOne({
  where: { id: orgId },
  relations: { members: true },
});
if (!org) throw new NotFoundException("Organization not found");
if (!org.members.some(m => m.userId === userId)) throw new ForbiddenException();
return org;
```

### B-2. 루프 내 쿼리 제거 — `auth.service.ts` auto-accept invites

**문제:** 회원가입 시 pending 초대 auto-accept 로직에서 초대 건수만큼 개별 `findOne` + `save` 반복.

**변경:** 배치 쿼리로 교체.
```typescript
const orgIds = pendingInvites.map(i => i.organizationId);
const existingMembers = await this.memberRepo.find({
  where: { organizationId: In(orgIds), userId: newUser.id },
});
const existingOrgIds = new Set(existingMembers.map(m => m.organizationId));

const newMembers = pendingInvites
  .filter(i => !existingOrgIds.has(i.organizationId))
  .map(i => this.memberRepo.create({
    organizationId: i.organizationId,
    userId: newUser.id,
    role: i.role,
  }));

await this.memberRepo.save(newMembers);
await this.inviteRepo.save(
  pendingInvites.map(i => ({ ...i, acceptedAt: new Date() }))
);
```

### B-3. relation select 명시 — `organization.service.ts`

**문제:** 멤버 목록 조회 시 User 전체 엔티티 로드 후 일부 필드만 사용.

**변경:**
```typescript
// 현재
relations: ["user"]

// 변경 후
relations: { user: true },
select: { user: { id: true, email: true, name: true } }
```

---

## C. 에러 처리 개선

### C-1. 잘못된 HTTP 예외 코드 수정

**문제:** `diagrams.service.ts`에서 콘텐츠 형식 오류에 `NotFoundException` 사용.

**변경:**
```typescript
// 변경 후
throw new BadRequestException("Diagram content is malformed");
```

### C-2. WebSocket 에러 로깅 보강 — `collaboration.gateway.ts`

**문제:** `catch` 블록에서 에러 내용을 로그하지 않아 디버깅 불가.

**변경:** 모든 catch 블록에 `this.logger.error(message, err.stack)` 추가.
```typescript
} catch (err) {
  this.logger.error("Failed to join diagram", (err as Error).stack);
  client.emit("error", { message: "Failed to join diagram" });
  client.disconnect();
}
```

### C-3. 이메일 발송 실패 처리 — `email.service.ts`

**문제:** 발송 실패를 `warn` 로그만으로 처리. 호출 측이 실패 여부를 알 수 없음.

**변경:**
- 로그 레벨 `warn` → `error`
- 반환 타입 `void` → `Promise<boolean>`
- 호출 측(`organization.service.ts`)에서 반환값 활용 (필요 시 로그)

재시도 로직은 이메일 인프라(SES 등) 레벨에서 담당하므로 서비스 레벨에서 추가하지 않음.

### C-4. 응답 형식 정리

**문제:** `{ ok: true }` 반환과 엔티티 직접 반환이 혼재.

**변경:** 글로벌 인터셉터 없이 컨트롤러별 정리.
- 삭제/로그아웃 등 결과 없는 엔드포인트: `@HttpCode(HttpStatus.NO_CONTENT)` + `void` 반환
- `{ ok: true }` 패턴 제거

---

## D. 타입/설정 개선

### D-1. 하드코딩된 값 → ConfigService

**신규 파일:** `src/common/config/app.config.ts`
```typescript
export default registerAs("app", () => ({
  persistIntervalMs: parseInt(process.env.PERSIST_INTERVAL_MS ?? "30000"),
  inviteExpiryDays: parseInt(process.env.INVITE_EXPIRY_DAYS ?? "7"),
}));
```

**대상:**
- `collaboration.service.ts`: `30_000` → `appConfig.persistIntervalMs`
- `organization.service.ts`: `7 * 24 * 60 * 60 * 1000` → `appConfig.inviteExpiryDays` 기반 계산

**쿠키 옵션 상수화 — `auth.controller.ts`:**
```typescript
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
} as const;
```

`DiagramsService`의 `presetToMs`는 도메인 상수이므로 유지.

### D-2. 느슨한 타입 정리 — `diagrams.service.ts`

**문제:** `content as unknown as DiagramDocument` 캐스팅이 여러 곳에 흩어져 있음.

**변경:** 캐스팅 + 검증을 단일 헬퍼로 통합.
```typescript
function toDiagramDocument(content: object): DiagramDocument {
  const doc = content as unknown as DiagramDocument;
  if (!doc || !Array.isArray(doc.entities)) {
    throw new BadRequestException("Diagram content is malformed");
  }
  return doc;
}
```

DTO의 `content?: object`는 `@erdify/domain`의 `DiagramDocument` 타입이 공유 패키지에 노출되지 않으므로 현행 유지.

### D-3. DTO 기본값 정리 — `AddColumnDto`

**문제:** `nullable`, `primaryKey`, `unique`, `defaultValue`의 기본값이 서비스에서 `??` 처리됨.

**변경:** DTO 레벨로 기본값 이동.
```typescript
@IsOptional()
@IsBoolean()
nullable?: boolean = true;

@IsOptional()
@IsBoolean()
primaryKey?: boolean = false;

@IsOptional()
@IsBoolean()
unique?: boolean = false;
```

서비스에서 `?? 기본값` 코드 제거.

---

## 파일별 변경 요약

| 파일 | 변경 유형 |
|------|-----------|
| `src/common/services/authorization.service.ts` | 신규 |
| `src/common/config/app.config.ts` | 신규 |
| `modules/diagrams/services/diagrams-crud.service.ts` | 신규 |
| `modules/diagrams/services/diagrams-schema.service.ts` | 신규 |
| `modules/diagrams/services/diagrams-version.service.ts` | 신규 |
| `modules/diagrams/services/diagrams-share.service.ts` | 신규 |
| `modules/diagrams/diagrams.service.ts` | 파사드로 변경, `new Function()` 제거 |
| `modules/diagrams/diagrams.module.ts` | 신규 서비스 등록 |
| `modules/diagrams/dto/add-column.dto.ts` | 기본값 추가 |
| `modules/organization/organization.service.ts` | N+1 쿼리 제거, select 명시 |
| `modules/project/project.service.ts` | `AuthorizationService` 주입 |
| `modules/auth/auth.service.ts` | 배치 쿼리 |
| `modules/auth/auth.controller.ts` | `COOKIE_OPTIONS` 상수화 |
| `modules/collaboration/collaboration.service.ts` | `appConfig.persistIntervalMs` |
| `modules/collaboration/collaboration.gateway.ts` | 에러 로깅 보강 |
| `modules/email/email.service.ts` | 반환 타입 `boolean`, 로그 레벨 |
| `app.module.ts` | `AppConfig`, `AuthorizationService` 등록 |

---

## 범위 외

- 컨트롤러 외부 인터페이스 변경 (URL, 파라미터)
- 글로벌 Response Interceptor 추가
- DTO의 `content?: object` → `DiagramContentDto` 변환 (공유 타입 미노출)
- 서비스 레벨 이메일 재시도 로직
- 테스트 추가 (기존 spec 파일 수정만)
