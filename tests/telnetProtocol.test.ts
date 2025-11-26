import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { processIAC, negotiateOption, handleTelnetProtocol } from '../src/telnetProtocol.js';
import { TelnetCommands } from '../src/types.js';

/**
 * Feature: telnet-mcp-server, Property 10: IAC 시퀀스 처리
 * 
 * 모든 IAC(Interpret As Command) 시퀀스에 대해, 수신된 데이터에서 IAC 시퀀스를 감지하면
 * 적절히 해석되어야 하며, 일반 텍스트 데이터와 분리되어 처리되어야 합니다.
 * 
 * 검증: 요구사항 8.1
 */
describe('Property 10: IAC 시퀀스 처리', () => {
  it('일반 텍스트 데이터는 IAC 처리 후에도 보존되어야 함', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 0, maxLength: 100 }).filter(arr => 
          !arr.includes(TelnetCommands.IAC)
        ),
        (textData) => {
          const buffer = Buffer.from(textData);
          const result = processIAC(buffer);
          
          // IAC가 없는 데이터는 그대로 반환되어야 함
          expect(result.cleanData).toEqual(buffer);
          expect(result.iacSequences).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('IAC IAC 시퀀스는 단일 255 바이트로 변환되어야 함', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 0, maxLength: 50 }).filter(arr => 
          !arr.includes(TelnetCommands.IAC)
        ),
        fc.uint8Array({ minLength: 0, maxLength: 50 }).filter(arr => 
          !arr.includes(TelnetCommands.IAC)
        ),
        (prefix, suffix) => {
          // prefix + IAC IAC + suffix 구성
          const data = Buffer.concat([
            Buffer.from(prefix),
            Buffer.from([TelnetCommands.IAC, TelnetCommands.IAC]),
            Buffer.from(suffix)
          ]);
          
          const result = processIAC(data);
          
          // IAC IAC는 단일 IAC(255)로 변환
          const expected = Buffer.concat([
            Buffer.from(prefix),
            Buffer.from([TelnetCommands.IAC]),
            Buffer.from(suffix)
          ]);
          
          expect(result.cleanData).toEqual(expected);
          expect(result.iacSequences).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('IAC + 옵션 협상 명령은 감지되고 일반 데이터에서 제거되어야 함', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          TelnetCommands.DO,
          TelnetCommands.DONT,
          TelnetCommands.WILL,
          TelnetCommands.WONT
        ),
        fc.integer({ min: 0, max: 255 }),
        fc.uint8Array({ minLength: 0, maxLength: 50 }).filter(arr => 
          !arr.includes(TelnetCommands.IAC)
        ),
        (command, option, textData) => {
          // textData + IAC + command + option 구성
          const data = Buffer.concat([
            Buffer.from(textData),
            Buffer.from([TelnetCommands.IAC, command, option])
          ]);
          
          const result = processIAC(data);
          
          // IAC 시퀀스는 제거되고 일반 데이터만 남아야 함
          expect(result.cleanData).toEqual(Buffer.from(textData));
          
          // IAC 시퀀스가 감지되어야 함
          expect(result.iacSequences).toHaveLength(1);
          expect(result.iacSequences[0]).toEqual({ command, option });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('여러 IAC 시퀀스가 섞인 데이터를 올바르게 분리해야 함', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            // 일반 텍스트
            fc.uint8Array({ minLength: 1, maxLength: 10 }).filter(arr => 
              !arr.includes(TelnetCommands.IAC)
            ).map(arr => ({ type: 'text' as const, data: arr })),
            // IAC 옵션 협상
            fc.record({
              type: fc.constant('iac' as const),
              command: fc.constantFrom(
                TelnetCommands.DO,
                TelnetCommands.DONT,
                TelnetCommands.WILL,
                TelnetCommands.WONT
              ),
              option: fc.integer({ min: 0, max: 255 })
            })
          ),
          { minLength: 1, maxLength: 20 }
        ),
        (segments) => {
          // 세그먼트를 버퍼로 조합
          const buffers: Buffer[] = [];
          const expectedText: number[] = [];
          const expectedIAC: Array<{ command: number; option: number }> = [];
          
          for (const seg of segments) {
            if (seg.type === 'text') {
              buffers.push(Buffer.from(seg.data));
              expectedText.push(...seg.data);
            } else {
              buffers.push(Buffer.from([TelnetCommands.IAC, seg.command, seg.option]));
              expectedIAC.push({ command: seg.command, option: seg.option });
            }
          }
          
          const data = Buffer.concat(buffers);
          const result = processIAC(data);
          
          // 일반 텍스트만 추출되어야 함
          expect(result.cleanData).toEqual(Buffer.from(expectedText));
          
          // 모든 IAC 시퀀스가 감지되어야 함
          expect(result.iacSequences).toHaveLength(expectedIAC.length);
          expect(result.iacSequences).toEqual(expectedIAC);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: telnet-mcp-server, Property 11: Telnet 옵션 협상 응답
 * 
 * 모든 Telnet 옵션 협상 요청에 대해, 서버는 정의된 기본 옵션에 따라
 * WILL, WONT, DO, DONT 중 적절한 응답을 생성하여 전송해야 합니다.
 * 
 * 검증: 요구사항 8.2
 */
describe('Property 11: Telnet 옵션 협상 응답', () => {
  it('DO 명령에 대해 WONT로 응답해야 함', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        (option) => {
          const response = negotiateOption(TelnetCommands.DO, option);
          
          // 응답은 IAC WONT <option> 형태여야 함
          expect(response).toEqual(
            Buffer.from([TelnetCommands.IAC, TelnetCommands.WONT, option])
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('DONT 명령에 대해 WONT로 응답해야 함', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        (option) => {
          const response = negotiateOption(TelnetCommands.DONT, option);
          
          // 응답은 IAC WONT <option> 형태여야 함
          expect(response).toEqual(
            Buffer.from([TelnetCommands.IAC, TelnetCommands.WONT, option])
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('WILL 명령에 대해 DONT로 응답해야 함', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        (option) => {
          const response = negotiateOption(TelnetCommands.WILL, option);
          
          // 응답은 IAC DONT <option> 형태여야 함
          expect(response).toEqual(
            Buffer.from([TelnetCommands.IAC, TelnetCommands.DONT, option])
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('WONT 명령에 대해 DONT로 응답해야 함', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        (option) => {
          const response = negotiateOption(TelnetCommands.WONT, option);
          
          // 응답은 IAC DONT <option> 형태여야 함
          expect(response).toEqual(
            Buffer.from([TelnetCommands.IAC, TelnetCommands.DONT, option])
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('모든 협상 명령에 대해 유효한 IAC 응답을 생성해야 함', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          TelnetCommands.DO,
          TelnetCommands.DONT,
          TelnetCommands.WILL,
          TelnetCommands.WONT
        ),
        fc.integer({ min: 0, max: 255 }),
        (command, option) => {
          const response = negotiateOption(command, option);
          
          // 응답은 항상 3바이트여야 함
          expect(response.length).toBe(3);
          
          // 첫 바이트는 항상 IAC
          expect(response[0]).toBe(TelnetCommands.IAC);
          
          // 두 번째 바이트는 유효한 응답 명령
          expect([
            TelnetCommands.DO,
            TelnetCommands.DONT,
            TelnetCommands.WILL,
            TelnetCommands.WONT
          ]).toContain(response[1]);
          
          // 세 번째 바이트는 옵션 코드
          expect(response[2]).toBe(option);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handleTelnetProtocol은 IAC 시퀀스를 처리하고 적절한 응답을 생성해야 함', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            command: fc.constantFrom(
              TelnetCommands.DO,
              TelnetCommands.DONT,
              TelnetCommands.WILL,
              TelnetCommands.WONT
            ),
            option: fc.integer({ min: 0, max: 255 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.uint8Array({ minLength: 0, maxLength: 50 }).filter(arr => 
          !arr.includes(TelnetCommands.IAC)
        ),
        (negotiations, textData) => {
          // IAC 시퀀스와 텍스트 데이터를 섞어서 구성
          const buffers: Buffer[] = [Buffer.from(textData)];
          
          for (const neg of negotiations) {
            buffers.push(Buffer.from([TelnetCommands.IAC, neg.command, neg.option]));
          }
          
          const data = Buffer.concat(buffers);
          const result = handleTelnetProtocol(data);
          
          // 텍스트 데이터만 남아야 함
          expect(result.cleanData).toEqual(Buffer.from(textData));
          
          // 각 협상에 대한 응답이 생성되어야 함
          expect(result.responses).toHaveLength(negotiations.length);
          
          // 각 응답이 올바른 형식이어야 함
          for (let i = 0; i < negotiations.length; i++) {
            const expectedResponse = negotiateOption(
              negotiations[i].command,
              negotiations[i].option
            );
            expect(result.responses[i]).toEqual(expectedResponse);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
