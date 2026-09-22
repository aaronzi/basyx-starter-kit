<template>
  <v-tooltip :text="text" location="top" max-width="320">
    <template #activator="{ props }">
      <v-icon
        v-bind="props"
        icon="mdi-help-circle-outline"
        size="small"
        class="ms-2"
        tabindex="0"
        :aria-label="text"
      />
    </template>
  </v-tooltip>
</template>

<script setup lang="ts">
defineProps<{ text: string }>();
</script>
