import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import ApplicationPage from '@/pages/get-started/application.vue';
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
  emits: ['update:modelValue'],
  template: '<div class="switch-stub" :data-label="label">{{ modelValue }}</div>',
});

const TextFieldStub = defineComponent({
  name: 'TextFieldStub',
  props: {
    modelValue: {
      type: [String, Number],
      default: '',
    },
    label: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  template:
    '<input class="field-stub" :data-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
});

const NumberInputStub = defineComponent({
  name: 'NumberInputStub',
  props: {
    modelValue: {
      type: [String, Number],
      default: '',
    },
    label: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  template:
    '<input class="number-stub" :data-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
});

const CheckboxStub = defineComponent({
  name: 'CheckboxStub',
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
  emits: ['update:modelValue'],
  template:
    '<input class="checkbox-stub" type="checkbox" :data-label="label" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
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
  emits: ['update:modelValue'],
  template:
    '<select class="select-stub" :data-label="label" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="http">HTTP</option><option value="https">HTTPS</option></select>',
});

describe('Application page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('reflects late store hydration updates while page is already open', async () => {
    const store = useAppStore();
    store.initializeStarterDefaults();

    const wrapper = mount(ApplicationPage, {
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
          'v-text-field': TextFieldStub,
          'v-select': SelectStub,
          'v-number-input': NumberInputStub,
          'v-checkbox': CheckboxStub,
          'v-divider': { template: '<hr />' },
          'v-card-actions': { template: '<div><slot /></div>' },
          'v-btn': { template: '<button><slot /></button>' },
          'v-spacer': { template: '<span />' },
          'v-switch': SwitchStub,
        },
      },
    });

    const readSwitchValues = (): string[] =>
      wrapper.findAll('.switch-stub').map(node => node.text().trim());

    expect(readSwitchValues()).toEqual(['true', 'true']);

    store.updateRegistryIntegration(false);
    store.updateDiscoveryIntegration(false);
    await nextTick();
    await nextTick();

    expect(readSwitchValues()).toEqual(['false', 'false']);
  });

  it('updates External Base URL from split URL controls', async () => {
    const store = useAppStore();
    store.initializeStarterDefaults();

    const wrapper = mount(ApplicationPage, {
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
          'v-text-field': TextFieldStub,
          'v-select': SelectStub,
          'v-number-input': NumberInputStub,
          'v-checkbox': CheckboxStub,
          'v-divider': { template: '<hr />' },
          'v-card-actions': { template: '<div><slot /></div>' },
          'v-btn': { template: '<button><slot /></button>' },
          'v-spacer': { template: '<span />' },
          'v-switch': SwitchStub,
        },
      },
    });

    await wrapper.find('input[data-label="Host or IP"]').setValue('192.168.100.200');
    await wrapper.find('input[data-label="AAS Environment Port"]').setValue('4000');
    await wrapper.find('input[data-label="AAS Context Path"]').setValue('api/aas/');
    await nextTick();

    expect(store.getExternalBaseUrl).toBe('http://192.168.100.200:4000/api/aas');
    expect(store.getContainerPort('aas-environment')).toBe(4000);
    expect(store.getContextPath('aas-environment')).toBe('/api/aas');
    expect(wrapper.get('[data-test="aas-environment-url"]').text()).toBe(
      'http://192.168.100.200:4000/api/aas'
    );
    expect(wrapper.get('[data-test="aas-shells-url"]').text()).toBe(
      'http://192.168.100.200:4000/api/aas/shells'
    );
    expect(wrapper.get('[data-test="external-url-preview"]').text()).toContain('/shells');

    await wrapper.find('input[data-label="Include explicit port"]').setValue(false);
    await nextTick();

    expect(store.getExternalBaseUrl).toBe('http://192.168.100.200/api/aas');
    expect(store.getContainerPort('aas-environment')).toBe(4000);
  });

  it('normalizes pasted URL pieces in the Host field', async () => {
    const store = useAppStore();
    store.initializeStarterDefaults();

    const wrapper = mount(ApplicationPage, {
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
          'v-text-field': TextFieldStub,
          'v-select': SelectStub,
          'v-number-input': NumberInputStub,
          'v-checkbox': CheckboxStub,
          'v-divider': { template: '<hr />' },
          'v-card-actions': { template: '<div><slot /></div>' },
          'v-btn': { template: '<button><slot /></button>' },
          'v-spacer': { template: '<span />' },
          'v-switch': SwitchStub,
        },
      },
    });

    await wrapper
      .find('input[data-label="Host or IP"]')
      .setValue('https://basyx.example.com:9443/api/aas/');
    await nextTick();

    expect(store.getExternalBaseUrl).toBe('https://basyx.example.com:9443/api/aas');
    expect(store.getContainerPort('aas-environment')).toBe(9443);
    expect(store.getContextPath('aas-environment')).toBe('/api/aas');
  });
});
