const simpleGit = require('simple-git');
const path = require('path');

class GitService {
  constructor(repoDir) {
    this.repoDir = repoDir;
    this.git = simpleGit(repoDir, {
      binary: 'git',
      maxConcurrentProcesses: 1,
    });
  }

  /**
   * Initialize git repository if not already initialized
   */
  async init() {
    const fs = require('fs');
    if (!fs.existsSync(path.join(this.repoDir, '.git'))) {
      console.log(`📦 Initializing git repository at ${this.repoDir}`);
      await this.git.init();
      await this.git.addConfig('user.name', 'MD-Collab-Editor');
      await this.git.addConfig('user.email', 'editor@md-collab.local');
      console.log('✅ Git repository initialized');
    }
  }

  /**
   * Commit a file change
   */
  async commit(relativePath, author, message) {
    try {
      const authorName = author === 'agent' ? 'Agent' : '涛哥';
      const email = author === 'agent' ? 'agent@md-collab.local' : 'taoge@md-collab.local';

      await this.git.add(relativePath);
      await this.git.commit(message, [relativePath], {
        '--author': `"${authorName} <${email}>"`,
      });

      const log = await this.git.log({ file: relativePath, maxCount: 1 });
      const commitHash = log.latest ? log.latest.hash : '';

      console.log(`💾 Committed: ${relativePath} (${authorName}): ${message}`);

      return commitHash;
    } catch (err) {
      // If no changes to commit (file unchanged), this is not an error
      if (err.message && err.message.includes('nothing to commit')) {
        console.log(`ℹ️  No changes to commit for ${relativePath}`);
        return null;
      }
      throw err;
    }
  }

  /**
   * Get git log for a file
   */
  async log(relativePath, maxCount = 50) {
    try {
      const log = await this.git.log({
        file: relativePath,
        maxCount,
      });
      return log.all;
    } catch (err) {
      return [];
    }
  }

  /**
   * Get git log for the entire repo
   */
  async globalLog(maxCount = 50) {
    try {
      const log = await this.git.log({ maxCount });
      return log.all;
    } catch (err) {
      return [];
    }
  }
}

module.exports = GitService;
