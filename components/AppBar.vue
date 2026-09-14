<template>
  <v-app-bar flat class="bg-appBar border-b-thin" :height="54">
    <v-container class="py-0 pl-7 pr-0" fluid style="max-width: 1300px; display: flex">
      <!-- BaSyx Logo -->
      <v-btn variant="plain" to="/" style="margin-top: 6px">
        <v-img src="@/assets/Logo_BaSyx_wide.svg" contain :width="120" alt="BaSyx Logo" />
      </v-btn>
      <v-spacer />
      <v-divider vertical style="height: 24px; margin-top: 11px" class="mr-2" />
      <Theme class="mr-3 ml-2" />
      <v-btn
        icon="mdi-github"
        variant="plain"
        href="https://github.com/eclipse-basyx"
        target="_blank"
        aria-label="Open BaSyx GitHub page"
      />
      <v-btn
        icon="mdi-docker"
        variant="plain"
        href="https://hub.docker.com/u/eclipsebasyx"
        target="_blank"
        aria-label="Open BaSyx DockerHub page"
      />
      <v-btn
        icon="mdi-email"
        variant="plain"
        href="mailto:basyx-dev@eclipse.org"
        aria-label="Send email to the BaSyx developers"
      />
    </v-container>
  </v-app-bar>
</template>

<script setup lang="ts">
defineOptions({
  name: 'AppBar',
});
</script>
