<template>
  <div>
    <div
      ref="container"
      class="rounded border"
      :style="{
        height: '340px',
        minWidth: '0',
        overflow: 'hidden',
        borderColor: error ? 'rgb(var(--v-theme-error))' : undefined,
      }"
    />
    <v-progress-linear v-if="loading" aria-label="Loading Telegraf editor" indeterminate />
    <v-alert v-if="loadError" class="mt-2" role="alert" type="error" variant="tonal">
      {{ loadError }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import type * as MonacoRuntime from '@/utils/monacoRuntime';
import type { editor, IDisposable } from 'monaco-editor';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useTheme } from 'vuetify';
import { validateTelegrafConfig } from '@/utils/telegrafConfig';
import { registerTelegrafLanguage } from '@/utils/telegrafMonaco';

defineProps<{ error?: boolean }>();
const value = defineModel<string>({ required: true });
const container = ref<HTMLElement>();
const loading = ref(true);
const loadError = ref('');
const theme = useTheme();
const options = computed<editor.IStandaloneEditorConstructionOptions>(() => ({
  automaticLayout: true,
  fixedOverflowWidgets: true,
  folding: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  tabSize: 2,
  quickSuggestions: true,
  ariaLabel: 'Telegraf configuration TOML',
  theme: theme.global.current.value.dark ? 'vs-dark' : 'vs',
}));

let runtime: typeof MonacoRuntime | undefined;
let instance: editor.IStandaloneCodeEditor | undefined;
let model: editor.ITextModel | undefined;
let subscription: IDisposable | undefined;
let unmounted = false;
let applyingExternalValue = false;

function markErrors(): void {
  if (!runtime || !model) return;
  const validation = validateTelegrafConfig(model.getValue());
  const line = Math.max(1, Math.min(validation.line || 1, model.getLineCount()));
  const column = Math.max(1, validation.column || 1);
  runtime.monaco.editor.setModelMarkers(
    model,
    'telegraf-config',
    validation.message
      ? [
          {
            severity: runtime.monaco.MarkerSeverity.Error,
            message: validation.message,
            startLineNumber: line,
            endLineNumber: line,
            startColumn: column,
            endColumn: Math.min(model.getLineMaxColumn(line), column + 1),
          },
        ]
      : []
  );
}

watch(value, text => {
  if (!model || text === model.getValue()) return;
  applyingExternalValue = true;
  try {
    model.setValue(text);
    markErrors();
  } finally {
    applyingExternalValue = false;
  }
});
watch(options, next => instance?.updateOptions(next), { deep: true });

onMounted(async () => {
  try {
    runtime = await import('@/utils/monacoRuntime');
    if (unmounted || !container.value) return;
    const { monaco } = runtime;
    registerTelegrafLanguage(monaco);
    model = monaco.editor.createModel(
      value.value,
      'telegraf-toml',
      monaco.Uri.parse(`inmemory://telegraf/${crypto.randomUUID()}.conf`)
    );
    instance = monaco.editor.create(container.value, { ...options.value, model });
    subscription = model.onDidChangeContent(() => {
      if (model && !applyingExternalValue) value.value = model.getValue();
      markErrors();
    });
    markErrors();
  } catch (error) {
    disposeEditor();
    if (!unmounted)
      loadError.value = `Unable to load the Telegraf editor: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    if (!unmounted) loading.value = false;
  }
});

onBeforeUnmount(() => {
  unmounted = true;
  disposeEditor();
});

function disposeEditor(): void {
  subscription?.dispose();
  instance?.dispose();
  model?.dispose();
  subscription = undefined;
  instance = undefined;
  model = undefined;
}
</script>
