const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config');

let db;

function initialize() {
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(config.dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Run schema
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);

  return db;
}

function getDb() {
  return db;
}

/**
 * Record a file save operation
 */
function recordSave(filePath, commitHash, author, message) {
  const stmt = db.prepare(
    'INSERT INTO file_versions (file_path, commit_hash, author, message) VALUES (?, ?, ?, ?)'
  );
  return stmt.run(filePath, commitHash, author, message);
}

/**
 * Get version history for a file
 */
function getFileHistory(filePath, limit = 50) {
  const stmt = db.prepare(
    'SELECT * FROM file_versions WHERE file_path = ? ORDER BY created_at DESC LIMIT ?'
  );
  return stmt.all(filePath, limit);
}

/**
 * Create a share link for a file
 */
function createShareLink(filePath, token) {
  const stmt = db.prepare(
    'INSERT INTO share_links (file_path, token) VALUES (?, ?)'
  );
  return stmt.run(filePath, token);
}

/**
 * Get share link by file path
 */
function getShareLinkByPath(filePath) {
  const stmt = db.prepare(
    'SELECT * FROM share_links WHERE file_path = ? ORDER BY created_at DESC LIMIT 1'
  );
  return stmt.get(filePath);
}

/**
 * Get file path by share token
 */
function getShareLinkByToken(token) {
  const stmt = db.prepare(
    'SELECT * FROM share_links WHERE token = ?'
  );
  return stmt.get(token);
}

/**
 * Delete share link for a file
 */
function deleteShareLink(filePath) {
  const stmt = db.prepare(
    'DELETE FROM share_links WHERE file_path = ?'
  );
  return stmt.run(filePath);
}

/**
 * Delete share link by token
 */
function deleteShareLinkByToken(token) {
  const stmt = db.prepare(
    'DELETE FROM share_links WHERE token = ?'
  );
  return stmt.run(token);
}

module.exports = { initialize, getDb, recordSave, getFileHistory, createShareLink, getShareLinkByPath, getShareLinkByToken, deleteShareLink, deleteShareLinkByToken };
