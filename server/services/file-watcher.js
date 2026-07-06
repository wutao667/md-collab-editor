const chokidar = require('chokidar');
const path = require('path');

class FileWatcher {
  constructor(repoDir, gitService, broadcastFn, debounceMs = 1000) {
    this.repoDir = repoDir;
    this.gitService = gitService;
    this.broadcast = broadcastFn;
    this.debounceMs = debounceMs;
    this.timers = new Map();
    this.watcher = null;
  }

  start() {
    this.watcher = chokidar.watch('**/*.md', {
      cwd: this.repoDir,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: this.debounceMs,
        pollInterval: 100,
      },
      ignorePermissionErrors: true,
    });

    this.watcher
      .on('add', (filePath) => this.handleChange(filePath, 'added'))
      .on('change', (filePath) => this.handleChange(filePath, 'modified'))
      .on('unlink', (filePath) => this.handleDelete(filePath));

    console.log(`👀 Watching for .md file changes in ${this.repoDir}`);
  }

  handleChange(filePath, action) {
    // Debounce: reset timer on rapid changes
    if (this.timers.has(filePath)) {
      clearTimeout(this.timers.get(filePath));
    }

    const timer = setTimeout(async () => {
      this.timers.delete(filePath);
      try {
        if (action === 'added') {
          console.log(`📄 New file detected: ${filePath}`);
        }

        // Git commit as 'agent'
        await this.gitService.commit(filePath, 'agent', `Agent ${action === 'added' ? 'created' : 'modified'} ${filePath}`);

        // Broadcast change
        this.broadcast({
          type: 'file-changed',
          file: filePath,
          action: action,
        });
      } catch (err) {
        console.error(`❌ Error processing ${filePath}:`, err.message);
      }
    }, this.debounceMs);

    this.timers.set(filePath, timer);
  }

  handleDelete(filePath) {
    this.broadcast({
      type: 'file-changed',
      file: filePath,
      action: 'deleted',
    });
    console.log(`🗑️  File deleted: ${filePath}`);
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}

module.exports = FileWatcher;
