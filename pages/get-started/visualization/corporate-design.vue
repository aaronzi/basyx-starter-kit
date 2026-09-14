<template>
  <v-container class="py-0 px-4 px-sm-8 px-md-12" fluid>
    <v-breadcrumbs class="px-0 pb-0 text-body-2 mb-3" divider="›" :items="breadcrumbs" />
    <h1 class="mb-8 text-header">Corporate Design</h1>
    <p class="text-normalText mt-8 mb-5 text-subtitle-1">
      Configure branding for the AAS Web UI including light/dark primary colors and logos.
    </p>

    <ClientOnly>
      <v-switch
        v-model="syncBranding"
        class="mb-2"
        color="primary"
        label="Sync light and dark branding"
        hint="Use one color and one logo file for both themes."
        persistent-hint
        hide-details="auto"
      />

      <v-divider class="mt-12 mb-8" />
      <h2 class="text-header">Theme Colors</h2>
      <v-row class="mt-4" density="compact">
        <v-col cols="12" :md="syncBranding ? 12 : 6">
          <v-card variant="tonal" class="pa-4">
            <div class="text-subtitle-1 font-weight-medium mb-3">
              {{ syncBranding ? 'Shared Color' : 'PRIMARY_LIGHT_COLOR' }}
            </div>
            <v-color-picker
              v-model="lightPrimaryColor"
              mode="hex"
              :modes="['hex']"
              hide-inputs
              show-swatches
              @update:model-value="onLightColorPicked"
            />
            <v-text-field
              v-model="lightPrimaryColor"
              class="mt-4"
              :label="syncBranding ? 'PRIMARY_COLOR' : 'PRIMARY_LIGHT_COLOR'"
              variant="solo-filled"
              :rules="[hexColorRule]"
              hint="Hex only: #RGB or #RRGGBB"
              persistent-hint
              hide-details="auto"
              @update:model-value="onLightColorInput"
            />
          </v-card>
        </v-col>
        <v-col v-if="!syncBranding" cols="12" md="6">
          <v-card variant="tonal" class="pa-4">
            <div class="text-subtitle-1 font-weight-medium mb-3">PRIMARY_DARK_COLOR</div>
            <v-color-picker
              v-model="darkPrimaryColor"
              mode="hex"
              :modes="['hex']"
              hide-inputs
              show-swatches
              @update:model-value="onDarkColorPicked"
            />
            <v-text-field
              v-model="darkPrimaryColor"
              class="mt-4"
              label="PRIMARY_DARK_COLOR"
              variant="solo-filled"
              :rules="[hexColorRule]"
              hint="Hex only: #RGB or #RRGGBB"
              persistent-hint
              hide-details="auto"
              @update:model-value="onDarkColorInput"
            />
          </v-card>
        </v-col>
      </v-row>

      <v-divider class="mt-12 mb-8" />
      <h2 class="text-header">Branding Assets</h2>
      <v-file-input
        v-model="iconFile"
        class="mt-8"
        variant="solo-filled"
        prepend-inner-icon="$file"
        prepend-icon=""
        label="Application Icon (favicon.ico)"
        density="compact"
        accept="image/x-icon"
        @update:model-value="addIcon"
      />
      <v-file-input
        v-model="logoLightFile"
        variant="solo-filled"
        prepend-inner-icon="$file"
        prepend-icon=""
        :label="syncBranding ? 'Logo (light + dark)' : 'Logo Light (LOGO_LIGHT_PATH)'"
        density="compact"
        accept="image/*"
        @update:model-value="addLogoLight"
      />
      <v-file-input
        v-if="!syncBranding"
        v-model="logoDarkFile"
        variant="solo-filled"
        prepend-inner-icon="$file"
        prepend-icon=""
        label="Logo Dark (LOGO_DARK_PATH)"
        density="compact"
        accept="image/*"
        @update:model-value="addLogoDark"
      />
      <template #fallback>
        <v-alert color="primary" variant="outlined" class="bg-alertCard mt-8 mb-8">
          Loading branding settings...
        </v-alert>
      </template>
    </ClientOnly>

    <h2 class="text-header mt-12">Apply</h2>
    <v-btn
      class="mt-8"
      block
      variant="tonal"
      :disabled="hasColorValidationError"
      @click="updateConfig()"
    >
      Apply Branding
    </v-btn>
    <v-btn
      color="error"
      append-icon="mdi-delete"
      block
      variant="tonal"
      class="mt-3 mb-8"
      @click="updateConfig(true)"
    >
      Clear custom branding
    </v-btn>

    <v-card-actions class="px-0 mb-8">
      <v-btn variant="tonal" prepend-icon="mdi-arrow-left" to="/get-started/visualization/ui"
        >Back</v-btn
      >
      <v-spacer />
      <v-btn
        variant="tonal"
        color="primary"
        append-icon="mdi-arrow-right"
        to="/get-started/deployment/integration"
      >
        Next
      </v-btn>
    </v-card-actions>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAppStore } from '@/stores/app';

