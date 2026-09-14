<template>
  <v-container class="py-0 px-4 px-sm-8 px-md-12" fluid>
    <v-breadcrumbs class="px-0 pb-0 text-body-2 mb-3" divider="›" :items="breadcrumbs" />
    <h1 class="mb-8 text-header">AAS Web User Interface</h1>
    <p class="text-normalText mt-8 mb-5 text-subtitle-1">
      Configure how the BaSyx AAS Web UI behaves at runtime.
    </p>
    <p class="text-normalText mt-3 mb-2 text-subtitle-1">
      The UI reads backend endpoints from <code>basyx-infra.yml</code> and behavior flags from
      Docker environment variables.
    </p>

    <v-alert color="alertCard" class="mt-8 mb-8">
      <div class="font-weight-medium text-header mb-3">Setting overview</div>
      <v-list bg-color="transparent" density="compact" class="py-0">
        <v-list-item>
          <template #title><v-kbd>ENDPOINT_CONFIG_AVAILABLE</v-kbd></template>
          <template #subtitle>
            Allow users to add, edit, and delete infrastructure endpoint definitions in the UI.
          </template>
        </v-list-item>
        <v-list-item>
          <template #title><v-kbd>ALLOW_EDITING</v-kbd></template>
          <template #subtitle>Enable or disable AAS and Submodel editor capabilities.</template>
        </v-list-item>
        <v-list-item>
          <template #title><v-kbd>ALLOW_UPLOADING</v-kbd></template>
          <template #subtitle>Control whether users can upload AAS files through the UI.</template>
        </v-list-item>
        <v-list-item>
          <template #title><v-kbd>ALLOW_LOGOUT</v-kbd></template>
          <template #subtitle>
            Show or hide logout behavior when authentication is configured.
          </template>
        </v-list-item>
        <v-list-item>
          <template #title><v-kbd>SM_VIEWER_EDITOR</v-kbd></template>
          <template #subtitle
            >Enable or disable the standalone Submodel Viewer and Editor.</template
          >
        </v-list-item>
        <v-list-item>
          <template #title><v-kbd>START_PAGE_ROUTE_NAME</v-kbd></template>
          <template #subtitle
            >Select the initial page such as <code>AASViewer</code> or
            <code>AASEditor</code>.</template
          >
        </v-list-item>
      </v-list>
    </v-alert>

    <v-divider class="mt-12 mb-8" />
    <h2 class="text-header">Web UI Behavior</h2>
    <v-alert color="primary" variant="outlined" class="bg-alertCard mt-8 mb-8">
      <v-switch
        v-model="endpointConfigAvailable"
        color="primary"
        label="ENDPOINT_CONFIG_AVAILABLE"
        hide-details
        @update:model-value="applyBehaviorSettings"
      />
      <v-switch
        v-model="allowEditing"
        color="primary"
        label="ALLOW_EDITING"
        hide-details
        @update:model-value="applyBehaviorSettings"
      />
      <v-switch
        v-model="allowUploading"
        color="primary"
        label="ALLOW_UPLOADING"
        hide-details
        @update:model-value="applyBehaviorSettings"
      />
      <v-switch
        v-model="allowLogout"
        color="primary"
        label="ALLOW_LOGOUT"
        hide-details
        @update:model-value="applyBehaviorSettings"
      />
      <v-switch
        v-model="smViewerEditor"
        color="primary"
        label="SM_VIEWER_EDITOR"
        hide-details
        @update:model-value="applyBehaviorSettings"
      />
      <v-select
        v-model="startPageRouteName"
        class="mt-6"
        variant="solo-filled"
        :items="['AASViewer', 'AASEditor']"
        label="START_PAGE_ROUTE_NAME"
        hide-details
        @update:model-value="applyBehaviorSettings"
      />
    </v-alert>

    <v-card-actions class="px-0 mb-8">
      <v-btn variant="tonal" prepend-icon="mdi-arrow-left" to="/get-started/behaviour/time-series"
        >Back</v-btn
      >
      <v-spacer />
      <v-btn
        variant="tonal"
        color="primary"
        append-icon="mdi-arrow-right"
        to="/get-started/visualization/corporate-design"
        >Next</v-btn
      >
    </v-card-actions>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAppStore } from '@/stores/app';

interface BasyxConfigItem {
  id: string;
  title?: string;
  type?: string;
  children?: BasyxConfigItem[];
}

interface DockerService {
  image?: string;
  container_name?: string;
  ports?: string[];
  environment?: Record<string, string> | string[];
  volumes?: string[];
  restart?: string;
  pull_policy?: string;
  depends_on?: Record<string, { condition: string }>;
}

defineOptions({
  name: 'UI',
});

useSeoMeta({
  title: 'AAS User Interface | Eclipse BaSyx™',
  ogTitle: 'AAS User Interface | Eclipse BaSyx™',
});

const appStore = useAppStore();

const breadcrumbs = ref([
  { title: 'Home', to: '/' },
  { title: 'Get Started', to: '/get-started/introduction' },
  { title: 'AAS User Interface', to: '/get-started/visualization/ui' },
]);

const endpointConfigAvailable = ref(false);
const allowEditing = ref(true);
const allowUploading = ref(true);
const allowLogout = ref(true);
const smViewerEditor = ref(true);
const startPageRouteName = ref('AASViewer');

