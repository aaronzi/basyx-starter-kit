import { type DOMWrapper, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import EventingPage from '@/pages/get-started/behaviour/eventing.vue';
import HistoryPage from '@/pages/get-started/behaviour/history.vue';
import RuntimePage from '@/pages/get-started/behaviour/runtime.vue';
import AccessControlPage from '@/pages/get-started/deployment/access-control.vue';
import ObservabilityPage from '@/pages/get-started/deployment/observability.vue';
import { useAppStore } from '@/stores/app';
import { decodeConfigHash, encodeConfigHash } from '@/utils/configPersistence';
import { readServiceEnvironment } from '@/utils/dockerEnvironment';

vi.stubGlobal('useSeoMeta', vi.fn());
vi.stubGlobal('navigateTo', vi.fn());

const InputStub = defineComponent({
  props: {
    modelValue: { type: [String, Number], default: '' },
    label: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  template:
    '<input :data-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
});

const NumberStub = defineComponent({
  props: {
    modelValue: { type: [String, Number], default: 0 },
    label: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  template:
    '<input :data-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
});

const SwitchStub = defineComponent({
  props: { modelValue: { type: Boolean, default: false }, label: { type: String, default: '' } },
  emits: ['update:modelValue'],
  template:
    '<input type="checkbox" :data-label="label" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
});

const globalStubs = {
  'v-container': { template: '<div><slot /></div>' },
  'v-breadcrumbs': { template: '<div />' },
  'v-alert': { template: '<div><slot /></div>' },
  'v-row': { template: '<div><slot /></div>' },
  'v-col': { template: '<div><slot /></div>' },
  'v-divider': { template: '<hr />' },
  'v-expansion-panels': { template: '<div><slot /></div>' },
  'v-expansion-panel': { template: '<section><slot /></section>' },
  'v-expansion-panel-text': { template: '<div><slot /></div>' },
  'v-text-field': InputStub,
  'v-textarea': InputStub,
  SchemaJsonEditor: InputStub,
  'v-file-input': InputStub,
  'v-select': InputStub,
  'v-number-input': NumberStub,
  'v-switch': SwitchStub,
  'v-btn': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  'v-card-actions': { template: '<div><slot /></div>' },
  'v-spacer': { template: '<span />' },
};

function environment(): Record<string, string> {
  const store = useAppStore();
  return readServiceEnvironment(store.getDockerComposeConfig?.value);
}

function applyButton(wrapper: VueWrapper, label: string): DOMWrapper<Element> | undefined {
  return wrapper.findAll('button').find(button => button.text().includes(label));
}

describe('BaSyx Go configuration pages', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAppStore().initializeStarterDefaults();
    vi.mocked(navigateTo).mockClear();
  });

  it('writes runtime and API settings to the AAS Environment', async () => {
    const wrapper = mount(RuntimePage, { global: { stubs: globalStubs } });

    await wrapper.find('input[data-label="SERVER_READ_TIMEOUT_SECONDS"]').setValue('900');
    await wrapper.find('input[data-label="Maximum upload size (MiB)"]').setValue('256');
    await wrapper
      .find('input[data-label="Delegated operation response limit (MiB)"]')
      .setValue('8');
    await applyButton(wrapper, 'Apply Runtime Settings')?.trigger('click');
    await nextTick();

    expect(environment().SERVER_READ_TIMEOUT_SECONDS).toBe('900');
    expect(environment().GENERAL_UPLOADMAXSIZEBYTES).toBe(String(256 * 1024 * 1024));
    expect(environment().GENERAL_DELEGATEDOPERATIONRESPONSEMAXSIZEBYTES).toBe(
      String(8 * 1024 * 1024)
    );
    expect(environment().CORS_ALLOWCREDENTIALS).toBe('true');
  });

  it('restores and resets the delegated operation response limit', async () => {
    expect(environment().GENERAL_DELEGATEDOPERATIONRESPONSEMAXSIZEBYTES).toBe('1048576');
    useAppStore().updateServiceEnvironment('aas-environment', {
      GENERAL_DELEGATEDOPERATIONRESPONSEMAXSIZEBYTES: String(4 * 1024 * 1024),
    });

    const wrapper = mount(RuntimePage, { global: { stubs: globalStubs } });
    expect(
      (
        wrapper.find('input[data-label="Delegated operation response limit (MiB)"]')
          .element as HTMLInputElement
      ).value
    ).toBe('4');

    await applyButton(wrapper, 'Reset To Defaults')?.trigger('click');
    expect(environment().GENERAL_DELEGATEDOPERATIONRESPONSEMAXSIZEBYTES).toBe('1048576');
  });

  it('applies pending runtime changes when advancing to the next page', async () => {
    const wrapper = mount(RuntimePage, { global: { stubs: globalStubs } });
    await wrapper.find('input[data-label="SERVER_READ_TIMEOUT_SECONDS"]').setValue('720');
    await applyButton(wrapper, 'Next')?.trigger('click');

    expect(environment().SERVER_READ_TIMEOUT_SECONDS).toBe('720');
    expect(navigateTo).toHaveBeenCalledWith('/get-started/behaviour/persistence');
  });

  it('enables audit history with a guarded PostgreSQL history store', async () => {
    const wrapper = mount(HistoryPage, { global: { stubs: globalStubs } });

    await wrapper.find('input[data-label="BASYX_HISTORY_MODE"]').setValue('audit');
    await wrapper
      .find('input[data-label="BASYX_HISTORY_IMMUTABILITY"]')
      .setValue('postgres_guarded');
    await wrapper.find('input[data-label="BASYX_AUDIT_IDENTITY_MODE"]').setValue('extended');
    await applyButton(wrapper, 'Apply History Settings')?.trigger('click');
    await nextTick();

    expect(environment().BASYX_HISTORY_MODE).toBe('audit');
    expect(environment().BASYX_HISTORY_IMMUTABILITY).toBe('postgres_guarded');
    expect(environment().BASYX_AUDIT_IDENTITY_MODE).toBe('extended');
  });

  it('configures MQTT CloudEvent publication', async () => {
    const wrapper = mount(EventingPage, { global: { stubs: globalStubs } });

    await wrapper.find('input[data-label="Event sink"]').setValue('mqtt');
    await nextTick();
    await wrapper.find('input[data-label="MQTT broker URL"]').setValue('mqtt://events:1883');
    await applyButton(wrapper, 'Apply Eventing Settings')?.trigger('click');
    await nextTick();

    expect(environment().BASYX_EVENTING_ENABLED).toBe('true');
    expect(environment().BASYX_EVENTING_SINKS).toBe('mqtt');
    expect(environment().BASYX_EVENTING_MQTT_BROKER).toBe('mqtt://events:1883');
  });

  it('enables eventing for the REST feed without enabling the outbox', async () => {
    const wrapper = mount(EventingPage, { global: { stubs: globalStubs } });

    await wrapper.find('input[data-label="Enable the REST event feed"]').setValue(true);
    await applyButton(wrapper, 'Apply Eventing Settings')?.trigger('click');
    await nextTick();

    expect(environment().BASYX_EVENTING_ENABLED).toBe('true');
    expect(environment().BASYX_EVENTING_OUTBOX_ENABLED).toBe('false');
    expect(environment().BASYX_EVENTING_FEED_ENABLED).toBe('true');
  });

  it('resets all broker settings instead of retaining the previous destination', async () => {
    const wrapper = mount(EventingPage, { global: { stubs: globalStubs } });

    await wrapper.find('input[data-label="Event sink"]').setValue('mqtt');
    await nextTick();
    await wrapper.find('input[data-label="MQTT broker URL"]').setValue('mqtt://old-events:1883');
    await applyButton(wrapper, 'Apply Eventing Settings')?.trigger('click');
    await wrapper
      .findAll('button')
      .find(button => button.text().includes('Reset To Defaults'))
      ?.trigger('click');
    await nextTick();

    expect(environment().BASYX_EVENTING_ENABLED).toBe('false');
    expect(environment().BASYX_EVENTING_MQTT_BROKER).toBeUndefined();

    await wrapper.find('input[data-label="Event sink"]').setValue('mqtt');
    await nextTick();
    expect(
      (wrapper.find('input[data-label="MQTT broker URL"]').element as HTMLInputElement).value
    ).toBe('mqtt://mqtt:1883');
  });

  it('configures structured logs and OTLP export', async () => {
    const wrapper = mount(ObservabilityPage, { global: { stubs: globalStubs } });

    await wrapper.find('input[data-label="LOGGING_FORMAT"]').setValue('json');
    await wrapper.find('input[data-label="OTEL_TRACES_EXPORTER"]').setValue('otlp');
    await nextTick();
    await wrapper
      .find('input[data-label="OTEL_EXPORTER_OTLP_ENDPOINT"]')
      .setValue('http://collector:4318');
    await applyButton(wrapper, 'Apply Observability Settings')?.trigger('click');
    await nextTick();

    expect(environment().LOGGING_FORMAT).toBe('json');
    expect(environment().OTEL_TRACES_EXPORTER).toBe('otlp');
    expect(environment().OTEL_EXPORTER_OTLP_ENDPOINT).toBe('http://collector:4318');
  });

  it('adds a matching local MQTT service and removes it in expert external mode', async () => {
    const wrapper = mount(EventingPage, { global: { stubs: globalStubs } });
    await wrapper.find('input[data-label="Event sink"]').setValue('mqtt');
    await nextTick();
    await applyButton(wrapper, 'Apply Eventing Settings')?.trigger('click');
    await nextTick();
    let services = (
      useAppStore().getDockerComposeConfig?.value as { services: Record<string, unknown> }
    ).services;
    expect(services.mqtt).toBeDefined();
    expect(environment().BASYX_EVENTING_MQTT_BROKER).toBe('mqtt://mqtt:1883');

    await wrapper.find('input[data-label="Include a local broker container"]').setValue(false);
    await wrapper.find('input[data-label="MQTT broker URL"]').setValue('mqtt://external:1883');
    await applyButton(wrapper, 'Apply Eventing Settings')?.trigger('click');
    await nextTick();
    services = (
      useAppStore().getDockerComposeConfig?.value as { services: Record<string, unknown> }
    ).services;
    expect(services.mqtt).toBeUndefined();
    expect(environment().BASYX_EVENTING_MQTT_BROKER).toBe('mqtt://external:1883');

    await wrapper.find('input[data-label="Include a local broker container"]').setValue(true);
    await applyButton(wrapper, 'Apply Eventing Settings')?.trigger('click');
    expect(environment().BASYX_EVENTING_MQTT_BROKER).toBe('mqtt://mqtt:1883');
  });

  it('requires a redacted external AMQP password before applying or advancing', async () => {
    const store = useAppStore();
    store.updateServiceEnvironment('aas-environment', {
      BASYX_EVENTING_ENABLED: 'true',
      BASYX_EVENTING_SINKS: 'amqp',
      BASYX_EVENTING_AMQP_BROKER: 'amqp://external:5672',
      BASYX_EVENTING_AMQP_ADDRESS: '/queues/events',
      BASYX_EVENTING_AMQP_USERNAME: 'external-user',
      BASYX_EVENTING_AMQP_PASSWORD: 'external-secret',
    });
    const encoded = encodeConfigHash({
      route: '/get-started/behaviour/eventing',
      state: store.createSerializableSnapshot(),
    });
    store.reset();
    store.initializeStarterDefaults();
    store.applySerializableSnapshot(decodeConfigHash(encoded).payload?.state);

    const wrapper = mount(EventingPage, { global: { stubs: globalStubs } });
    await nextTick();
    expect(
      (wrapper.find('input[data-label="AMQP password"]').element as HTMLInputElement).value
    ).toBe('');
    expect(applyButton(wrapper, 'Apply Eventing Settings')?.attributes('disabled')).toBeDefined();
    expect(applyButton(wrapper, 'Next')?.attributes('disabled')).toBeDefined();

    await wrapper.find('input[data-label="AMQP password"]').setValue('new-secret');
    await applyButton(wrapper, 'Apply Eventing Settings')?.trigger('click');
    expect(environment().BASYX_EVENTING_AMQP_PASSWORD).toBe('new-secret');
  });

  it('clears local AMQP credentials when switching to an external broker', async () => {
    let wrapper = mount(EventingPage, { global: { stubs: globalStubs } });
    await wrapper.find('input[data-label="Event sink"]').setValue('amqp');
    await applyButton(wrapper, 'Apply Eventing Settings')?.trigger('click');
    wrapper.unmount();
    wrapper = mount(EventingPage, { global: { stubs: globalStubs } });
    await nextTick();
    expect(
      (wrapper.find('input[data-label="AMQP password"]').element as HTMLInputElement).value
    ).toBe('basyx-demo');

    await wrapper.find('input[data-label="Include a local broker container"]').setValue(false);
    expect(
      (wrapper.find('input[data-label="AMQP broker URL"]').element as HTMLInputElement).value
    ).toBe('');
    expect(
      (wrapper.find('input[data-label="AMQP username"]').element as HTMLInputElement).value
    ).toBe('');
    expect(
      (wrapper.find('input[data-label="AMQP password"]').element as HTMLInputElement).value
    ).toBe('');

    await wrapper.find('input[data-label="Include a local broker container"]').setValue(true);
    expect(
      (wrapper.find('input[data-label="AMQP broker URL"]').element as HTMLInputElement).value
    ).toBe('amqp://rabbitmq:5672');
    expect(
      (wrapper.find('input[data-label="AMQP password"]').element as HTMLInputElement).value
    ).toBe('basyx-demo');
  });

  it('adds the local telemetry stack and supports an external collector', async () => {
    const wrapper = mount(ObservabilityPage, { global: { stubs: globalStubs } });
    await wrapper.find('input[data-label="OTEL_TRACES_EXPORTER"]').setValue('otlp');
    await applyButton(wrapper, 'Apply Observability Settings')?.trigger('click');
    await nextTick();
    let services = (
      useAppStore().getDockerComposeConfig?.value as { services: Record<string, unknown> }
    ).services;
    expect(services['otel-collector']).toBeDefined();
    expect(services.prometheus).toBeDefined();
    expect(services.tempo).toBeDefined();

    await wrapper
      .find('input[data-label="Include local observability containers"]')
      .setValue(false);
    await wrapper
      .find('input[data-label="OTEL_EXPORTER_OTLP_ENDPOINT"]')
      .setValue('https://otel.example.test:4318');
    await applyButton(wrapper, 'Apply Observability Settings')?.trigger('click');
    await nextTick();
    services = (
      useAppStore().getDockerComposeConfig?.value as { services: Record<string, unknown> }
    ).services;
    expect(services['otel-collector']).toBeUndefined();
    expect(environment().OTEL_EXPORTER_OTLP_ENDPOINT).toBe('https://otel.example.test:4318');
  });

  it('keeps an external OTLP endpoint when another exporter is enabled', async () => {
    const wrapper = mount(ObservabilityPage, { global: { stubs: globalStubs } });
    await wrapper.find('input[data-label="OTEL_TRACES_EXPORTER"]').setValue('otlp');
    await nextTick();
    await wrapper
      .find('input[data-label="Include local observability containers"]')
      .setValue(false);
    await wrapper
      .find('input[data-label="OTEL_EXPORTER_OTLP_ENDPOINT"]')
      .setValue('https://external-otel.example.test:4318');
    await wrapper.find('input[data-label="OTEL_METRICS_EXPORTER"]').setValue('otlp');
    await applyButton(wrapper, 'Apply Observability Settings')?.trigger('click');

    expect(environment().OTEL_EXPORTER_OTLP_ENDPOINT).toBe(
      'https://external-otel.example.test:4318'
    );
    const services = (
      useAppStore().getDockerComposeConfig?.value as { services: Record<string, unknown> }
    ).services;
    expect(services['otel-collector']).toBeUndefined();
  });

  it('adds local log collection when structured logging is selected', async () => {
    const wrapper = mount(ObservabilityPage, { global: { stubs: globalStubs } });
    await wrapper.find('input[data-label="LOGGING_FORMAT"]').setValue('json');
    await applyButton(wrapper, 'Apply Observability Settings')?.trigger('click');
    await nextTick();
    const services = (
      useAppStore().getDockerComposeConfig?.value as { services: Record<string, unknown> }
    ).services;
    expect(services.loki).toBeDefined();
    expect(services.alloy).toBeDefined();
    expect(services.grafana).toBeDefined();
    expect(environment().LOGGING_FORMAT).toBe('json');
  });

  it('packages local Keycloak configuration or keeps an external OIDC connection', async () => {
    const wrapper = mount(AccessControlPage, { global: { stubs: globalStubs } });
    await wrapper.find('input[data-label="Enable access control"]').setValue(true);
    await nextTick();
    await applyButton(wrapper, 'Apply Access Control Settings')?.trigger('click');
    await nextTick();
    let services = (
      useAppStore().getDockerComposeConfig?.value as { services: Record<string, unknown> }
    ).services;
    expect(services.keycloak).toBeDefined();
    expect(services.keycloak).toMatchObject({
      networks: { default: { aliases: ['keycloak.localhost'] } },
    });
    expect(services['aas-environment']).not.toMatchObject({
      extra_hosts: ['keycloak.localhost:host-gateway'],
    });
    expect(environment().ABAC_ENABLED).toBe('true');
    expect(environment().ABAC_MODELPATH).toBe('/security_env/access-rules.json');

    await wrapper.find('input[data-label="Include local Keycloak container"]').setValue(false);
    await wrapper
      .find('input[data-label="OIDC issuer URL"]')
      .setValue('https://identity.example.test/realms/basyx');
    await applyButton(wrapper, 'Apply Access Control Settings')?.trigger('click');
    await nextTick();
    services = (
      useAppStore().getDockerComposeConfig?.value as { services: Record<string, unknown> }
    ).services;
    expect(services.keycloak).toBeUndefined();
    expect(environment().ABAC_ENABLED).toBe('true');
    const infra = useAppStore().getBasyxInfraConfig?.value as {
      infrastructures: { infra1: { security: { config: { issuer: string } } } };
    };
    expect(infra.infrastructures.infra1.security.config.issuer).toBe(
      'https://identity.example.test/realms/basyx'
    );
  });

  it('applies access control before finalizing and keeps trust-list customizations', async () => {
    const wrapper = mount(AccessControlPage, { global: { stubs: globalStubs } });
    await wrapper.find('input[data-label="Enable access control"]').setValue(true);
    await nextTick();
    await wrapper.find('input[data-label="Include local Keycloak container"]').setValue(false);
    const trustList = [
      {
        issuer: 'http://keycloak.localhost:8080/realms/basyx',
        audience: 'discovery-service',
        scopes: ['custom-scope'],
      },
    ];
    await wrapper
      .find('input[data-label="OIDC trust-list JSON"]')
      .setValue(JSON.stringify(trustList));
    await wrapper
      .find('input[data-label="OIDC issuer URL"]')
      .setValue('https://id.example.test/realms/basyx');
    await applyButton(wrapper, 'Finalize')?.trigger('click');

    const store = useAppStore();
    expect(environment().ABAC_ENABLED).toBe('true');
    expect(JSON.parse(store.trustListJson)).toEqual([
      { ...trustList[0], issuer: 'https://id.example.test/realms/basyx' },
    ]);
    expect(navigateTo).toHaveBeenCalledWith('/get-started/download');
  });

  it('clears the applied notice after edits and blocks invalid access policies at Finalize', async () => {
    const wrapper = mount(AccessControlPage, { global: { stubs: globalStubs } });
    await wrapper.find('input[data-label="Enable access control"]').setValue(true);
    await applyButton(wrapper, 'Apply Access Control Settings')?.trigger('click');
    await nextTick();
    expect(wrapper.text()).toContain('Access control settings applied.');

    await wrapper.find('input[data-label="Access policy JSON"]').setValue('{');
    await nextTick();
    expect(wrapper.text()).not.toContain('Access control settings applied.');
    await applyButton(wrapper, 'Finalize')?.trigger('click');
    expect(navigateTo).not.toHaveBeenCalled();
  });
});
