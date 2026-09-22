import type * as MonacoRuntime from '@/utils/monacoRuntime';

let registered = false;

export function registerTelegrafLanguage(monaco: typeof MonacoRuntime.monaco): void {
  if (registered) return;
  registered = true;
  monaco.languages.register({ id: 'telegraf-toml', extensions: ['.conf', '.toml'] });
  monaco.languages.setMonarchTokensProvider('telegraf-toml', {
    tokenizer: {
      root: [
        [/\s*#.*/, 'comment'],
        [/\[\[[^\]]+\]\]/, 'type.identifier'],
        [/\[[^\]]+\]/, 'type.identifier'],
        [/\b(?:true|false)\b/, 'keyword'],
        [/\b\d+(?:\.\d+)?\b/, 'number'],
        [/"(?:[^"\\]|\\.)*"/, 'string'],
        [/'[^']*'/, 'string'],
        [/[\w.-]+(?=\s*=)/, 'key'],
      ],
    },
  });

  const snippets = [
    { label: '[agent]', text: '[agent]\n  interval = "${1:10s}"\n  flush_interval = "${2:10s}"' },
    { label: '[[inputs.internal]]', text: '[[inputs.internal]]' },
    {
      label: '[[inputs.http]]',
      text: '[[inputs.http]]\n  urls = ["${1:http://asset:8080/metrics}"]\n  data_format = "${2:json}"',
    },
    {
      label: '[[inputs.mqtt_consumer]]',
      text: '[[inputs.mqtt_consumer]]\n  servers = ["${1:tcp://mqtt:1883}"]\n  topics = ["${2:asset/metrics}"]\n  data_format = "${3:json}"',
    },
    {
      label: '[[outputs.influxdb_v2]]',
      text: '[[outputs.influxdb_v2]]\n  urls = ["\\${INFLUX_URL}"]\n  token = "\\${INFLUX_TOKEN}"\n  organization = "\\${INFLUX_ORG}"\n  bucket = "\\${INFLUX_BUCKET}"',
    },
  ];
  monaco.languages.registerCompletionItemProvider('telegraf-toml', {
    triggerCharacters: ['['],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: snippets.map(item => ({
          label: item.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: item.text,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })),
      };
    },
  });
}
