-- File versions tracking
CREATE TABLE IF NOT EXISTS file_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  commit_hash TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT 'agent',
  message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_file_versions_path ON file_versions(file_path);
CREATE INDEX IF NOT EXISTS idx_file_versions_created ON file_versions(created_at);

-- Share links for public file access
CREATE TABLE IF NOT EXISTS share_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_file_path ON share_links(file_path);
