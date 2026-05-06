# Member Management & Invite System Design

## Goal

조직(Organization) 멤버를 초대·조회·역할 변경·내보내기할 수 있는 전체 멤버 관리 기능을 추가한다. 미가입 이메일에는 가입 초대 메일을 발송하고, 가입 시 자동으로 조직에 합류하는 pending invite 시스템을 구현한다.

---

## Architecture

- **Backend**: NestJS 기존 `organization` 모듈 확장 + 신규 `Invite` 엔티티 + 인증 signup flow 수정
- **Frontend**: 대시보드 사이드바에 "👥 멤버 관리" 서브메뉴 추가 + 신규 `MemberManagementPage`
- **Email**: `@nestjs-modules/mailer` + nodemailer 신규 설치. SMTP 환경변수(`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) 추가 필요.
- **DB**: `invites` 테이블 신규 추가, TypeORM 마이그레이션

---

## Data Model

### 신규: `invites` 테이블

```
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
email       varchar(255) NOT NULL
role        enum('owner','editor','viewer') NOT NULL DEFAULT 'editor'
token       uuid UNIQUE NOT NULL DEFAULT gen_random_uuid()
invited_by  uuid NOT NULL REFERENCES users(id)
expires_at  timestamptz NOT NULL  -- 초대 후 7일
accepted_at timestamptz           -- NULL = 아직 미수락
created_at  timestamptz NOT NULL DEFAULT now()
```

인덱스: `(email, accepted_at)` — 회원가입 시 pending invite 조회에 사용

---

## Backend Changes

### 1. `packages/db/src/entities/invite.entity.ts` (신규)

```typescript
@Entity("invites")
export class Invite {
  @PrimaryGeneratedColumn("uuid") id: string;
  @ManyToOne(() => Organization, { onDelete: "CASCADE" }) org: Organization;
  @Column() orgId: string;
  @Column() email: string;
  @Column({ type: "enum", enum: OrgRole, default: OrgRole.EDITOR }) role: OrgRole;
  @Column({ type: "uuid", unique: true, default: () => "gen_random_uuid()" }) token: string;
  @ManyToOne(() => User) invitedBy: User;
  @Column() invitedById: string;
  @Column({ type: "timestamptz" }) expiresAt: Date;
  @Column({ type: "timestamptz", nullable: true }) acceptedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
}
```

### 2. `packages/db/src/migrations/1746000000012-CreateInvitesTable.ts` (신규)

`invites` 테이블 생성 마이그레이션.

### 3. `apps/api/src/modules/organization/organization.service.ts` (수정)

**추가 메서드:**

- `getMembers(orgId, requesterId)` → `OrganizationMember[]` 반환. requester가 해당 org 멤버인지 확인 후 반환.
- `updateMemberRole(orgId, targetUserId, role, requesterId)` → Owner만 변경 가능. 자기 자신 변경 불가.
- `removeMember(orgId, targetUserId, requesterId)` — 기존 DELETE, requester 권한 확인 로직 추가.
- `invite(orgId, email, role, requesterId)`:
  1. requester가 owner/editor인지 확인
  2. email로 User 조회
  3. **가입된 경우**: `OrganizationMember` 즉시 생성, 완료
  4. **미가입 경우**: 기존 pending invite 있으면 재사용(expiresAt 갱신), 없으면 신규 생성. 이메일 발송.
- `getPendingInvites(orgId, requesterId)` → `Invite[]` 반환
- `cancelInvite(orgId, inviteId, requesterId)` → invite 삭제

### 4. `apps/api/src/modules/organization/organization.controller.ts` (수정)

**추가 엔드포인트:**

| Method | Path | 설명 |
|--------|------|------|
| GET | `/organizations/:id/members` | 멤버 목록 |
| PATCH | `/organizations/:id/members/:userId` | 역할 변경 |
| DELETE | `/organizations/:id/members/:userId` | 멤버 제거 (기존) |
| POST | `/organizations/:id/members/invite` | 초대 (수정) |
| GET | `/organizations/:id/invites` | 대기 초대 목록 |
| DELETE | `/organizations/:id/invites/:inviteId` | 초대 취소 |

### 5. `apps/api/src/modules/auth/auth.service.ts` (수정)

`register()` 메서드 완료 후:
```
const pendingInvites = await inviteRepo.find({
  where: { email: dto.email, acceptedAt: IsNull(), expiresAt: MoreThan(new Date()) }
});
for (const invite of pendingInvites) {
  await orgMemberRepo.save({ orgId: invite.orgId, userId: newUser.id, role: invite.role });
  invite.acceptedAt = new Date();
  await inviteRepo.save(invite);
}
```

### 6. Email 템플릿

초대 이메일 내용:
- 제목: `[ERDify] {orgName} 조직에 초대되었습니다`
- 본문: 초대자 이름, 역할, 가입 링크(`/register?invite={token}`)
- 만료: 7일

---

## Frontend Changes

### 신규 파일

**`src/shared/api/members.api.ts`**

```typescript
export const getMembers = (orgId: string) =>
  apiFetch<Member[]>(`/organizations/${orgId}/members`);

export const updateMemberRole = (orgId: string, userId: string, role: OrgRole) =>
  apiFetch<void>(`/organizations/${orgId}/members/${userId}`, { method: "PATCH", body: { role } });

export const removeMember = (orgId: string, userId: string) =>
  apiFetch<void>(`/organizations/${orgId}/members/${userId}`, { method: "DELETE" });

export const inviteMember = (orgId: string, email: string, role: OrgRole) =>
  apiFetch<InviteResult>(`/organizations/${orgId}/members/invite`, { method: "POST", body: { email, role } });

export const getPendingInvites = (orgId: string) =>
  apiFetch<PendingInvite[]>(`/organizations/${orgId}/invites`);

export const cancelInvite = (orgId: string, inviteId: string) =>
  apiFetch<void>(`/organizations/${orgId}/invites/${inviteId}`, { method: "DELETE" });
```

**`src/features/dashboard/hooks/useMembers.ts`**

TanStack Query로 멤버 목록 조회, 역할 변경, 제거 mutation 제공.

**`src/features/dashboard/hooks/useInvites.ts`**

TanStack Query로 대기 초대 목록 조회, 초대 전송, 취소 mutation 제공.

**`src/features/dashboard/pages/MemberManagementPage.tsx`**

레이아웃:
1. 페이지 헤더: "멤버 관리 · {orgName}" + "＋ 멤버 초대" 버튼
2. 현재 멤버 섹션: 아바타 이니셜, 이메일, 역할 드롭다운(Owner만 변경 가능), "내보내기" 버튼
3. 대기 중인 초대 섹션: 이메일, 역할, 만료일, "취소" 버튼
4. 초대 모달: 이메일 + 역할 입력 → "초대 보내기" 버튼 클릭 → 응답에 따라 결과 표시

**`src/features/dashboard/components/InviteOrgModal.tsx`**

이미 `editor/components/InviteModal.tsx`가 존재하지만 editor-전용이므로, dashboard용 신규 컴포넌트 작성. 로직:
- 이메일 + 역할 입력 후 "초대 보내기" 버튼 클릭 시 `POST /invite` 호출
- 응답이 `{ status: "added" }` → "멤버로 추가되었습니다" 성공 메시지 후 모달 닫기, 멤버 목록 invalidate
- 응답이 `{ status: "pending" }` → "가입 초대 메일을 보냈습니다" 메시지 후 모달 닫기, 대기 초대 목록 invalidate

### 수정 파일

**`src/features/dashboard/components/UnifiedSidebar.tsx`**

현재 org 하위에 "관리" 섹션 추가:
```tsx
<div className={css.treeSectionLabel}>관리</div>
<button
  className={clsx(css.projRow, isActive && css.projRowActive)}
  onClick={() => navigate(`/orgs/${orgId}/members`)}
>
  👥 멤버 관리
</button>
```

**`src/app/Router.tsx`**

```tsx
<Route path="/orgs/:orgId/members" element={<MemberManagementPage />} />
```

`DashboardPage` 내부에서 렌더링하는 방식도 가능하지만, 독립 라우트로 처리하는 것이 더 명확.

---

## Flow Summary

```
초대자가 이메일 입력
       ↓
POST /organizations/:id/members/invite
       ↓
  가입된 유저?
  ├─ YES → OrganizationMember 즉시 생성 → { status: "added" }
  └─ NO  → invites 레코드 생성 + 초대 메일 발송 → { status: "pending" }
                    ↓
           피초대자 이메일 수신
                    ↓
           /register?invite={token} 접속
                    ↓
           회원가입 완료
                    ↓
  auth.service: 가입 이메일 기준 pending invites 자동 수락
                    ↓
           OrganizationMember 자동 생성 + invite.acceptedAt 기록
```

---

## Error Handling

| 상황 | 처리 |
|------|------|
| 이미 멤버인 이메일 초대 | 409 Conflict: "이미 조직의 멤버입니다" |
| 만료된 초대 토큰으로 가입 | 무시 (acceptedAt만 기록 안 함) |
| Owner가 자기 자신 역할 변경 | 400 Bad Request |
| 권한 없는 사용자가 API 호출 | 403 Forbidden |

---

## Testing

- `organization.service.spec.ts`: invite, getMembers, updateMemberRole, cancelInvite 단위 테스트
- `auth.service.spec.ts`: 회원가입 시 pending invite 자동 수락 테스트
- `MemberManagementPage.test.tsx`: 멤버 목록 렌더링, 초대 모달 상태, 역할 변경 UI 테스트
- `InviteOrgModal.test.tsx`: 가입자 초대 / 미가입자 초대 분기 테스트
