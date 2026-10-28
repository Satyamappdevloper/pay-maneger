/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EqualPay: Full-Stack Express Server & Vite Dev Engine Entrypoint
 * Listens on port 3000, mounts /api/v1 routes, and runs Vite middlewares in development.
 */

import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/routes.ts';

dotenv.config();
process.env.DISABLE_HMR = 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Body parser middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS headers for local / cross-origin mobile clients
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Mount API router at /api/v1
  app.use('/api/v1', apiRouter);

  // Development: Mount Vite in middleware mode
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
    console.log(`[Pay Manager] Vite middleware attached for live client rendering.`);
  } else {
    // Production: Serve static assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 Pay Manager Full-Stack Server Running on Port ${PORT}`);
    console.log(`📡 API Endpoints: http://0.0.0.0:${PORT}/api/v1`);
    console.log(`✨ Environment: ${isProd ? 'Production' : 'Development'}`);
    console.log(`====================================================`);
  });
}

startServer().catch((err) => {
  console.error('[EqualPay Server Fatal Error]:', err);
  process.exit(1);
});
