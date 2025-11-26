/**
 * Telnet 프로토콜 핸들러
 * IAC 시퀀스 처리 및 옵션 협상 기능 제공
 */
/**
 * IAC 시퀀스를 감지하고 파싱
 *
 * @param data - 원본 데이터 버퍼
 * @returns 처리된 데이터와 IAC 시퀀스 정보
 */
export declare function processIAC(data: Buffer): {
    cleanData: Buffer;
    iacSequences: Array<{
        command: number;
        option?: number;
    }>;
};
/**
 * Telnet 옵션 협상 응답 생성
 * 기본 정책: 모든 옵션에 대해 거부 응답
 *
 * @param command - 수신한 명령 (DO, DONT, WILL, WONT)
 * @param option - 옵션 코드
 * @returns 응답 버퍼
 */
export declare function negotiateOption(command: number, option: number): Buffer;
/**
 * 데이터에서 IAC 시퀀스를 처리하고 협상 응답 생성
 *
 * @param data - 수신한 데이터
 * @returns 정리된 데이터와 전송할 응답 버퍼 배열
 */
export declare function handleTelnetProtocol(data: Buffer): {
    cleanData: Buffer;
    responses: Buffer[];
};
//# sourceMappingURL=telnetProtocol.d.ts.map