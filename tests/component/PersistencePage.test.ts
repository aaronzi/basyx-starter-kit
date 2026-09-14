import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import PersistencePage from '@/pages/get-started/behaviour/persistence.vue';
import { useAppStore } from '@/stores/app';

vi.stubGlobal('useSeoMeta', vi.fn());

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
    '<input class="field" :data-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
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
    '<input class="number-field" :data-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
});

function readEnvValue(environment: string[], key: string): string | undefined {
  const entry = environment.find(item => item.startsWith(`${key}=`));
  return entry ? entry.split('=').slice(1).join('=') : undefined;
}

describe('Persistence page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('applies postgres settings to AAS Environment and Configuration Service', async () => {
    const store = useAppStore();
    store.initializeStarterDefaults();

    const wrapper = mount(PersistencePage, {
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
          'v-divider': { template: '<hr />' },
          'v-text-field': TextFieldStub,
          'v-number-input': NumberInputStub,
          'v-btn': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          'v-card-actions': { template: '<div><slot /></div>' },
          'v-spacer': { template: '<span />' },
        },
      },
    });

    await wrapper.find('input[data-label="POSTGRES_HOST"]').setValue('db-internal');
    await wrapper.find('input[data-label="POSTGRES_PORT"]').setValue('5544');
    await wrapper.find('input[data-label="POSTGRES_DBNAME"]').setValue('customdb');
    await wrapper.find('input[data-label="POSTGRES_USER"]').setValue('customuser');
    await wrapper.find('input[data-label="POSTGRES_PASSWORD"]').setValue('custompassword');

    await wrapper
      .findAll('button')
      .find(button => button.text().includes('Apply Persistence Settings'))
      ?.trigger('click');
    await nextTick();

    const compose = store.getDockerComposeConfig?.value as {
      services: Record<string, { environment?: string[] }>;
    };
    const aasEnv = compose.services['aas-environment'];
    const configService = compose.services.basyx_configuration;
    if (!aasEnv || !configService) {
      throw new Error('Expected aas-environment and basyx_configuration services to be present.');
    }

    expect(readEnvValue(aasEnv.environment || [], 'POSTGRES_HOST')).toBe('db-internal');
    expect(readEnvValue(aasEnv.environment || [], 'POSTGRES_PORT')).toBe('5544');
    expect(readEnvValue(configService.environment || [], 'POSTGRES_DBNAME')).toBe('customdb');
    expect(readEnvValue(configService.environment || [], 'POSTGRES_USER')).toBe('customuser');
  });
});
