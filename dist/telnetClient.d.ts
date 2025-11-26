import { Session } from './types.js';
/**
 * Telnet 클라이언트 세션 클래스
 * 개별 Telnet 연결을 관리하고 프로토콜을 처리합니다.
 */
export declare class TelnetSession {
    private session;
    constructor(sessionId?: string);
    /**
     * 세션 ID 반환
     */
    getId(): string;
    /**
     * 세션 정보 반환
     */
    getSession(): Session;
    /**
     * Telnet 서버에 연결
     * @param host 호스트 주소
     * @param port 포트 번호
     * @param timeout 연결 타임아웃 (밀리초)
     */
    connect(host: string, port: number, timeout?: number): Promise<void>;
    /**
     * 데이터 수신 핸들러 설정
     */
    private setupDataHandler;
    /**
     * 오류 핸들러 설정
     */
    private setupErrorHandlers;
    /**
     * 버퍼에 데이터 추가 (FIFO 방식으로 크기 제한 준수)
     */
    private appendToBuffer;
    /**
     * 명령 전송
     * @param command 전송할 명령
     */
    sendCommand(command: string): Promise<void>;
    /**
     * 응답 읽기
     * @param waitMs 데이터 대기 시간 (선택)
     * @param encoding 인코딩 방식 (기본값: 'utf8')
     */
    readResponse(waitMs?: number, encoding?: BufferEncoding): Promise<string>;
    /**
     * 연결 종료
     */
    disconnect(): Promise<void>;
    /**
     * 연결 상태 확인
     */
    isConnected(): boolean;
}
//# sourceMappingURL=telnetClient.d.ts.map