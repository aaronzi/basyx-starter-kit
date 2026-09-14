import { shallowMount } from '@vue/test-utils';
import MenuList from '@/components/MenuList.vue';

describe('MenuList component', () => {
  it('renders key wizard sections', () => {
    const wrapper = shallowMount(MenuList, {
      global: {
        stubs: {
          'v-container': { template: '<div><slot /></div>' },
          'v-list': { template: '<div><slot /></div>' },
          'v-list-subheader': { template: '<div><slot /></div>' },
          'v-list-item': {
            props: ['title'],
            template: '<div>{{ title }}</div>',
          },
        },
      },
    });

    const text = wrapper.text();

    expect(text).toContain('Introduction');
    expect(text).toContain('Application');
    expect(text).toContain('Eventing');
    expect(text).toContain('Corporate Design');
    expect(text).toContain('Access Control');
  });
});
