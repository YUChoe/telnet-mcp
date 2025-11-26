import { TelnetSession } from './telnetClient.js';
import { SessionInfo } from './types.js';
/**
 * 세션 관리자 클래스
 * 여러 Telnet 세션의 생명주기를 관리합니다.
 */
export declare class SessionManager {
    private sessions;
    constructor();
    /**
     * 새 세션 생성 및 연결
     * @param host Telnet 서버 호스트
     * @param port Telnet 서버 포트
     * @param timeout 연결 타임아웃 (밀리초, 기본값: 5000)
     * @returns 생성된 세션 ID
     */
    createSession(host: string, port: number, timeout?: number): Promise<string>;
    /**
     * 세션 조회
     * @param sessionId 세션 ID
     * @returns TelnetSession 또는 undefined
     */
    getSession(sessionId: string): TelnetSession | undefined;
    /**
     * 세션 삭제
     * @param sessionId 세션 ID
     */
    deleteSession(sessionId: string): Promise<void>;
    /**
     * 모든 활성 세션 목록 조회
     * @returns 세션 정보 배열
     */
    listSessions(): SessionInfo[];
}
//# sourceMappingURL=sessionManager.d.ts.map