import { flushPromises, mount } from '@vue/test-utils';
import JSZip from 'jszip';
import { vi } from 'vitest';
import DownloadPage from '@/pages/get-started/download.vue';
import { useAppStore } from '@/stores/app';

vi.mock('@/utils/rsaKey', () => ({ generateRsaPrivateKeyPem: vi.fn(async () => 'test-key') }));
vi.stubGlobal('useSeoMeta', vi.fn());
vi.stubGlobal('useRoute', () => ({
  path: '/get-started/download',
  fullPath: '/get-started/download',
}));

const stubs = {
  ContactUs: true,
  'v-container': { template: '<div><slot /></div>' },
  'v-breadcrumbs': true,
  'v-alert': { template: '<div><slot /></div>' },
  'v-row': { template: '<div><slot /></div>' },
  'v-col': { template: '<div><slot /></div>' },
  'v-spacer': true,
  'v-fade-transition': { template: '<div><slot /></div>' },
  'v-btn': { template: '<button><slot /></button>' },
  'v-divider': true,
  'v-text-field': true,
  'v-card-actions': { template: '<div><slot /></div>' },
};

async function download(): Promise<ReturnType<typeof mount>> {
  const wrapper = mount(DownloadPage, { global: { stubs } });
  await wrapper
    .findAll('button')
    .find(button => button.text() === 'Download BaSyx Setup')!
    .trigger('click');
  await flushPromises();
  return wrapper;
}

describe('download with optional Telegraf', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    useAppStore().initializeStarterDefaults();
    useAppStore().updateTimeSeriesData(true);
  });

  afterEach(() => vi.restoreAllMocks());

  it('downloads local InfluxDB without requiring or bundling Telegraf configuration', async () => {
    const store = useAppStore();
    const compose = store.getDockerComposeConfig!;
    const value = compose.value as { services: Record<string, unknown> };
    value.services.influxdb = { image: 'influxdb:2', ports: ['8086:8086'] };
    store.setDockerComposeConfig(compose);
    store.setTelegrafConf(new File(['old collector configuration'], 'telegraf.conf'));
    const generate = vi.spyOn(JSZip.prototype, 'generateAsync').mockResolvedValue(new Blob());

    const wrapper = await download();

    expect(generate).toHaveBeenCalledOnce();
    const zip = generate.mock.contexts[0] as JSZip;
    expect(zip.file('docker-compose.yml')).not.toBeNull();
    expect(Object.keys(zip.files).some(path => path.startsWith('telegraf/'))).toBe(false);
    expect(wrapper.text()).not.toContain('Configure a valid Telegraf');
    wrapper.unmount();
  });

  it('downloads external InfluxDB without Telegraf using independently stored connection settings', async () => {
    const store = useAppStore();
    store.updateExternalInfluxSettings({
      url: 'https://influx.example.org',
      org: 'basyx',
      bucket: 'metrics',
      token: 'external-token',
    });
    const generate = vi.spyOn(JSZip.prototype, 'generateAsync').mockResolvedValue(new Blob());

    const wrapper = await download();

    expect(generate).toHaveBeenCalledOnce();
    const zip = generate.mock.contexts[0] as JSZip;
    expect(Object.keys(zip.files).some(path => path.startsWith('telegraf/'))).toBe(false);
    wrapper.unmount();
  });

  it('still requires the external InfluxDB token after a shared configuration strips it', async () => {
    useAppStore().updateExternalInfluxSettings({
      url: 'https://influx.example.org',
      org: 'basyx',
      bucket: 'metrics',
      token: '',
    });
    const generate = vi.spyOn(JSZip.prototype, 'generateAsync').mockResolvedValue(new Blob());

    const wrapper = await download();

    expect(generate).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Enter the external InfluxDB URL and API token');
    wrapper.unmount();
  });

  it('still requires the configuration file when a local Telegraf service is included', async () => {
    const store = useAppStore();
    const compose = store.getDockerComposeConfig!;
    const value = compose.value as { services: Record<string, unknown> };
    value.services.telegraf = { image: 'telegraf:1.29.1' };
    store.setDockerComposeConfig(compose);
    const generate = vi.spyOn(JSZip.prototype, 'generateAsync').mockResolvedValue(new Blob());

    const wrapper = await download();

    expect(generate).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Configure a valid Telegraf TOML file');
    wrapper.unmount();
  });
});
