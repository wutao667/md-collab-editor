const crypto = require('crypto');

const path = require('path');

// In Docker, app is at /app; locally, app is at the project root
const appRoot = process.env.APP_ROOT || __dirname;

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  reposDir: process.env.REPOS_DIR || path.join(appRoot, '..', 'data', 'repos', 'default'),
  dbPath: process.env.DB_PATH || path.join(appRoot, '..', 'data', 'db', 'md-collab.db'),
  agentInboxDir: process.env.AGENT_INBOX_DIR || path.join(appRoot, '..', 'agent-inbox'),
};

// Access password for login (default: wutao667)
config.accessPassword = process.env.ACCESS_PASSWORD || 'wutao667';

// Access token: from env or auto-generate
config.accessToken = process.env.ACCESS_TOKEN || crypto.randomBytes(32).toString('hex');

if (!process.env.ACCESS_TOKEN) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║        🔑  MD-Collab-Editor 启动                    ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Token: ${config.accessToken}`);
  console.log(`║  URL:   http://localhost:${config.port}/?token=${config.accessToken}`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
} else {
  console.log(`🔑 Using ACCESS_TOKEN from environment`);
  console.log(`🔗 URL: http://localhost:${config.port}/?token=${config.accessToken}`);
}

// Public URL for share links (used to generate full share URLs)
config.publicUrl = process.env.PUBLIC_URL || 'https://md.zeaho.site';

module.exports = config;
