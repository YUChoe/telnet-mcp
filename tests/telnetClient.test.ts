import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { TelnetSession } from '../src/telnetClient.js';
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

describe('TelnetSession - Property-Based Tests', () => {
  let mockServer: MockTelnetServer;
  const TEST_PORT = 23456;

  beforeAll(async () => {
    mockServer = new MockTelnetServer(TEST_PORT);
    await mockServer.start();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  /**
   * **Feature: telnet-mcp-server, Property 1: 연결 성공 시 고유 세션 생성**
   * **Validates: Requirements 1.1, 1.2**
   * 
   * 모든 유효한 호스트와 포트 조합에 대해, 연결이 성공하면 고유한 세션 ID가 생성되어야 하며,
   * 동시에 여러 연결을 생성할 때 모든 세션 ID는 서로 달라야 합니다.
   */
  it('Property 1: 연결 성공 시 고유 세션 생성', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // 동시 연결 수
        async (connectionCount) => {
          const sessions: TelnetSession[] = [];
          const sessionIds: Set<string> = new Set();

          try {
            // 여러 세션 동시 생성
            for (let i = 0; i < connectionCount; i++) {
              const session = new TelnetSession();
              await session.connect('localhost', TEST_PORT, 2000);
              sessions.push(session);
              sessionIds.add(session.getId());
            }

            // 모든 세션 ID가 고유해야 함
            expect(sessionIds.size).toBe(connectionCount);

            // 모든 세션이 연결되어 있어야 함
            for (const session of sessions) {
              expect(session.isConnected()).toBe(true);
            }
          } finally {
            // 정리
            for (const session of sessions) {
              await session.disconnect();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: telnet-mcp-server, Property 2: 명령 전송 시 CRLF 추가**
   * **Validates: Requirements 2.1, 2.2**
   * 
   * 모든 명령 문자열에 대해, 명령을 전송할 때 소켓에 기록되는 데이터는
   * 원본 명령 뒤에 캐리지 리턴(\r)과 라인 피드(\n)가 추가된 형태여야 합니다.
   */
  it('Property 2: 명령 전송 시 CRLF 추가', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // 임의의 명령 문자열
        async (command) => {
          const session = new TelnetSession();
          
          try {
            await session.connect('localhost', TEST_PORT, 2000);
            
            // 명령 전송
            await session.sendCommand(command);
            
            // 짧은 대기 후 응답 읽기
            await new Promise(resolve => setTimeout(resolve, 50));
            const response = await session.readResponse();
            
            // 에코 서버이므로 응답은 명령 + CRLF여야 함
            expect(response).toBe(command + '\r\n');
          } finally {
            await session.disconnect();
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * **Feature: telnet-mcp-server, Property 4: 데이터 수신 시 자동 버퍼링**
   * **Validates: Requirements 3.4**
   * 
   * 모든 수신 데이터에 대해, Telnet 서버로부터 데이터가 도착하면
   * 해당 데이터는 자동으로 세션의 버퍼에 추가되어야 하며, 이후 읽기 작업으로 조회 가능해야 합니다.
   */
  it('Property 4: 데이터 수신 시 자동 버퍼링', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }), // 여러 명령
        async (commands) => {
          const session = new TelnetSession();
          
          try {
            await session.connect('localhost', TEST_PORT, 2000);
            
            // 여러 명령을 연속으로 전송
            for (const command of commands) {
              await session.sendCommand(command);
            }
            
            // 데이터가 도착할 때까지 대기
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 버퍼에서 모든 데이터 읽기
            const response = await session.readResponse();
            
            // 모든 명령 + CRLF가 버퍼에 있어야 함
            const expected = commands.map(cmd => cmd + '\r\n').join('');
            expect(response).toBe(expected);
          } finally {
            await session.disconnect();
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * **Feature: telnet-mcp-server, Property 8: 버퍼 크기 제한 준수**
   * **Validates: Requirements 6.4**
   * 
   * 모든 데이터 수신에 대해, 버퍼에 데이터를 추가한 후 버퍼 크기는 설정된 최대 크기를 초과하지 않아야 하며,
   * 최대 크기 도달 시 가장 오래된 데이터가 제거되어야 합니다.
   */
  it('Property 8: 버퍼 크기 제한 준수', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 1000 }), // 작은 버퍼 크기
        fc.integer({ min: 10, max: 50 }), // 데이터 청크 수
        async (maxBufferSize, chunkCount) => {
          const session = new TelnetSession();
          
          try {
            await session.connect('localhost', TEST_PORT, 2000);
            
            // 버퍼 크기 제한 설정
            const sessionData = session.getSession();
            sessionData.maxBufferSize = maxBufferSize;
            
            // 버퍼를 초과하는 데이터 전송
            const chunkSize = 20;
            for (let i = 0; i < chunkCount; i++) {
              const data = 'x'.repeat(chunkSize);
              await session.sendCommand(data);
            }
            
            // 데이터가 도착할 때까지 대기
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // 버퍼 크기 확인
            const buffer = sessionData.buffer;
            expect(buffer.length).toBeLessThanOrEqual(maxBufferSize);
          } finally {
            await session.disconnect();
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * **Feature: telnet-mcp-server, Property 3: 버퍼 읽기 후 비우기**
   * **Validates: Requirements 3.1, 3.2**
   * 
   * 모든 세션에 대해, 버퍼에서 데이터를 읽으면 읽은 데이터가 반환되어야 하며,
   * 읽기 작업 후 버퍼는 비어 있어야 합니다.
   */
  it('Property 3: 버퍼 읽기 후 비우기', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (command) => {
          const session = new TelnetSession();
          
          try {
            await session.connect('localhost', TEST_PORT, 2000);
            
            // 명령 전송
            await session.sendCommand(command);
            
            // 데이터 도착 대기
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // 첫 번째 읽기
            const response1 = await session.readResponse();
            expect(response1).toBe(command + '\r\n');
            
            // 버퍼가 비어있어야 함
            const sessionData = session.getSession();
            expect(sessionData.buffer.length).toBe(0);
            
            // 두 번째 읽기는 빈 문자열 반환
            const response2 = await session.readResponse();
            expect(response2).toBe('');
          } finally {
            await session.disconnect();
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * **Feature: telnet-mcp-server, Property 13: UTF-8 디코딩 정확성**
   * **Validates: Requirements 8.3**
   * 
   * 모든 UTF-8 인코딩된 데이터에 대해, 읽기 도구에서 'utf8' 인코딩을 지정하면
   * 올바른 유니코드 문자열로 디코딩되어야 하며, 멀티바이트 문자가 올바르게 처리되어야 합니다.
   */
  it('Property 13: UTF-8 디코딩 정확성', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // 유니코드 문자 포함
        async (text) => {
          const session = new TelnetSession();
          
          try {
            await session.connect('localhost', TEST_PORT, 2000);
            
            // UTF-8 텍스트 전송
            await session.sendCommand(text);
            
            // 데이터 도착 대기
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // UTF-8로 읽기
            const response = await session.readResponse(undefined, 'utf8');
            
            // 원본 텍스트 + CRLF와 일치해야 함
            expect(response).toBe(text + '\r\n');
          } finally {
            await session.disconnect();
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * **Feature: telnet-mcp-server, Property 14: ANSI 제어 코드 보존**
   * **Validates: Requirements 8.4**
   * 
   * 모든 ANSI 제어 코드(ESC 시퀀스)를 포함한 데이터에 대해, 버퍼에 저장하고 읽을 때
   * 제어 코드가 원본 그대로 보존되어야 하며, 색상 코드, 커서 이동 등의 시퀀스가 손실되지 않아야 합니다.
   */
  it('Property 14: ANSI 제어 코드 보존', async () => {
    const ansiCodes = [
      '\x1b[31m', // 빨간색
      '\x1b[32m', // 녹색
      '\x1b[1m',  // 굵게
      '\x1b[0m',  // 리셋
      '\x1b[H',   // 홈
      '\x1b[2J',  // 화면 지우기
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...ansiCodes),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (ansiCode, text) => {
          const session = new TelnetSession();
          
          try {
            await session.connect('localhost', TEST_PORT, 2000);
            
            // ANSI 코드 + 텍스트 전송
            const message = ansiCode + text;
            await session.sendCommand(message);
            
            // 데이터 도착 대기
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // 읽기
            const response = await session.readResponse();
            
            // ANSI 코드가 보존되어야 함
            expect(response).toBe(message + '\r\n');
          } finally {
            await session.disconnect();
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * **Feature: telnet-mcp-server, Property 12: 이진 데이터 라운드트립**
   * **Validates: Requirements 8.3**
   * 
   * 모든 이진 데이터에 대해, 데이터를 인코딩한 후 디코딩하면 원본 데이터와 동일해야 합니다.
   */
  it('Property 12: 이진 데이터 라운드트립', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 50 }),
        async (binaryData) => {
          const session = new TelnetSession();
          
          try {
            await session.connect('localhost', TEST_PORT, 2000);
            
            // 이진 데이터를 base64로 인코딩하여 전송
            const base64Data = Buffer.from(binaryData).toString('base64');
            await session.sendCommand(base64Data);
            
            // 데이터 도착 대기
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // 읽기
            const response = await session.readResponse();
            
            // CRLF 제거
            const receivedBase64 = response.replace('\r\n', '');
            
            // 디코딩
            const decodedData = Buffer.from(receivedBase64, 'base64');
            
            // 원본과 일치해야 함
            expect(Array.from(decodedData)).toEqual(Array.from(binaryData));
          } finally {
            await session.disconnect();
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * **Feature: telnet-mcp-server, Property 5: 세션 종료 시 리소스 정리**
   * **Validates: Requirements 4.1, 4.2**
   * 
   * 모든 활성 세션에 대해, 연결 해제를 호출하면 TCP 소켓이 닫혀야 하며,
   * 세션이 비활성 상태가 되어야 합니다.
   */
  it('Property 5: 세션 종료 시 리소스 정리', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (sessionCount) => {
          const sessions: TelnetSession[] = [];
          
          try {
            // 여러 세션 생성
            for (let i = 0; i < sessionCount; i++) {
              const session = new TelnetSession();
              await session.connect('localhost', TEST_PORT, 2000);
              sessions.push(session);
            }
            
            // 모든 세션이 활성 상태여야 함
            for (const session of sessions) {
              expect(session.isConnected()).toBe(true);
            }
            
            // 모든 세션 종료
            for (const session of sessions) {
              await session.disconnect();
            }
            
            // 모든 세션이 비활성 상태여야 함
            for (const session of sessions) {
              expect(session.isConnected()).toBe(false);
              expect(session.getSession().socket).toBeNull();
            }
          } finally {
            // 정리 (이미 닫혔지만 안전을 위해)
            for (const session of sessions) {
              await session.disconnect();
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * **Feature: telnet-mcp-server, Property 6: 연결 해제의 멱등성**
   * **Validates: Requirements 4.3**
   * 
   * 모든 세션에 대해, 연결 해제를 여러 번 호출해도 오류가 발생하지 않아야 하며,
   * 첫 번째 호출 이후의 호출은 상태를 변경하지 않아야 합니다.
   */
  it('Property 6: 연결 해제의 멱등성', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // 연결 해제 호출 횟수
        async (disconnectCount) => {
          const session = new TelnetSession();
          
          try {
            await session.connect('localhost', TEST_PORT, 2000);
            expect(session.isConnected()).toBe(true);
            
            // 여러 번 연결 해제 호출
            for (let i = 0; i < disconnectCount; i++) {
              await session.disconnect();
              
              // 항상 비활성 상태여야 함
              expect(session.isConnected()).toBe(false);
            }
          } finally {
            await session.disconnect();
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);
});
