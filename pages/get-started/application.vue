<template>
  <v-container class="py-0 px-4 px-sm-8 px-md-12" fluid>
    <v-breadcrumbs class="px-0 pb-0 text-body-2 mb-3" divider="›" :items="breadcrumbs" />
    <h1 class="mb-8 text-header">Application</h1>
    <v-alert color="alertCard">
      <v-row align="center">
        <v-col cols="auto" class="pr-0">
          <v-icon color="subheader">mdi-alert-circle-outline</v-icon>
        </v-col>
        <v-col>
          <div class="font-weight-medium text-header">
            AAS Environment bundles all standardized AAS Components
          </div>
        </v-col>
      </v-row>
      <p class="text-subheader font-weight-medium ms-0 ms-sm-12 mt-2">
        In BaSyx Go, the AAS Environment includes AAS Discovery, AAS Registry, Submodel Registry,
        AAS Repository, Submodel Repository, and Concept Description Repository on one service.
      </p>
    </v-alert>

    <v-divider class="mt-12 mb-8" />
    <h2 class="text-header">External Access</h2>
    <p class="text-normalText mt-8 mb-5 text-subtitle-1">
      Configure the public AAS Environment endpoint used by browsers and generated UI infrastructure
      files.
    </p>

    <v-row class="mt-4 mb-8" density="compact">
      <v-col cols="12" sm="4" md="4">
        <v-select
          v-model="externalUrlProtocol"
          variant="solo-filled"
          :items="externalUrlProtocolItems"
          label="Protocol"
          hide-details="auto"
        />
      </v-col>
      <v-col cols="12" sm="8" md="8">
        <v-text-field
          v-model="externalUrlHostInput"
          variant="solo-filled"
          label="Host or IP"
          prepend-inner-icon="mdi-web"
          hide-details="auto"
          hint="Reachable by browsers opening the AAS Web UI."
          persistent-hint
        />
      </v-col>
      <v-col cols="12" sm="5" md="4">
        <v-number-input
          v-model="externalUrlPortInput"
          variant="solo-filled"
          label="AAS Environment Port"
          :disabled="!externalUrlUsesPort"
          :min="1"
          :max="65535"
          :step="1"
          hide-details="auto"
          hint="Synced with the AAS Environment Docker port."
          persistent-hint
        />
      </v-col>
      <v-col cols="12" sm="7" md="6">
        <v-checkbox
          v-model="externalUrlUsesPort"
          color="primary"
          label="Include explicit port"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="8">
        <v-text-field
          v-model="externalUrlContextPathInput"
          variant="solo-filled"
          label="AAS Context Path"
          prepend-inner-icon="mdi-folder-network-outline"
          clearable
          hide-details="auto"
          hint="Optional SERVER_CONTEXTPATH, for example /api/aas."
          persistent-hint
        />
      </v-col>
    </v-row>

    <v-alert color="alertCard" class="mb-8 border">
      <v-row align="center">
        <v-col cols="auto" class="pr-0">
          <v-icon color="subheader">mdi-link-variant</v-icon>
        </v-col>
        <v-col>
          <div class="font-weight-medium text-header">Effective Result</div>
        </v-col>
      </v-row>
      <div class="ms-0 mt-2">
        <div
          class="d-flex flex-wrap align-start overflow-x-auto mt-5"
          style="padding: 4px 0 2px"
          aria-label="AAS Shells API URL preview"
          data-test="external-url-preview"
        >
          <span
            v-for="part in externalUrlPreviewParts"
            :key="part.id"
            class="d-inline-flex flex-column align-center"
            style="min-width: max-content; padding: 0 2px 10px"
          >
            <span
              class="text-no-wrap"
              style="
                font-family:
                  ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
                  'Courier New', monospace;
                color: rgb(var(--v-theme-on-surface));
                font-size: 0.9rem;
                line-height: 1.4;
              "
              >{{ part.value }}</span
            >
            <span
              class="position-relative d-block mt-1"
              style="width: 100%; min-width: 28px; height: 14px"
              aria-hidden="true"
            >
              <span
                class="position-absolute"
                style="
                  top: 6px;
                  right: 8px;
                  left: 8px;
                  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.62);
                "
              />
            </span>
            <span
              style="
                color: rgba(var(--v-theme-on-surface), 0.68);
                font-size: 0.75rem;
                line-height: 1.2;
              "
              >{{ part.label }}</span
            >
          </span>
        </div>

        <div class="d-flex flex-column ga-2 mt-5">
          <div class="d-flex flex-column flex-sm-row" style="gap: 12px">
            <span
              class="align-self-start align-self-sm-center"
              style="
                min-width: 128px;
                color: rgba(var(--v-theme-on-surface), 0.68);
                font-size: 0.75rem;
                line-height: 1.2;
              "
              >AAS Environment</span
            >
            <code
              data-test="aas-environment-url"
              style="
                overflow-wrap: anywhere;
                font-family:
                  ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
                  'Courier New', monospace;
                color: rgb(var(--v-theme-on-surface));
                font-size: 0.85rem;
              "
              >{{ effectiveAasEnvironmentUrl }}</code
            >
          </div>
          <div class="d-flex flex-column flex-sm-row" style="gap: 12px">
            <span
              class="align-self-start align-self-sm-center"
              style="
                min-width: 128px;
                color: rgba(var(--v-theme-on-surface), 0.68);
                font-size: 0.75rem;
                line-height: 1.2;
              "
              >AAS API</span
            >
            <code
              data-test="aas-shells-url"
              style="
                overflow-wrap: anywhere;
                font-family:
                  ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
                  'Courier New', monospace;
                color: rgb(var(--v-theme-on-surface));
                font-size: 0.85rem;
              "
              >{{ aasShellsEndpointUrl }}</code
            >
          </div>
        </div>
      </div>
    </v-alert>

    <v-divider class="mt-12 mb-8" />
    <h2 class="text-header">Integration Options</h2>
    <p class="text-normalText mt-8 mb-5 text-subtitle-1">
      Repository-to-registry integration and registry-to-discovery integration are enabled by
      default. You can opt out below.
    </p>

    <v-row class="mt-4 mb-2" density="compact">
      <v-col cols="12" md="6">
        <v-alert color="primary" variant="tonal" class="h-100">
          <div class="font-weight-medium text-header mb-2">Registry Integration</div>
          <p class="text-subheader mb-0">
            Automatically creates and updates AAS and Submodel descriptors in the registries when
            data is written to repositories.
          </p>
        </v-alert>
      </v-col>
      <v-col cols="12" md="6">
        <v-alert color="primary" variant="tonal" class="h-100">
          <div class="font-weight-medium text-header mb-2">Discovery Integration</div>
          <p class="text-subheader mb-0">
            Automatically publishes shell-to-asset links to Discovery whenever shell descriptors are
            registered in the AAS Registry.
          </p>
        </v-alert>
      </v-col>
    </v-row>

    <v-alert color="primary" variant="outlined" class="bg-alertCard mt-8 mb-8">
      <v-switch
        v-model="registryIntegration"
        color="primary"
        label="Enable Registry Integration"
        hide-details
      />
      <p class="text-subheader ml-2 mb-4">
        Controls <v-kbd>GENERAL_AASREGISTRYINTEGRATION</v-kbd> and
        <v-kbd>GENERAL_SUBMODELREGISTRYINTEGRATION</v-kbd>.
      </p>
      <v-switch
        v-model="discoveryIntegration"
        color="primary"
        label="Enable Discovery Integration"
        hide-details
      />
      <p class="text-subheader ml-2 mb-0">
        Controls <v-kbd>GENERAL_DISCOVERYINTEGRATION</v-kbd> in the AAS Environment.
      </p>
    </v-alert>

    <v-card-actions class="px-0 mb-8">
      <v-btn variant="tonal" prepend-icon="mdi-arrow-left" to="/get-started/introduction"
        >Back</v-btn
      >
      <v-spacer />
      <v-btn
        variant="tonal"
        color="primary"
        append-icon="mdi-arrow-right"
        to="/get-started/behaviour/runtime"
        >Next</v-btn
      >
    </v-card-actions>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAppStore } from '@/stores/app';
