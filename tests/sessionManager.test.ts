import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { SessionManager } from '../src/sessionManager.js';
import { createServer, Server, Socket } from 'net';

/**
 * Mock Telnet 서버
 * 테스트용 간단한 Telnet 서버
 */
class MockTelnetServer {
  private server: Server;
  private port: number;
  private clients: Set<Socket> = new Set();

  constructor(port: number) {
    this.port = port;
    this.server = createServer((socket) => {
      this.clients.add(socket);
      
      socket.on('close', () => {
        this.clients.delete(socket);
      });
      
      socket.on('data', (data) => {
        // 에코 서버: 받은 데이터를 그대로 돌려보냄
        socket.write(data);
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    // 모든 클라이언트 연결 종료
    for (const client of this.clients) {
      client.destroy();
    }
    this.clients.clear();

    return new Promise((resolve) => {
      this.server.close(() => {
        resolve();
      });
    });
  }

  getPort(): number {
    return this.port;
  }
}

describe('SessionManager - Property-Based Tests', () => {
  let mockServer: MockTelnetServer;
  const TEST_PORT = 23457;

  beforeAll(async () => {
    mockServer = new MockTelnetServer(TEST_PORT);
    await mockServer.start();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  /**
   * **Feature: telnet-mcp-server, Property 7: 세션 목록 완전성**
   * **Validates: Requirements 5.1, 5.2**
   * 
   * 모든 세션 상태에 대해, 세션 목록을 조회하면 모든 활성 세션이 포함되어야 하며,
   * 각 세션 정보는 세션 ID, 호스트, 포트, 연결 시간을 포함해야 합니다.
   */
  it('Property 7: 세션 목록 완전성', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // 생성할 세션 수
        fc.integer({ min: 0, max: 5 }), // 삭제할 세션 수
        async (createCount, deleteCount) => {
          const manager = new SessionManager();
          const createdSessionIds: string[] = [];
          
          try {
            // 여러 세션 생성
            for (let i = 0; i < createCount; i++) {
              const sessionId = await manager.createSession('localhost', TEST_PORT, 2000);
              createdSessionIds.push(sessionId);
            }
            
            // 일부 세션 삭제
            const actualDeleteCount = Math.min(deleteCount, createCount);
            const deletedSessionIds = createdSessionIds.slice(0, actualDeleteCount);
            
            for (const sessionId of deletedSessionIds) {
              await manager.deleteSession(sessionId);
            }
            
            // 남아있는 세션 ID
            const remainingSessionIds = createdSessionIds.slice(actualDeleteCount);
            
            // 세션 목록 조회
            const sessionList = manager.listSessions();
            
            // 목록 크기가 남아있는 세션 수와 일치해야 함
            expect(sessionList.length).toBe(remainingSessionIds.length);
            
            // 모든 남아있는 세션이 목록에 포함되어야 함
            const listedSessionIds = sessionList.map(s => s.sessionId);
            for (const sessionId of remainingSessionIds) {
              expect(listedSessionIds).toContain(sessionId);
            }
            
            // 각 세션 정보가 필수 필드를 포함해야 함
            for (const sessionInfo of sessionList) {
              expect(sessionInfo.sessionId).toBeDefined();
              expect(typeof sessionInfo.sessionId).toBe('string');
              expect(sessionInfo.host).toBe('localhost');
              expect(sessionInfo.port).toBe(TEST_PORT);
              expect(sessionInfo.connectedAt).toBeInstanceOf(Date);
              expect(typeof sessionInfo.isActive).toBe('boolean');
            }
            
            // 삭제된 세션은 목록에 없어야 함
            for (const sessionId of deletedSessionIds) {
              expect(listedSessionIds).not.toContain(sessionId);
            }
          } finally {
            // 정리: 모든 남아있는 세션 삭제
            for (const sessionId of createdSessionIds) {
              await manager.deleteSession(sessionId);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});
