import { TelnetCommands, TelnetOptions } from './types.js';

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
export function processIAC(data: Buffer): { 
  cleanData: Buffer; 
  iacSequences: Array<{ command: number; option?: number }> 
} {
  const cleanData: number[] = [];
  const iacSequences: Array<{ command: number; option?: number }> = [];
  
  let i = 0;
  while (i < data.length) {
    // IAC 시퀀스 감지 (255)
    if (data[i] === TelnetCommands.IAC) {
      if (i + 1 < data.length) {
        const command = data[i + 1];
        
        // IAC IAC는 255 바이트를 의미 (이스케이프)
        if (command === TelnetCommands.IAC) {
          cleanData.push(TelnetCommands.IAC);
          i += 2;
          continue;
        }
        
        // DO, DONT, WILL, WONT 명령은 옵션 바이트를 포함
        if (
          command === TelnetCommands.DO ||
          command === TelnetCommands.DONT ||
          command === TelnetCommands.WILL ||
          command === TelnetCommands.WONT
        ) {
          if (i + 2 < data.length) {
            const option = data[i + 2];
            iacSequences.push({ command, option });
            i += 3;
            continue;
          }
        }
        
        // SB (Subnegotiation Begin) 처리
        if (command === TelnetCommands.SB) {
          // SE (Subnegotiation End)를 찾을 때까지 스킵
          let j = i + 2;
          while (j < data.length) {
            if (data[j] === TelnetCommands.IAC && j + 1 < data.length && data[j + 1] === TelnetCommands.SE) {
              iacSequences.push({ command });
              i = j + 2;
              break;
            }
            j++;
          }
          if (j >= data.length) {
            // SE를 찾지 못한 경우, 나머지 데이터 스킵
            i = data.length;
          }
          continue;
        }
        
        // 기타 IAC 명령
        iacSequences.push({ command });
        i += 2;
      } else {
        // 버퍼 끝에 IAC만 있는 경우
        i++;
      }
    } else {
      // 일반 데이터
      cleanData.push(data[i]);
      i++;
    }
  }
  
  return {
    cleanData: Buffer.from(cleanData),
    iacSequences,
  };
}

/**
 * Telnet 옵션 협상 응답 생성
 * 기본 정책: 모든 옵션에 대해 거부 응답
 * 
 * @param command - 수신한 명령 (DO, DONT, WILL, WONT)
 * @param option - 옵션 코드
 * @returns 응답 버퍼
 */
export function negotiateOption(command: number, option: number): Buffer {
  const response: number[] = [TelnetCommands.IAC];
  
  // DO 요청에 대해 WONT로 응답 (우리는 해당 옵션을 지원하지 않음)
  if (command === TelnetCommands.DO) {
    response.push(TelnetCommands.WONT, option);
  }
  // DONT 요청에 대해 WONT로 응답 (이미 하지 않고 있음을 확인)
  else if (command === TelnetCommands.DONT) {
    response.push(TelnetCommands.WONT, option);
  }
  // WILL 요청에 대해 DONT로 응답 (우리는 해당 옵션을 원하지 않음)
  else if (command === TelnetCommands.WILL) {
    response.push(TelnetCommands.DONT, option);
  }
  // WONT 요청에 대해 DONT로 응답 (하지 않는 것을 확인)
  else if (command === TelnetCommands.WONT) {
    response.push(TelnetCommands.DONT, option);
  }
  
  return Buffer.from(response);
}

/**
 * 데이터에서 IAC 시퀀스를 처리하고 협상 응답 생성
 * 
 * @param data - 수신한 데이터
 * @returns 정리된 데이터와 전송할 응답 버퍼 배열
 */
export function handleTelnetProtocol(data: Buffer): {
  cleanData: Buffer;
  responses: Buffer[];
} {
  const { cleanData, iacSequences } = processIAC(data);
  const responses: Buffer[] = [];
  
  // 옵션 협상이 필요한 시퀀스에 대해 응답 생성
  for (const seq of iacSequences) {
    if (seq.option !== undefined) {
      const response = negotiateOption(seq.command, seq.option);
      responses.push(response);
    }
  }
  
  return { cleanData, responses };
}
