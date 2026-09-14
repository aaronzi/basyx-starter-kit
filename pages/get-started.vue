<template>
  <v-container fluid class="py-0 px-0">
    <v-container class="get-started-frame py-0">
      <v-container fluid class="py-2 px-3 get-started-mobile-actions">
        <v-row class="ma-0 mb-2 ga-2">
          <v-col cols="12" sm="6" class="pa-0">
            <v-btn
              block
              variant="tonal"
              color="primary"
              prepend-icon="mdi-menu"
              @click="mobileNavOpen = true"
            >
              Navigation
            </v-btn>
          </v-col>
          <v-col cols="12" sm="6" class="pa-0">
            <v-btn
              block
              variant="tonal"
              color="primary"
              prepend-icon="mdi-file-tree"
              @click="mobileOutputOpen = true"
            >
              Components
            </v-btn>
          </v-col>
        </v-row>
      </v-container>

      <div class="get-started-desktop-nav">
        <MenuList />
      </div>
      <v-divider vertical class="get-started-desktop-divider" />

      <div class="get-started-page-content">
        <NuxtPage class="w-100 mt-1 mt-lg-2" />
      </div>

      <div class="get-started-desktop-output">
        <ClientOnly>
          <OutputView />
        </ClientOnly>
      </div>
    </v-container>

    <v-navigation-drawer
      v-model="mobileNavOpen"
      temporary
      location="start"
      width="300"
      class="bg-background get-started-mobile-drawer"
    >
      <MenuList compact />
    </v-navigation-drawer>

    <v-navigation-drawer
      v-model="mobileOutputOpen"
      temporary
      location="end"
      width="320"
      class="bg-background get-started-mobile-drawer"
    >
      <ClientOnly>
        <OutputView compact />
      </ClientOnly>
    </v-navigation-drawer>
  </v-container>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '@/stores/app';

defineOptions({
  name: 'GetStarted',
});

const route = useRoute();
const appStore = useAppStore();
appStore.initializeStarterDefaults();

const mobileNavOpen = ref(false);
const mobileOutputOpen = ref(false);

watch(
  () => route.fullPath,
  () => {
    mobileNavOpen.value = false;
    mobileOutputOpen.value = false;
  }
);

useSeoMeta({
  title: 'Get Started | Eclipse BaSyx™',
  ogTitle: 'Get Started | Eclipse BaSyx™',
  description:
    'Start a new project with BaSyx. Access detailed documentation or use the BaSyx Starter Kit to easily configure your own BaSyx setup.',
  ogDescription:
    'Start a new project with BaSyx. Access detailed documentation or use the BaSyx Starter Kit to easily configure your own BaSyx setup.',
  ogImage: 'https://basyx.org/Dataspace.jpg',
});
</script>

<style scoped>
.get-started-frame {
  max-width: 1300px;
  display: flex;
}

.get-started-page-content {
  width: 100%;
  margin-left: 0;
}

.get-started-desktop-nav,
.get-started-desktop-divider,
.get-started-desktop-output {
  display: none;
}

@media (max-width: 1450px) {
  .get-started-frame {
    display: block;
    max-width: none;
    padding-right: 0;
    padding-left: 0;
  }
}

@media (min-width: 1451px) {
  .get-started-mobile-actions,
  .get-started-mobile-drawer {
    display: none;
  }

  .get-started-desktop-nav {
    display: block;
    width: 250px;
    height: calc(100svh - 94px);
    position: fixed;
    overflow-y: auto;
  }

  .get-started-desktop-divider {
    display: block;
    margin-left: 250px;
    height: calc(100svh - 94px);
    position: fixed;
  }

  .get-started-page-content {
    margin-left: 250px;
    width: 800px;
    flex: 0 0 800px;
  }

  .get-started-desktop-output {
    display: block;
    margin-left: 1050px;
    width: 320px;
    height: calc(100svh - 94px);
    position: fixed;
    overflow-y: auto;
  }
}
</style>
