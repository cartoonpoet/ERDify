# API 키 관리 화면 Design

## Overview

사용자가 REST API 및 MCP 서버용 API 키를 직접 관리할 수 있는 전용 페이지를 추가한다. 현재는 생성만 가능하며 목록 조회·폐기·재발급이 없다.

## Decisions

| 항목 | 결정 |
|---|---|
| 화면 위치 | `/settings/api-keys` 독립 페이지 |
| 진입 경로 | 대시보드 아바타 드롭다운 → 페이지 이동 (navigate) |
| 재복사 | 재생성 버튼 (새 키 발급 + 기존 키 자동 폐기) |
| 만료 기간 | 30일 / 90일 / 1년 / 무기한 프리셋 + 직접 날짜 입력 |

## DB Changes

`ApiKey` 엔티티에 두 컬럼을 추가한다.

```
name       varchar(100)  nullable  — 키 이름. null이면 서버에서 "API Key #N" (N = 해당 유저의 총 키 수) 자동 부여
expiresAt  timestamp     nullable  — null이면 무기한
```

마이그레이션 파일 신규 작성 필요.

## API Changes

### 기존 엔드포인트 (변경 없음)
- `GET /api-keys` — 내 키 목록 (listApiKeys 서비스 메서드 이미 존재)
- `DELETE /api-keys/:id` — 폐기 (revokeApiKey 서비스 메서드 이미 존재)

### 신규 엔드포인트
- `POST /api-keys/:id/regenerate` — 기존 키 폐기 + 새 키 발급, 새 키 plaintext 반환

### 기존 생성 엔드포인트 수정
- `POST /api-keys` — `name`, `expiresAt` 필드 추가 수신

### 응답 스키마
```ts
// 목록 조회
interface ApiKeyItem {
  id: string;
  name: string | null;
  prefix: string;        // 앞 16자
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

// 생성 / 재생성 (plaintext는 이 응답에서만 노출)
interface ApiKeyCreated {
  id: string;
  key: string;           // 전체 키값, 한 번만 반환
  name: string | null;
  prefix: string;
  expiresAt: string | null;
  createdAt: string;
}
```

## Frontend

### 라우팅
`Router.tsx`에 `/settings/api-keys` 라우트 추가 (ProtectedRoute 내부).

### 페이지 구조 (`ApiKeysPage`)

```
[← 대시보드]  API 키 관리          [+ 새 키 생성]
────────────────────────────────────────────────
[ 인라인 생성 폼 (토글) ]
  이름 (선택)  [________]
  만료 기간    [30일][90일][1년][무기한][직접입력]
               직접 입력 선택 시 → 날짜 피커 노출
  [취소]  [생성]

────────────────────────────────────────────────
이름        접두사          만료일     상태    생성일     액션
Production  sk-prod1a2b    2026-12-31  🟢활성  2026-01-15  재생성 폐기
Dev key     sk-dev3c4d     2026-06-01  🟡D-26  2026-03-01  재생성 폐기
Claude MCP  sk-mcp5e6f     무기한      🟢활성  2026-04-20  재생성 폐기
```

### 상태 배지 규칙
- 활성 (만료까지 > 7일 또는 무기한): 초록 "활성"
- 만료 임박 (7일 이하): 주황 "D-N"
- 만료됨: 회색 "만료됨"
- 폐기됨: 취소선 + 회색 (목록에서 제외, revokedAt이 있는 항목은 표시 안 함)

### 키 생성 플로우
1. "+ 새 키 생성" 클릭 → 인라인 폼 슬라이드 다운
2. 이름(선택) + 만료 기간 선택 후 "생성"
3. 생성 성공 시 전체 키값 표시 (copy 버튼) + 경고 메시지 "이 키는 지금만 확인할 수 있습니다"
4. "확인" 클릭 → 폼 닫힘, 목록 refetch

### 재생성 플로우
1. "재생성" 클릭 → 인라인 confirm 텍스트 노출 ("기존 키는 즉시 무효화됩니다. 계속할까요?")
2. "확인" 클릭 → `POST /api-keys/:id/regenerate` 호출
3. 새 키값 한 번 표시 (copy 버튼)
4. "확인" 클릭 → 목록 refetch

### 폐기 플로우
1. "폐기" 클릭 → 인라인 confirm
2. "확인" → `DELETE /api-keys/:id` 호출
3. 목록에서 해당 항목 제거 (optimistic update)

### 진입 경로
`DashboardPage` 아바타 드롭다운의 "MCP API 키" 버튼을:
- 모달 open → `navigate('/settings/api-keys')` 로 변경
- `ApiKeyModal` 컴포넌트는 제거

## File Map

| 파일 | 작업 |
|---|---|
| `packages/db/src/entities/api-key.entity.ts` | `name`, `expiresAt` 컬럼 추가 |
| `packages/db/src/migrations/...CreateApiKeyColumns.ts` | 마이그레이션 신규 |
| `apps/api/src/modules/auth/api-keys.service.ts` | `createApiKey` name/expiresAt 수신, `regenerateApiKey` 메서드 추가 |
| `apps/api/src/modules/auth/api-keys.controller.ts` | `POST /:id/regenerate` 엔드포인트 추가 |
| `apps/api/src/modules/auth/dto/create-api-key.dto.ts` | `name`, `expiresAt` 필드 추가 |
| `apps/web/src/shared/api/api-keys.api.ts` | `listApiKeys`, `createApiKey`, `revokeApiKey`, `regenerateApiKey` |
| `apps/web/src/features/settings/pages/ApiKeysPage.tsx` | 신규 페이지 |
| `apps/web/src/features/settings/pages/api-keys-page.css.ts` | vanilla-extract 스타일 |
| `apps/web/src/app/Router.tsx` | `/settings/api-keys` 라우트 추가 |
| `apps/web/src/features/dashboard/pages/DashboardPage.tsx` | 드롭다운 항목 navigate로 변경, ApiKeyModal 제거 |
| `apps/web/src/features/dashboard/components/ApiKeyModal.tsx` | 삭제 |
