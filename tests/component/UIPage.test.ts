import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import UIPage from '@/pages/get-started/visualization/ui.vue';
import { useAppStore } from '@/stores/app';

vi.stubGlobal('useSeoMeta', vi.fn());

const SwitchStub = defineComponent({
  name: 'SwitchStub',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      default: '',
    },
  },
  template: '<div class="switch-stub" :data-label="label">{{ modelValue }}</div>',
});

const SelectStub = defineComponent({
  name: 'SelectStub',
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
  template: '<div class="select-stub" :data-label="label">{{ modelValue }}</div>',
});

const TextareaStub = defineComponent({
  name: 'TextareaStub',
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
    '<textarea class="textarea-stub" :data-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
});

describe('UI page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('uses the external InfluxDB token when no local database or collector exists', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateTimeSeriesData(true);
    const config = store.getDockerComposeConfig;
    const value = config?.value as {
      services: Record<string, { environment?: string[] | Record<string, string> }>;
    };
    delete value.services['aas-ui'];
    delete value.services.influxdb;
    delete value.services.telegraf;
    store.setDockerComposeConfig({ name: 'docker-compose.yml', value });
    store.updateIncludeLocalInfluxDb(false);
    store.updateIncludeTelegraf(false);
    store.updateExternalInfluxSettings({
      url: 'https://influx.example.org',
      org: 'basyx',
      bucket: 'basyx',
      token: 'test-token',
    });

    mount(UIPage, {
      global: {
        stubs: {
          'v-container': { template: '<div><slot /></div>' },
          'v-breadcrumbs': { template: '<div />' },
          'v-alert': { template: '<div><slot /></div>' },
          'v-row': { template: '<div><slot /></div>' },
          'v-col': { template: '<div><slot /></div>' },
          'v-icon': { template: '<i />' },
          'v-kbd': { template: '<kbd><slot /></kbd>' },
          'v-list': { template: '<div><slot /></div>' },
          'v-list-item': { template: '<div><slot /></div>' },
          'v-divider': { template: '<hr />' },
          'v-expansion-panels': { template: '<div><slot /></div>' },
          'v-expansion-panel': { template: '<section><slot /></section>' },
          'v-expansion-panel-text': { template: '<div><slot /></div>' },
          'v-switch': SwitchStub,
          'v-select': SelectStub,
          'v-textarea': TextareaStub,
          'v-card-actions': { template: '<div><slot /></div>' },
          'v-btn': { template: '<button><slot /></button>' },
          'v-spacer': { template: '<span />' },
        },
      },
    });

    const ui = (store.getDockerComposeConfig?.value as typeof value).services['aas-ui'];
    expect(ui?.environment).toHaveProperty('INFLUXDB_TOKEN', 'test-token');
    expect(store.getConfiguredInfluxDbOrigin).toBe('https://influx.example.org');
  });

  it('reflects late docker-compose hydration updates while page is open', async () => {
    const store = useAppStore();
    store.initializeStarterDefaults();

    const wrapper = mount(UIPage, {
      global: {
        stubs: {
          ClientOnly: { template: '<div><slot /></div>' },
          'v-container': { template: '<div><slot /></div>' },
          'v-breadcrumbs': { template: '<div />' },
          'v-alert': { template: '<div><slot /></div>' },
          'v-row': { template: '<div><slot /></div>' },
          'v-col': { template: '<div><slot /></div>' },
          'v-icon': { template: '<i />' },
          'v-kbd': { template: '<kbd><slot /></kbd>' },
          'v-list': { template: '<div><slot /></div>' },
          'v-list-item': { template: '<div><slot /><slot name="subtitle" /></div>' },
          'v-divider': { template: '<hr />' },
          'v-expansion-panels': { template: '<div><slot /></div>' },
          'v-expansion-panel': { template: '<section><slot /></section>' },
          'v-expansion-panel-text': { template: '<div><slot /></div>' },
          'v-switch': SwitchStub,
          'v-select': SelectStub,
          'v-textarea': TextareaStub,
          'v-card-actions': { template: '<div><slot /></div>' },
          'v-btn': { template: '<button><slot /></button>' },
          'v-spacer': { template: '<span />' },
        },
      },
    });

    const compose = store.getDockerComposeConfig?.value as {
      services?: Record<string, { environment?: Record<string, string> }>;
    };
    const services = compose?.services || {};
    const ui = services['aas-ui'];
    if (ui?.environment) {
      ui.environment.ENDPOINT_CONFIG_AVAILABLE = 'true';
      ui.environment.ALLOW_EDITING = 'false';
      ui.environment.ALLOW_UPLOADING = 'false';
      ui.environment.ALLOW_LOGOUT = 'false';
      ui.environment.SM_VIEWER_EDITOR = 'false';
      ui.environment.START_PAGE_ROUTE_NAME = 'AASEditor';
      store.setDockerComposeConfig({
        name: 'docker-compose.yml',
        value: { services },
      });
    }

    await nextTick();
    await nextTick();

    const switchValues = wrapper
      .findAll('.switch-stub')
      .map(node => `${node.attributes('data-label')}:${node.text().trim()}`);
    expect(switchValues).toEqual([
      'Allow AAS and Submodel editing:false',
      'Allow AAS file uploads:false',
      'Show standalone Submodel Viewer and Editor:false',
      'Show logout action:false',
      'Allow endpoint configuration in the UI:true',
    ]);
    expect(wrapper.find('.select-stub').text().trim()).toBe('AASEditor');
  });

  it('validates and writes additional origins to the selected infrastructure', async () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    const wrapper = mount(UIPage, {
      global: {
        stubs: {
          'v-container': { template: '<div><slot /></div>' },
          'v-breadcrumbs': { template: '<div />' },
          'v-alert': { template: '<div><slot /></div>' },
          'v-divider': { template: '<hr />' },
          'v-expansion-panels': { template: '<div><slot /></div>' },
          'v-expansion-panel': { template: '<section><slot /></section>' },
          'v-expansion-panel-text': { template: '<div><slot /></div>' },
          'v-switch': SwitchStub,
          'v-select': SelectStub,
          'v-textarea': TextareaStub,
          'v-card-actions': { template: '<div><slot /></div>' },
          'v-btn': { template: '<button><slot /></button>' },
          'v-spacer': { template: '<span />' },
        },
      },
    });

    const input = wrapper.find('textarea[data-label="Additional trusted origins"]');
    const applyButton = wrapper
      .findAll('button')
      .find(button => button.text().includes('Apply trusted origins'))!;

    await input.setValue('https://unsafe.example/path');
    expect(applyButton.attributes()).toHaveProperty('disabled');
    expect(store.getBasyxInfraConfigAsString.value).not.toContain('trustedOrigins');

    await input.setValue('https://linked.example:8443\nhttp://localhost:8086');
    expect(applyButton.attributes()).not.toHaveProperty('disabled');
    await applyButton.trigger('click');

    const infra = store.getBasyxInfraConfig?.value as {
      infrastructures: Record<string, { trustedOrigins?: string[] }>;
    };
    expect(infra.infrastructures.infra1?.trustedOrigins).toEqual([
      'https://linked.example:8443',
      'http://localhost:8086',
    ]);
  });

  it('shows the automatically trusted local InfluxDB origin without an add action', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateExternalBaseUrl('http://deployment.example:8082');
    store.setContainerPort('influxdb', 18086);
    store.updateTimeSeriesData(true);
    const compose = store.getDockerComposeConfig as {
      name?: string;
      value: { services: Record<string, unknown> };
    };
    compose.value.services.influxdb = { ports: ['18086:8086'] };
    store.setDockerComposeConfig(compose);

    const wrapper = mount(UIPage, {
      global: {
        stubs: {
          'v-container': { template: '<div><slot /></div>' },
          'v-breadcrumbs': { template: '<div />' },
          'v-alert': { template: '<div><slot /></div>' },
          'v-divider': { template: '<hr />' },
          'v-expansion-panels': { template: '<div><slot /></div>' },
          'v-expansion-panel': { template: '<section><slot /></section>' },
          'v-expansion-panel-text': { template: '<div><slot /></div>' },
          'v-switch': SwitchStub,
          'v-select': SelectStub,
          'v-textarea': TextareaStub,
          'v-card-actions': { template: '<div><slot /></div>' },
          'v-btn': { template: '<button><slot /></button>' },
          'v-spacer': { template: '<span />' },
        },
      },
    });

    expect(store.getBasyxInfraConfigAsString.value).toContain('http://deployment.example:18086');
    expect(wrapper.text()).toContain('http://deployment.example:18086');
    const addButton = wrapper
      .findAll('button')
      .find(button => button.text().includes('Add configured InfluxDB origin'));
    expect(addButton).toBeUndefined();
  });
});
