import * as yaml from 'js-yaml';
import { createPinia, setActivePinia } from 'pinia';
import { useAppStore } from '@/stores/app';
import { decodeConfigHash, encodeConfigHash } from '@/utils/configPersistence';

describe('starter setup + persistence flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('creates default docker and infra setup', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();

    const compose = store.getDockerComposeConfig?.value as { services?: Record<string, unknown> };
    const infra = store.getBasyxInfraConfig?.value as { infrastructures?: Record<string, unknown> };

    expect(compose?.services?.['aas-environment']).toBeTruthy();
    expect(compose?.services?.['aas-ui']).toBeTruthy();
    expect(infra?.infrastructures?.default).toBeTruthy();
    expect(store.getBasyxInfraConfigAsString.value).not.toContain('trustedOrigins');

    const environment = (
      compose?.services?.['aas-environment'] as { environment?: string[] } | undefined
    )?.environment;
    expect(environment).toContain('CORS_ALLOWCREDENTIALS=true');
    expect(environment).toContain('BASYX_HISTORY_MODE=off');
    expect(environment).toContain('BASYX_EVENTING_ENABLED=false');
    expect(environment).toContain('OTEL_TRACES_EXPORTER=none');
  });

  it('uses a custom external base url for generated browser-facing endpoints', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateExternalBaseUrl('http://basyx-server.local:4000/');

    const compose = store.getDockerComposeConfig?.value as {
      services?: Record<string, { environment?: string[] }>;
    };
    const infra = store.getBasyxInfraConfig?.value as {
      infrastructures?: Record<string, unknown>;
    };
    const aasEnvironmentEnv = compose?.services?.['aas-environment']?.environment || [];
    const defaultKey = infra?.infrastructures?.default as string;
    const defaultInfra = infra?.infrastructures?.[defaultKey] as {
      components?: Record<string, { baseUrl?: string }>;
    };

    expect(store.getContainerPort('aas-environment')).toBe(4000);
    expect(aasEnvironmentEnv).toContain('GENERAL_EXTERNALURL=http://basyx-server.local:4000');
    expect(defaultInfra.components?.aasDiscovery?.baseUrl).toBe(
      'http://basyx-server.local:4000/lookup/shells'
    );
    expect(defaultInfra.components?.aasRepository?.baseUrl).toBe(
      'http://basyx-server.local:4000/shells'
    );
  });

  it('updates generated external URLs when the AAS Environment external port changes', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateExternalBaseUrl('http://192.168.100.200:4000');
    store.setContainerPort('aas-environment', 9090);

    const compose = store.getDockerComposeConfig?.value as {
      services?: Record<string, { environment?: string[] }>;
    };
    const infra = store.getBasyxInfraConfig?.value as {
      infrastructures?: Record<string, unknown>;
    };
    const aasEnvironmentEnv = compose?.services?.['aas-environment']?.environment || [];
    const defaultKey = infra?.infrastructures?.default as string;
    const defaultInfra = infra?.infrastructures?.[defaultKey] as {
      components?: Record<string, { baseUrl?: string }>;
    };

    expect(store.getExternalBaseUrl).toBe('http://192.168.100.200:9090');
    expect(aasEnvironmentEnv).toContain('GENERAL_EXTERNALURL=http://192.168.100.200:9090');
    expect(defaultInfra.components?.aasRepository?.baseUrl).toBe(
      'http://192.168.100.200:9090/shells'
    );
  });

  it('updates the AAS Environment compose port when the External Base URL port changes', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateExternalBaseUrl('http://192.168.100.200:4000');

    const compose = store.getDockerComposeConfig?.value as {
      services?: Record<string, { ports?: string[]; environment?: string[] }>;
    };
    const aasEnvironment = compose?.services?.['aas-environment'];
    const aasEnvironmentEnv = aasEnvironment?.environment || [];

    expect(store.getContainerPort('aas-environment')).toBe(4000);
    expect(aasEnvironment?.ports).toEqual(['4000:4000']);
    expect(aasEnvironmentEnv).toContain('SERVER_PORT=4000');
    expect(aasEnvironmentEnv).toContain('GENERAL_EXTERNALURL=http://192.168.100.200:4000');
  });

  it('updates the AAS Environment context path when the External Base URL path changes', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateExternalBaseUrl('http://192.168.100.200:4000/api/aas');

    const compose = store.getDockerComposeConfig?.value as {
      services?: Record<string, { environment?: string[] }>;
    };
    const aasEnvironmentEnv = compose?.services?.['aas-environment']?.environment || [];

    expect(store.getExternalBaseUrl).toBe('http://192.168.100.200:4000/api/aas');
    expect(store.getContextPath('aas-environment')).toBe('/api/aas');
    expect(aasEnvironmentEnv).toContain('SERVER_CONTEXTPATH=/api/aas');
    expect(aasEnvironmentEnv).toContain('GENERAL_EXTERNALURL=http://192.168.100.200:4000/api/aas');
  });

  it('adds the AAS Environment context path to generated browser-facing endpoints', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateExternalBaseUrl('http://192.168.100.200:4000');
    store.setContextPath('aas-environment', '/api/aas');

    const compose = store.getDockerComposeConfig?.value as {
      services?: Record<string, { environment?: string[] }>;
    };
    const infra = store.getBasyxInfraConfig?.value as {
      infrastructures?: Record<string, unknown>;
    };
    const aasEnvironmentEnv = compose?.services?.['aas-environment']?.environment || [];
    const defaultKey = infra?.infrastructures?.default as string;
    const defaultInfra = infra?.infrastructures?.[defaultKey] as {
      components?: Record<string, { baseUrl?: string }>;
    };

    expect(store.getExternalBaseUrl).toBe('http://192.168.100.200:4000/api/aas');
    expect(aasEnvironmentEnv).toContain('GENERAL_EXTERNALURL=http://192.168.100.200:4000/api/aas');
    expect(defaultInfra.components?.aasRepository?.baseUrl).toBe(
      'http://192.168.100.200:4000/api/aas/shells'
    );
  });

  it('preserves portless external base URLs for generated browser-facing endpoints', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateExternalBaseUrl('https://basyx.example.com');

    const compose = store.getDockerComposeConfig?.value as {
      services?: Record<string, { environment?: string[] }>;
    };
    const infra = store.getBasyxInfraConfig?.value as {
      infrastructures?: Record<string, unknown>;
    };
    const aasEnvironmentEnv = compose?.services?.['aas-environment']?.environment || [];
    const defaultKey = infra?.infrastructures?.default as string;
    const defaultInfra = infra?.infrastructures?.[defaultKey] as {
      components?: Record<string, { baseUrl?: string }>;
    };

    expect(aasEnvironmentEnv).toContain('GENERAL_EXTERNALURL=https://basyx.example.com');
    expect(defaultInfra.components?.aasRepository?.baseUrl).toBe(
      'https://basyx.example.com/shells'
    );
  });

  it('keeps portless External Base URLs unchanged when the AAS Environment port changes', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateExternalBaseUrl('https://basyx.example.com');
    store.setContainerPort('aas-environment', 9090);

    const compose = store.getDockerComposeConfig?.value as {
      services?: Record<string, { ports?: string[]; environment?: string[] }>;
    };
    const aasEnvironment = compose?.services?.['aas-environment'];
    const aasEnvironmentEnv = aasEnvironment?.environment || [];

    expect(store.getExternalBaseUrl).toBe('https://basyx.example.com');
    expect(aasEnvironment?.ports).toEqual(['9090:9090']);
    expect(aasEnvironmentEnv).toContain('SERVER_PORT=9090');
    expect(aasEnvironmentEnv).toContain('GENERAL_EXTERNALURL=https://basyx.example.com');
  });

  it('round-trips shared config payload and reapplies state', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateRegistryIntegration(false);
    store.updateDiscoveryIntegration(false);
    store.updateExternalBaseUrl('http://192.168.100.200:8082');
    store.updateDefaultInfrastructureTrustedOrigins(['https://linked-segments.example.org:8443']);

    const encoded = encodeConfigHash({
      route: '/get-started/deployment/access-control',
      state: store.createSerializableSnapshot(),
    });

    const decoded = decodeConfigHash(encoded);
    expect(decoded.error).toBeUndefined();
    expect(decoded.payload?.route).toBe('/get-started/deployment/access-control');

    const anotherStore = useAppStore();
    anotherStore.reset();
    anotherStore.initializeStarterDefaults();
    anotherStore.applySerializableSnapshot(decoded.payload?.state);

    expect(anotherStore.getRegistryIntegration).toBe(false);
    expect(anotherStore.getDiscoveryIntegration).toBe(false);
    expect(anotherStore.getExternalBaseUrl).toBe('http://192.168.100.200:8082');
    expect(anotherStore.getBasyxInfraConfigAsString.value).toContain(
      'https://linked-segments.example.org:8443'
    );
  });

  it('serializes validated origins for only the selected infrastructure', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.setBasyxInfraConfig({
      name: 'basyx-infra.yml',
      value: {
        schemaVersion: 'custom-v1',
        infrastructures: {
          default: 'primary',
          primary: {
            name: 'Primary',
            components: {},
            customSetting: true,
          },
          secondary: {
            name: 'Secondary',
            components: {},
            trustedOrigins: ['https://secondary.example'],
          },
        },
      },
    });

    expect(
      store.updateDefaultInfrastructureTrustedOrigins([
        ' https://linked.example:8443 ',
        'http://localhost:8086',
      ])
    ).toBe(true);

    const serialized = yaml.load(store.getBasyxInfraConfigAsString.value as string) as {
      schemaVersion: string;
      infrastructures: Record<string, Record<string, unknown>>;
    };
    expect(serialized.schemaVersion).toBe('custom-v1');
    expect(serialized.infrastructures.primary?.customSetting).toBe(true);
    expect(serialized.infrastructures.primary?.trustedOrigins).toEqual([
      'https://linked.example:8443',
      'http://localhost:8086',
    ]);
    expect(serialized.infrastructures.secondary?.trustedOrigins).toEqual([
      'https://secondary.example',
    ]);
    expect(store.getDockerComposeConfigAsString.value).not.toContain('TRUSTED_ORIGINS');
  });

  it('maintains the generated local InfluxDB origin without changing external trust', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateExternalBaseUrl('https://basyx.example.org:8082/api');
    store.setContainerPort('influxdb', 18086);
    store.updateTimeSeriesData(true);
    store.updateDefaultInfrastructureTrustedOrigins(['https://manual.example.org']);

    const compose = store.getDockerComposeConfig as {
      name?: string;
      value: { services: Record<string, unknown> };
    };
    compose.value.services.influxdb = { ports: ['18086:8086'] };
    store.setDockerComposeConfig(compose);

    expect(store.getConfiguredInfluxDbOrigin).toBe('http://basyx.example.org:18086');
    expect(store.getBasyxInfraConfigAsString.value).toContain('http://basyx.example.org:18086');
    expect(store.getBasyxInfraConfigAsString.value).toContain('https://manual.example.org');

    store.updateExternalBaseUrl('https://new-basyx.example.org:8082/api');
    expect(store.getBasyxInfraConfigAsString.value).not.toContain('http://basyx.example.org:18086');
    expect(store.getBasyxInfraConfigAsString.value).toContain('http://new-basyx.example.org:18086');

    store.setContainerPort('influxdb', 443);
    expect(store.getConfiguredInfluxDbOrigin).toBe('http://new-basyx.example.org:443');
    expect(store.getBasyxInfraConfigAsString.value).not.toContain(
      'http://new-basyx.example.org:18086'
    );
    expect(store.getBasyxInfraConfigAsString.value).toContain('http://new-basyx.example.org:443');

    store.setContainerPort('influxdb', undefined);
    expect(store.getConfiguredInfluxDbOrigin).toBe('http://new-basyx.example.org:8086');

    delete compose.value.services.influxdb;
    compose.value.services.telegraf = {
      environment: ['INFLUX_URL=https://influx.example.org:9443/api/v2'],
    };
    store.setDockerComposeConfig(compose);
    expect(store.getConfiguredInfluxDbOrigin).toBe('https://influx.example.org:9443');
    expect(store.getBasyxInfraConfigAsString.value).not.toContain(
      'http://new-basyx.example.org:8086'
    );
    expect(store.getBasyxInfraConfigAsString.value).not.toContain(
      'https://influx.example.org:9443'
    );
    expect(store.getBasyxInfraConfigAsString.value).toContain('https://manual.example.org');
  });

  it('persists a deliberate local InfluxDB trust removal across unrelated updates and sharing', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateExternalBaseUrl('http://deployment.example:8082');
    store.updateTimeSeriesData(true);

    const compose = store.getDockerComposeConfig as {
      name?: string;
      value: { services: Record<string, unknown> };
    };
    compose.value.services.influxdb = { ports: ['8086:8086'] };
    store.setDockerComposeConfig(compose);
    expect(store.getBasyxInfraConfigAsString.value).toContain('http://deployment.example:8086');

    store.updateDefaultInfrastructureTrustedOrigins(['https://manual.example.org']);
    store.setDockerComposeConfig(compose);
    expect(store.getBasyxInfraConfigAsString.value).not.toContain('http://deployment.example:8086');

    const encoded = encodeConfigHash({
      route: '/get-started/visualization/ui',
      state: store.createSerializableSnapshot(),
    });
    const snapshot = decodeConfigHash(encoded).payload?.state;
    store.reset();
    store.initializeStarterDefaults();
    store.applySerializableSnapshot(snapshot);

    expect(store.getBasyxInfraConfigAsString.value).not.toContain('http://deployment.example:8086');
    expect(store.getBasyxInfraConfigAsString.value).toContain('https://manual.example.org');

    const legacySnapshot = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;
    if (!legacySnapshot) throw new Error('Expected a decoded snapshot');
    delete legacySnapshot.managedInfluxDbOrigin;
    delete legacySnapshot.localInfluxDbOriginOptOutKey;
    const infrastructures = (
      legacySnapshot.basyxInfraConfig?.value as {
        infrastructures: Record<string, unknown>;
      }
    ).infrastructures;
    const defaultKey = infrastructures.default;
    const defaultInfrastructure =
      typeof defaultKey === 'string' ? infrastructures[defaultKey] : undefined;
    if (!defaultInfrastructure || typeof defaultInfrastructure !== 'object') {
      throw new Error('Expected a default infrastructure');
    }
    delete (defaultInfrastructure as Record<string, unknown>).trustedOrigins;

    store.reset();
    store.initializeStarterDefaults();
    store.applySerializableSnapshot(legacySnapshot);
    expect(store.getBasyxInfraConfigAsString.value).toContain('http://deployment.example:8086');
  });

  it('does not claim a matching manually trusted InfluxDB origin as auto-managed', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateExternalBaseUrl('http://deployment.example:8082');
    store.updateDefaultInfrastructureTrustedOrigins(['http://deployment.example:8086']);
    store.updateTimeSeriesData(true);

    const compose = store.getDockerComposeConfig as {
      name?: string;
      value: { services: Record<string, unknown> };
    };
    compose.value.services.influxdb = { ports: ['8086:8086'] };
    store.setDockerComposeConfig(compose);
    store.updateTimeSeriesData(false);

    expect(store.getBasyxInfraConfigAsString.value).toContain('http://deployment.example:8086');
  });
});
