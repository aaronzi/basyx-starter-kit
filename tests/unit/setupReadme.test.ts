import { createSetupReadme } from '@/utils/setupReadme';

describe('setup README generation', () => {
  it('uses synced external AAS and UI endpoints', () => {
    const readme = createSetupReadme({
      externalBaseUrl: 'http://192.168.100.200:4000',
      aasEnvironmentExternalPort: 8082,
      aasEnvironmentContextPath: '/api/aas',
      aasUiExternalPort: 3000,
      aasUiBasePath: '/basyx-ui',
    });

    expect(readme).toContain('- AAS Environment: http://192.168.100.200:8082/api/aas');
    expect(readme).toContain('- AAS Web UI: http://192.168.100.200:3000/basyx-ui');
    expect(readme).toContain("selected infrastructure's `trustedOrigins` list");
    expect(readme).toContain('backend requests do not follow redirects');
  });
});
