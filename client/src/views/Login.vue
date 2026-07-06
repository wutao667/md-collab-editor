<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Left: Login Form -->
      <div class="login-card">
        <div class="login-icon">📝</div>
        <h1>MD-Collab-Editor</h1>
        <p class="login-desc">Enter password to access documents</p>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="input-group">
            <input
              v-model="password"
              type="password"
              placeholder="Password"
              class="login-input"
              :disabled="loading"
              autofocus
            />
          </div>

          <div v-if="error" class="login-error">{{ error }}</div>

          <button type="submit" class="login-btn" :disabled="loading || !password">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>
      </div>

      <!-- Right: Agent Access Guide -->
      <div class="guide-card">
        <div class="guide-header">🤖 Agent Access Guide</div>
        <p class="guide-intro">Remote agents can connect to this editor via HTTP API:</p>

        <div class="guide-method">
          <div class="method-title">HTTP API (any server)</div>
          <div class="method-desc">Login to get a token, then use it for CRUD operations.</div>
          <div class="code-block">
            <div class="code-line"><span class="comment"># Login to get token</span></div>
            <div class="code-line">$ curl -s -X POST https://md.zeaho.site/api/auth/login \</div>
            <div class="code-line">  -H "Content-Type: application/json" \</div>
            <div class="code-line">  -d '{"password":"***"}'</div>
            <div class="code-line"><span class="comment"># Returns: {"success":true,"token":"abc123...","message":"Login successful"}</span></div>
            <div class="code-line"><span class="comment"># Save the token for subsequent requests</span></div>
            <div class="code-line">$ TOKEN="your-token-here"</div>
            <div class="code-line">&nbsp;</div>
            <div class="code-line"><span class="comment"># List files</span></div>
            <div class="code-line">$ curl -s https://md.zeaho.site/api/files \</div>
            <div class="code-line">  -H "Authorization: Bearer $TOKEN"</div>
            <div class="code-line">&nbsp;</div>
            <div class="code-line"><span class="comment"># Create file</span></div>
            <div class="code-line">$ curl -s -X POST https://md.zeaho.site/api/files \</div>
            <div class="code-line">  -H "Content-Type: application/json" \</div>
            <div class="code-line">  -H "Authorization: Bearer $TOKEN" \</div>
            <div class="code-line">  -d '{"path":"doc.md","content":"# Hello"}'</div>
            <div class="code-line">&nbsp;</div>
            <div class="code-line"><span class="comment"># Edit file</span></div>
            <div class="code-line">$ curl -s -X PUT https://md.zeaho.site/api/files/doc.md \</div>
            <div class="code-line">  -H "Content-Type: application/json" \</div>
            <div class="code-line">  -H "Authorization: Bearer $TOKEN" \</div>
            <div class="code-line">  -d '{"content":"# Updated","message":"revised"}'</div>
            <div class="code-line">&nbsp;</div>
            <div class="code-line"><span class="comment"># Delete file</span></div>
            <div class="code-line">$ curl -s -X DELETE https://md.zeaho.site/api/files/doc.md \</div>
            <div class="code-line">  -H "Authorization: Bearer $TOKEN"</div>
            <div class="code-line">&nbsp;</div>
            <div class="code-line"><span class="comment"># Generate share link (no auth needed to visit)</span></div>
            <div class="code-line">$ curl -s -X POST https://md.zeaho.site/api/files/doc.md/share \</div>
            <div class="code-line">  -H "Authorization: Bearer $TOKEN"</div>
            <div class="code-line"><span class="comment"># Returns: {"token":"abc...","url":"https://md.zeaho.site/s/abc..."}</span></div>
            <div class="code-line"><span class="comment"># Anyone can then access https://md.zeaho.site/s/abc... directly</span></div>
          </div>
        </div>

        <div class="guide-footer">
          <div class="guide-info">
            <span class="info-label">Endpoint:</span>
            <code>https://md.zeaho.site/</code>
          </div>
          <div class="guide-info">
            <span class="info-label">Password:</span>
            <code>wutao667</code>
          </div>
          <div class="guide-info">
            <span class="info-label">Auth:</span>
            Bearer token via login, or <code>?token=</code> query param
          </div>
          <div class="guide-note">
            All changes tracked via Git with author attribution. WebSocket pushes real-time updates.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api/index.js'

const router = useRouter()
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!password.value) return
  loading.value = true
  error.value = ''

  try {
    const result = await api.login(password.value)
    if (result.success) {
      localStorage.setItem('md_collab_token', result.token)
      router.push('/')
    }
  } catch (err) {
    error.value = err.message || 'Invalid password'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  overflow-y: auto;
}

.login-container {
  display: flex;
  gap: 24px;
  max-width: 1100px;
  width: 100%;
  align-items: flex-start;
}

/* Left: Login Form */
.login-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 36px 32px;
  width: 320px;
  flex-shrink: 0;
  text-align: center;
  box-shadow: var(--shadow);
  position: sticky;
  top: 24px;
}

.login-icon {
  font-size: 42px;
  margin-bottom: 10px;
}

h1 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.login-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 24px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.input-group {
  width: 100%;
}

.login-input {
  width: 100%;
  padding: 11px 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.login-input:focus {
  border-color: var(--accent);
}

.login-input::placeholder {
  color: var(--text-muted);
}

.login-error {
  font-size: 12px;
  color: var(--danger);
  text-align: left;
}

.login-btn {
  padding: 11px;
  background: var(--accent);
  color: #000;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
  cursor: pointer;
}

.login-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Right: Agent Guide */
.guide-card {
  flex: 1;
  min-width: 0;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 28px 28px 24px;
  box-shadow: var(--shadow);
}

.guide-header {
  font-size: 17px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 4px;
}

.guide-intro {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 20px;
}

.guide-method {
  margin-bottom: 18px;
}

.method-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.method-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  line-height: 1.6;
}

.method-desc code {
  background: var(--bg-primary);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.code-block {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px 14px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px;
  line-height: 1.7;
  overflow-x: auto;
}

.code-line {
  white-space: pre;
}

.code-line .comment {
  color: var(--text-muted);
  font-style: italic;
}

.guide-footer {
  margin-top: 16px;
  padding: 12px 14px;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.guide-info {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  line-height: 1.7;
}

.guide-info:last-of-type {
  margin-bottom: 0;
}

.guide-info code {
  background: var(--bg-surface);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  color: var(--accent);
}

.info-label {
  color: var(--text-muted);
  font-weight: 500;
}

.guide-note {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
}
</style>
