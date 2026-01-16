# Telnet MCP Server

A Model Context Protocol (MCP) server that enables interaction with remote servers via the Telnet protocol.

## Features

- Telnet server connection and session management
- Command transmission and response reception
- Telnet protocol special command handling (IAC, option negotiation)
- Multiple concurrent session management
- ANSI control code preservation

## MCP Configuration

### Using from Git repository:

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

## Available Tools

### telnet_connect
Connects to a Telnet server.

**Arguments:**
- `host` (string): Host address
- `port` (number): Port number
- `timeout` (number, optional): Connection timeout (default: 5000ms)

**Returns:** Session ID

### telnet_send
Sends a command to an active session.

**Arguments:**
- `sessionId` (string): Session ID
- `command` (string): Command to send

### telnet_read
Reads response from the session buffer.

**Arguments:**
- `sessionId` (string): Session ID
- `waitMs` (number, optional): Data wait time
- `encoding` (string, optional): Encoding method (utf8, base64, hex, binary)

**Returns:** Data from buffer

### telnet_disconnect
Terminates a session.

**Arguments:**
- `sessionId` (string): Session ID

### telnet_list
Lists all active sessions.

**Returns:** Array of session information

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## License

MIT

---

# Telnet MCP Server (한국어)

Model Context Protocol (MCP) 서버로 Telnet 프로토콜을 통해 원격 서버와 상호작용할 수 있습니다.

## 기능

- Telnet 서버 연결 및 세션 관리
- 명령 전송 및 응답 수신
- Telnet 프로토콜 특수 명령 처리 (IAC, 옵션 협상)
- 여러 세션 동시 관리
- ANSI 제어 코드 보존

## MCP 설정

### Git 저장소에서 직접 사용하는 경우:

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
