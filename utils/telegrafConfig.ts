import * as toml from '@iarna/toml';

export function defaultTelegrafConfig(): string {
  return `# Starter collection: replace or extend the input with your asset's metrics.
[agent]
  interval = "10s"
  flush_interval = "10s"

[[outputs.influxdb_v2]]
  urls = ["\${INFLUX_URL}"]
  token = "\${INFLUX_TOKEN}"
  organization = "\${INFLUX_ORG}"
  bucket = "\${INFLUX_BUCKET}"

[[inputs.internal]]
`;
}

export interface TelegrafValidationResult {
  message?: string;
  line?: number;
  column?: number;
}

export function validateTelegrafConfig(input: string): TelegrafValidationResult {
  let value: Record<string, unknown>;
  try {
    value = toml.parse(input) as Record<string, unknown>;
  } catch (error) {
    const parseError = error as Error & { line?: number; col?: number };
    return {
      message: `Invalid TOML: ${parseError.message}`,
      line: parseError.line,
      column: parseError.col,
    };
  }

  const hasPlugin = (group: unknown): boolean =>
    Boolean(
      group &&
      typeof group === 'object' &&
      Object.values(group).some(plugins => Array.isArray(plugins) && plugins.length > 0)
    );
  if (!hasPlugin(value.inputs)) return { message: 'Enable at least one [[inputs.*]] plugin.' };
  if (!hasPlugin(value.outputs)) return { message: 'Enable at least one [[outputs.*]] plugin.' };
  return {};
}
