const BASE_URL = '';

/**
 * Get authentication token from localStorage
 */
function getToken() {
  return localStorage.getItem('md_collab_token');
}

/**
 * Get current token (reads from localStorage each time)
 */
function currentToken() {
  return localStorage.getItem('md_collab_token');
}

/**
 * Make an API request
 */
async function request(method, url, body = null) {
  const headers = {};

  const token = currentToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (body && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${url}`, options);

  if (response.status === 401) {
    // Token invalid - redirect to login
    localStorage.removeItem('md_collab_token');
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    const msg = await response.json().catch(() => ({ error: 'Unauthorized' }));
    throw new Error(msg.message || 'Invalid password or session expired');
  }

  if (!response.ok) {
    const msg = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(msg.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * API methods
 */
export const api = {
  getToken,
  getToken,

  // Login with password
  login(password) {
    return request('POST', '/api/auth/login', { password });
  },

  // Health check
  health() {
    return request('GET', '/api/health');
  },

  // File list
  listFiles() {
    return request('GET', '/api/files');
  },

  // Get file metadata
  getFile(path) {
    return request('GET', `/api/files/${encodeURIComponent(path)}`);
  },

  // Get file content
  getFileContent(path) {
    return request('GET', `/api/files/${encodeURIComponent(path)}/content`);
  },

  // Save file
  saveFile(path, content, message = '') {
    return request('PUT', `/api/files/${encodeURIComponent(path)}`, { content, message });
  },

  // Create file
  createFile(path, content = '') {
    return request('POST', '/api/files', { path, content });
  },

  // Delete file
  deleteFile(path) {
    return request('DELETE', `/api/files/${encodeURIComponent(path)}`);
  },

  // Share link management
  createShareLink(filePath) {
    return request('POST', `/api/files/${encodeURIComponent(filePath)}/share`);
  },

  getShareLink(filePath) {
    return request('GET', `/api/files/${encodeURIComponent(filePath)}/share`);
  },

  deleteShareLink(filePath) {
    return request('DELETE', `/api/files/${encodeURIComponent(filePath)}/share`);
  },

  // Public share access (no auth needed — uses native fetch, not request wrapper)
  getShareFile(token) {
    return fetch(`${BASE_URL}/api/share/${token}`).then(r => {
      if (!r.ok) throw new Error(`Share link request failed: ${r.status}`);
      return r.json();
    });
  },

  saveShareFile(token, content, message = '') {
    return fetch(`${BASE_URL}/api/share/${token}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, message }),
    }).then(r => {
      if (!r.ok) throw new Error(`Share link save failed: ${r.status}`);
      return r.json();
    });
  },
};

/**
 * Connect WebSocket for real-time updates
 */
export function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const token = TOKEN;

  const ws = new WebSocket(`${protocol}//${host}/ws?token=${token}`);

  ws.onopen = () => {
    console.log('🔌 WebSocket connected');
  };

  ws.onclose = (event) => {
    if (event.code !== 4001) {
      // Not an auth error, try reconnecting after delay
      console.log('🔌 WebSocket disconnected, reconnecting in 3s...');
      setTimeout(connectWebSocket, 3000);
    }
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
  };

  return ws;
}
