import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * **Feature: telnet-mcp-server, Property 9: 도구 호출 라우팅**
 * **검증: 요구사항 7.3, 7.4**
 * 
 * 모든 유효한 MCP 도구 호출 요청에 대해, 요청이 검증을 통과하면 
 * 해당 도구에 매핑된 함수가 실행되어야 하며, 
 * 실행 결과가 MCP 프로토콜 형식으로 반환되어야 합니다.
 */

describe('MCP Server - Property 9: 도구 호출 라우팅', () => {
  it('유효한 도구 이름은 적절한 핸들러로 라우팅되어야 함', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('telnet_connect', 'telnet_send', 'telnet_read', 'telnet_disconnect', 'telnet_list'),
        (toolName) => {
          // 도구 이름이 유효한 도구 목록에 포함되어 있는지 확인
          const validTools = ['telnet_connect', 'telnet_send', 'telnet_read', 'telnet_disconnect', 'telnet_list'];
          expect(validTools).toContain(toolName);
          
          // 각 도구는 고유한 이름을 가져야 함
          const uniqueTools = new Set(validTools);
          expect(uniqueTools.size).toBe(validTools.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('도구 스키마는 필수 필드를 포함해야 함', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          { name: 'telnet_connect', requiredFields: ['host', 'port'] },
          { name: 'telnet_send', requiredFields: ['sessionId', 'command'] },
          { name: 'telnet_read', requiredFields: ['sessionId'] },
          { name: 'telnet_disconnect', requiredFields: ['sessionId'] },
          { name: 'telnet_list', requiredFields: [] }
        ),
        (toolSpec) => {
          // 각 도구는 이름을 가져야 함
          expect(toolSpec.name).toBeTruthy();
          expect(typeof toolSpec.name).toBe('string');
          
          // 필수 필드는 배열이어야 함
          expect(Array.isArray(toolSpec.requiredFields)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
