import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { searchIndicators, getIndicator } from './catalog.js';
import { dataService, DataError } from './data.js';

export function createMcpServer(service = dataService) {
  const server = new McpServer({ name: 'bc-aberto', version: '2.0.0' });
  const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
  const result = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value });
  server.registerTool('search_indicators', {
    description: 'Busca no catalogo curado BCB/SGS por assunto, nome ou termo em portugues. Nao cobre todas as series do BCB.',
    inputSchema: { q: z.string().max(200).optional(), topic: z.string().max(80).optional() }, annotations,
  }, async input => result({ data: searchIndicators(input) }));
  server.registerTool('get_indicator', {
    description: 'Retorna unidade, frequencia, fonte, codigo SGS, metodologia e limitacoes de um indicador.',
    inputSchema: { id: z.string().max(80) }, annotations,
  }, async ({ id }) => {
    const indicator = getIndicator(id);
    return indicator ? result({ data: indicator }) : { isError: true, content: [{ type: 'text', text: 'INDICATOR_NOT_FOUND: indicador nao encontrado.' }] };
  });
  server.registerTool('get_observations', {
    description: 'Consulta dados oficiais, sem estimativas. Datas YYYY-MM-DD, no maximo cinco anos. Unidades, explicacoes e proveniencia em meta. Periodos YYYY-MM para mensais, YYYY-QN para trimestrais; nao sao datas de publicacao. Poupanca tem frequencia diaria mas unidade mensal. Vazio significa ausencia de dados; nunca zero. Nao comparar unidades diferentes como se fossem iguais.',
    inputSchema: {
      id: z.string().max(80), start: z.string().optional(), end: z.string().optional(),
      limit: z.number().int().min(1).max(2000).optional(),
    }, annotations,
  }, async ({ id, ...query }) => {
    try { return result(await service.observations(id, query)); }
    catch (error) {
      console.error('MCP observation failed:', error.message);
      if (!(error instanceof DataError)) throw error;
      return { isError: true, content: [{ type: 'text', text: `${error.code}: ${error.message}` }] };
    }
  });
  return server;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, MCP-Protocol-Version, MCP-Session-Id');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Use POST. MCP Streamable HTTP sem sessoes ou SSE.' } });
  }
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP transport failed:', error.message);
    if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Erro interno no transporte MCP.' } });
  } finally {
    await transport.close();
    await server.close();
  }
}
