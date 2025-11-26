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
export declare const TelnetCommands: {
    /** Interpret As Command */
    readonly IAC: 255;
    /** Don't */
    readonly DONT: 254;
    /** Do */
    readonly DO: 253;
    /** Won't */
    readonly WONT: 252;
    /** Will */
    readonly WILL: 251;
    /** Subnegotiation Begin */
    readonly SB: 250;
    /** Subnegotiation End */
    readonly SE: 240;
};
/**
 * Telnet 옵션 코드
 */
export declare const TelnetOptions: {
    /** Binary Transmission */
    readonly BINARY: 0;
    /** Echo */
    readonly ECHO: 1;
    /** Suppress Go Ahead */
    readonly SUPPRESS_GO_AHEAD: 3;
    /** Terminal Type */
    readonly TERMINAL_TYPE: 24;
    /** Window Size */
    readonly WINDOW_SIZE: 31;
    /** Terminal Speed */
    readonly TERMINAL_SPEED: 32;
    /** Remote Flow Control */
    readonly REMOTE_FLOW_CONTROL: 33;
    /** Linemode */
    readonly LINEMODE: 34;
    /** Environment Variables */
    readonly ENVIRONMENT_VARIABLES: 36;
};
/**
 * 기본 설정 상수
 */
export declare const DEFAULT_CONFIG: {
    /** 기본 연결 타임아웃 (5초) */
    readonly TIMEOUT: 5000;
    /** 기본 최대 버퍼 크기 (1MB) */
    readonly MAX_BUFFER_SIZE: 1048576;
    /** 기본 인코딩 */
    readonly DEFAULT_ENCODING: BufferEncoding;
    /** CRLF 시퀀스 */
    readonly CRLF: "\r\n";
};
//# sourceMappingURL=types.d.ts.map