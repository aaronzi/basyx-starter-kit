import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import CorporateDesignPage from '@/pages/get-started/visualization/corporate-design.vue';
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
  template: '<div class="text-field-stub" :data-label="label">{{ modelValue }}</div>',
});

describe('Corporate design page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('reflects late docker-compose hydration updates while page is open', async () => {
    const store = useAppStore();
    store.initializeStarterDefaults();

    const wrapper = mount(CorporateDesignPage, {
      global: {
        stubs: {
          ClientOnly: { template: '<div><slot /></div>' },
          'v-container': { template: '<div><slot /></div>' },
          'v-breadcrumbs': { template: '<div />' },
          'v-alert': { template: '<div><slot /></div>' },
          'v-switch': { template: '<div />' },
          'v-divider': { template: '<hr />' },
          'v-row': { template: '<div><slot /></div>' },
          'v-col': { template: '<div><slot /></div>' },
          'v-card': { template: '<div><slot /></div>' },
          'v-color-picker': { template: '<div />' },
          'v-text-field': TextFieldStub,
          'v-file-input': { template: '<div />' },
          'v-btn': { template: '<button><slot /></button>' },
          'v-card-actions': { template: '<div><slot /></div>' },
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
      ui.environment.PRIMARY_LIGHT_COLOR = '#112233';
      ui.environment.PRIMARY_DARK_COLOR = '#445566';
      store.setDockerComposeConfig({
        name: 'docker-compose.yml',
        value: { services },
      });
    }

    await nextTick();
    await nextTick();

    const fieldValues = wrapper
      .findAll('.text-field-stub')
      .map(node => `${node.attributes('data-label')}:${node.text().trim()}`);
    expect(fieldValues).toContain('PRIMARY_LIGHT_COLOR:#112233');
    expect(fieldValues).toContain('PRIMARY_DARK_COLOR:#445566');
  });
});
