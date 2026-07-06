<template>
  <div id="app-root">
    <header class="app-header">
      <div class="header-left">
        <a href="/" class="logo">📝 MD-Collab-Editor</a>
      </div>
      <div class="header-right">
        <span v-if="api.TOKEN" class="token-badge" title="Access Token">🔑 Token: {{ maskedToken }}</span>
      </div>
    </header>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { api } from './api/index.js'

const maskedToken = computed(() => {
  const t = api.getToken() || ''
  if (t.length <= 8) return t
  return t.substring(0, 4) + '...' + t.substring(t.length - 4)
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-surface: #1f2940;
  --bg-hover: #2a3a5c;
  --text-primary: #e8e8e8;
  --text-secondary: #a0a0b8;
  --text-muted: #6b6b8a;
  --accent: #4fc3f7;
  --accent-hover: #29b6f6;
  --success: #66bb6a;
  --danger: #ef5350;
  --warning: #ffa726;
  --border: #2a3a5c;
  --header-bg: #0f1629;
  --radius: 8px;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

html, body, #app {
  height: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
}

#app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 52px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: none;
  white-space: nowrap;
}

.logo:hover {
  color: var(--accent);
}

.token-badge {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-surface);
  padding: 3px 10px;
  border-radius: 12px;
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.app-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

button {
  cursor: pointer;
  font-family: inherit;
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  color: var(--accent-hover);
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--bg-hover);
}
</style>
