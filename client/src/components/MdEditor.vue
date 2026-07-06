<template>
  <div class="md-editor-wrapper" ref="containerRef">
    <div ref="editorRef" class="cm-host"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'save'])

const editorRef = ref(null)
const containerRef = ref(null)
let view = null

onMounted(() => {
  if (!editorRef.value) return

  const startState = EditorState.create({
    doc: props.modelValue || '',
    extensions: [
      basicSetup,
      markdown(),
      oneDark,
      keymap.of([
        indentWithTab,
        {
          key: 'Mod-s',
          run: () => {
            emit('save')
            return true
          },
        },
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          emit('update:modelValue', update.state.doc.toString())
        }
      }),
      EditorView.theme({
        '&': {
          backgroundColor: 'transparent',
          height: '100%',
        },
        '.cm-scroller': {
          fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
          fontSize: '14px',
          lineHeight: '1.6',
        },
        '.cm-content': {
          caretColor: '#528bff',
          padding: '16px 20px',
        },
        '.cm-gutters': {
          backgroundColor: 'transparent',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          color: '#4a4a6a',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'rgba(255,255,255,0.04)',
        },
      }),
    ],
  })

  view = new EditorView({
    state: startState,
    parent: editorRef.value,
  })

  // Focus the editor
  view.focus()
})

// Sync external content changes to editor
watch(
  () => props.modelValue,
  (newVal) => {
    if (view && newVal !== undefined && newVal !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: newVal },
      })
    }
  }
)

onUnmounted(() => {
  if (view) {
    view.destroy()
    view = null
  }
})

defineExpose({
  getScrollDom() {
    return view?.scrollDOM || null
  },
})
</script>

<style scoped>
.md-editor-wrapper {
  height: 100%;
  overflow: hidden;
  background: #1a1a2e;
}

.cm-host {
  height: 100%;
}

/* Ensure the codemirror fills its container */
:deep(.cm-editor) {
  height: 100%;
}

:deep(.cm-editor.cm-focused) {
  outline: none;
}

:deep(.cm-scroller) {
  overflow: auto;
}
</style>