interface DockerService {
  environment?: Record<string, string>;
  volumes?: string[];
}

const HEX_COLOR_PATTERN = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

defineOptions({
  name: 'CorporateDesign',
});

useSeoMeta({
  title: 'Corporate Design | Eclipse BaSyx™',
  ogTitle: 'Corporate Design | Eclipse BaSyx™',
});

const appStore = useAppStore();

const breadcrumbs = ref([
  { title: 'Home', to: '/' },
  { title: 'Get Started', to: '/get-started/introduction' },
  { title: 'Corporate Design', to: '/get-started/visualization/corporate-design' },
]);

const lightPrimaryColor = ref('');
const darkPrimaryColor = ref('');
const iconFile = ref<File | undefined>(undefined);
const logoLightFile = ref<File | undefined>(undefined);
const logoDarkFile = ref<File | undefined>(undefined);
const syncBranding = computed({
  get: () => appStore.getSyncBranding,
  set: value => {
    appStore.updateSyncBranding(value);
  },
});

const dockerComposeConfigObject = computed(() => appStore.getDockerComposeConfig);

const hasColorValidationError = computed(() => {
  const hasLight = lightPrimaryColor.value.trim().length > 0;
  const hasDark = darkPrimaryColor.value.trim().length > 0;

  if (hasLight && !HEX_COLOR_PATTERN.test(lightPrimaryColor.value.trim())) {
    return true;
  }
  if (hasDark && !HEX_COLOR_PATTERN.test(darkPrimaryColor.value.trim())) {
    return true;
  }
  return false;
});

function sanitizeHexColor(value: string | null | undefined): string {
  const normalized = (value || '').trim();
  if (!normalized) {
    return '';
  }

  if (!normalized.startsWith('#')) {
    return '';
  }

  // Normalize accidental alpha values from pickers to non-alpha hex.
  if (normalized.length === 5) {
    return normalized.slice(0, 4).toUpperCase();
  }
  if (normalized.length === 9) {
    return normalized.slice(0, 7).toUpperCase();
  }
  return normalized.toUpperCase();
}

const hexColorRule = (value: string): true | string => {
  const normalized = (value || '').trim();
  if (!normalized || HEX_COLOR_PATTERN.test(normalized)) {
    return true;
  }
  return 'Use hex color format #RGB or #RRGGBB.';
};

watch(
  () => appStore.getPrimaryLightColor,
  color => {
    lightPrimaryColor.value = color || '';
  },
  { immediate: true }
);

watch(
  () => appStore.getPrimaryDarkColor,
  color => {
    darkPrimaryColor.value = color || '';
  },
  { immediate: true }
);

watch(
  () => appStore.getAppIcon,
  icon => {
    iconFile.value = icon;
  },
  { immediate: true }
);

watch(
  () => appStore.getLogoLight,
  logoLight => {
    logoLightFile.value = logoLight;
  },
  { immediate: true }
);

watch(
  () => appStore.getLogoDark,
  logoDark => {
    logoDarkFile.value = logoDark;
  },
  { immediate: true }
);

watch(
  () => dockerComposeConfigObject.value?.value,
  compose => {
    if (compose && typeof compose === 'object' && 'services' in compose) {
      const services = compose.services as Record<string, DockerService>;
      const ui = services['aas-ui'];
      if (ui?.environment) {
        const envLight = ui.environment.PRIMARY_LIGHT_COLOR || lightPrimaryColor.value;
        const envDark = ui.environment.PRIMARY_DARK_COLOR || darkPrimaryColor.value;
        lightPrimaryColor.value = envLight;
        darkPrimaryColor.value = envDark;
      }
    }
  },
  { immediate: true }
);

watch(syncBranding, enabled => {
  if (enabled) {
    darkPrimaryColor.value = lightPrimaryColor.value;
    logoDarkFile.value = logoLightFile.value;
  }
});

function onLightColorPicked(value: string): void {
  const sanitized = sanitizeHexColor(value);
  if (sanitized) {
    lightPrimaryColor.value = sanitized;
    if (syncBranding.value) {
      darkPrimaryColor.value = sanitized;
    }
  }
}

