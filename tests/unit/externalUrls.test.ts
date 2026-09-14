import {
  buildAasEnvironmentExternalUrl,
  buildExternalBaseUrl,
  buildExternalServiceUrl,
  getExplicitUrlPort,
  getUrlPath,
  hasExplicitUrlPort,
  parseExternalBaseUrl,
  replaceExplicitUrlPort,
  replaceUrlPath,
} from '@/utils/externalUrls';

describe('external URL helpers', () => {
  it('replaces an explicit AAS Environment URL port with the configured external port', () => {
    expect(buildAasEnvironmentExternalUrl('http://192.168.100.200:4000', 8082)).toBe(
      'http://192.168.100.200:8082'
    );
    expect(getExplicitUrlPort('http://192.168.100.200:4000')).toBe(4000);
    expect(replaceExplicitUrlPort('http://192.168.100.200:4000', 9090)).toBe(
      'http://192.168.100.200:9090'
    );
  });

  it('preserves portless AAS Environment URLs', () => {
    expect(buildAasEnvironmentExternalUrl('https://basyx.example.com', 8082)).toBe(
      'https://basyx.example.com'
    );
    expect(hasExplicitUrlPort('https://basyx.example.com')).toBe(false);
  });

  it('builds service URLs from the external base host and configured service port', () => {
    expect(buildExternalServiceUrl('http://192.168.100.200:8082', 3000)).toBe(
      'http://192.168.100.200:3000'
    );
  });

  it('appends configured context paths after the effective external URL', () => {
    expect(buildAasEnvironmentExternalUrl('http://192.168.100.200:4000', 8082, '/api/aas')).toBe(
      'http://192.168.100.200:8082/api/aas'
    );
    expect(
      buildAasEnvironmentExternalUrl('http://192.168.100.200:4000/old-path', 8082, '/api/aas')
    ).toBe('http://192.168.100.200:8082/api/aas');
    expect(buildExternalServiceUrl('http://192.168.100.200:8082', 3000, 'basyx-ui')).toBe(
      'http://192.168.100.200:3000/basyx-ui'
    );
    expect(getUrlPath('http://192.168.100.200:8082/api/aas')).toBe('/api/aas');
    expect(replaceUrlPath('http://192.168.100.200:8082/api/aas', undefined)).toBe(
      'http://192.168.100.200:8082'
    );
  });

  it('parses and builds split External Base URL parts', () => {
    expect(parseExternalBaseUrl('https://basyx.example.com:8443/api/aas')).toEqual({
      protocol: 'https',
      host: 'basyx.example.com',
      port: 8443,
      contextPath: '/api/aas',
    });
    expect(
      buildExternalBaseUrl({
        protocol: 'https',
        host: 'basyx.example.com',
        contextPath: '/api/aas',
      })
    ).toBe('https://basyx.example.com/api/aas');
  });
});
