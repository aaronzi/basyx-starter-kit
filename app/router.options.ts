import type { RouterConfig } from '@nuxt/schema';

const CONFIG_HASH_PREFIX = '#cfg=';

const routerOptions: RouterConfig = {
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    if (!to.hash) {
      return { left: 0, top: 0 };
    }

    if (to.hash.startsWith(CONFIG_HASH_PREFIX)) {
      return false;
    }

    if (!import.meta.client) {
      return false;
    }

    const decodedId = decodeURIComponent(to.hash.slice(1));
    const escapedId = CSS.escape(decodedId);
    const element = document.querySelector(`#${escapedId}`);

    if (!element) {
      return false;
    }

    return { el: element, top: 0 };
  },
};

export default routerOptions;
