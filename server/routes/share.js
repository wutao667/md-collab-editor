const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const db = require('../db');
const { broadcast } = require('../services/broadcast');

/**
 * Validate file path to prevent directory traversal
 */
function validateFilePath(filePath) {
  const normalized = path.normalize(filePath);
  if (normalized.startsWith('..') || normalized.includes('..')) {
    return null;
  }
  return normalized;
}

/**
 * Get absolute path from relative path
 */
function getAbsolutePath(relativePath) {
  return path.join(config.reposDir, relativePath);
}

/**
 * Check if path is within repos directory
 */
function isPathSafe(absolutePath) {
  const resolved = path.resolve(absolutePath);
  return resolved.startsWith(path.resolve(config.reposDir));
}

module.exports = async function (fastify) {
  // ── Share link management (auth required) ────────────────

  // POST /api/files/:id/share - Create a share link for a file
  fastify.post('/files/:id/share', async (request, reply) => {
    const relativePath = validateFilePath(decodeURIComponent(request.params.id));
    if (!relativePath) {
      return reply.code(400).send({ error: 'Invalid file path' });
    }

    const absPath = getAbsolutePath(relativePath);
    if (!fs.existsSync(absPath)) {
      return reply.code(404).send({ error: 'File not found' });
    }

    // Check if a share link already exists for this file
    const existing = db.getShareLinkByPath(relativePath);
    if (existing) {
      return {
        token: existing.token,
        url: `${config.publicUrl || 'https://md.zeaho.site'}/s/${existing.token}`,
      };
    }

    // Generate a unique token
    const token = crypto.randomBytes(16).toString('hex');

    try {
      db.createShareLink(relativePath, token);
    } catch (err) {
      // Handle unique constraint violation (extremely unlikely but safe)
      if (err.message && err.message.includes('UNIQUE')) {
        // Retry with a new token
        const retryToken = crypto.randomBytes(16).toString('hex');
        db.createShareLink(relativePath, retryToken);
        return {
          token: retryToken,
          url: `${config.publicUrl || 'https://md.zeaho.site'}/s/${retryToken}`,
        };
      }
      throw err;
    }

    return {
      token,
      url: `${config.publicUrl || 'https://md.zeaho.site'}/s/${token}`,
    };
  });

  // GET /api/files/:id/share - Get existing share link for a file
  fastify.get('/files/:id/share', async (request, reply) => {
    const relativePath = validateFilePath(decodeURIComponent(request.params.id));
    if (!relativePath) {
      return reply.code(400).send({ error: 'Invalid file path' });
    }

    const share = db.getShareLinkByPath(relativePath);
    if (!share) {
      return reply.code(404).send({ error: 'No share link found for this file' });
    }

    return {
      token: share.token,
      url: `${config.publicUrl || 'https://md.zeaho.site'}/s/${share.token}`,
      created_at: share.created_at,
    };
  });

  // DELETE /api/files/:id/share - Delete share link for a file
  fastify.delete('/files/:id/share', async (request, reply) => {
    const relativePath = validateFilePath(decodeURIComponent(request.params.id));
    if (!relativePath) {
      return reply.code(400).send({ error: 'Invalid file path' });
    }

    const existing = db.getShareLinkByPath(relativePath);
    if (!existing) {
      return reply.code(404).send({ error: 'No share link found for this file' });
    }

    db.deleteShareLink(relativePath);
    return { success: true, message: 'Share link deleted' };
  });

  // ── Public share access (no auth required) ───────────────

  // GET /api/share/:token - Get file content via share token
  fastify.get('/share/:token', async (request, reply) => {
    const { token } = request.params;

    if (!token || token.length < 10) {
      return reply.code(400).send({ error: 'Invalid token' });
    }

    const share = db.getShareLinkByToken(token);
    if (!share) {
      return reply.code(404).send({ error: 'Share link not found or expired' });
    }

    const relativePath = share.file_path;
    const absPath = getAbsolutePath(relativePath);

    if (!fs.existsSync(absPath)) {
      // File has been deleted, clean up the share link
      db.deleteShareLinkByToken(token);
      return reply.code(404).send({ error: 'File not found. This share link is no longer valid.' });
    }

    const content = fs.readFileSync(absPath, 'utf-8');
    return {
      path: relativePath,
      name: path.basename(relativePath),
      content,
      token,
    };
  });

  // PUT /api/share/:token - Update file content via share token (no auth)
  fastify.put('/share/:token', async (request, reply) => {
    const { token } = request.params;
    const { content, message } = request.body || {};

    if (!token || token.length < 10) {
      return reply.code(400).send({ error: 'Invalid token' });
    }

    if (content === undefined) {
      return reply.code(400).send({ error: 'Content is required' });
    }

    const share = db.getShareLinkByToken(token);
    if (!share) {
      return reply.code(404).send({ error: 'Share link not found or expired' });
    }

    const relativePath = share.file_path;
    const absPath = getAbsolutePath(relativePath);

    if (!fs.existsSync(absPath)) {
      db.deleteShareLinkByToken(token);
      return reply.code(404).send({ error: 'File not found. This share link is no longer valid.' });
    }

    if (!isPathSafe(absPath)) {
      return reply.code(403).send({ error: 'Path traversal detected' });
    }

    // Write file
    fs.writeFileSync(absPath, content || '', 'utf-8');

    // Git commit with author "share"
    const commitMsg = message || `Updated ${relativePath}`;
    try {
      const commitHash = await fastify.gitService.commit(relativePath, 'share', commitMsg);
      if (commitHash) {
        db.recordSave(relativePath, commitHash, 'share', commitMsg);
      }
    } catch (err) {
      console.error('Git commit error:', err.message);
    }

    // Update share link timestamp
    try {
      const { getDb } = require('../db');
      const dbConn = getDb();
      if (dbConn) {
        const stmt = dbConn.prepare('UPDATE share_links SET updated_at = datetime(\'now\') WHERE token = ?');
        stmt.run(token);
      }
    } catch (e) {
      // Ignore update errors
    }

    // Broadcast
    broadcast({
      type: 'file-changed',
      file: relativePath,
      action: 'modified',
      source: 'share',
    });

    return { success: true, path: relativePath };
  });
};