import {
  buildExternalBaseUrl,
  DEFAULT_AAS_ENVIRONMENT_EXTERNAL_PORT,
  joinBaseUrl,
  normalizeContextPath,
  parseExternalBaseUrl,
} from '@/utils/externalUrls';

defineOptions({
  name: 'Application',
});

useSeoMeta({
  title: 'Application | Eclipse BaSyx™',
  ogTitle: 'Application | Eclipse BaSyx™',
});

const appStore = useAppStore();

const breadcrumbs = ref([
  { title: 'Home', to: '/' },
  { title: 'Get Started', to: '/get-started/introduction' },
  { title: 'Application', to: '/get-started/application' },
]);

const registryIntegration = computed({
  get: () => appStore.getRegistryIntegration,
  set: value => {
    appStore.updateRegistryIntegration(value);
  },
});

const discoveryIntegration = computed({
  get: () => appStore.getDiscoveryIntegration,
  set: value => {
    appStore.updateDiscoveryIntegration(value);
  },
});

const externalUrlProtocolItems = [
  { title: 'HTTP', value: 'http' },
  { title: 'HTTPS', value: 'https' },
];
const externalUrlProtocol = ref<'http' | 'https'>('http');
const externalUrlHost = ref('');
const externalUrlUsesPort = ref(true);
const externalUrlPort = ref<number | undefined>(DEFAULT_AAS_ENVIRONMENT_EXTERNAL_PORT);
const externalUrlContextPath = ref('');
let syncingExternalUrlParts = false;

