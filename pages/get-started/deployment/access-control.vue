<template>
  <v-container class="py-0 px-4 px-sm-8 px-md-12" fluid>
    <v-breadcrumbs class="px-0 pb-0 text-body-2 mb-3" divider="›" :items="breadcrumbs" />
    <h1 class="mb-8 text-header">Attribute Based Access Control</h1>
    <v-alert color="alertCard">
      <v-row align="center">
        <v-col cols="auto" class="pr-0">
          <v-icon color="subheader">mdi-alert-circle-outline</v-icon>
        </v-col>
        <v-col>
          <div class="font-weight-medium text-header">Notice</div>
        </v-col>
      </v-row>
      <p class="text-subheader font-weight-medium ms-0 ms-sm-12 mt-2">
        This starter does not auto-generate a complete ABAC security policy yet. By default,
        generated services start with <code>ABAC_ENABLED=false</code>.
      </p>
    </v-alert>

    <p class="text-normalText mt-8 mb-5 text-subtitle-1">
      BaSyx Go supports ABAC-based protection and OIDC trust configuration across core services.
      Enable ABAC in production by mounting policy/trust files and setting ABAC-related environment
      variables according to your security model.
    </p>

    <v-card-actions class="px-0 mb-8">
      <v-btn
        variant="tonal"
        prepend-icon="mdi-arrow-left"
        to="/get-started/deployment/container-config"
        >Back</v-btn
      >
      <v-spacer />
      <v-btn
        variant="tonal"
        color="primary"
        append-icon="mdi-flag-checkered"
        to="/get-started/download"
        >finalize</v-btn
      >
    </v-card-actions>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineOptions({
  name: 'ABAC',
});

useSeoMeta({
  title: 'Access Control | Eclipse BaSyx™',
  ogTitle: 'Access Control | Eclipse BaSyx™',
});

const breadcrumbs = ref([
  { title: 'Home', to: '/' },
  { title: 'Get Started', to: '/get-started/introduction' },
  { title: 'Access Control', to: '/get-started/deployment/access-control' },
]);
</script>
