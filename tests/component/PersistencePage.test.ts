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

const SwitchStub = defineComponent({
  props: { modelValue: { type: Boolean, default: false }, label: { type: String, default: '' } },
  emits: ['update:modelValue'],
  template:
    '<input type="checkbox" :data-label="label" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
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
          'v-expansion-panels': { template: '<div><slot /></div>' },
          'v-expansion-panel': { template: '<section><slot /></section>' },
          'v-expansion-panel-text': { template: '<div><slot /></div>' },
          'v-text-field': TextFieldStub,
          'v-select': TextFieldStub,
          'v-number-input': NumberInputStub,
          'v-switch': SwitchStub,
          'v-btn': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          'v-card-actions': { template: '<div><slot /></div>' },
          'v-spacer': { template: '<span />' },
        },
      },
    });

    await wrapper.find('input[data-label="Include a local PostgreSQL container"]').setValue(false);
    await wrapper.find('input[data-label="POSTGRES_HOST"]').setValue('db-internal');
    await wrapper.find('input[data-label="POSTGRES_PORT"]').setValue('5544');
    await wrapper.find('input[data-label="POSTGRES_DBNAME"]').setValue('customdb');
    await wrapper.find('input[data-label="POSTGRES_USER"]').setValue('customuser');
    await wrapper.find('input[data-label="POSTGRES_PASSWORD"]').setValue('custompassword');
    await wrapper.find('input[data-label="POSTGRES_SSLMODE"]').setValue('require');
    await wrapper.find('input[data-label="POSTGRES_SEARCHPATH"]').setValue('basyx_schema');

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
    expect(readEnvValue(aasEnv.environment || [], 'POSTGRES_SSLMODE')).toBe('require');
    expect(readEnvValue(configService.environment || [], 'POSTGRES_SEARCHPATH')).toBe(
      'basyx_schema'
    );
    expect(compose.services.db).toBeUndefined();
  });
});
