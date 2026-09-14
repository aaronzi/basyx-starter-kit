<template>
  <v-container class="h-100 d-flex align-center justify-center">
    <div class="w-100 w-lg-80 w-xl-50 w-xxl-50 text-center">
      <div class="d-flex justify-center mb-4">
        <v-img
          :height="mdAndUp ? 150 : 80"
          :width="mdAndUp ? 150 : 80"
          src="@/assets/Icon_BaSyx.svg"
          alt="BaSyx Logo"
          aspect-ratio="1"
        />
      </div>

      <h1 class="text-h4 text-md-h2 font-weight-bold my-6">Eclipse BaSyx™</h1>

      <v-row>
        <v-col cols="12">
          <!-- Get Started -->
          <v-card
            class="py-2"
            color="surface-variant"
            rounded="lg"
            variant="outlined"
            to="/get-started/introduction"
            @click="resetStore()"
          >
            <v-list-item
              prepend-icon="mdi-rocket-launch-outline"
              class="text-left py-0"
              lines="one"
            >
              <template #append>
                <AAS_Logo :fill-color="isDark ? '#A3A3A3' : '#424242'" />
              </template>
              <v-list-item-title class="text-subtitle-1 text-md-h5 font-weight-bold"
                >Get Started</v-list-item-title
              >
              <v-list-item-subtitle class="text-subtitle-2 text-md-subtitle-1">
                <span>Start a new project with BaSyx</span>
                <span v-if="mdAndUp"> - <v-kbd>Digital Twins</v-kbd> tailored to your needs.</span>
              </v-list-item-subtitle>
            </v-list-item>
            <v-overlay opacity=".12" scrim="primary" contained model-value persistent />
          </v-card>
        </v-col>

        <v-col
          v-for="link in links"
          :key="link.id"
          cols="12"
          xs="12"
          sm="12"
          md="6"
          :class="mdAndUp ? '' : 'py-1'"
        >
          <!-- <v-card v-if="link.id !== 2" append-icon="mdi-open-in-new" class="py-4" color="surface-variant" :href="link.link" target="_blank" :prepend-icon="link.icon" rel="noopener noreferrer" rounded="lg" :subtitle="link.subtitle" :title="link.title" variant="text"> -->
          <v-card
            v-if="link.id !== 2"
            class="py-2"
            color="surface-variant"
            :href="link.link"
            target="_blank"
            rel="noopener noreferrer"
            rounded="lg"
            variant="text"
          >
            <v-list-item
              class="text-left"
              :prepend-icon="link.icon"
              append-icon="mdi-open-in-new"
              lines="one"
            >
              <v-list-item-title class="text-subtitle-1 text-md-h6 font-weight-medium">{{
                link.title
              }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption text-md-subtitle-2">{{
                link.subtitle
              }}</v-list-item-subtitle>
            </v-list-item>
            <v-overlay opacity=".06" scrim="primary" contained model-value persistent />
            <v-tooltip
              activator="parent"
              :open-delay="600"
              :location="link.location"
              :aria-label="`Tooltip for ${link.title}`"
            >
              <div class="font-weight-bold">{{ link.title }}</div>
              <div>{{ link.subtitle }}</div>
            </v-tooltip>
          </v-card>
          <!-- Link to the AAS Dataspace -->
          <!-- <v-card v-else class="py-4" color="surface-variant" :to="link.link" :prepend-icon="link.icon" rounded="lg" :subtitle="link.subtitle" :title="link.title" variant="text">
                        <v-overlay opacity=".06" class="custom-gradient-overlay" contained model-value persistent />
                        <v-tooltip activator="parent" :open-delay="600" :location="link.location">
                            <div class="font-weight-bold">{{ link.title }}</div>
                            <div>{{ link.subtitle }}</div>
                        </v-tooltip>
                    </v-card> -->
        </v-col>
      </v-row>

      <div class="v-bg position-absolute top-0 right-0 left-0 bottom-0">
        <div aria-hidden="true" class="overflow-hidden opacity-20 w-100 h-100" />
      </div>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDisplay, useTheme } from 'vuetify';
import { useAppStore } from '@/stores/app';

defineOptions({
  name: 'Startpage',
});

type Anchor = 'start' | 'end';

type Link = {
  id?: number;
  link: string;
  icon: string;
  title: string;
  subtitle: string;
  location: Anchor;
};

const theme = useTheme();
const appStore = useAppStore();
const { mdAndUp } = useDisplay();

const links = ref<Link[]>([
  {
    id: 1,
    link: 'https://wiki.basyx.org/',
    icon: 'mdi-text-box-outline',
    title: 'Documentation',
    subtitle: 'Learn about all things BaSyx in our documentation.',
    location: 'start',
  },
  // { id: 2, link: '/aas-dataspace', icon: 'mdi-cloud-braces', title: 'AAS Dataspace', subtitle: 'The industrial dataspace build on BaSyx', location: 'end' as Anchor },
  {
    link: 'https://www.iese.fraunhofer.de/en/solution/dataspace.html',
    icon: 'mdi-cloud-braces',
    title: 'AAS Dataspace for Everybody',
    subtitle: 'The test environment for data spaces based on Asset Administration Shells',
    location: 'end',
  },
  {
    id: 3,
    link: 'https://hub.docker.com/u/eclipsebasyx',
    icon: 'mdi-widgets-outline',
    title: 'Components',
    subtitle: 'Discover the BaSyx off-the-shelf components.',
    location: 'start',
  },
  {
    id: 4,
    link: 'https://github.com/eclipse-basyx',
    icon: 'mdi-account-group-outline',
    title: 'Community',
    subtitle: 'Connect with BaSyx developers on GitHub.',
    location: 'end',
  },
]);

const isDark = computed(() => theme.global.name.value === 'dark');

function resetStore() {
  appStore.reset();
}
</script>

<style scoped>
.custom-gradient-overlay .v-overlay__scrim {
  background: linear-gradient(
    45deg,
    rgb(var(--v-theme-gradientStart)),
    rgb(var(--v-theme-gradientEnd))
  );
}

.v-bg {
  filter: blur(56px);
  pointer-events: none;
}

.v-bg > div {
  background: linear-gradient(
    to bottom right,
    rgb(var(--v-theme-primary)),
    rgb(var(--v-theme-error))
  );
  z-index: -10;
  clip-path: polygon(
    20% 50%,
    27% 66%,
    41% 66%,
    50% 50%,
    41% 34%,
    27% 34%,
    20% 50%,
    55% 50%,
    62% 66%,
    76% 66%,
    85% 50%,
    76% 34%,
    62% 34%,
    55% 50%,
    30% 50%,
    37% 66%,
    51% 66%,
    60% 50%,
    51% 34%,
    37% 34%,
    30% 50%
  );
}
</style>
