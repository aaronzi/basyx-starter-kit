import { useAppStore } from '@/stores/app';

export type ComposeService = Record<string, unknown> & {
  environment?: Record<string, string> | string[];
  volumes?: string[];
  depends_on?: Record<string, { condition: string }>;
};

export function getComposeServices(): Record<string, ComposeService> | undefined {
  const value = useAppStore().getDockerComposeConfig?.value;
  if (!value || typeof value !== 'object' || !('services' in value)) return undefined;
  return value.services as Record<string, ComposeService>;
}

export function updateOptionalServices(
  additions: Record<string, ComposeService>,
  managedNames: string[] = Object.keys(additions)
): void {
  const store = useAppStore();
  const config = store.getDockerComposeConfig;
  if (!config?.value || typeof config.value !== 'object' || !('services' in config.value)) return;
  const updated = JSON.parse(JSON.stringify(config)) as typeof config;
  const root = updated.value as {
    services: Record<string, ComposeService>;
    volumes?: Record<string, unknown>;
  };
  root.services = {
    ...Object.fromEntries(
      Object.entries(root.services).filter(([name]) => !managedNames.includes(name))
    ),
    ...additions,
  };
  if (
    managedNames.includes('prometheus') ||
    managedNames.includes('tempo') ||
    managedNames.includes('alloy')
  ) {
    const volumes = Object.fromEntries(
      Object.entries(root.volumes || {}).filter(
        ([name]) => !['prometheus-data', 'tempo-data', 'alloy-data'].includes(name)
      )
    );
    if (additions.prometheus) volumes['prometheus-data'] = {};
    if (additions.tempo) volumes['tempo-data'] = {};
    if (additions.alloy) volumes['alloy-data'] = {};
    if (Object.keys(volumes).length) root.volumes = volumes;
    else delete root.volumes;
  }
  store.setDockerComposeConfig(updated);
}

export function setServiceDependency(
  serviceName: string,
  dependency: string,
  enabled: boolean,
  condition = 'service_started'
): void {
  const store = useAppStore();
  const config = store.getDockerComposeConfig;
  if (!config?.value || typeof config.value !== 'object' || !('services' in config.value)) return;
  const updated = JSON.parse(JSON.stringify(config)) as typeof config;
  const service = (updated.value as { services: Record<string, ComposeService> }).services[
    serviceName
  ];
  if (!service) return;
  const dependencies = Object.fromEntries(
    Object.entries(service.depends_on || {}).filter(([name]) => name !== dependency)
  );
  if (enabled) dependencies[dependency] = { condition };
  service.depends_on = dependencies;
  store.setDockerComposeConfig(updated);
}
