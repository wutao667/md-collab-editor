<template>
  <div class="md-preview" v-html="renderedHTML"></div>
</template>

<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

const props = defineProps({
  content: {
    type: String,
    default: '',
  },
})

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
      } catch (e) {
        // fall through
      }
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
  },
})

const renderedHTML = computed(() => {
  if (!props.content) return '<div class="empty-content"><p>Empty file</p></div>'
  return md.render(props.content)
})
</script>

<style>
@import 'highlight.js/styles/atom-one-dark.css';

.md-preview {
  padding: 32px 40px;
  max-width: 860px;
  margin: 0 auto;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-primary);
}

.md-preview h1,
.md-preview h2,
.md-preview h3,
.md-preview h4,
.md-preview h5,
.md-preview h6 {
  margin: 1.5em 0 0.6em;
  font-weight: 600;
  line-height: 1.3;
  color: #e0e0e0;
}

.md-preview h1 { font-size: 2em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
.md-preview h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.2em; }
.md-preview h3 { font-size: 1.25em; }
.md-preview h4 { font-size: 1.1em; }

.md-preview p {
  margin: 0 0 1em;
}

.md-preview a {
  color: var(--accent);
}

.md-preview a:hover {
  text-decoration: underline;
}

.md-preview ul,
.md-preview ol {
  margin: 0 0 1em;
  padding-left: 2em;
}

.md-preview li {
  margin: 0.3em 0;
}

.md-preview blockquote {
  margin: 0 0 1em;
  padding: 0.5em 1em;
  border-left: 4px solid var(--accent);
  background: var(--bg-surface);
  color: var(--text-secondary);
}

.md-preview blockquote p:last-child {
  margin-bottom: 0;
}

.md-preview code {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.88em;
  padding: 0.2em 0.4em;
  background: var(--bg-surface);
  border-radius: 3px;
}

.md-preview pre {
  margin: 0 0 1em;
  border-radius: var(--radius);
  overflow-x: auto;
}

.md-preview pre code {
  padding: 1em;
  display: block;
  background: none;
  font-size: 13px;
  line-height: 1.5;
}

.md-preview img {
  max-width: 100%;
  border-radius: var(--radius);
  margin: 1em 0;
}

.md-preview table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
  font-size: 14px;
}

.md-preview th,
.md-preview td {
  padding: 8px 12px;
  border: 1px solid var(--border);
  text-align: left;
}

.md-preview th {
  background: var(--bg-surface);
  font-weight: 600;
}

.md-preview hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2em 0;
}

.md-preview .empty-content {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

/* Task list styling */
.md-preview input[type="checkbox"] {
  margin-right: 6px;
}
</style>
