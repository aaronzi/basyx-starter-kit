<template>
  <v-switch
    v-model="isDarkTheme"
    hide-details
    density="compact"
    inset
    false-icon="mdi-weather-sunny"
    true-icon="mdi-weather-night"
    :color="isDarkTheme ? '#000' : '#fff'"
    style="margin-top: 3px"
    aria-label="theme switch"
    @update:model-value="toggleTheme"
  />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useTheme } from 'vuetify';

defineOptions({
  name: 'Theme',
});

const theme = useTheme();

const isDarkTheme = ref(false);

onMounted(() => {
  // get theme from local storage
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme && (storedTheme === 'dark' || storedTheme === 'light')) {
    isDarkTheme.value = storedTheme === 'dark';
    theme.change(storedTheme);
  } else {
    // get user preferred theme
    const userPrefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (userPrefersDark) {
      isDarkTheme.value = userPrefersDark;
      theme.change('dark');
    } else {
      isDarkTheme.value = false;
      theme.change('light');
    }
    // Clear invalid theme from localStorage
    if (storedTheme && storedTheme !== 'dark' && storedTheme !== 'light') {
      localStorage.removeItem('theme');
    }
  }
});

function toggleTheme() {
  theme.change(isDarkTheme.value ? 'dark' : 'light');
  // save theme in local storage
  localStorage.setItem('theme', theme.global.name.value);
}
</script>
