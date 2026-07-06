<template>
  <div class="editor-page">
    <!-- Header -->
    <div class="editor-toolbar">
      <button class="btn-icon" @click="goBack" title="Back to file list">← Back</button>
      <div class="toolbar-info">
        <span class="toolbar-file-name">{{ fileName }}</span>
        <span v-if="filePath" class="toolbar-file-path">{{ filePath }}</span>
        <span v-if="isShareMode" class="toolbar-badge">Shared</span>
      </div>
      <div class="toolbar-actions">
        <button
          class="btn btn-save"
          :disabled="saving"
          @click="saveFile"
        >
          {{ saving ? 'Saving...' : '💾 Save' }}
        </button>
      </div>
    </div>

    <!-- Status Bar -->
    <div v-if="status" class="status-bar" :class="statusType">
      {{ status }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="editor-loading">
      <div class="spinner"></div>
      <span>Loading...</span>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="editor-error">
      <span>⚠️</span>
      <p>{{ loadError }}</p>
      <button class="btn btn-primary" @click="loadFile">Retry</button>
    </div>

    <!-- Content: Side by Side Editor + Preview -->
    <div v-else class="editor-content">
      <div class="panel edit-panel">
        <MdEditor
          ref="editorComponent"
          v-if="editorReady"
          v-model="content"
          @save="saveFile"
        />
      </div>
      <div ref="previewPanel" class="panel preview-panel">
        <MdPreview :content="content" />
      </div>
    </div>

    <!-- File Update Notification -->
    <div v-if="showUpdateNotice" class="update-notice">
      <span>📄 File updated by Agent</span>
      <button class="btn btn-sm" @click="refreshContent">Reload</button>
      <button class="btn btn-sm btn-close" @click="showUpdateNotice = false">✕</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, connectWebSocket } from '../api/index.js'

import MdPreview from '../components/MdPreview.vue'
import MdEditor from '../components/MdEditor.vue'

const route = useRoute()
const router = useRouter()

// Mode detection
const isShareMode = computed(() => !!route.params.token)
const shareToken = computed(() => route.params.token || '')
const filePath = ref('')
const fileName = ref('')
const content = ref('')
const loading = ref(true)
const saving = ref(false)
const loadError = ref(null)
const status = ref('')
const statusType = ref('info')
const editorReady = ref(false)
const showUpdateNotice = ref(false)

// Scroll sync refs
const previewPanel = ref(null)
const editorComponent = ref(null)
let ws = null
let editorScrollDom = null
let syncingScroll = false

function goBack() {
  if (isShareMode.value) {
    window.location.href = '/'
  } else {
    router.push('/')
  }
}

async function loadFile() {
  loading.value = true
  loadError.value = null
  status.value = ''

  try {
    if (isShareMode.value) {
      const token = shareToken.value
      const result = await api.getShareFile(token)
      filePath.value = result.path || ''
      fileName.value = result.name || token
      content.value = result.content || ''
    } else {
      const raw = decodeURIComponent(route.params.path || '')
      filePath.value = raw
      fileName.value = raw.split('/').pop()
      const result = await api.getFileContent(raw)
      content.value = result.content || ''
    }
    editorReady.value = true
  } catch (err) {
    loadError.value = err.message
  } finally {
    loading.value = false
  }
}

async function saveFile() {
  if (saving.value) return
  saving.value = true
  status.value = ''
  statusType.value = 'info'

  try {
    if (isShareMode.value) {
      await api.saveShareFile(shareToken.value, content.value, `Saved ${fileName.value}`)
    } else {
      await api.saveFile(filePath.value, content.value, `Saved ${fileName.value}`)
    }
    status.value = '✅ Saved successfully'
    statusType.value = 'success'
    setTimeout(() => { status.value = '' }, 3000)
  } catch (err) {
    status.value = `❌ Save failed: ${err.message}`
    statusType.value = 'error'
  } finally {
    saving.value = false
  }
}

async function refreshContent() {
  showUpdateNotice.value = false
  try {
    if (isShareMode.value) {
      const result = await api.getShareFile(shareToken.value)
      content.value = result.content || ''
    } else {
      const result = await api.getFileContent(filePath.value)
      content.value = result.content || ''
    }
  } catch (err) {
    // ignore
  }
}

// ── Scroll Sync ──────────────────────────────────────────

