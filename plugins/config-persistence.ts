import { watch } from 'vue';
import { useAppStore } from '@/stores/app';
import {
  canonicalStringify,
  CONFIG_QUERY_KEY,
  decodeConfigHash,
  encodeConfigHash,
  readConfigHashFromUrl,
  readConfigQueryValue,
  removeQueryParam,
  setQueryParam,
  shouldWarnForLength,
} from '@/utils/configPersistence';

function canRestoreRoute(path: string): boolean {
  return path.startsWith('/get-started/');
}

function waitForHydrationFrame(): Promise<void> {
  return new Promise(resolve => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

export default defineNuxtPlugin(async () => {
  const appStore = useAppStore();
  const router = useRouter();
  const route = useRoute();
  const nuxtApp = useNuxtApp();

  appStore.initializeStarterDefaults();

  const initialQueryEncoded = readConfigQueryValue(route.query[CONFIG_QUERY_KEY]);
  if (initialQueryEncoded) {
    const decoded = decodeConfigHash(initialQueryEncoded);
    if (decoded.error) {
      console.warn(`[config-persistence] ${decoded.error}`);
    } else if (decoded.payload) {
      appStore.applySerializableSnapshot(decoded.payload.state);
    }
  }

  if (!import.meta.client) {
    return;
  }

  let lastCanonicalPayload = '';
  let debounceHandle: ReturnType<typeof setTimeout> | undefined;
  let hasWarnedForLongUrl = false;
  let hasBootstrapped = false;

  nuxtApp.hook('app:mounted', async () => {
    await waitForHydrationFrame();

    const initialHashEncoded = readConfigHashFromUrl(window.location.hash);
    if (!initialQueryEncoded && initialHashEncoded) {
      const decoded = decodeConfigHash(initialHashEncoded);
      if (decoded.error) {
        console.warn(`[config-persistence] ${decoded.error}`);
      } else if (decoded.payload) {
        appStore.applySerializableSnapshot(decoded.payload.state);
        const nextQuery = setQueryParam(
          window.location.search,
          CONFIG_QUERY_KEY,
          initialHashEncoded
        );
        const nextPath = canRestoreRoute(decoded.payload.route)
          ? decoded.payload.route
          : route.path;
        window.history.replaceState(window.history.state, '', `${nextPath}${nextQuery}`);
        if (nextPath !== route.path) {
          await router.replace({
            path: nextPath,
            query: { ...route.query, [CONFIG_QUERY_KEY]: initialHashEncoded },
          });
        }
      }
    } else if (initialQueryEncoded && window.location.hash) {
      const nextQuery = setQueryParam(
        window.location.search,
        CONFIG_QUERY_KEY,
        initialQueryEncoded
      );
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${nextQuery}`
      );
    }

    const initialPayload = {
      route: route.path,
      state: appStore.createSerializableSnapshot(),
    };
    lastCanonicalPayload = canonicalStringify(initialPayload);
    hasBootstrapped = true;
  });

  watch(
    () => ({
      route: route.path,
      state: appStore.createSerializableSnapshot(),
    }),
    payload => {
      if (!hasBootstrapped) {
        return;
      }

      if (!canRestoreRoute(payload.route)) {
        return;
      }

      const canonicalPayload = canonicalStringify(payload);
      if (canonicalPayload === lastCanonicalPayload) {
        return;
      }

      lastCanonicalPayload = canonicalPayload;

      if (debounceHandle) {
        clearTimeout(debounceHandle);
      }

      debounceHandle = setTimeout(() => {
        const encoded = encodeConfigHash(payload);
        const query = setQueryParam(
          removeQueryParam(window.location.search, CONFIG_QUERY_KEY),
          CONFIG_QUERY_KEY,
          encoded
        );
        const nextUrl = `${window.location.pathname}${query}`;
        if (import.meta.dev && shouldWarnForLength(nextUrl) && !hasWarnedForLongUrl) {
          hasWarnedForLongUrl = true;
          console.warn('[config-persistence] Share URL is long and may not work in all contexts.');
        }

        // Use history.replaceState to avoid router navigation loops during debounced URL sync.
        window.history.replaceState(window.history.state, '', nextUrl);
      }, 250);
    },
    { deep: true, flush: 'post' }
  );
});
