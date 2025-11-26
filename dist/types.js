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
};
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
};
/**
 * 기본 설정 상수
 */
export const DEFAULT_CONFIG = {
    /** 기본 연결 타임아웃 (5초) */
    TIMEOUT: 5000,
    /** 기본 최대 버퍼 크기 (1MB) */
    MAX_BUFFER_SIZE: 1048576,
    /** 기본 인코딩 */
    DEFAULT_ENCODING: 'utf8',
    /** CRLF 시퀀스 */
    CRLF: '\r\n',
};
//# sourceMappingURL=types.js.map