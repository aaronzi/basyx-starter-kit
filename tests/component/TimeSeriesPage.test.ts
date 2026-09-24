import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import TimeSeriesPage from '@/pages/get-started/behaviour/time-series.vue';
import { useAppStore } from '@/stores/app';

vi.stubGlobal('useSeoMeta', vi.fn());
vi.stubGlobal('navigateTo', vi.fn());

const FieldStub = defineComponent({
  props: { modelValue: { type: String, default: '' }, label: { type: String, default: '' } },
  emits: ['update:modelValue'],
  template:
    '<input :data-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
});
const SwitchStub = defineComponent({
  props: { modelValue: { type: Boolean, default: false }, label: { type: String, default: '' } },
  emits: ['update:modelValue'],
  template:
    '<input type="checkbox" :data-label="label" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
});
const stubs = {
  'v-container': { template: '<div><slot /></div>' },
  'v-breadcrumbs': { template: '<div />' },
  'v-alert': { template: '<div><slot /></div>' },
  'v-row': { template: '<div><slot /></div>' },
  'v-col': { template: '<div><slot /></div>' },
  'v-icon': { template: '<i />' },
  'v-kbd': { template: '<kbd><slot /></kbd>' },
  'v-divider': { template: '<hr />' },
  'v-slide-y-transition': { template: '<div><slot /></div>' },
  'v-radio-group': { template: '<div><slot /></div>' },
  'v-radio': { template: '<div />' },
  'v-file-input': { template: '<div />' },
  TelegrafConfigEditor: { template: '<div />' },
  'v-text-field': FieldStub,
  'v-switch': SwitchStub,
  'v-btn': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'v-card-actions': { template: '<div><slot /></div>' },
  'v-spacer': { template: '<span />' },
};

function services(store: ReturnType<typeof useAppStore>) {
  return (
    store.getDockerComposeConfig?.value as {
      services: Record<string, { environment?: string[]; depends_on?: string[] }>;
    }
  ).services;
}

describe('Time Series page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('creates local services and an editable starter file, then connects externally without a local InfluxDB', async () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateTimeSeriesData(true);
    store.updateIncludeTelegraf(true);
    const wrapper = mount(TimeSeriesPage, { global: { stubs } });
    await nextTick();
    expect(wrapper.text()).toContain('automatically adds the local InfluxDB container');
    expect(services(store).influxdb).toBeDefined();
    expect(store.getBasyxInfraConfigAsString.value).toContain('http://localhost:8086');
    expect(services(store).telegraf?.depends_on).toEqual(['influxdb']);
    expect((await store.getTelegrafConf?.text()) || '').toContain('${INFLUX_TOKEN}');
    const localToken = services(store).influxdb?.environment?.find(entry =>
      entry.startsWith('DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=')
    );

    await wrapper.find('input[data-label="Include local Telegraf collector"]').setValue(false);
    expect(services(store).telegraf).toBeUndefined();
    expect(store.getBasyxConfig.some(item => item.id === 'comp-telegraf')).toBe(false);
    expect(
      services(store).influxdb?.environment?.find(entry =>
        entry.startsWith('DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=')
      )
    ).toBe(localToken);

    await wrapper.find('input[data-label="Include local Telegraf collector"]').setValue(true);
    expect(services(store).telegraf?.depends_on).toEqual(['influxdb']);

    await wrapper.find('input[data-label="Include local InfluxDB container"]').setValue(false);
    expect(services(store).influxdb).toBeUndefined();
    expect(services(store).telegraf?.depends_on).toBeUndefined();
    expect(store.getBasyxConfig.some(item => item.id === 'comp-influxdb')).toBe(false);

    await wrapper
      .find('input[data-label="External InfluxDB URL"]')
      .setValue('https://influx.example.org');
    await wrapper
      .find('input[data-label="External InfluxDB API token"]')
      .setValue('external-token');
    await wrapper
      .findAll('button')
      .find(button => button.text().includes('Next'))
      ?.trigger('click');
    await nextTick();
    expect(services(store).telegraf?.environment).toContain(
      'INFLUX_URL=https://influx.example.org'
    );
    expect(services(store).telegraf?.environment).toContain('INFLUX_TOKEN=external-token');
    expect(navigateTo).toHaveBeenCalledWith('/get-started/visualization/ui');

    wrapper.unmount();
    const restored = mount(TimeSeriesPage, { global: { stubs } });
    await nextTick();
    expect(services(store).influxdb).toBeUndefined();
    expect(restored.find('input[data-label="External InfluxDB URL"]').element).toHaveProperty(
      'value',
      'https://influx.example.org'
    );
    expect(services(store).telegraf?.environment).toContain('INFLUX_TOKEN=external-token');

    await restored.find('input[data-label="Include local InfluxDB container"]').setValue(true);
    expect(services(store).influxdb).toBeDefined();
    expect(services(store).telegraf?.depends_on).toEqual(['influxdb']);
    const regeneratedLocalToken = services(store).influxdb?.environment?.find(entry =>
      entry.startsWith('DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=')
    );
    expect(regeneratedLocalToken).toBeTruthy();
    expect(regeneratedLocalToken).not.toContain('external-token');

    restored.unmount();
    const localRestored = mount(TimeSeriesPage, { global: { stubs } });
    await nextTick();
    expect(
      services(store).influxdb?.environment?.find(entry =>
        entry.startsWith('DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=')
      )
    ).toBe(regeneratedLocalToken);
    localRestored.unmount();
  });

  it('keeps InfluxDB configured when the local Telegraf collector is omitted', async () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateTimeSeriesData(true);
    const wrapper = mount(TimeSeriesPage, { global: { stubs } });
    await nextTick();

    expect(
      (
        wrapper.find('input[data-label="Include local Telegraf collector"]')
          .element as HTMLInputElement
      ).checked
    ).toBe(false);
    expect(store.getIncludeTelegraf).toBe(false);
    expect(services(store).influxdb).toBeDefined();
    expect(services(store).telegraf).toBeUndefined();
    expect(store.getBasyxConfig.some(item => item.id === 'comp-telegraf')).toBe(false);
    expect(wrapper.text()).not.toContain('Telegraf configuration (TOML)');

    await wrapper.find('input[data-label="Include local InfluxDB container"]').setValue(false);
    await wrapper
      .find('input[data-label="External InfluxDB URL"]')
      .setValue('https://external-influx.example.org');
    await wrapper
      .find('input[data-label="External InfluxDB API token"]')
      .setValue('external-token');
    await wrapper
      .findAll('button')
      .find(button => button.text().includes('Next'))
      ?.trigger('click');
    await nextTick();

    expect(services(store).influxdb).toBeUndefined();
    expect(services(store).telegraf).toBeUndefined();
    expect(store.getExternalInfluxSettings).toEqual({
      url: 'https://external-influx.example.org',
      org: 'basyx',
      bucket: 'basyx',
      token: 'external-token',
    });
    expect(store.getConfiguredInfluxDbOrigin).toBe('https://external-influx.example.org');
    expect(navigateTo).toHaveBeenCalledWith('/get-started/visualization/ui');

    wrapper.unmount();
    const restored = mount(TimeSeriesPage, { global: { stubs } });
    await nextTick();
    expect(
      (
        restored.find('input[data-label="Include local Telegraf collector"]')
          .element as HTMLInputElement
      ).checked
    ).toBe(false);
    expect(restored.find('input[data-label="External InfluxDB URL"]').element).toHaveProperty(
      'value',
      'https://external-influx.example.org'
    );
  });
});
