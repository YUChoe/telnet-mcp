#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { SessionManager } from './sessionManager.js';
/**
 * MCP Telnet Server
 * Model Context Protocol을 통해 Telnet 서버와 상호작용하는 서버
 */
// 세션 관리자 인스턴스
const sessionManager = new SessionManager();
// MCP 서버 인스턴스 생성
const server = new McpServer({
    name: 'telnet-mcp-server',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
/**
 * 서버 시작
 */
async function main() {
    // 도구 등록
    registerTools();
    // StdioServerTransport 설정
    const transport = new StdioServerTransport();
    // 서버와 트랜스포트 연결
    await server.connect(transport);
    console.error('Telnet MCP Server started');
}
/**
 * MCP 도구 등록
 */
function registerTools() {
    // telnet_connect 도구 등록
    server.registerTool('telnet_connect', {
        description: 'Connect to a Telnet server',
        inputSchema: {
            host: z.string().describe('Telnet server hostname or IP address'),
            port: z.number().int().min(1).max(65535).describe('Telnet server port number'),
            timeout: z.number().int().positive().optional().describe('Connection timeout in milliseconds (default: 5000)'),
        },
    }, async (args) => {
        return await handleConnect(args);
    });
    // telnet_send 도구 등록
    server.registerTool('telnet_send', {
        description: 'Send a command to an active Telnet session',
        inputSchema: {
            sessionId: z.string().describe('Session ID returned from telnet_connect'),
            command: z.string().describe('Command to send to the Telnet server'),
        },
    }, async (args) => {
        return await handleSend(args);
    });
    // telnet_read 도구 등록
    server.registerTool('telnet_read', {
        description: 'Read response from an active Telnet session',
        inputSchema: {
            sessionId: z.string().describe('Session ID returned from telnet_connect'),
            waitMs: z.number().int().positive().optional().describe('Time to wait for data in milliseconds (optional)'),
            encoding: z.string().optional().describe('Encoding format (default: utf8, options: base64, hex, binary)'),
        },
    }, async (args) => {
        return await handleRead(args);
    });
    // telnet_disconnect 도구 등록
    server.registerTool('telnet_disconnect', {
        description: 'Disconnect from a Telnet session',
        inputSchema: {
            sessionId: z.string().describe('Session ID to disconnect'),
        },
    }, async (args) => {
        return await handleDisconnect(args);
    });
    // telnet_list 도구 등록
    server.registerTool('telnet_list', {
        description: 'List all active Telnet sessions',
    }, async () => {
        return await handleList();
    });
}
/**
 * telnet_connect 핸들러
 */
async function handleConnect(args) {
    const timeout = args.timeout || 5000;
    try {
        // 세션 생성 및 연결
        const sessionId = await sessionManager.createSession(args.host, args.port, timeout);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        sessionId,
                        message: `Connected to ${args.host}:${args.port}`,
                    }),
                },
            ],
        };
    }
    catch (error) {
        throw new Error(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * telnet_send 핸들러
 */
async function handleSend(args) {
    // 세션 조회
    const session = sessionManager.getSession(args.sessionId);
    if (!session) {
        throw new Error('Session not found');
    }
    // 연결 상태 확인
    if (!session.isConnected()) {
        throw new Error('Session disconnected');
    }
    try {
        // 명령 전송
        await session.sendCommand(args.command);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: 'Command sent successfully',
                    }),
                },
            ],
        };
    }
    catch (error) {
        throw new Error(`Failed to send command: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * telnet_read 핸들러
 */
async function handleRead(args) {
    // 세션 조회
    const session = sessionManager.getSession(args.sessionId);
    if (!session) {
        throw new Error('Session not found');
    }
    try {
        // 인코딩 검증
        const encoding = (args.encoding || 'utf8');
        const validEncodings = ['utf8', 'base64', 'hex', 'binary', 'ascii', 'latin1'];
        if (!validEncodings.includes(encoding)) {
            throw new Error(`Invalid encoding: ${encoding}`);
        }
        // 응답 읽기
        const data = await session.readResponse(args.waitMs, encoding);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        data,
                    }),
                },
            ],
        };
    }
    catch (error) {
        throw new Error(`Failed to read response: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * telnet_disconnect 핸들러
 */
async function handleDisconnect(args) {
    try {
        // 세션 삭제 (연결 종료 포함)
        await sessionManager.deleteSession(args.sessionId);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: 'Session disconnected successfully',
                    }),
                },
            ],
        };
    }
    catch (error) {
        throw new Error(`Failed to disconnect: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * telnet_list 핸들러
 */
async function handleList() {
    try {
        // 모든 활성 세션 목록 조회
        const sessions = sessionManager.listSessions();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        sessions: sessions.map(s => ({
                            sessionId: s.sessionId,
                            host: s.host,
                            port: s.port,
                            connectedAt: s.connectedAt.toISOString(),
                            isActive: s.isActive,
                        })),
                    }),
                },
            ],
        };
    }
    catch (error) {
        throw new Error(`Failed to list sessions: ${error instanceof Error ? error.message : String(error)}`);
    }
}
// 서버 시작
main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map