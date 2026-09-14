<template>
  <v-container class="py-0 px-4 px-sm-8 px-md-12" fluid>
    <v-breadcrumbs class="px-0 pb-0 text-body-2 mb-3" divider="›" :items="breadcrumbs" />
    <h1 class="mb-8 text-header">Introduction</h1>
    <v-alert color="alertCard" class="mb-6">
      <v-row align="center">
        <v-col cols="auto" class="pr-0">
          <v-icon color="subheader">mdi-alert-circle-outline</v-icon>
        </v-col>
        <v-col>
          <div class="font-weight-medium text-header">BaSyx Interactive Configuration</div>
        </v-col>
      </v-row>
      <ul class="ms-6 mt-2">
        <li class="font-weight-medium text-subheader">
          The Starter Kit now supports BaSyx Go. For migration support from BaSyx Java, send us a
          <a class="text-primary" style="text-decoration: none" href="mailto:basyx-dev@eclipse.org"
            >mail</a
          >.
        </li>
        <li class="font-weight-medium text-subheader">New to BaSyx? You are in the right place!</li>
      </ul>
    </v-alert>
    <ContactUs class="mt-3" />
    <v-divider class="mt-12 mb-8" />
    <h2 class="text-header">BaSyx Starter Kit</h2>
    <p class="text-normalText mt-8 mb-5 text-subtitle-1">
      The BaSyx Starter Kit guides you through a short set of decisions and generates a ready-to-run
      setup with Docker Compose, infrastructure configuration and optional visualization add-ons.
    </p>
    <v-row justify="center" class="mt-5">
      <v-col cols="auto">
        <v-btn
          variant="tonal"
          color="primary"
          append-icon="mdi-rocket-launch"
          size="large"
          to="/get-started/application"
          >Let's start</v-btn
        >
      </v-col>
    </v-row>
    <v-divider class="mt-12 mb-8" />
    <!-- What is BaSyx -->
    <h2 class="text-header">What is BaSyx?</h2>
    <p class="text-normalText mt-8 mb-5 text-subtitle-1">
      Eclipse BaSyx is an Open Source framework designed to facilitate the development and use of
      Digital Twins in the context of Industry 4.0. At its core, BaSyx serves as a middleware that
      bridges the gap between assets and their digital representations.
    </p>
    <p class="text-normalText mt-3 mb-2 text-subtitle-1">
      With a strong focus on interoperability, BaSyx supports the
      <a
        class="text-primary"
        style="text-decoration: none"
        href="https://industrialdigitaltwin.org/en/content-hub/aasspecifications"
        target="_blank"
        >Asset Administration Shell (AAS)</a
      >, a key enabler for the use of standardized Digital Twins. This enables the creation of
      detailed digital representations that reflect the characteristics and behavior of their
      real-world counterparts, providing a unified interface for their management and integration
      into digital ecosystems.
    </p>
    <v-divider class="mt-12 mb-8" />
    <!-- Off the Shelf Components -->
    <h2 class="text-header">Off-the-Shelf Components</h2>
    <p class="text-normalText mt-8 mb-5 text-subtitle-1">
      Eclipse BaSyx simplifies the journey towards Industry 4.0 with its Off-the-Shelf components,
      designed to jumpstart the deployment of Digital Twins and their integration into digital
      ecosystems. Available for direct download from
      <a
        class="text-primary"
        style="text-decoration: none"
        href="https://hub.docker.com/u/eclipsebasyx"
        target="_blank"
        >Docker Hub</a
      >, these components offer a ready-to-use foundation that can be customised to meet your
      requirements.
    </p>
    <p class="text-normalText mt-3 mb-8 text-subtitle-1">
      These components are containerised, making them highly portable and easy to deploy in a
      variety of environments, from local development setups to cloud-based platforms.
    </p>
    <h2 class="text-header">Prerequisites</h2>
    <v-alert color="primary" variant="outlined" class="bg-alertCard mb-8 mt-8">
      <v-row align="center">
        <v-col cols="auto" class="pr-0">
          <v-icon color="primary">mdi-alert-circle-outline</v-icon>
        </v-col>
        <v-col>
          <div class="font-weight-medium text-header">Docker required</div>
        </v-col>
      </v-row>
      <p class="text-subheader font-weight-medium ms-0 ms-sm-12 mt-2">
        To deploy BaSyx components, install
        <a
          class="text-primary"
          style="text-decoration: none"
          href="https://docs.docker.com/get-docker/"
          target="_blank"
          >Docker</a
        >
        first.
      </p>
    </v-alert>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAppStore } from '@/stores/app';

defineOptions({
  name: 'Introduction',
});

useSeoMeta({
  title: 'Introduction | Eclipse BaSyx™',
  ogTitle: 'Introduction | Eclipse BaSyx™',
});

const appStore = useAppStore();

const breadcrumbs = ref([
  { title: 'Home', to: '/' },
  { title: 'Get Started', to: '/get-started/introduction' },
  { title: 'Introduction', to: '/get-started/introduction' },
]);

onMounted(() => {
  appStore.initializeStarterDefaults();
});
</script>
