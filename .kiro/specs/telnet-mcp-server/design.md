# 설계 문서

## 개요

Telnet MCP Server는 Model Context Protocol(MCP)을 구현하여 Telnet 서버와의 상호작용을 가능하게 하는 Node.js 기반 서버입니다. 이 시스템은 표준 입출력을 통해 JSON-RPC 메시지를 처리하며, 여러 Telnet 세션을 동시에 관리할 수 있습니다.

주요 기능:
- Telnet 서버 연결 및 세션 관리
- 명령 전송 및 응답 수신
- Telnet 프로토콜 특수 명령 처리
- MCP 프로토콜 준수

## 아키텍처

시스템은 다음과 같은 계층 구조로 설계됩니다:

```
┌─────────────────────────────────────┐
│      MCP Client (Kiro 등)          │
└─────────────────────────────────────┘
              │ JSON-RPC
              ▼
┌─────────────────────────────────────┐
│         MCP Server Layer            │
│  - 도구 등록 및 스키마 관리          │
│  - 요청 검증 및 라우팅               │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│      Session Manager Layer          │
│  - 세션 생성/삭제/조회               │
│  - 세션 상태 관리                    │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│      Telnet Client Layer            │
│  - TCP 소켓 연결                     │
│  - 데이터 송수신                     │
│  - 버퍼 관리                         │
│  - Telnet 프로토콜 처리              │
└─────────────────────────────────────┘
              │ TCP
              ▼
┌─────────────────────────────────────┐
│         Telnet Server               │
└─────────────────────────────────────┘
```

## 컴포넌트 및 인터페이스

### 1. MCP Server (index.ts)

MCP 프로토콜의 진입점으로, 표준 입출력을 통해 클라이언트와 통신합니다.

```typescript
interface MCPServer {
  // 서버 초기화 및 시작
  start(): Promise<void>;
  
  // 도구 등록
  registerTools(): void;
  
  // 도구 실행
  executeTool(name: string, args: any): Promise<any>;
}
```

### 2. Session Manager (sessionManager.ts)

Telnet 세션의 생명주기를 관리합니다.

```typescript
interface SessionManager {
  // 새 세션 생성
  createSession(host: string, port: number, timeout?: number): Promise<string>;
  
  // 세션 조회
  getSession(sessionId: string): TelnetSession | undefined;
  
  // 세션 삭제
  deleteSession(sessionId: string): void;
  
  // 모든 활성 세션 목록
  listSessions(): SessionInfo[];
}

interface SessionInfo {
  sessionId: string;
  host: string;
  port: number;
  connectedAt: Date;
  isActive: boolean;
}
```

### 3. Telnet Client (telnetClient.ts)

개별 Telnet 연결을 관리하고 프로토콜을 처리합니다.

```typescript
interface TelnetSession {
  // 연결 설정
  connect(host: string, port: number, timeout: number): Promise<void>;
  
  // 명령 전송
  sendCommand(command: string): Promise<void>;
  
  // 응답 읽기
  readResponse(waitMs?: number): Promise<string>;
  
  // 연결 종료
  disconnect(): Promise<void>;
  
  // 연결 상태 확인
  isConnected(): boolean;
}
```

### 4. Telnet Protocol Handler (telnetProtocol.ts)

Telnet 프로토콜의 특수 명령(IAC 등)을 처리합니다.

```typescript
interface TelnetProtocolHandler {
  // IAC 시퀀스 처리
  processIAC(data: Buffer): Buffer;
  
  // 옵션 협상 응답 생성
  negotiateOption(command: number, option: number): Buffer;
  
  // 이진 데이터 인코딩
  encodeData(data: Buffer): string;
}
```

## 데이터 모델

### Session

```typescript
interface Session {
  id: string;                    // 고유 세션 ID (UUID)
  host: string;                  // Telnet 서버 호스트
  port: number;                  // Telnet 서버 포트
  socket: net.Socket | null;     // TCP 소켓
  buffer: Buffer;                // 응답 버퍼
  connectedAt: Date;             // 연결 시간
  isActive: boolean;             // 활성 상태
  maxBufferSize: number;         // 최대 버퍼 크기 (기본: 1MB)
}
```

### MCP Tool Schemas

