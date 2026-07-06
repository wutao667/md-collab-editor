const config = require('../config');

async function authMiddleware(request, reply) {
  // Only protect API and WebSocket routes
  if (!request.url.startsWith('/api/') && !request.url.startsWith('/ws')) {
    return;
  }

  // Skip health check, login, and public share access (no auth required)
  if (
    request.url.startsWith('/api/health') ||
    request.url.startsWith('/api/auth/login') ||
    request.url.startsWith('/api/share/')
  ) {
    return;
  }

  let token = null;

  // Check Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Check query parameter (for WebSocket connections)
  if (!token && request.query && request.query.token) {
    token = request.query.token;
  }

  if (!token || token !== config.accessToken) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or missing access token' });
    return;
  }
}

module.exports = authMiddleware;
