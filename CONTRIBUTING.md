# 개발 & 배포 프로세스

ERDify 저장소에서 기능을 개발하고 master에 반영하기까지의 흐름입니다.

## 전체 흐름

```mermaid
flowchart TD
    A[Issue 등록] --> B["이슈 연결 브랜치 생성<br/>gh issue develop &lt;번호&gt; --checkout"]
    B --> C[로컬 개발 + 로컬 검증<br/>build/lint/typecheck/test]
    C --> D[PR 생성]
    D --> E{PR 체크}
    E --> F["CI 게이트<br/>Lint · Typecheck · Test"]
    E --> G["SonarCloud<br/>Quality Gate (New Code)"]
    E --> H["CodeRabbit<br/>advisory 리뷰"]
    F --> I{모두 통과?}
    G --> I
    I -- "아니오" --> C
    I -- "예" --> J[사람 승인 후 Merge]
    J --> K["master push<br/>→ npm 퍼블리시 (배포 아님)"]
    J --> L["dev / prod 머지<br/>→ 해당 환경 자동 배포"]
```

## 1. 이슈 → 브랜치 → PR

```bash
gh issue create --title "..." --body "..."
gh issue develop <이슈번호> --base master --checkout   # 이슈 연결 브랜치 생성 + 체크아웃

# 개발 + 로컬 검증
pnpm build && pnpm lint && pnpm typecheck && pnpm test

git add <파일> && git commit -m "..."
git push -u origin HEAD
gh pr create --base master --title "..." --body "... Closes #<이슈번호>"
```

- 브랜치는 항상 이슈에서 생성 (`gh issue develop`) — PR과 이슈가 자동으로 연결됩니다.
- 커밋 메시지/PR 본문에 `Closes #N`을 넣으면 머지 시 이슈가 자동으로 닫힙니다.

## 2. PR 체크 — 역할 분담

같은 PR에 여러 체크가 동시에 붙지만 역할이 다릅니다.

| 체크 | 역할 | 실패 시 |
|---|---|---|
| **Lint · Typecheck · Test** (`.github/workflows/ci.yml`) | 워크스페이스 전체 build/lint/typecheck/test(+coverage) 게이트 | 머지 차단 (required) |
| **SonarCloud Code Analysis** | 정적분석 + Quality Gate(New Code 기준) + 커버리지 | 머지 차단 (required) |
| **CodeRabbit** | AI 코드 리뷰 (로직/설계/엣지케이스 중심) | 머지 차단 안 함 (advisory) |
| **Deploy Scripts · shellcheck · test** (`ci.yml`) | 배포 스크립트 정적 검사 + 동작 테스트 | 머지 차단 (required 등록 권장) |
| **test** (`test.yml`) | 텔레그램 알림용 (`continue-on-error`) | 항상 통과, 참고용 |

- **CI 게이트**와 **SonarCloud**만 [master branch protection](https://github.com/cartoonpoet/ERDify/settings/branches)의 required status check로 등록되어 있어 실제로 머지를 막습니다.
- **CodeRabbit**은 의도적으로 advisory — 정적분석 수준 지적(복잡도/중복/시크릿)은 SonarCloud가 담당하도록 `.coderabbit.yaml`에서 역할을 나눴습니다. 리뷰 코멘트는 판단해서 반영하거나 논의로 남깁니다.
- SonarCloud Quality Gate는 **New Code** 기준입니다 — 기존 코드에 남아있는 이슈 때문에 무관한 PR이 막히지 않고, 이번에 건드린 코드만 깨끗하면 됩니다.

## 3. Branch protection (master)

- Required checks: `Lint · Typecheck · Test`, `SonarCloud Code Analysis`
- `strict: true` — 머지 전 브랜치가 최신 master 기준이어야 함 (뒤처져 있으면 `git merge origin/master` 또는 GitHub UI의 "Update branch")
- force-push, 브랜치 삭제 금지
- 배포 브랜치(`dev`/`prod`)에도 같은 required check + force-push 금지를 걸어야 합니다 — 이미지 불변 태그가 커밋 SHA에 묶여 있어 force-push는 롤백 대상 커밋을 통째로 날립니다. 자세한 내용은 [docs/operations/deployment.md](./docs/operations/deployment.md)를 보세요.

## 4. 배포 (브랜치 분리)

**master는 더 이상 서버에 배포하지 않습니다.** 배포 브랜치는 `dev`와 `prod`입니다.

```mermaid
flowchart LR
    M[master merge] --> PB["publish-npm.yml<br/>CLI/MCP 퍼블리시 (버전 올라간 경우만)"]
    M -->|merge| D[dev]
    D --> DW["deploy-dev.yml<br/>테스트 → 이미지 빌드 → SSH 배포"]
    DW --> DS[개발 서버]
    M -->|merge| P[prod]
    P --> PW["deploy-prod.yml<br/>테스트 → 이미지 빌드 → self-hosted runner 배포"]
    PW --> PS[운영 Mac mini]
```

- 이미지는 브랜치 이동 태그(`dev`/`prod`)와 **커밋 SHA 불변 태그**(`dev-<sha>`/`prod-<sha>`) 두 개로 밀고, 배포는 항상 불변 태그로 합니다 — 공유 `latest` 하나를 두고 dev/prod가 경쟁하지 않습니다.
- 환경별 동시 배포는 `concurrency`로 직렬화되고, 배포 실패(헬스 검증 실패 포함) 시 직전 태그로 자동 롤백됩니다.
- 운영 호스트로 들어오는 SSH는 열지 않습니다 — Mac mini의 self-hosted runner가 잡을 가져가는 방식입니다.
- CLI/MCP 서버는 master에서만, `package.json` 버전이 올라간 경우에만 npm publish됩니다.

환경/시크릿 설정, self-hosted runner 등록, 롤백·검증 절차는 **[docs/operations/deployment.md](./docs/operations/deployment.md)** 를 보세요.

## 로컬 개발 명령어

```bash
pnpm build              # 전체 패키지 빌드
pnpm lint               # 전체 패키지 ESLint
pnpm typecheck          # 전체 패키지 tsc --noEmit
pnpm test               # 전체 패키지 Vitest
pnpm test:coverage      # 전체 패키지 Vitest + 커버리지(lcov) — SonarCloud가 사용하는 것과 동일
```

CI에서 도는 파이프라인과 로컬 명령어가 1:1로 대응하므로, PR 올리기 전에 로컬에서 위 4개(`build`/`lint`/`typecheck`/`test`)를 돌려보면 CI 실패를 미리 잡을 수 있습니다.
