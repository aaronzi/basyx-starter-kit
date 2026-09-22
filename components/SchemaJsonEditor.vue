<template>
  <div>
    <div
      ref="container"
      class="rounded border"
      :style="{
        height,
        minWidth: '0',
        overflow: 'hidden',
        borderColor: error ? 'rgb(var(--v-theme-error))' : undefined,
      }"
    />
    <v-progress-linear v-if="loading" :aria-label="`Loading ${label}`" indeterminate />
    <v-alert v-if="loadError" class="mt-2" type="error" variant="tonal" role="alert">
      {{ loadError }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import type { CodeSchema } from '@/utils/codeSchema';
import type * as MonacoRuntime from '@/utils/monacoRuntime';
import type { editor, IDisposable } from 'monaco-editor';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useTheme } from 'vuetify';

const props = withDefaults(
  defineProps<{
    label: string;
    modelNamespace: string;
    schema: CodeSchema;
    height?: string;
    error?: boolean;
  }>(),
  { height: '320px', error: false }
);
const modelValue = defineModel<string>({ required: true });
const container = ref<HTMLElement>();
const loading = ref(true);
const loadError = ref('');
const theme = useTheme();
const editorOptions = computed<editor.IStandaloneEditorConstructionOptions>(() => ({
  automaticLayout: true,
  fixedOverflowWidgets: true,
  folding: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  tabSize: 2,
  formatOnPaste: true,
  formatOnType: true,
  quickSuggestions: { comments: false, other: true, strings: true },
  wordBasedSuggestions: 'off',
  renderValidationDecorations: 'on',
  ariaLabel: props.label,
  theme: theme.global.current.value.dark ? 'vs-dark' : 'vs',
}));

let runtime: typeof MonacoRuntime | undefined;
let instance: editor.IStandaloneCodeEditor | undefined;
let model: editor.ITextModel | undefined;
let subscription: IDisposable | undefined;
let unmounted = false;
let applyingExternalValue = false;

watch(modelValue, value => {
  if (!model || value === model.getValue()) return;
  applyingExternalValue = true;
  try {
    model.setValue(value);
  } finally {
    applyingExternalValue = false;
  }
});
watch(editorOptions, options => instance?.updateOptions(options), { deep: true });
watch(
  () => props.schema,
  schema => runtime?.configureJsonDiagnostics([schema])
);

onMounted(async () => {
  try {
    runtime = await import('@/utils/monacoRuntime');
    if (unmounted || !container.value) return;
    runtime.configureJsonDiagnostics([props.schema]);
    const { monaco } = runtime;
    const uri = monaco.Uri.parse(`inmemory://${props.modelNamespace}/${crypto.randomUUID()}.json`);
    model = monaco.editor.createModel(modelValue.value, 'json', uri);
    instance = monaco.editor.create(container.value, { ...editorOptions.value, model });
    subscription = model.onDidChangeContent(() => {
      if (model && !applyingExternalValue) modelValue.value = model.getValue();
    });
  } catch (error) {
    disposeEditor();
    if (!unmounted)
      loadError.value = `Unable to load the JSON editor: ${error instanceof Error ? error.message : String(error)}`;
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