interface ExternalUrlPreviewPart {
  id: string;
  label: string;
  value: string;
}

const externalUrlHostInput = computed({
  get: () => externalUrlHost.value,
  set: value => {
    updateExternalUrlHost(value);
  },
});

const externalUrlPortInput = computed({
  get: () => externalUrlPort.value,
  set: value => {
    externalUrlPort.value = maskPortInput(value);
  },
});

const externalUrlContextPathInput = computed({
  get: () => externalUrlContextPath.value,
  set: value => {
    externalUrlContextPath.value = maskContextPathInput(value);
  },
});

const dockerComposeConfigObject = computed(() => appStore.getDockerComposeConfig);
const basyxInfraConfigObject = computed(() => appStore.getBasyxInfraConfig);
const effectiveAasEnvironmentUrl = computed(() => appStore.getExternalBaseUrl);
const aasShellsEndpointUrl = computed(() =>
  joinBaseUrl(effectiveAasEnvironmentUrl.value, 'shells')
);
const externalUrlPreviewParts = computed<ExternalUrlPreviewPart[]>(() => {
  const parts = parseExternalBaseUrl(effectiveAasEnvironmentUrl.value);
  const previewParts: ExternalUrlPreviewPart[] = [
    {
      id: 'protocol',
      label: 'scheme',
      value: `${parts.protocol}://`,
    },
    {
      id: 'host',
      label: 'host',
      value: parts.host,
    },
  ];

  if (parts.port) {
    previewParts.push({
      id: 'port',
      label: 'port',
      value: `:${parts.port}`,
    });
  }

  if (parts.contextPath) {
    previewParts.push({
      id: 'context-path',
      label: 'context path',
      value: parts.contextPath,
    });
  }

  previewParts.push({
    id: 'shells',
    label: 'API endpoint',
    value: '/shells',
  });

  return previewParts;
});

watch(
  [() => appStore.getExternalBaseUrl, () => appStore.getContainerPort('aas-environment')],
  ([value]) => {
    syncExternalUrlParts(value);
  },
  { immediate: true }
);

watch(
  [
    externalUrlProtocol,
    externalUrlHost,
    externalUrlUsesPort,
    externalUrlPort,
    externalUrlContextPath,
  ],
  () => {
    updateExternalBaseUrlFromParts();
  },
  { flush: 'sync' }
);

watch(
  [() => appStore.getRegistryIntegration, () => appStore.getDiscoveryIntegration],
  () => {
    applyIntegrationConfig();
  },
  { immediate: true }
);

function setOrReplaceEnvVar(env: string[], key: string, value: string): void {
  const prefix = `${key}=`;
  const idx = env.findIndex(item => item.startsWith(prefix));
  if (idx >= 0) {
    env[idx] = `${key}=${value}`;
  } else {
    env.push(`${key}=${value}`);
  }
}

function syncExternalUrlParts(value: string): void {
  const parts = parseExternalBaseUrl(value);
  syncingExternalUrlParts = true;
  externalUrlProtocol.value = parts.protocol;
  externalUrlHost.value = parts.host;
  externalUrlUsesPort.value = parts.port !== undefined;
  externalUrlPort.value =
    parts.port ??
    appStore.getContainerPort('aas-environment') ??
    DEFAULT_AAS_ENVIRONMENT_EXTERNAL_PORT;
  externalUrlContextPath.value = parts.contextPath || '';
  syncingExternalUrlParts = false;
}

