<template>
  <div class="file-list-page">
    <div class="file-list-header">
      <h1>Files</h1>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="refresh" :disabled="loading">
          {{ loading ? '🔄' : '🔄 Refresh' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Loading files...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="refresh">Retry</button>
    </div>

    <div v-else-if="files.length === 0" class="empty-state">
      <div class="empty-icon">📂</div>
      <p>No files yet</p>
      <p class="empty-hint">
        Tell Yang Jian or Ne Zha to create one, or place <code>.md</code> files in the repository directory.
      </p>
    </div>

    <div v-else class="file-table">
      <div
        v-for="file in files"
        :key="file.path"
        class="file-row"
      >
        <div class="file-main" @click="openFile(file.path)">
          <div class="file-icon">📄</div>
          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-path">{{ file.path }}</div>
            <div v-if="file.lastCommit" class="file-meta">
              {{ formatDate(file.lastModified) }}
              <span class="meta-sep">·</span>
              {{ file.lastCommit.message }}
            </div>
            <div v-else class="file-meta">
              {{ formatDate(file.lastModified) }}
            </div>
          </div>
          <div class="file-size">{{ formatSize(file.size) }}</div>
        </div>
        <div class="file-actions">
          <button
            class="btn btn-share"
            :disabled="sharingFile === file.path"
            @click.stop="shareFile(file)"
            :title="shareLinks[file.path] ? 'Copy share link' : 'Generate share link'"
          >
            {{ sharingFile === file.path ? '...' : (shareLinks[file.path] ? '🔗' : '🔒') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast notification -->
    <div v-if="toast" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, connectWebSocket } from '../api/index.js'

const router = useRouter()
const files = ref([])
const loading = ref(true)
const error = ref(null)
const shareLinks = ref({})
const sharingFile = ref(null)
const toast = ref(null)
let ws = null

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function showToast(message, type = 'info') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3000)
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    showToast('📋 Link copied to clipboard!', 'success')
  } catch {
    // Fallback: select and copy via textarea
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    showToast('📋 Link copied to clipboard!', 'success')
  }
}

async function shareFile(file) {
  sharingFile.value = file.path
  try {
    // If we already have a share link, just copy it
    if (shareLinks.value[file.path]) {
      await copyToClipboard(shareLinks.value[file.path])
      sharingFile.value = null
      return
    }

    const result = await api.createShareLink(file.path)
    shareLinks.value[file.path] = result.url
    await copyToClipboard(result.url)
  } catch (err) {
    showToast(`❌ Failed to create share link: ${err.message}`, 'error')
  } finally {
    sharingFile.value = null
  }
}

async function loadShareLinks() {
  // Try to load existing share links for all files
  for (const file of files.value) {
    try {
      const result = await api.getShareLink(file.path)
      shareLinks.value[file.path] = result.url
    } catch {
      // No share link exists, that's fine
    }
  }
}

async function refresh() {
  loading.value = true
  error.value = null
  try {
    const result = await api.listFiles()
    files.value = result.files || []
    // Load existing share links after getting file list
    await loadShareLinks()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function openFile(filePath) {
  router.push(`/edit/${encodeURIComponent(filePath)}`)
}

onMounted(async () => {
  await refresh()

  // WebSocket for live updates
  ws = connectWebSocket()
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'file-changed') {
        refresh()
      }
    } catch (e) {
      // ignore parse errors
    }
  }
})

onUnmounted(() => {
  if (ws) {
    ws.close()
  }
})
</script>

<style scoped>
.file-list-page {
  padding: 24px 32px;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
  overflow-y: auto;
  flex: 1;
}

.file-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.file-list-header h1 {
  font-size: 22px;
  font-weight: 600;
}

.btn-secondary {
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

/* File Table */
.file-table {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--bg-surface);
  border-radius: var(--radius);
  transition: background 0.15s;
}

.file-row:hover {
  background: var(--bg-hover);
}

.file-main {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}

.file-actions {
  padding-right: 12px;
  flex-shrink: 0;
}

.btn-share {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 4px 8px;
  font-size: 13px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;
}

.btn-share:hover:not(:disabled) {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
}

.btn-share:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-path {
  font-size: 12px;
  color: var(--text-muted);
  font-family: 'SFMono-Regular', Consolas, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.meta-sep {
  margin: 0 4px;
}

.file-size {
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 18px;
  border-radius: var(--radius);
  font-size: 13px;
  box-shadow: var(--shadow);
  z-index: 100;
}

.toast.success {
  background: rgba(102, 187, 106, 0.9);
  color: #000;
}

.toast.error {
  background: rgba(239, 83, 80, 0.9);
  color: #fff;
}

.toast.info {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}
</style>
