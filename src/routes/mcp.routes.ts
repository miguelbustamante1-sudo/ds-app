import { Router } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMcpServer } from '../mcp/server';
import type { Request, Response } from 'express';

const router = Router();

async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  const server = createMcpServer();
  try {
    // Stateless mode: no sessionIdGenerator means a new transport per request.
    // Cast is required because exactOptionalPropertyTypes makes the SDK class
    // structurally incompatible with its own Transport interface at the type level,
    // even though it implements it correctly at runtime.
    const transport = new StreamableHTTPServerTransport() as Parameters<Server['connect']>[0];
    await server.connect(transport);
    await (transport as StreamableHTTPServerTransport).handleRequest(req, res, req.body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  } finally {
    await server.close();
  }
}

router.post('/', handleMcpRequest);
router.get('/', handleMcpRequest);

export default router;