```typescript
// connect 도구
interface ConnectArgs {
  host: string;
  port: number;
  timeout?: number;  // 기본값: 5000ms
}

// send 도구
interface SendArgs {
  sessionId: string;
  command: string;
}

// read 도구
interface ReadArgs {
  sessionId: string;
  waitMs?: number;     // 대기 시간 (선택)
  encoding?: string;   // 인코딩 방식 (기본값: 'utf8', 옵션: 'base64', 'hex' 등)
}

// disconnect 도구
interface DisconnectArgs {
  sessionId: string;
}

// list 도구 (인자 없음)
```


## 정확성 속성

*속성(property)은 시스템의 모든 유효한 실행에서 참이어야 하는 특성 또는 동작입니다. 본질적으로 시스템이 수행해야 하는 작업에 대한 형식적 진술입니다. 속성은 사람이 읽을 수 있는 명세와 기계가 검증할 수 있는 정확성 보장 사이의 다리 역할을 합니다.*

### 속성 1: 연결 성공 시 고유 세션 생성

*모든* 유효한 호스트와 포트 조합에 대해, 연결이 성공하면 고유한 세션 ID가 생성되어야 하며, 동시에 여러 연결을 생성할 때 모든 세션 ID는 서로 달라야 합니다.

**검증: 요구사항 1.1, 1.2**

### 속성 2: 명령 전송 시 CRLF 추가

*모든* 명령 문자열에 대해, 명령을 전송할 때 소켓에 기록되는 데이터는 원본 명령 뒤에 캐리지 리턴(\r)과 라인 피드(\n)가 추가된 형태여야 합니다.

**검증: 요구사항 2.1, 2.2**

### 속성 3: 버퍼 읽기 후 비우기

*모든* 세션에 대해, 버퍼에서 데이터를 읽으면 읽은 데이터가 반환되어야 하며, 읽기 작업 후 버퍼는 비어 있어야 합니다.

**검증: 요구사항 3.1, 3.2**

### 속성 4: 데이터 수신 시 자동 버퍼링

*모든* 수신 데이터에 대해, Telnet 서버로부터 데이터가 도착하면 해당 데이터는 자동으로 세션의 버퍼에 추가되어야 하며, 이후 읽기 작업으로 조회 가능해야 합니다.

**검증: 요구사항 3.4**

### 속성 5: 세션 종료 시 리소스 정리

*모든* 활성 세션에 대해, 연결 해제를 호출하면 TCP 소켓이 닫혀야 하며, 세션 관리자에서 해당 세션이 제거되어야 합니다.

**검증: 요구사항 4.1, 4.2**

### 속성 6: 연결 해제의 멱등성

*모든* 세션에 대해, 연결 해제를 여러 번 호출해도 오류가 발생하지 않아야 하며, 첫 번째 호출 이후의 호출은 상태를 변경하지 않아야 합니다.

**검증: 요구사항 4.3**

### 속성 7: 세션 목록 완전성

*모든* 세션 상태에 대해, 세션 목록을 조회하면 모든 활성 세션이 포함되어야 하며, 각 세션 정보는 세션 ID, 호스트, 포트, 연결 시간을 포함해야 합니다.

**검증: 요구사항 5.1, 5.2**

### 속성 8: 버퍼 크기 제한 준수

*모든* 데이터 수신에 대해, 버퍼에 데이터를 추가한 후 버퍼 크기는 설정된 최대 크기를 초과하지 않아야 하며, 최대 크기 도달 시 가장 오래된 데이터가 제거되어야 합니다.

**검증: 요구사항 6.4**

### 속성 9: 도구 호출 라우팅

*모든* 유효한 MCP 도구 호출 요청에 대해, 요청이 검증을 통과하면 해당 도구에 매핑된 함수가 실행되어야 하며, 실행 결과가 MCP 프로토콜 형식으로 반환되어야 합니다.

**검증: 요구사항 7.3, 7.4**

### 속성 10: IAC 시퀀스 처리

*모든* IAC(Interpret As Command) 시퀀스에 대해, 수신된 데이터에서 IAC 시퀀스를 감지하면 적절히 해석되어야 하며, 일반 텍스트 데이터와 분리되어 처리되어야 합니다.

**검증: 요구사항 8.1**

### 속성 11: Telnet 옵션 협상 응답

*모든* Telnet 옵션 협상 요청에 대해, 서버는 정의된 기본 옵션에 따라 WILL, WONT, DO, DONT 중 적절한 응답을 생성하여 전송해야 합니다.

**검증: 요구사항 8.2**

### 속성 12: 이진 데이터 라운드트립

