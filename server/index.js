const path = require('path');
const fs = require('fs');
const Fastify = require('fastify');
const config = require('./config');
const db = require('./db');
const GitService = require('./services/git-service');
const FileWatcher = require('./services/file-watcher');
const { broadcast } = require('./services/broadcast');

async function main() {
  // Ensure repos directory exists
  if (!fs.existsSync(config.reposDir)) {
    fs.mkdirSync(config.reposDir, { recursive: true });
    console.log(`📁 Created repos directory: ${config.reposDir}`);
  }

  // Initialize Fastify
  const fastify = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // ── Plugins ────────────────────────────────────────
  await fastify.register(require('@fastify/cors'), { origin: true });
  await fastify.register(require('@fastify/websocket'));

  // ── Auth Middleware (except /api/health) ──────────
  const authMiddleware = require('./middleware/auth');
  fastify.addHook('preHandler', authMiddleware);

  // ── Health (no auth, must register before auth hook catches it) ──
  // Actually, the onRequest hook runs for all routes but the middleware
  // skips /api/health. This is fine.

  // ── Database ──────────────────────────────────────
  db.initialize();
  console.log('🗄️  Database initialized');

  // ── Git Service ───────────────────────────────────
  const gitService = new GitService(config.reposDir);
  await gitService.init();
  fastify.decorate('gitService', gitService);

  // ── File Watcher ──────────────────────────────────
  const fileWatcher = new FileWatcher(config.reposDir, gitService, broadcast);
  fileWatcher.start();
  fastify.addHook('onClose', () => fileWatcher.stop());

  // ── API Routes ────────────────────────────────────
  fastify.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  fastify.register(require('./routes/auth'), { prefix: '/api' });
  fastify.register(require('./routes/files'), { prefix: '/api' });
  fastify.register(require('./routes/share'), { prefix: '/api' });
  fastify.register(require('./routes/ws'));

  // ── Static Files (built client) ──────────────────
  const clientDist = path.join(__dirname, '../client/dist');
  if (fs.existsSync(clientDist)) {
    await fastify.register(require('@fastify/static'), {
      root: clientDist,
      prefix: '/',
      wildcard: true,
    });

    // SPA fallback: serve index.html for non-API routes
    fastify.setNotFoundHandler(async (request, reply) => {
      if (
        request.url.startsWith('/api') ||
        request.url.startsWith('/ws')
      ) {
        return reply.code(404).send({ error: 'Not found' });
      }
      // For SPA routing, serve index.html
      return reply.sendFile('index.html');
    });
  } else {
    console.log('⚠️  Client dist not found. Run "cd client && npm run build" first.');
    console.log('   API server will run without static file serving.');
  }

  // ── Start Server ──────────────────────────────────
  try {
    await fastify.listen({
      port: config.port,
      host: '0.0.0.0',
    });
    console.log(`\n🚀 MD-Collab-Editor is running!`);
    console.log(`   URL:   http://localhost:${config.port}/?token=${config.accessToken}`);
    console.log(`   Port:  ${config.port}`);
    console.log(`   Repos: ${config.reposDir}\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
