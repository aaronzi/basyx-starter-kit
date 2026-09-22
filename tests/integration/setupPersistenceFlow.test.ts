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
  });
});