function onDarkColorPicked(value: string): void {
  if (syncBranding.value) {
    return;
  }
  const sanitized = sanitizeHexColor(value);
  if (sanitized) {
    darkPrimaryColor.value = sanitized;
  }
}

function onLightColorInput(value: string): void {
  const sanitized = sanitizeHexColor(value);
  if (sanitized || value.trim() === '') {
    lightPrimaryColor.value = sanitized;
    if (syncBranding.value) {
      darkPrimaryColor.value = sanitized;
    }
  }
}

function onDarkColorInput(value: string): void {
  if (syncBranding.value) {
    return;
  }
  const sanitized = sanitizeHexColor(value);
  if (sanitized || value.trim() === '') {
    darkPrimaryColor.value = sanitized;
  }
}

function addIcon(): void {
  appStore.setAppIcon(iconFile.value);
}

function addLogoLight(): void {
  appStore.setLogoLight(logoLightFile.value);
  if (syncBranding.value) {
    logoDarkFile.value = logoLightFile.value;
    appStore.setLogoDark(logoLightFile.value);
  }
}

function addLogoDark(): void {
  appStore.setLogoDark(logoDarkFile.value);
}

function updateConfig(clear = false): void {
  if (
    !dockerComposeConfigObject.value?.value ||
    typeof dockerComposeConfigObject.value.value !== 'object'
  ) {
    return;
  }

  const localDockerComposeConfig = { ...dockerComposeConfigObject.value };
  const dockerComposeConfig = localDockerComposeConfig.value as {
    services: Record<string, DockerService>;
  };
  const service = dockerComposeConfig.services['aas-ui'];
  if (!service) {
    return;
  }

  if (!service.environment) {
    service.environment = {};
  }

  if (clear) {
    lightPrimaryColor.value = '';
    darkPrimaryColor.value = '';
    iconFile.value = undefined;
    logoLightFile.value = undefined;
    logoDarkFile.value = undefined;

    appStore.setPrimaryLightColor('');
    appStore.setPrimaryDarkColor('');
    appStore.setAppIcon(undefined);
    appStore.setLogoLight(undefined);
    appStore.setLogoDark(undefined);

    delete service.environment.PRIMARY_LIGHT_COLOR;
    delete service.environment.PRIMARY_DARK_COLOR;
    delete service.environment.LOGO_LIGHT_PATH;
    delete service.environment.LOGO_DARK_PATH;

    if (service.volumes) {
      service.volumes = service.volumes.filter(vol => vol !== './logo:/usr/src/app/dist/Logo');
      if (service.volumes.length === 0) {
        delete service.volumes;
      }
    }
  } else {
    if (hasColorValidationError.value) {
      return;
    }

    const light = sanitizeHexColor(lightPrimaryColor.value);
    const dark = sanitizeHexColor(
      syncBranding.value ? lightPrimaryColor.value : darkPrimaryColor.value
    );
    lightPrimaryColor.value = light;
    darkPrimaryColor.value = dark;

    appStore.setPrimaryLightColor(light);
    appStore.setPrimaryDarkColor(dark);

    if (light) {
      service.environment.PRIMARY_LIGHT_COLOR = light;
    } else {
      delete service.environment.PRIMARY_LIGHT_COLOR;
    }

    if (dark) {
      service.environment.PRIMARY_DARK_COLOR = dark;
    } else {
      delete service.environment.PRIMARY_DARK_COLOR;
    }

    if (syncBranding.value && logoLightFile.value) {
      logoDarkFile.value = logoLightFile.value;
      appStore.setLogoDark(logoLightFile.value);
    }

    if (logoLightFile.value) {
      service.environment.LOGO_LIGHT_PATH = logoLightFile.value.name;
    } else {
      delete service.environment.LOGO_LIGHT_PATH;
    }

    if (logoDarkFile.value) {
      service.environment.LOGO_DARK_PATH = logoDarkFile.value.name;
    } else {
      delete service.environment.LOGO_DARK_PATH;
    }

    if (logoLightFile.value || logoDarkFile.value || iconFile.value) {
      const volume = './logo:/usr/src/app/dist/Logo';
      service.volumes = service.volumes || [];
      if (!service.volumes.includes(volume)) {
        service.volumes.push(volume);
      }
    }
  }

  localDockerComposeConfig.value = dockerComposeConfig;
  appStore.setDockerComposeConfig(localDockerComposeConfig);
}
</script>
