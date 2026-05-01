# 공유 링크 기능 설계

**날짜:** 2026-05-02  
**범위:** 로그인 없이 ERD를 뷰어로 볼 수 있는 시간 제한 공유 링크

---

## 1. 요구사항 요약

- 다이어그램 소유자(editor/owner)가 공유 링크를 생성
- 만료 시간 프리셋 선택: 1시간 / 1일 / 7일 / 30일
- 링크 접근 시 로그인 불필요 (public 엔드포인트)
- 뷰어는 기존 EditorCanvas 그대로 렌더링, 편집 UI만 숨김 (팬/줌/클릭 가능)
- 링크는 만료 전 언제든지 비활성화 가능
- 공유 버튼: 에디터 상단 바 + 대시보드 카드 컨텍스트 메뉴(⋮)
- 아이콘 라이브러리: Lucide React

---

## 2. 데이터 모델

### Diagram 엔티티 컬럼 추가 (백엔드)

```
shareToken     : string | null   -- UUID v4, 공유 링크 식별자
shareExpiresAt : Date   | null   -- 만료 시각, null이면 비활성 상태
```

규칙:
- `shareToken`이 null이면 공유 비활성 상태
- 조회 시 `shareExpiresAt < now()`이면 403 응답
- 새 링크 생성 시 기존 토큰을 덮어씀 (다이어그램당 링크 1개)

---

## 3. API

### 3-1. 링크 생성/갱신 (인증 필요)
```
POST /diagrams/:id/share
Body: { preset: "1h" | "1d" | "7d" | "30d" }
Response: { shareToken: string, shareUrl: string, expiresAt: string }
```
- 권한 확인: 요청자가 해당 diagram의 owner 또는 editor여야 함
- 기존 토큰 있으면 덮어씀

### 3-2. 링크 비활성화 (인증 필요)
```
DELETE /diagrams/:id/share
Response: 204 No Content
```
- `shareToken`, `shareExpiresAt` 모두 null로 초기화

### 3-3. 공개 다이어그램 조회 (인증 불필요)
```
GET /diagrams/public/:shareToken
Response: { id, name, content, dialect }
```
- `shareToken` 미존재 → 404
- `shareExpiresAt < now()` → 403 `{ message: "SHARE_LINK_EXPIRED" }`
- 반환 데이터: 뷰어에 필요한 최소 필드만 (소유자 정보, organizationId 등 제외)

---

## 4. 프론트엔드

### 4-1. 라우팅

```
Router.tsx 변경:
  Public (ProtectedRoute 밖):
    /share/:shareToken  →  SharedDiagramPage
```

### 4-2. SharedDiagramPage

- `GET /diagrams/public/:shareToken` 조회, 로딩 중 스켈레톤 표시
- 에러 상태:
  - 404 → "존재하지 않는 공유 링크입니다."
  - 403 → "링크가 만료되었습니다."
- 정상: 상단 바 + EditorCanvas 렌더링
  - 상단 바: 다이어그램 이름 + "읽기 전용" 배지만 표시, 편집 버튼 없음
  - `useEditorStore`에 `setDocument(content)`, `setCanEdit(false)` 호출
  - 실시간 협업(WebSocket) 연결 없음

### 4-3. ShareDiagramModal

트리거: 에디터 공유 버튼 클릭 / 대시보드 컨텍스트 메뉴 공유하기 클릭

상태 흐름:
```
[초기: 공유 비활성]
  → 프리셋 선택 버튼 4개 (1시간 / 1일 / 7일 / 30일)
  → 선택 시 POST /share 호출
  → [링크 활성 상태]
      URL 인풋 + 복사 버튼 (Lucide: Copy 아이콘)
      만료 시각 표시: "YYYY-MM-DD HH:mm까지 유효"
      "링크 비활성화" 버튼 → DELETE /share → 초기 상태로
```

이미 공유 중인 경우(shareToken 존재):
- 모달 열면 바로 [링크 활성 상태]로 진입
- 프리셋 재선택으로 만료 시간 갱신 가능

### 4-4. 에디터 상단 바

```tsx
// EditorPage.tsx 상단 바에 추가
<button onClick={() => setShowShare(true)} className={css.topbarBtn({ variant: "secondary" })}>
  <Share2 size={14} /> 공유
</button>
```

Lucide 아이콘: `Share2` (원 3개 연결 모양)

### 4-5. 대시보드 카드 컨텍스트 메뉴

현재 구조 변경:
- 기존: 호버 시 우상단 삭제 버튼(✕)만 표시
- 변경: 우상단 ⋮ 버튼 → 클릭 시 컨텍스트 메뉴

```
┌─────────────────┐
│ 🔗 공유하기      │  ← Share2 아이콘, primary 색상
├─────────────────┤
│ 🗑 삭제          │  ← Trash2 아이콘, danger 색상
└─────────────────┘
```

컨텍스트 메뉴 동작:
- 외부 클릭 시 닫힘
- "공유하기" 클릭 → ShareDiagramModal 오픈 (해당 diagramId로)
- 메뉴에서 공유 모달을 여는 경우 diagramId를 prop으로 전달

---

## 5. 파일 구조 (신규/변경)

```
백엔드:
  apps/api/src/modules/diagrams/
    diagrams.entity.ts          -- shareToken, shareExpiresAt 컬럼 추가
    diagrams.controller.ts      -- POST/DELETE /:id/share, GET /public/:token 추가
    diagrams.service.ts         -- generateShareLink, revokeShareLink, getPublicDiagram 추가
    dto/share-diagram.dto.ts    -- SharePresetDto (신규)

  마이그레이션:
    apps/api/src/migrations/    -- share_token 컬럼 추가 마이그레이션

프론트엔드:
  apps/web/src/shared/api/
    diagrams.api.ts             -- shareDiagram, revokeDiagram, getPublicDiagram 함수 추가

  apps/web/src/features/
    shared-diagram/             -- 신규 feature 폴더
      pages/SharedDiagramPage.tsx
      pages/shared-diagram-page.css.ts

  apps/web/src/features/editor/
    components/ShareDiagramModal.tsx   -- 신규
    components/share-diagram-modal.css.ts

  apps/web/src/features/dashboard/
    components/DiagramGrid.tsx         -- ⋮ 버튼 + 컨텍스트 메뉴로 변경
    components/DiagramGrid.css.ts      -- 관련 스타일 추가

  apps/web/src/app/
    Router.tsx                  -- /share/:shareToken 라우트 추가 (public)
```

---

## 6. 에러 처리

| 상황 | 응답 | 프론트 처리 |
|---|---|---|
| 토큰 없음 | 404 | "존재하지 않는 링크" 화면 |
| 토큰 만료 | 403 SHARE_LINK_EXPIRED | "링크가 만료되었습니다" 화면 |
| 권한 없는 사용자가 생성 시도 | 403 | 모달에 에러 토스트 |
| 링크 복사 | — | "복사됨" 피드백 (버튼 텍스트 변경, 2초 후 복귀) |

---

## 7. 범위 외 (이번 구현에 포함하지 않음)

- 공유 링크 접근 통계/조회수
- 링크별 비밀번호 보호
- 다이어그램당 복수 링크
- 공유된 상태에서 댓글/피드백
