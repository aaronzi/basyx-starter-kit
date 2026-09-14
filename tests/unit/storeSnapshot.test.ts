import { createPinia, setActivePinia } from 'pinia';
import { useAppStore } from '@/stores/app';

describe('app store snapshot helpers', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('creates and reapplies a serializable snapshot', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();
    store.updateRegistryIntegration(false);
    store.setPrimaryDarkColor('#123456');

    const snapshot = store.createSerializableSnapshot();
    store.reset();
    store.initializeStarterDefaults();

    expect(store.getRegistryIntegration).toBe(true);
    store.applySerializableSnapshot(snapshot);
    expect(store.getRegistryIntegration).toBe(false);
    expect(store.getPrimaryDarkColor).toBe('#123456');
  });

  it('ignores unknown keys and keeps defaults for missing keys', () => {
    const store = useAppStore();
    store.initializeStarterDefaults();

    store.applySerializableSnapshot({
      registryIntegration: false,
      unknownFeature: true,
    });

    expect(store.getRegistryIntegration).toBe(false);
    expect(store.getDiscoveryIntegration).toBe(true);
  });
});
