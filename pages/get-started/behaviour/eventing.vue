<template>
  <v-container class="py-0 px-4 px-sm-8 px-md-12" fluid>
    <v-breadcrumbs class="px-0 pb-0 text-body-2 mb-3" divider="›" :items="breadcrumbs" />
    <h1 class="mb-8 text-header">Eventing</h1>
    <p class="text-normalText mt-8 mb-5 text-subtitle-1">
      Eventing support is currently an upcoming feature in this starter profile.
    </p>
    <p class="text-normalText mt-3 mb-2 text-subtitle-1">
      The upcoming implementation will provide eventing based on the CloudEvents standard for
      interoperable event payloads.
    </p>

    <v-alert color="alertCard" class="mt-8 mb-8">
      <v-row align="center">
        <v-col cols="auto" class="pr-0">
          <v-icon color="subheader">mdi-bullhorn-outline</v-icon>
        </v-col>
        <v-col>
          <div class="font-weight-medium text-header">Planned protocols</div>
        </v-col>
      </v-row>
      <p class="text-subheader font-weight-medium ms-0 ms-sm-12 mt-2">
        MQTT and Kafka are currently the planned transport technologies. This step is intentionally
        informational for now.
      </p>
    </v-alert>

    <v-card-actions class="px-0 mb-8">
      <v-btn variant="tonal" prepend-icon="mdi-arrow-left" to="/get-started/behaviour/persistence"
        >Back</v-btn
      >
      <v-spacer />
      <v-btn
        variant="tonal"
        color="primary"
        append-icon="mdi-arrow-right"
        to="/get-started/behaviour/time-series"
        >Next</v-btn
      >
    </v-card-actions>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineOptions({
  name: 'Eventing',
});

useSeoMeta({
  title: 'Eventing | Eclipse BaSyx™',
  ogTitle: 'Eventing | Eclipse BaSyx™',
});

const breadcrumbs = ref([
  { title: 'Home', to: '/' },
  { title: 'Get Started', to: '/get-started/introduction' },
  { title: 'Eventing', to: '/get-started/behaviour/eventing' },
]);
</script>