function onEditorScroll() {
  if (syncingScroll || !editorScrollDom || !previewPanel.value) return
  syncingScroll = true
  const sd = editorScrollDom
  const maxScroll = sd.scrollHeight - sd.clientHeight
  if (maxScroll > 0) {
    const ratio = sd.scrollTop / maxScroll
    const el = previewPanel.value
    const maxPreviewScroll = el.scrollHeight - el.clientHeight
    if (maxPreviewScroll > 0) {
      el.scrollTop = ratio * maxPreviewScroll
    }
  }
  syncingScroll = false
}

function onPreviewScroll() {
  if (syncingScroll || !previewPanel.value || !editorScrollDom) return
  syncingScroll = true
  const el = previewPanel.value
  const maxScroll = el.scrollHeight - el.clientHeight
  if (maxScroll > 0) {
    const ratio = el.scrollTop / maxScroll
    const maxEditorScroll = editorScrollDom.scrollHeight - editorScrollDom.clientHeight
    if (maxEditorScroll > 0) {
      editorScrollDom.scrollTop = ratio * maxEditorScroll
    }
  }
  syncingScroll = false
}

// Setup editor scroll sync when the component ref is populated
function setupEditorScrollSync() {
  const comp = editorComponent.value
  if (!comp) return false
  const sd = comp.getScrollDom?.() || null
  if (!sd) return false
  editorScrollDom = sd
  editorScrollDom.addEventListener('scroll', onEditorScroll)
  return true
}

// Watch for editor component ref to be populated
watch(editorComponent, (comp) => {
  if (comp && !editorScrollDom) {
    setupEditorScrollSync()
  }
}, { immediate: false })

onMounted(async () => {
  await loadFile()
  await nextTick()

  // Set up preview → editor scroll sync
  if (previewPanel.value) {
    previewPanel.value.addEventListener('scroll', onPreviewScroll)
  }

  // Set up editor → preview scroll sync (eager import = component is ready)
  setupEditorScrollSync()

  // WebSocket for file change notifications
  if (!isShareMode.value) {
    ws = connectWebSocket()
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'file-changed' && data.file === filePath.value) {
          showUpdateNotice.value = true
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  }
})

onUnmounted(() => {
  if (editorScrollDom) {
    editorScrollDom.removeEventListener('scroll', onEditorScroll)
    editorScrollDom = null
  }
  if (previewPanel.value) {
    previewPanel.value.removeEventListener('scroll', onPreviewScroll)
  }
  if (ws) {
    ws.close()
  }
})
</script>

<style scoped>
.editor-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.btn-icon {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  padding: 6px 10px;
  border-radius: var(--radius);
  transition: all 0.15s;
}

.btn-icon:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.toolbar-info {
  flex: 1;
  min-width: 0;
}

.toolbar-file-name {
  font-size: 14px;
  font-weight: 600;
  display: block;
}

.toolbar-file-path {
  font-size: 11px;
  color: var(--text-muted);
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.toolbar-badge {
  display: inline-block;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 193, 7, 0.2);
  color: #f5a623;
  font-weight: 600;
  margin-left: 6px;
  vertical-align: middle;
}

.toolbar-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.btn {
  padding: 7px 14px;
  border: none;
  border-radius: var(--radius);
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s;
}

.btn-save {
  background: var(--accent);
  color: #000;
}

.btn-save:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-bar {
  padding: 6px 16px;
  font-size: 12px;
  flex-shrink: 0;
}

.status-bar.success {
  background: rgba(102, 187, 106, 0.15);
  color: var(--success);
}

.status-bar.error {
  background: rgba(239, 83, 80, 0.15);
  color: var(--danger);
}

.status-bar.info {
  background: rgba(79, 195, 247, 0.1);
  color: var(--accent);
}

.editor-loading,
.editor-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.editor-error p {
  margin: 8px 0 16px;
  color: var(--danger);
}

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}

.panel {
  flex: 1;
  width: 50%;
}

.edit-panel {
  overflow: hidden;
}

.preview-panel {
  overflow-y: auto;
  border-left: 1px solid var(--border);
}

.update-notice {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  background: var(--bg-secondary);
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  font-size: 13px;
  color: var(--text-primary);
  box-shadow: var(--shadow);
  z-index: 100;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 11px;
  background: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
}

.btn-sm:hover {
  background: var(--accent);
  color: #000;
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 14px;
}

.btn-primary {
  background: var(--accent);
  color: #000;
  padding: 8px 18px;
  border: none;
  border-radius: var(--radius);
}
</style>
