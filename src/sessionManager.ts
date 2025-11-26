import { TelnetSession } from './telnetClient.js';
import { SessionInfo, DEFAULT_CONFIG } from './types.js';

/**
 * 세션 관리자 클래스
 * 여러 Telnet 세션의 생명주기를 관리합니다.
 */
export class SessionManager {
  private sessions: Map<string, TelnetSession>;

  constructor() {
    this.sessions = new Map();
  }

  /**
   * 새 세션 생성 및 연결
   * @param host Telnet 서버 호스트
   * @param port Telnet 서버 포트
   * @param timeout 연결 타임아웃 (밀리초, 기본값: 5000)
   * @returns 생성된 세션 ID
   */
  async createSession(host: string, port: number, timeout: number = DEFAULT_CONFIG.TIMEOUT): Promise<string> {
    const session = new TelnetSession();
    
    try {
      await session.connect(host, port, timeout);
      const sessionId = session.getId();
      this.sessions.set(sessionId, session);
      return sessionId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 세션 조회
   * @param sessionId 세션 ID
   * @returns TelnetSession 또는 undefined
   */
  getSession(sessionId: string): TelnetSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 세션 삭제
   * @param sessionId 세션 ID
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      // 연결이 활성화되어 있으면 종료
      if (session.isConnected()) {
        await session.disconnect();
      }
      
      // 세션 저장소에서 제거
      this.sessions.delete(sessionId);
    }
  }

  /**
   * 모든 활성 세션 목록 조회
   * @returns 세션 정보 배열
   */
  listSessions(): SessionInfo[] {
    const sessionInfos: SessionInfo[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionData = session.getSession();
      sessionInfos.push({
        sessionId: sessionData.id,
        host: sessionData.host,
        port: sessionData.port,
        connectedAt: sessionData.connectedAt,
        isActive: sessionData.isActive,
      });
    }
    
    return sessionInfos;
  }
}