const basyxConfig = computed(() => appStore.getBasyxConfig);
const isTimeSeriesDataEnabled = computed(() => appStore.getTimeSeriesData);
const dockerComposeConfigObject = computed(() => appStore.getDockerComposeConfig);

watch(
  () => dockerComposeConfigObject.value?.value,
  () => {
    ensureUIService();
    syncBehaviorSettingsFromCompose();
  },
  { immediate: true }
);

function syncBehaviorSettingsFromCompose() {
  const compose = dockerComposeConfigObject.value?.value;
  if (compose && typeof compose === 'object' && 'services' in compose) {
    const services = compose.services as Record<string, DockerService>;
    const ui = services['aas-ui'];
    if (ui?.environment && !Array.isArray(ui.environment)) {
      endpointConfigAvailable.value = ui.environment.ENDPOINT_CONFIG_AVAILABLE === 'true';
      allowEditing.value = ui.environment.ALLOW_EDITING !== 'false';
      allowUploading.value = ui.environment.ALLOW_UPLOADING !== 'false';
      allowLogout.value = ui.environment.ALLOW_LOGOUT !== 'false';
      smViewerEditor.value = ui.environment.SM_VIEWER_EDITOR !== 'false';
      startPageRouteName.value = ui.environment.START_PAGE_ROUTE_NAME || 'AASViewer';
    }
  }
}

function readInfluxTokenFromCompose(services: Record<string, DockerService>): string | undefined {
  const influxService = services.influxdb;
  if (!influxService?.environment) {
    return undefined;
  }

  if (Array.isArray(influxService.environment)) {
    const entry = influxService.environment.find(item =>
      item.startsWith('DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=')
    );
    return entry ? entry.split('=').slice(1).join('=') : undefined;
  }

  return influxService.environment.DOCKER_INFLUXDB_INIT_ADMIN_TOKEN;
}

function ensureUIService() {
  if (
    dockerComposeConfigObject.value?.value &&
    typeof dockerComposeConfigObject.value.value === 'object'
  ) {
    const localDockerComposeConfig = { ...dockerComposeConfigObject.value };
    const dockerComposeConfig = localDockerComposeConfig.value as {
      services: Record<string, DockerService>;
    };

    if (!dockerComposeConfig.services['aas-ui']) {
      const env: Record<string, string> = {
        ENDPOINT_CONFIG_AVAILABLE: 'false',
        ALLOW_EDITING: 'true',
        ALLOW_UPLOADING: 'true',
        ALLOW_LOGOUT: 'true',
        SM_VIEWER_EDITOR: 'true',
      };

      if (isTimeSeriesDataEnabled.value) {
        const token = readInfluxTokenFromCompose(dockerComposeConfig.services);
        if (token) {
          env.INFLUXDB_TOKEN = token;
        }
      }

      dockerComposeConfig.services['aas-ui'] = {
        image: 'eclipsebasyx/aas-gui:latest',
        container_name: 'aas-web-ui',
        pull_policy: 'always',
        ports: ['3000:3000'],
        volumes: ['./basyx-infra.yml:/basyx-infra.yml:ro'],
        environment: env,
        restart: 'unless-stopped',
        depends_on: {
          'aas-environment': {
            condition: 'service_started',
          },
        },
      };

      localDockerComposeConfig.value = dockerComposeConfig;
      appStore.setDockerComposeConfig(localDockerComposeConfig);
    }
  }

  appStore.updateUserInterface(true);

  const updatedBasyxConfig = [...basyxConfig.value];
  if (!updatedBasyxConfig.some((item: BasyxConfigItem) => item.id === 'comp-aas-ui')) {
    updatedBasyxConfig.push({
      id: 'comp-aas-ui',
      title: 'AAS Web UI',
      children: [
        { id: 'ovw-aas-ui-summary', title: 'Runtime & Access', type: 'overview' },
        { id: 'ovw-aas-ui-behavior', title: 'Behavior Settings', type: 'overview' },
        { id: 'ovw-aas-ui-branding', title: 'Corporate Design', type: 'overview' },
        {
          id: 'ovw-aas-ui-infra',
          title: 'Backend Connections',
          type: 'overview',
        },
        { id: 'cfg-aas-ui', title: 'Docker', type: 'config' },
        { id: 'cfg-basyx-infra', title: 'Infrastructure Config', type: 'config' },
      ],
    });
    appStore.updateBasyxConfig(updatedBasyxConfig);
  }
}

function applyBehaviorSettings() {
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
  if (Array.isArray(service.environment)) {
    service.environment = {};
  }

  service.environment.ENDPOINT_CONFIG_AVAILABLE = String(endpointConfigAvailable.value);
  service.environment.ALLOW_EDITING = String(allowEditing.value);
  service.environment.ALLOW_UPLOADING = String(allowUploading.value);
  service.environment.ALLOW_LOGOUT = String(allowLogout.value);
  service.environment.SM_VIEWER_EDITOR = String(smViewerEditor.value);
  service.environment.START_PAGE_ROUTE_NAME = startPageRouteName.value;

  localDockerComposeConfig.value = dockerComposeConfig;
  appStore.setDockerComposeConfig(localDockerComposeConfig);
}
</script>