*모든* 이진 데이터에 대해, 데이터를 인코딩한 후 디코딩하면 원본 데이터와 동일해야 합니다.

**검증: 요구사항 8.3**

### 속성 13: UTF-8 디코딩 정확성

*모든* UTF-8 인코딩된 데이터에 대해, 읽기 도구에서 'utf8' 인코딩을 지정하면 올바른 유니코드 문자열로 디코딩되어야 하며, 멀티바이트 문자가 올바르게 처리되어야 합니다.

**검증: 요구사항 8.3**

### 속성 14: ANSI 제어 코드 보존

*모든* ANSI 제어 코드(ESC 시퀀스)를 포함한 데이터에 대해, 버퍼에 저장하고 읽을 때 제어 코드가 원본 그대로 보존되어야 하며, 색상 코드, 커서 이동 등의 시퀀스가 손실되지 않아야 합니다.

**검증: 요구사항 8.4**

## 오류 처리

### 연결 오류

- **잘못된 호스트/포트**: DNS 해석 실패 또는 연결 거부 시 명확한 오류 메시지 반환
- **타임아웃**: 지정된 시간 내에 연결되지 않으면 타임아웃 오류 반환
- **네트워크 오류**: 연결 중 네트워크 문제 발생 시 오류 로깅 및 사용자에게 알림

### 세션 오류

- **잘못된 세션 ID**: 존재하지 않는 세션 ID 사용 시 "Session not found" 오류 반환
- **비활성 세션**: 연결이 끊어진 세션에 작업 시도 시 "Session disconnected" 오류 반환
- **예기치 않은 연결 끊김**: Telnet 서버가 연결을 끊으면 세션을 비활성 상태로 표시하고 다음 작업 시 오류 반환

### 데이터 처리 오류

- **버퍼 오버플로**: 버퍼가 최대 크기에 도달하면 FIFO 방식으로 오래된 데이터 제거
- **소켓 쓰기 오류**: 데이터 전송 실패 시 연결 상태 확인 후 적절한 오류 반환
- **인코딩 오류**: 이진 데이터 인코딩 실패 시 오류 로깅 및 안전한 대체 인코딩 사용

### MCP 프로토콜 오류

- **잘못된 요청 형식**: JSON-RPC 형식이 올바르지 않으면 프로토콜 오류 반환
- **알 수 없는 도구**: 등록되지 않은 도구 호출 시 "Tool not found" 오류 반환
- **잘못된 인자**: 도구 인자 검증 실패 시 상세한 검증 오류 반환

## 테스트 전략

### 단위 테스트

단위 테스트는 개별 컴포넌트와 함수의 동작을 검증합니다:

- **Telnet Protocol Handler**: IAC 시퀀스 파싱, 옵션 협상 응답 생성
- **Session Manager**: 세션 생성/삭제/조회 로직
- **Buffer Management**: 버퍼 추가/읽기/오버플로 처리
- **Error Handling**: 각종 오류 조건에 대한 적절한 응답

### 속성 기반 테스트 (Property-Based Testing)

속성 기반 테스트는 위에서 정의한 정확성 속성을 검증합니다. Node.js 환경에서는 **fast-check** 라이브러리를 사용합니다.

**테스트 설정**:
- 각 속성 테스트는 최소 100회 반복 실행
- 각 테스트는 설계 문서의 속성 번호를 명시적으로 참조
- 형식: `**Feature: telnet-mcp-server, Property {번호}: {속성 텍스트}**`

**테스트 범위**:
- 속성 1-12: 각 정확성 속성에 대해 하나의 속성 기반 테스트 작성
- 임의의 입력 생성: 호스트명, 포트 번호, 명령 문자열, 이진 데이터 등
- 불변성 검증: 각 속성이 모든 생성된 입력에 대해 유지되는지 확인

### 통합 테스트

통합 테스트는 전체 시스템의 동작을 검증합니다:

- **MCP 클라이언트 시뮬레이션**: 실제 MCP 클라이언트처럼 JSON-RPC 메시지 전송
- **Mock Telnet 서버**: 테스트용 Telnet 서버를 로컬에서 실행하여 실제 연결 테스트
- **엔드투엔드 시나리오**: 연결 → 명령 전송 → 응답 읽기 → 연결 해제의 전체 흐름

### 테스트 도구

- **fast-check**: 속성 기반 테스트 라이브러리
- **Jest** 또는 **Vitest**: 테스트 러너 및 단위 테스트 프레임워크
- **net 모듈**: Mock Telnet 서버 구현


