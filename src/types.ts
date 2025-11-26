import { Socket } from 'net';

/**
 * Telnet 세션 인터페이스
 * 개별 Telnet 연결의 상태와 데이터를 관리
 */
export interface Session {
  /** 고유 세션 ID (UUID) */
  id: string;
  
  /** Telnet 서버 호스트 */
  host: string;
  
  /** Telnet 서버 포트 */
  port: number;
  
  /** TCP 소켓 연결 */
  socket: Socket | null;
  
  /** 응답 데이터 버퍼 */
  buffer: Buffer;
  
  /** 연결 시간 */
  connectedAt: Date;
  
  /** 활성 상태 */
  isActive: boolean;
  
  /** 최대 버퍼 크기 (기본: 1MB) */
  maxBufferSize: number;
}

/**
 * 세션 정보 (목록 조회용)
 */
export interface SessionInfo {
  sessionId: string;
  host: string;
  port: number;
  connectedAt: Date;
  isActive: boolean;
}

/**
 * MCP 도구 인자: telnet_connect
 */
export interface ConnectArgs {
  /** Telnet 서버 호스트 */
  host: string;
  
  /** Telnet 서버 포트 */
  port: number;
  
  /** 연결 타임아웃 (밀리초, 기본값: 5000) */
  timeout?: number;
}

/**
 * MCP 도구 인자: telnet_send
 */
export interface SendArgs {
  /** 세션 ID */
  sessionId: string;
  
  /** 전송할 명령 */
  command: string;
}

/**
 * MCP 도구 인자: telnet_read
 */
export interface ReadArgs {
  /** 세션 ID */
  sessionId: string;
  
  /** 데이터 대기 시간 (밀리초, 선택) */
  waitMs?: number;
  
  /** 인코딩 방식 (기본값: 'utf8') */
  encoding?: BufferEncoding;
}

/**
 * MCP 도구 인자: telnet_disconnect
 */
export interface DisconnectArgs {
  /** 세션 ID */
  sessionId: string;
}

/**
 * Telnet 프로토콜 상수
 */
export const TelnetCommands = {
  /** Interpret As Command */
  IAC: 255,
  
  /** Don't */
  DONT: 254,
  
  /** Do */
  DO: 253,
  
  /** Won't */
  WONT: 252,
  
  /** Will */
  WILL: 251,
  
  /** Subnegotiation Begin */
  SB: 250,
  
  /** Subnegotiation End */
  SE: 240,
} as const;

/**
 * Telnet 옵션 코드
 */
export const TelnetOptions = {
  /** Binary Transmission */
  BINARY: 0,
  
  /** Echo */
  ECHO: 1,
  
  /** Suppress Go Ahead */
  SUPPRESS_GO_AHEAD: 3,
  
  /** Terminal Type */
  TERMINAL_TYPE: 24,
  
  /** Window Size */
  WINDOW_SIZE: 31,
  
  /** Terminal Speed */
  TERMINAL_SPEED: 32,
  
  /** Remote Flow Control */
  REMOTE_FLOW_CONTROL: 33,
  
  /** Linemode */
  LINEMODE: 34,
  
  /** Environment Variables */
  ENVIRONMENT_VARIABLES: 36,
} as const;

/**
 * 기본 설정 상수
 */
export const DEFAULT_CONFIG = {
  /** 기본 연결 타임아웃 (5초) */
  TIMEOUT: 5000,
  
  /** 기본 최대 버퍼 크기 (1MB) */
  MAX_BUFFER_SIZE: 1048576,
  
  /** 기본 인코딩 */
  DEFAULT_ENCODING: 'utf8' as BufferEncoding,
  
  /** CRLF 시퀀스 */
  CRLF: '\r\n',
} as const;
