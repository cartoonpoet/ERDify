# ERDify MCP Server

ERDify 다이어그램을 Claude Desktop 등 MCP 클라이언트에서 조작할 수 있게 하는 stdio MCP 서버.

## 1. API 키 발급

ERDify에 로그인한 뒤 아래 요청을 보내세요 (Authorization 헤더에 기존 액세스 토큰 사용):

```bash
curl -X POST http://localhost:3000/auth/api-key \
  -H "Authorization: Bearer <your-access-token>"
```

응답: `{ "apiKey": "eyJ..." }`

## 2. Claude Desktop 설정

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "erdify": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/apps/mcp-server/src/index.ts"],
      "env": {
        "ERDIFY_API_URL": "http://localhost:3000",
        "ERDIFY_API_KEY": "eyJ..."
      }
    }
  }
}
```

Claude Desktop을 재시작하면 ERDify 툴이 활성화됩니다.

## 사용 예시

- "내 프로젝트 목록 보여줘" → `list_projects`
- "쇼핑몰 ERD의 테이블 목록 알려줘" → `list_diagrams` → `get_diagram`
- "users 테이블에 email 컬럼 추가해줘" → `add_column`
- "orders → users 관계 추가해줘" → `add_relationship`
- "현재 스키마 DDL 뽑아줘" → `get_ddl`
