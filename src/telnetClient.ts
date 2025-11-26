import { Socket } from 'net';
import { randomUUID } from 'crypto';
import { Session, DEFAULT_CONFIG } from './types.js';
import { processIAC } from './telnetProtocol.js';

/**
 * Telnet 클라이언트 세션 클래스
 * 개별 Telnet 연결을 관리하고 프로토콜을 처리합니다.
 */
export class TelnetSession {
  private session: Session;

  constructor(sessionId?: string) {
    this.session = {
      id: sessionId || randomUUID(),
      host: '',
      port: 0,
      socket: null,
      buffer: Buffer.alloc(0),
      connectedAt: new Date(),
      isActive: false,
      maxBufferSize: DEFAULT_CONFIG.MAX_BUFFER_SIZE,
    };
  }

  /**
   * 세션 ID 반환
   */
  getId(): string {
    return this.session.id;
  }

  /**
   * 세션 정보 반환
   */
  getSession(): Session {
    return this.session;
  }

  /**
   * Telnet 서버에 연결
   * @param host 호스트 주소
   * @param port 포트 번호
   * @param timeout 연결 타임아웃 (밀리초)
   */
  async connect(host: string, port: number, timeout: number = DEFAULT_CONFIG.TIMEOUT): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      
      // 타임아웃 설정
      const timeoutId = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Connection timeout after ${timeout}ms`));
      }, timeout);

      // 연결 성공 핸들러
      socket.once('connect', () => {
        clearTimeout(timeoutId);
        this.session.host = host;
        this.session.port = port;
        this.session.socket = socket;
        this.session.isActive = true;
        this.session.connectedAt = new Date();
        
        // 데이터 수신 핸들러 설정
        this.setupDataHandler();
        
        // 오류 핸들러 설정
        this.setupErrorHandlers();
        
        resolve();
      });

      // 연결 오류 핸들러
      socket.once('error', (err) => {
        clearTimeout(timeoutId);
        reject(new Error(`Connection failed: ${err.message}`));
      });

      // 연결 시도
      socket.connect(port, host);
    });
  }

  /**
   * 데이터 수신 핸들러 설정
   */
  private setupDataHandler(): void {
    if (!this.session.socket) return;

    this.session.socket.on('data', (data: Buffer) => {
      // IAC 시퀀스 처리
      const { cleanData } = processIAC(data);
      
      // 버퍼에 데이터 추가
      this.appendToBuffer(cleanData);
    });
  }

  /**
   * 오류 핸들러 설정
   */
  private setupErrorHandlers(): void {
    if (!this.session.socket) return;

    // 예기치 않은 연결 끊김
    this.session.socket.on('close', () => {
      this.session.isActive = false;
    });

    // 네트워크 오류
    this.session.socket.on('error', (err) => {
      console.error(`Socket error for session ${this.session.id}:`, err.message);
      this.session.isActive = false;
    });
  }

  /**
   * 버퍼에 데이터 추가 (FIFO 방식으로 크기 제한 준수)
   */
  private appendToBuffer(data: Buffer): void {
    // 새 데이터를 버퍼에 추가
    this.session.buffer = Buffer.concat([this.session.buffer, data]);
    
    // 버퍼 크기 제한 확인
    if (this.session.buffer.length > this.session.maxBufferSize) {
      // 가장 오래된 데이터 제거 (FIFO)
      const excess = this.session.buffer.length - this.session.maxBufferSize;
      this.session.buffer = this.session.buffer.subarray(excess);
    }
  }

  /**
   * 명령 전송
   * @param command 전송할 명령
   */
  async sendCommand(command: string): Promise<void> {
    if (!this.session.socket || !this.session.isActive) {
      throw new Error('Session is not connected');
    }

    return new Promise((resolve, reject) => {
      // CRLF 추가
      const data = command + DEFAULT_CONFIG.CRLF;
      
      this.session.socket!.write(data, 'utf8', (err) => {
        if (err) {
          reject(new Error(`Failed to send command: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 응답 읽기
   * @param waitMs 데이터 대기 시간 (선택)
   * @param encoding 인코딩 방식 (기본값: 'utf8')
   */
  async readResponse(waitMs?: number, encoding: BufferEncoding = DEFAULT_CONFIG.DEFAULT_ENCODING): Promise<string> {
    // 대기 옵션이 있으면 대기
    if (waitMs && waitMs > 0) {
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }

    // 버퍼에서 데이터 읽기
    const data = this.session.buffer.toString(encoding);
    
    // 버퍼 비우기
    this.session.buffer = Buffer.alloc(0);
    
    return data;
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    // 이미 닫힌 경우 (멱등성)
    if (!this.session.socket || !this.session.isActive) {
      return;
    }

    return new Promise((resolve) => {
      this.session.socket!.once('close', () => {
        this.session.isActive = false;
        this.session.socket = null;
        resolve();
      });

      this.session.socket!.end();
    });
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.session.isActive && this.session.socket !== null;
  }
}
