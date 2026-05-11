# @erdify/cli

ERDify CLI — 터미널에서 ERD를 직접 제어하는 커맨드라인 도구입니다.

## 설치

```bash
npm install -g @erdify/cli
```

## 시작하기

```bash
# API 키 저장 (최초 1회)
erdify login --key erd_your_api_key_here

# 또는 대화형 입력
erdify login
```

API 키는 [ERDify 앱 → 설정 → API](http://erdify-app.kro.kr/settings/api)에서 발급받을 수 있습니다.

> **환경변수 사용**: `ERDIFY_API_KEY` 환경변수가 설정되어 있으면 config 파일보다 우선 적용됩니다.

## 커맨드 레퍼런스

### 설정

```bash
erdify login [--key <key>] [--url <url>]   # API 키 저장
erdify whoami                               # 현재 설정 확인
```

### 조회

```bash
erdify list orgs                            # 조직 목록
erdify list projects <orgId>               # 프로젝트 목록
erdify list diagrams <projectId>           # 다이어그램 목록

erdify get diagram <diagramId>             # 테이블·컬럼·관계 요약
erdify get ddl <diagramId>                 # DDL SQL 출력
```

### 테이블

```bash
erdify add table <diagramId> <name>        # 테이블 추가
erdify remove table <diagramId> <tableId>  # 테이블 삭제
```

### 컬럼

```bash
erdify add column <diagramId> <tableId> <name> \
  --type <type>        # SQL 타입 (필수, 예: uuid, varchar, integer)
  [--pk]               # Primary Key
  [--not-null]         # NOT NULL
  [--unique]           # UNIQUE
  [--default <value>]  # 기본값

erdify update column <diagramId> <tableId> <columnId> \
  [--name <name>]      # 컬럼명 변경
  [--type <type>]      # 타입 변경
  [--pk <true|false>]  # PK 설정/해제
  [--not-null <true|false>]
  [--unique <true|false>]
  [--default <value>]  # 기본값 (null 입력 시 제거)

erdify remove column <diagramId> <tableId> <columnId>
```

### 관계

```bash
erdify add rel <diagramId> <srcTableId> <tgtTableId> <cardinality>
# cardinality: one-to-one | one-to-many | many-to-one

erdify remove rel <diagramId> <relationshipId>
# alias: erdify rm rel ...
```

## 예시

```bash
# 다이어그램 조회
erdify list orgs
# my-org  (id: org_abc)

erdify list projects org_abc
# my-project  (id: proj_xyz)

erdify list diagrams proj_xyz
# main-erd  (id: diag_123, updated: 2026-05-11T...)

erdify get diagram diag_123
# Diagram: "main-erd" (mysql)
# Tables (2):
#   users [tableId: tbl_aaa]
#     - id [columnId: col_1]: uuid PK NOT NULL
#     - email [columnId: col_2]: varchar NOT NULL UNIQUE

# 테이블 추가
erdify add table diag_123 orders
# Table "orders" added. tableId=tbl_bbb

erdify add column diag_123 tbl_bbb id --type uuid --pk --not-null
erdify add column diag_123 tbl_bbb user_id --type uuid --not-null
erdify add column diag_123 tbl_bbb total --type "decimal(10,2)" --not-null
erdify add column diag_123 tbl_bbb created_at --type timestamp --not-null

erdify add rel diag_123 tbl_bbb tbl_aaa many-to-one
# Relationship added: "orders" → "users" (many-to-one).

# DDL 출력
erdify get ddl diag_123
# CREATE TABLE `users` ( ... );
# CREATE TABLE `orders` ( ... );
```

## MCP와 차이점

| | MCP | CLI |
|---|---|---|
| 사용 방법 | AI 도구에서 자연어 | 터미널 직접 실행 |
| 토큰 소모 | 높음 (프로토콜 오버헤드) | 없음 |
| 자동화 | 제한적 | 스크립트/CI 가능 |
| 대상 | AI 워크플로우 | 개발자 · 자동화 |

## 라이선스

[MIT](./LICENSE)
