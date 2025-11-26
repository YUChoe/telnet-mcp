# Telnet MCP Server

Model Context Protocol (MCP) 서버로 Telnet 프로토콜을 통해 원격 서버와 상호작용할 수 있습니다.

## 기능

- Telnet 서버 연결 및 세션 관리
- 명령 전송 및 응답 수신
- Telnet 프로토콜 특수 명령 처리 (IAC, 옵션 협상)
- 여러 세션 동시 관리
- ANSI 제어 코드 보존

## 설치

### NPX로 직접 실행 (권장)

```bash
npx telnet-mcp
```

### Git에서 설치

```bash
npm install -g git+https://github.com/YUChoe/telnet-mcp.git
```

## MCP 설정

### Kiro에서 사용

`.kiro/settings/mcp.json` 또는 `~/.kiro/settings/mcp.json`에 추가:

```json
{
  "mcpServers": {
    "telnet": {
      "command": "npx",
      "args": ["-y", "telnet-mcp"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Git 저장소에서 직접 사용하는 경우:

```json
{
  "mcpServers": {
    "telnet": {
      "command": "npx",
      "args": ["-y", "git+https://github.com/YUChoe/telnet-mcp"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Claude Desktop에서 사용

`claude_desktop_config.json`에 추가:

```json
{
  "mcpServers": {
    "telnet": {
      "command": "npx",
      "args": ["-y", "telnet-mcp"]
    }
  }
}
```

## 사용 가능한 도구

### telnet_connect
Telnet 서버에 연결합니다.

**인자:**
- `host` (string): 호스트 주소
- `port` (number): 포트 번호
- `timeout` (number, 선택): 연결 타임아웃 (기본값: 5000ms)

**반환:** 세션 ID

### telnet_send
활성 세션에 명령을 전송합니다.

**인자:**
- `sessionId` (string): 세션 ID
- `command` (string): 전송할 명령

### telnet_read
세션의 버퍼에서 응답을 읽습니다.

**인자:**
- `sessionId` (string): 세션 ID
- `waitMs` (number, 선택): 데이터 대기 시간
- `encoding` (string, 선택): 인코딩 방식 (utf8, base64, hex, binary)

**반환:** 버퍼의 데이터

### telnet_disconnect
세션을 종료합니다.

**인자:**
- `sessionId` (string): 세션 ID

### telnet_list
모든 활성 세션 목록을 조회합니다.

**반환:** 세션 정보 배열

## 개발

### 빌드

```bash
npm run build
```

### 테스트

```bash
npm test
```

### 개발 모드

```bash
npm run dev
```

## 라이선스

MIT
