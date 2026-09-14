// https://nuxt.com/docs/api/configuration/nuxt-config
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  experimental: {
    writeEarlyHints: false,
  },
  build: {
    transpile: ['vuetify'],
  },
  modules: [
    'nuxt-gtag',
    '@pinia/nuxt',
    '@nuxt/eslint',
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', config => {
        // @ts-expect-error: 'config.plugins' may not be typed correctly in Nuxt hook context, but vuetify plugin needs to be added here.
        config.plugins.push(vuetify({ autoImport: true }));
      });
    },
  ],
  gtag: {
    id: 'G-JRF51QQK43',
    config: {
      anonymize_ip: true,
      send_page_view: true,
      page_title: 'BaSyx Starter Kit',
    },
    initCommands: [
      [
        'consent',
        'default',
        {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        },
      ],
    ],
  },
  runtimeConfig: {
    public: {
      siteUrl: '',
    },
  },
  app: {
    head: {
      title: 'Eclipse BaSyx™ Starter-Kit',
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1.0',
      meta: [
        {
          name: 'description',
          content:
            'Discover Eclipse BaSyx, the leading Digital Twin middleware for industry 4.0 Asset Administration Shells. Access detailed documentation or use the BaSyx Starter Kit to easily configure your own BaSyx setup.',
        },
        {
          property: 'og:title',
          content: 'Eclipse BaSyx™ Starter-Kit',
        },
        {
          property: 'og:description',
          content:
            'Discover Eclipse BaSyx, the leading Digital Twin middleware for industry 4.0 Asset Administration Shells. Access detailed documentation or use the BaSyx Starter Kit to easily configure your own BaSyx setup.',
        },
        {
          property: 'og:image',
          content: '/Dataspace.jpg',
        },
        {
          property: 'og:url',
          content: 'https://basyx.org',
        },
        {
          property: 'og:type',
          content: 'website',
        },
        {
          name: 'twitter:card',
          content: 'summary_large_image',
        },
        {
          name: 'twitter:title',
          content: 'Eclipse BaSyx™ Starter-Kit',
        },
        {
          name: 'twitter:description',
          content:
            'Discover Eclipse BaSyx, the leading Digital Twin middleware for industry 4.0 Asset Administration Shells.',
        },
        {
          name: 'twitter:image',
          content: '/Dataspace.jpg',
        },
        {
          name: 'application-name',
          content: 'Eclipse BaSyx™',
        },
      ],
      htmlAttrs: {
        lang: 'en',
      },
    },
  },
  vite: {
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },
});
