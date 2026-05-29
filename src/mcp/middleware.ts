import type { Request, Response, NextFunction } from 'express';

export function mcpApiKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env['MCP_API_KEY'];

  if (!apiKey) {
    res.status(500).json({ error: 'MCP_API_KEY is not configured on this server' });
    return;
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