## 구현 세부사항

### MCP 서버 초기화

```typescript
// @modelcontextprotocol/sdk 사용
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'telnet-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});
```

### 도구 등록

5개의 MCP 도구를 등록합니다:

1. **telnet_connect**: Telnet 서버에 연결
2. **telnet_send**: 명령 전송
3. **telnet_read**: 응답 읽기
4. **telnet_disconnect**: 연결 종료
5. **telnet_list**: 세션 목록 조회

### 세션 ID 생성

UUID v4를 사용하여 고유한 세션 ID를 생성합니다:

```typescript
import { randomUUID } from 'crypto';

function generateSessionId(): string {
  return randomUUID();
}
```

### 버퍼 관리

- 기본 최대 버퍼 크기: 1MB (1048576 bytes)
- FIFO 방식으로 오래된 데이터 제거
- Buffer 객체를 사용하여 이진 데이터 안전하게 처리

### 데이터 인코딩

읽기 작업 시 다양한 인코딩 방식을 지원합니다:

- **utf8** (기본값): UTF-8 텍스트로 디코딩, 한글 등 멀티바이트 문자 지원
- **base64**: 이진 데이터를 Base64 문자열로 인코딩
- **hex**: 이진 데이터를 16진수 문자열로 인코딩
- **binary**: 원시 이진 데이터 (Latin-1 인코딩)

```typescript
function decodeBuffer(buffer: Buffer, encoding: string = 'utf8'): string {
  return buffer.toString(encoding as BufferEncoding);
}
```

### ANSI 제어 코드 처리

Telnet 서버는 종종 ANSI 이스케이프 시퀀스를 사용하여 터미널 제어를 수행합니다:

- **색상 코드**: `\x1b[31m` (빨간색), `\x1b[32m` (녹색) 등
- **커서 이동**: `\x1b[H` (홈), `\x1b[2J` (화면 지우기) 등
- **텍스트 스타일**: `\x1b[1m` (굵게), `\x1b[4m` (밑줄) 등

이러한 제어 코드는 Buffer에 원본 바이트로 저장되며, UTF-8 디코딩 시에도 그대로 보존됩니다. 클라이언트는 이 제어 코드를 해석하여 터미널에 표시하거나, 원본 그대로 사용자에게 전달할 수 있습니다.

```typescript
// ANSI 제어 코드는 자동으로 보존됨
const data = Buffer.from('\x1b[31mRed Text\x1b[0m');
const decoded = data.toString('utf8'); // '\x1b[31mRed Text\x1b[0m'
```

### Telnet 프로토콜 상수

```typescript
const IAC = 255;   // Interpret As Command
const DONT = 254;  // Don't
const DO = 253;    // Do
const WONT = 252;  // Won't
const WILL = 251;  // Will
const SB = 250;    // Subnegotiation Begin
const SE = 240;    // Subnegotiation End
```

## 의존성

### 필수 패키지

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "fast-check": "^3.0.0",
    "vitest": "^1.0.0"
  }
}
```

### Node.js 내장 모듈

- `net`: TCP 소켓 연결
- `crypto`: UUID 생성
- `events`: 이벤트 처리

## 보안 고려사항

1. **입력 검증**: 모든 사용자 입력(호스트, 포트, 명령)을 검증
2. **버퍼 제한**: 메모리 고갈 방지를 위한 버퍼 크기 제한
3. **타임아웃**: 무한 대기 방지를 위한 연결 타임아웃
4. **오류 정보 노출 방지**: 내부 구현 세부사항이 오류 메시지에 노출되지 않도록 주의

## 성능 고려사항

1. **비동기 I/O**: 모든 네트워크 작업은 비동기로 처리
2. **이벤트 기반**: Node.js 이벤트 루프를 활용한 효율적인 다중 세션 관리
3. **버퍼 최적화**: Buffer 객체를 사용하여 메모리 효율성 확보
4. **세션 제한**: 동시 세션 수 제한 고려 (선택적)

## 확장 가능성

향후 추가 가능한 기능:

1. **SSH 지원**: Telnet 외에 SSH 프로토콜 지원
2. **세션 지속성**: 서버 재시작 시 세션 복구
3. **로깅 개선**: 구조화된 로깅 및 로그 레벨 설정
4. **인증**: Telnet 서버 인증 정보 관리
5. **스크립트 실행**: 여러 명령을 순차적으로 실행하는 스크립트 기능
