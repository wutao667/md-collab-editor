const fs = require('fs');
const path = require('path');
const config = require('../config');
const db = require('../db');
const { broadcast } = require('../services/broadcast');

/**
 * Validate file path to prevent directory traversal
 */
function validateFilePath(filePath) {
  // Normalize and check for path traversal
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

/**
 * List all .md files recursively
 */
function listMdFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) {
    return files;
  }

  function walk(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        files.push(path.relative(config.reposDir, fullPath));
      }
    }
  }

  walk(dir);
  return files.sort();
}

/**
 * Get file metadata
 */
function getFileMeta(relativePath) {
  const absPath = getAbsolutePath(relativePath);
  if (!fs.existsSync(absPath)) return null;

  const stat = fs.statSync(absPath);
  return {
    path: relativePath,
    name: path.basename(relativePath),
    size: stat.size,
    lastModified: stat.mtime.toISOString(),
    created: stat.birthtime.toISOString(),
  };
}

module.exports = async function (fastify) {
  // GET /api/files - List all .md files
  fastify.get('/files', async (request, reply) => {
    try {
      const files = listMdFiles(config.reposDir);
      const fileList = files.map((f) => getFileMeta(f)).filter(Boolean);
      return { files: fileList };
    } catch (err) {
      reply.code(500).send({ error: 'Failed to list files', message: err.message });
    }
  });

  // GET /api/files/:id - Get file metadata (HEAD info)
  fastify.get('/files/:id', async (request, reply) => {
    const relativePath = validateFilePath(decodeURIComponent(request.params.id));
    if (!relativePath) {
      return reply.code(400).send({ error: 'Invalid file path' });
    }

    const meta = getFileMeta(relativePath);
    if (!meta) {
      return reply.code(404).send({ error: 'File not found' });
    }

    // Also get latest commit info
    try {
      const gitService = fastify.gitService;
      const log = await gitService.log(relativePath, 1);
      if (log.length > 0) {
        meta.lastCommit = {
          hash: log[0].hash,
          message: log[0].message,
          author: log[0].author_name,
          date: log[0].date,
        };
      }
    } catch (e) {
      // Git log might fail if no commits yet
    }

    return meta;
  });

  // GET /api/files/:id/content - Get file raw content
  fastify.get('/files/:id/content', async (request, reply) => {
    const relativePath = validateFilePath(decodeURIComponent(request.params.id));
    if (!relativePath) {
      return reply.code(400).send({ error: 'Invalid file path' });
    }

    const absPath = getAbsolutePath(relativePath);
    if (!fs.existsSync(absPath)) {
      return reply.code(404).send({ error: 'File not found' });
    }

    const content = fs.readFileSync(absPath, 'utf-8');
    return { path: relativePath, content };
  });

  // PUT /api/files/:id - Save file (update existing or create new)
  fastify.put('/files/:id', async (request, reply) => {
    const relativePath = validateFilePath(decodeURIComponent(request.params.id));
    if (!relativePath) {
      return reply.code(400).send({ error: 'Invalid file path' });
    }

    const absPath = getAbsolutePath(relativePath);
    const { content, message } = request.body || {};

    if (content === undefined && message === undefined) {
      return reply.code(400).send({ error: 'Content is required' });
    }

    // Check safety
    if (!isPathSafe(absPath)) {
      return reply.code(403).send({ error: 'Path traversal detected' });
    }

    // Create subdirectories if needed
    const dir = path.dirname(absPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(absPath, content || '', 'utf-8');

    // Git commit
    const commitMsg = message || `Updated ${relativePath}`;
    try {
      const commitHash = await fastify.gitService.commit(relativePath, 'taoge', commitMsg);
      if (commitHash) {
        db.recordSave(relativePath, commitHash, 'taoge', commitMsg);
      }
    } catch (err) {
      console.error('Git commit error:', err.message);
    }

    // Broadcast
    broadcast({
      type: 'file-changed',
      file: relativePath,
      action: 'modified',
      source: 'user',
    });

    return { success: true, path: relativePath };
  });

  // POST /api/files - Create new file
  fastify.post('/files', async (request, reply) => {
    const { path: filePath, content } = request.body || {};

    if (!filePath) {
      return reply.code(400).send({ error: 'Field "path" is required' });
    }

    const relativePath = validateFilePath(filePath);
    if (!relativePath) {
      return reply.code(400).send({ error: 'Invalid file path' });
    }

    const absPath = getAbsolutePath(relativePath);
    if (!isPathSafe(absPath)) {
      return reply.code(403).send({ error: 'Path traversal detected' });
    }

    if (fs.existsSync(absPath)) {
      return reply.code(409).send({ error: 'File already exists' });
    }

    // Create subdirectories if needed
    const dir = path.dirname(absPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(absPath, content || '', 'utf-8');

    const commitMsg = `Created ${relativePath}`;
    try {
      const commitHash = await fastify.gitService.commit(relativePath, 'taoge', commitMsg);
      if (commitHash) {
        db.recordSave(relativePath, commitHash, 'taoge', commitMsg);
      }
    } catch (err) {
      console.error('Git commit error:', err.message);
    }

    broadcast({
      type: 'file-changed',
      file: relativePath,
      action: 'added',
      source: 'user',
    });

    reply.code(201).send({ success: true, path: relativePath });
  });

  // DELETE /api/files/:id - Delete a file
  fastify.delete('/files/:id', async (request, reply) => {
    const relativePath = validateFilePath(decodeURIComponent(request.params.id));
    if (!relativePath) {
      return reply.code(400).send({ error: 'Invalid file path' });
    }

    const absPath = getAbsolutePath(relativePath);
    if (!fs.existsSync(absPath)) {
      return reply.code(404).send({ error: 'File not found' });
    }

    if (!isPathSafe(absPath)) {
      return reply.code(403).send({ error: 'Path traversal detected' });
    }

    fs.unlinkSync(absPath);

    broadcast({
      type: 'file-changed',
      file: relativePath,
      action: 'deleted',
      source: 'user',
    });

    return { success: true, path: relativePath };
  });
};
