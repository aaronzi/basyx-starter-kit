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

describe('UI page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
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
          'v-switch': SwitchStub,
          'v-select': SelectStub,
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
      'ENDPOINT_CONFIG_AVAILABLE:true',
      'ALLOW_EDITING:false',
      'ALLOW_UPLOADING:false',
      'ALLOW_LOGOUT:false',
      'SM_VIEWER_EDITOR:false',
    ]);
    expect(wrapper.find('.select-stub').text().trim()).toBe('AASEditor');
  });
});
