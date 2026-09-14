import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import { createSSRApp, defineComponent, h, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';
import TimeSeriesPage from '@/pages/get-started/behaviour/time-series.vue';
import { useAppStore } from '@/stores/app';

vi.stubGlobal('useSeoMeta', vi.fn());

const TextFieldStub = defineComponent({
  name: 'TextFieldStub',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    label: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  template:
    '<input class="field" :data-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
});

const ssrStubs = {
  ClientOnly: defineComponent({ template: '<div><slot /></div>' }),
  'v-container': defineComponent({ template: '<div><slot /></div>' }),
  'v-breadcrumbs': defineComponent({ template: '<div />' }),
  'v-alert': defineComponent({ template: '<div><slot /></div>' }),
  'v-radio-group': defineComponent({ template: '<div><slot /></div>' }),
  'v-radio': defineComponent({ template: '<div />' }),
  'v-slide-y-transition': defineComponent({ template: '<div><slot /></div>' }),
  'v-divider': defineComponent({ template: '<hr />' }),
  'v-row': defineComponent({ template: '<div><slot /></div>' }),
  'v-col': defineComponent({ template: '<div><slot /></div>' }),
  'v-icon': defineComponent({ template: '<i />' }),
  'v-kbd': defineComponent({ template: '<kbd><slot /></kbd>' }),
  'v-text-field': TextFieldStub,
  'v-file-input': defineComponent({ template: '<div />' }),
  'v-card-actions': defineComponent({ template: '<div><slot /></div>' }),
  'v-btn': defineComponent({ template: '<button><slot /></button>' }),
  'v-spacer': defineComponent({ template: '<span />' }),
};

function readEnvValue(environment: string[], key: string): string | undefined {
  const entry = environment.find(item => item.startsWith(`${key}=`));
  return entry ? entry.split('=').slice(1).join('=') : undefined;
}

describe('Time Series page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('reflects late store hydration updates while page is already open', async () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateTimeSeriesData(false);

    const wrapper = mount(TimeSeriesPage, {
      global: {
        stubs: {
          ClientOnly: { template: '<div><slot /></div>' },
          'v-container': { template: '<div><slot /></div>' },
          'v-breadcrumbs': { template: '<div />' },
          'v-alert': { template: '<div><slot /></div>' },
          'v-radio-group': { template: '<div><slot /></div>' },
          'v-radio': { template: '<div />' },
          'v-slide-y-transition': { template: '<div><slot /></div>' },
          'v-divider': { template: '<hr />' },
          'v-row': { template: '<div><slot /></div>' },
          'v-col': { template: '<div><slot /></div>' },
          'v-icon': { template: '<i />' },
          'v-kbd': { template: '<kbd><slot /></kbd>' },
          'v-text-field': TextFieldStub,
          'v-file-input': { template: '<div />' },
          'v-card-actions': { template: '<div><slot /></div>' },
          'v-btn': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          'v-spacer': { template: '<span />' },
        },
      },
    });

    expect(wrapper.text()).not.toContain('Metrics Collection');

    store.updateTimeSeriesData(true);
    await nextTick();
    await nextTick();

    expect(wrapper.text()).toContain('Metrics Collection');
  });

  it('applies influx settings and syncs token to AAS UI', async () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateTimeSeriesData(true);

    const wrapper = mount(TimeSeriesPage, {
      global: {
        stubs: {
          ClientOnly: { template: '<div><slot /></div>' },
          'v-container': { template: '<div><slot /></div>' },
          'v-breadcrumbs': { template: '<div />' },
          'v-alert': { template: '<div><slot /></div>' },
          'v-radio-group': { template: '<div><slot /></div>' },
          'v-radio': { template: '<div />' },
          'v-slide-y-transition': { template: '<div><slot /></div>' },
          'v-divider': { template: '<hr />' },
          'v-row': { template: '<div><slot /></div>' },
          'v-col': { template: '<div><slot /></div>' },
          'v-icon': { template: '<i />' },
          'v-kbd': { template: '<kbd><slot /></kbd>' },
          'v-text-field': TextFieldStub,
          'v-file-input': { template: '<div />' },
          'v-card-actions': { template: '<div><slot /></div>' },
          'v-btn': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          'v-spacer': { template: '<span />' },
        },
      },
    });

    await nextTick();

    await wrapper.find('input[data-label="DOCKER_INFLUXDB_INIT_ORG"]').setValue('demo-org');
    await wrapper.find('input[data-label="DOCKER_INFLUXDB_INIT_BUCKET"]').setValue('demo-bucket');
    await wrapper
      .find('input[data-label="DOCKER_INFLUXDB_INIT_ADMIN_TOKEN"]')
      .setValue('demo-token-123');

    await wrapper
      .findAll('button')
      .find(button => button.text().includes('Apply InfluxDB Settings'))
      ?.trigger('click');
    await nextTick();

    const compose = store.getDockerComposeConfig?.value as {
      services: Record<string, { environment?: string[] | Record<string, string> }>;
    };
    const influx = compose.services.influxdb;
    const aasUi = compose.services['aas-ui'];

    if (!influx || !Array.isArray(influx.environment)) {
      throw new Error('Expected influxdb service with array environment variables.');
    }
    if (!aasUi || !aasUi.environment || Array.isArray(aasUi.environment)) {
      throw new Error('Expected aas-ui service with object environment variables.');
    }

    expect(readEnvValue(influx.environment, 'DOCKER_INFLUXDB_INIT_ORG')).toBe('demo-org');
    expect(readEnvValue(influx.environment, 'DOCKER_INFLUXDB_INIT_BUCKET')).toBe('demo-bucket');
    expect(readEnvValue(influx.environment, 'DOCKER_INFLUXDB_INIT_ADMIN_TOKEN')).toBe(
      'demo-token-123'
    );
    expect(aasUi.environment.INFLUXDB_TOKEN).toBe('demo-token-123');
  });

  it('does not generate a random token during SSR render', async () => {
    const cryptoMock = {
      getRandomValues: vi.fn(() => {
        throw new Error('Token generation must not happen during SSR.');
      }),
    };
    vi.stubGlobal('crypto', cryptoMock);

    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateTimeSeriesData(true);

    const app = createSSRApp({
      render: () => h(TimeSeriesPage),
    });
    app.use(pinia);
    Object.entries(ssrStubs).forEach(([name, component]) => {
      app.component(name, component);
    });

    const html = await renderToString(app);

    expect(cryptoMock.getRandomValues).not.toHaveBeenCalled();
    expect(html).toContain('data-label="DOCKER_INFLUXDB_INIT_ADMIN_TOKEN"');
  });
});