function updateExternalUrlHost(value: string | number): void {
  const input = String(value || '')
    .trim()
    .replace(/\s+/g, '');

  if (!input) {
    externalUrlHost.value = '';
    return;
  }

  const looksLikeUrl = input.includes('://') || /[/?#]/.test(input) || /:\d+$/.test(input);
  if (!looksLikeUrl) {
    externalUrlHost.value = input;
    return;
  }

  const candidate = input.includes('://') ? input : `${externalUrlProtocol.value}://${input}`;
  const parts = parseExternalBaseUrl(candidate);

  syncingExternalUrlParts = true;
  if (input.includes('://')) {
    externalUrlProtocol.value = parts.protocol;
  }
  externalUrlHost.value = parts.host;
  if (parts.port !== undefined) {
    externalUrlUsesPort.value = true;
    externalUrlPort.value = parts.port;
  }
  externalUrlContextPath.value = parts.contextPath || '';
  syncingExternalUrlParts = false;
  updateExternalBaseUrlFromParts();
}

function maskPortInput(value: string | number | undefined): number | undefined {
  const port = Number(value);
  if (!Number.isFinite(port)) {
    return undefined;
  }
  return Math.min(65535, Math.max(1, Math.trunc(port)));
}

function maskContextPathInput(value: string | number | undefined): string {
  return normalizeContextPath(String(value || '').replace(/\s+/g, ''));
}

function updateExternalBaseUrlFromParts(): void {
  if (syncingExternalUrlParts) {
    return;
  }

  const host = externalUrlHost.value.trim();
  if (!host) {
    return;
  }

  let port = externalUrlUsesPort.value ? externalUrlPort.value : undefined;
  if (externalUrlUsesPort.value && !port) {
    port = appStore.getContainerPort('aas-environment') ?? DEFAULT_AAS_ENVIRONMENT_EXTERNAL_PORT;
    externalUrlPort.value = port;
  }

  appStore.updateExternalBaseUrl(
    buildExternalBaseUrl({
      protocol: externalUrlProtocol.value,
      host,
      port,
      contextPath: externalUrlContextPath.value,
    })
  );
}

function applyIntegrationConfig(): void {
  if (
    dockerComposeConfigObject.value?.value &&
    typeof dockerComposeConfigObject.value.value === 'object' &&
    'services' in dockerComposeConfigObject.value.value
  ) {
    const localCompose = { ...dockerComposeConfigObject.value };
    const services = (localCompose.value as { services: Record<string, unknown> }).services;
    const aasEnv = services['aas-environment'] as { environment?: string[] } | undefined;
    if (aasEnv?.environment && Array.isArray(aasEnv.environment)) {
      setOrReplaceEnvVar(
        aasEnv.environment,
        'GENERAL_AASREGISTRYINTEGRATION',
        String(appStore.getRegistryIntegration)
      );
      setOrReplaceEnvVar(
        aasEnv.environment,
        'GENERAL_SUBMODELREGISTRYINTEGRATION',
        String(appStore.getRegistryIntegration)
      );
      setOrReplaceEnvVar(
        aasEnv.environment,
        'GENERAL_DISCOVERYINTEGRATION',
        String(appStore.getDiscoveryIntegration)
      );
      appStore.setDockerComposeConfig(localCompose);
    }
  }

  if (
    basyxInfraConfigObject.value?.value &&
    typeof basyxInfraConfigObject.value.value === 'object' &&
    'infrastructures' in basyxInfraConfigObject.value.value
  ) {
    const localInfra = { ...basyxInfraConfigObject.value };
    const infrastructures = (localInfra.value as { infrastructures: Record<string, unknown> })
      .infrastructures;
    const defaultKey = infrastructures.default;
    if (typeof defaultKey !== 'string') {
      return;
    }

    const infra = infrastructures[defaultKey];
    if (!infra || typeof infra !== 'object') {
      return;
    }

    const infraRecord = { ...(infra as Record<string, unknown>) };
    const components =
      (infraRecord.components as Record<string, Record<string, unknown>> | undefined) || {};

    if (components.aasRegistry) {
      components.aasRegistry.hasDiscoveryIntegration = appStore.getDiscoveryIntegration;
    }
    if (components.aasRepository) {
      components.aasRepository.hasRegistryIntegration = appStore.getRegistryIntegration;
    }
    if (components.submodelRepository) {
      components.submodelRepository.hasRegistryIntegration = appStore.getRegistryIntegration;
    }

    infraRecord.components = components;
    infrastructures[defaultKey] = infraRecord;
    localInfra.value = { infrastructures };
    appStore.setBasyxInfraConfig(localInfra);
  }
}
</script>
