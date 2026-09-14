import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import { nextTick } from 'vue';
import IntegrationPage from '@/pages/get-started/deployment/integration.vue';
import { useAppStore } from '@/stores/app';

vi.stubGlobal('useSeoMeta', vi.fn());

describe('Integration page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('reflects late AAS file hydration updates while page is open', async () => {
    const store = useAppStore();
    store.initializeStarterDefaults();

    const wrapper = mount(IntegrationPage, {
      global: {
        stubs: {
          ClientOnly: { template: '<div><slot /></div>' },
          'v-container': { template: '<div><slot /></div>' },
          'v-breadcrumbs': { template: '<div />' },
          'v-file-input': { template: '<div />' },
          'v-btn': { template: '<button><slot /></button>' },
          'v-table': { template: '<table><slot /></table>' },
          'v-icon': { template: '<i />' },
          'v-divider': { template: '<hr />' },
          'v-alert': { template: '<div><slot /></div>' },
          'v-row': { template: '<div><slot /></div>' },
          'v-col': { template: '<div><slot /></div>' },
          'v-card-actions': { template: '<div><slot /></div>' },
          'v-spacer': { template: '<span />' },
          'v-kbd': { template: '<kbd><slot /></kbd>' },
        },
      },
    });

    expect(wrapper.text()).not.toContain('demo-aas');

    store.setAasFiles([new File(['{}'], 'demo-aas.json', { type: 'application/json' })]);
    await nextTick();
    await nextTick();

    expect(wrapper.text()).toContain('demo-aas');
  });
});
