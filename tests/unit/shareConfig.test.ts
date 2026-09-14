import type { SerializableStarterState } from '@/stores/app';
import {
  decodeConfigHash,
  parseQueryParams,
  readConfigQueryFromUrl,
} from '@/utils/configPersistence';
import { buildShareConfigUrl } from '@/utils/shareConfig';

function createState(): SerializableStarterState {
  return {
    registryIntegration: true,
    discoveryIntegration: false,
    externalBaseUrl: 'http://localhost:8082',
    mqtt: false,
    timeSeriesData: true,
    userInterface: true,
    dashboard: false,
    aasDiscovery: true,
    customColor: '',
    syncBranding: false,
    lightPrimaryColor: '#FFFFFF',
    darkPrimaryColor: '#101010',
    containerPorts: [{ id: 'aas-environment', port: 8082 }],
    containerNames: [{ id: 'aas-environment', name: 'aas-environment' }],
    contextPathes: [{ id: 'aas-environment', contextPath: '/api/aas' }],
    basyxConfig: [],
    dockerComposeConfig: {
      name: 'docker-compose.yml',
      value: {
        services: {
          'aas-environment': {
            image: 'eclipsebasyx/aasenvironment-go:latest',
          },
        },
      },
    },
    basyxInfraConfig: {
      name: 'basyx-infra.yml',
      value: { infrastructures: { default: 'infra1' } },
    },
  };
}

describe('shareConfig url builder', () => {
  it('creates a share url that contains cfg payload', () => {
    const url = buildShareConfigUrl(
      'http://localhost:3000/',
      '/get-started/download?foo=bar',
      createState()
    );

    expect(url).toContain('/get-started/download?foo=bar&cfg=v1.');
  });

  it('creates a decodable cfg payload', () => {
    const url = buildShareConfigUrl(
      'http://localhost:3000',
      '/get-started/application',
      createState()
    );
    const query = url.split('?')[1] || '';
    const cfgValue = readConfigQueryFromUrl(`?${query}`);

    const decoded = decodeConfigHash(cfgValue);
    expect(decoded.error).toBeUndefined();
    expect(decoded.payload?.route).toBe('/get-started/application');
    expect(decoded.payload?.state.discoveryIntegration).toBe(false);

    const params = parseQueryParams(`?${query}`);
    expect(params.get('cfg')).toBeTruthy();
  });
});
