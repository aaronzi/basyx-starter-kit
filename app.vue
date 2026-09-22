<template>
  <NuxtLayout style="min-height: 100vh" class="bg-background">
    <v-app>
      <NuxtPage />
    </v-app>
  </NuxtLayout>
  <!-- Cookies Panel -->
  <v-snackbar v-model="showConsentSnackbar" :timeout="-1" theme="dark">
    <div>We collect anonymous analytics data to improve our service.</div>
    <div>By clicking "Accept", you agree to our use of cookies.</div>
    <template #actions>
      <v-btn variant="outlined" color="grey-darken-3" class="mr-2" @click="acceptConsent(false)"
        >Decline</v-btn
      >
      <v-btn variant="elevated" color="grey-darken-3" @click="acceptConsent(true)">Accept</v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

defineOptions({
  name: 'App',
});

// Set up SEO meta tags
useSeoMeta({
  title: 'Eclipse BaSyx™',
  ogTitle: 'Eclipse BaSyx™',
  description:
    'Discover Eclipse BaSyx, the leading Digital Twin middleware for industry 4.0 Asset Administration Shells. Access detailed documentation or use the BaSyx Starter Kit to easily configure your own BaSyx setup.',
  ogDescription:
    'Discover Eclipse BaSyx, the leading Digital Twin middleware for industry 4.0 Asset Administration Shells. Access detailed documentation or use the BaSyx Starter Kit to easily configure your own BaSyx setup.',
  ogImage: 'https://basyx.org/Dataspace.jpg',
  ogType: 'website',
  ogSiteName: 'Eclipse BaSyx™',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Eclipse BaSyx™',
  twitterDescription:
    'Discover Eclipse BaSyx, the leading Digital Twin middleware for industry 4.0 Asset Administration Shells.',
  twitterImage: 'https://basyx.org/Dataspace.jpg',
});

const route = useRoute();
const requestUrl = useRequestURL();
const runtimeConfig = useRuntimeConfig();
const { gtag } = useGtag();

const canonicalUrl = computed(() => {
  const configuredSiteUrl = runtimeConfig.public.siteUrl?.trim();
  const siteUrlRaw = configuredSiteUrl || requestUrl.origin || 'https://basyx.org';
  const normalizedBase = siteUrlRaw.endsWith('/') ? siteUrlRaw : `${siteUrlRaw}/`;
  return new URL(route.path.replace(/^\//, ''), normalizedBase).toString();
});

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  meta: [{ property: 'og:url', content: canonicalUrl.value }],
}));

// Cookie consent management
const consentCookie = useCookie('consent', { maxAge: 31536000 }); // 1 year

const showConsentSnackbar = ref(
  consentCookie.value !== 'granted' && consentCookie.value !== 'denied'
);

function acceptConsent(consent: boolean) {
  showConsentSnackbar.value = false;

  if (typeof gtag === 'function') {
    if (!consent) {
      gtag('consent', 'update', {
        ad_storage: 'denied',
        analytics_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
      document.cookie = 'consent=denied; max-age=31536000'; // 1 year
    } else {
      gtag('consent', 'update', {
        ad_storage: 'granted',
        analytics_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
      document.cookie = 'consent=granted; max-age=31536000'; // 1 year
    }
  }
}
</script>

<style>
div.v-switch__track {
  background-color: #424242 !important;
}

.setup-config-panels .v-expansion-panel-text__wrapper {
  padding-inline: 16px;
}
</style>
