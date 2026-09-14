import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  setActivePinia(createPinia());
});

vi.stubGlobal('scrollTo', vi.fn());
