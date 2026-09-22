<template>
  <v-container class="py-0 px-4 px-sm-8 px-md-12" fluid>
    <v-breadcrumbs class="px-0 pb-0 text-body-2 mb-3" divider="›" :items="breadcrumbs" />
    <h1 class="mb-5 text-header">Access Control</h1>
    <p class="text-normalText mb-6 text-subtitle-1">
      Protect BaSyx Go with an access policy and an OIDC trust list. The local setup includes
      Keycloak by default; experts can use an existing identity provider instead.
    </p>
    <v-switch
      v-model="enabled"
      color="primary"
      label="Enable access control"
      @update:model-value="onEnabledChanged"
    />
    <template v-if="enabled">
      <v-alert type="warning" variant="tonal" class="mb-6">
        Review the policy before deployment. The starting policy gives only the local administrator
        access. Replace local development credentials before exposing this stack.
      </v-alert>

      <h2 class="text-header mb-3">Access policy</h2>
      <p class="text-normalText mb-3">Upload an access-rules JSON file or edit the policy below.</p>
      <v-file-input
        label="Upload access policy JSON"
        accept="application/json,.json"
        variant="solo-filled"
        @update:model-value="loadPolicyFile"
      />
      <label class="d-block mb-2 text-body-2">Access policy JSON</label>
      <SchemaJsonEditor
        v-model="policyJson"
        label="Access policy JSON"
        model-namespace="access-policy"
        :schema="policyEditorSchema"
        :error="Boolean(policyError)"
        height="320px"
      />
      <p v-if="policyError" class="text-error text-body-2 mt-2">{{ policyError }}</p>
      <p class="text-medium-emphasis text-caption mt-2">
        The policy is packaged as security_env/access-rules.json, not placed in the share URL.
      </p>

      <h2 class="text-header mt-8 mb-3">Identity provider</h2>
      <v-switch
        v-model="includeKeycloak"
        color="primary"
        density="compact"
        label="Include local Keycloak container"
        hint="Turn off to use an existing OIDC provider. Configure its issuer and trust list below."
        persistent-hint
        class="mb-6"
        @update:model-value="onKeycloakSelected"
      />
      <v-alert v-if="includeKeycloak" type="info" variant="tonal" class="mb-4">
        The download includes a local realm and a one-time administrator password in its README.
        Keycloak is for development; use an appropriately secured identity provider in production.
      </v-alert>
      <v-expansion-panels class="setup-config-panels mb-6">
        <v-expansion-panel title="Expert OIDC and policy settings">
          <v-expansion-panel-text>
            <v-row density="compact">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="issuer"
                  label="OIDC issuer URL"
                  :disabled="includeKeycloak"
                  variant="solo-filled"
                  hint="Must match the issuer in tokens and be reachable by browsers and containers."
                  persistent-hint
                  @update:model-value="updateDefaultTrustList"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="clientId" label="Web UI client ID" variant="solo-filled" />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="importMode"
                  :items="['if_missing', 'always', 'never']"
                  label="Policy file import mode"
                  variant="solo-filled"
                  hint="if_missing preserves changes to a database-backed policy after first start."
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="managementApi"
                  color="primary"
                  label="Enable policy management API"
                />
              </v-col>
            </v-row>
            <label class="d-block mt-4 mb-2 text-body-2">OIDC trust-list JSON</label>
            <SchemaJsonEditor
              v-model="trustListJson"
              label="OIDC trust-list JSON"
              model-namespace="oidc-trust-list"
              :schema="trustListEditorSchema"
              :error="Boolean(trustListError)"
              height="180px"
            />
            <p v-if="trustListError" class="text-error text-body-2 mt-2">
              {{ trustListError }}
            </p>
            <p class="text-medium-emphasis text-caption mt-2">
              List allowed token issuers and audiences. Packaged as security_env/trustlist.json.
            </p>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>

    <v-btn
      class="mb-2"
      block
      variant="tonal"
      :disabled="Boolean(policyError || trustListError)"
      @click="applySettings"
      >Apply Access Control Settings</v-btn
    >
    <v-alert v-if="applied" type="success" variant="tonal" class="mb-6"
      >Access control settings applied.</v-alert
    >
    <v-card-actions class="px-0 mb-8">
      <v-btn
        variant="tonal"
        prepend-icon="mdi-arrow-left"
        to="/get-started/deployment/observability"
        >Back</v-btn
      >
      <v-spacer />
      <v-btn
        variant="tonal"
        color="primary"
        append-icon="mdi-flag-checkered"
        :disabled="Boolean(policyError || trustListError)"
        @click="finalizeSettings"
        >Finalize</v-btn
      >
    </v-card-actions>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAppStore } from '@/stores/app';
import {
  ACCESS_POLICY_MODEL_PATTERN,
  ACCESS_POLICY_SCHEMA_URI,
  accessPolicySchema,
  TRUST_LIST_MODEL_PATTERN,
  TRUST_LIST_SCHEMA_URI,
  trustListSchema,
} from '@/utils/accessSchemas';
import { envBoolean, readServiceEnvironment } from '@/utils/dockerEnvironment';
import { getComposeServices, updateOptionalServices } from '@/utils/optionalServices';
import {
  defaultTrustList,
  localKeycloakService,
  validatePolicy,
  validateTrustList,
} from '@/utils/securitySetup';

defineOptions({ name: 'ABAC' });
useSeoMeta({
  title: 'Access Control | Eclipse BaSyx™',
  ogTitle: 'Access Control | Eclipse BaSyx™',
});

const appStore = useAppStore();
const policyEditorSchema = {
  uri: ACCESS_POLICY_SCHEMA_URI,
  fileMatch: [ACCESS_POLICY_MODEL_PATTERN],
  schema: accessPolicySchema,
};
const trustListEditorSchema = {
  uri: TRUST_LIST_SCHEMA_URI,
  fileMatch: [TRUST_LIST_MODEL_PATTERN],
  schema: trustListSchema,
};
const compose = computed(() => appStore.getDockerComposeConfig?.value);
const breadcrumbs = ref([
  { title: 'Home', to: '/' },
  { title: 'Get Started', to: '/get-started/introduction' },
  { title: 'Access Control', to: '/get-started/deployment/access-control' },
]);
const enabled = ref(false);
const includeKeycloak = ref(true);
const policyJson = ref(appStore.accessPolicyJson);
const trustListJson = ref(appStore.trustListJson);
const issuer = ref('http://keycloak.localhost:8080/realms/basyx');
const clientId = ref('basyx-ui');
const importMode = ref('if_missing');
const managementApi = ref(false);
const appliedSignature = ref('');
const settingsSignature = computed(() =>
  JSON.stringify({
    enabled: enabled.value,
    includeKeycloak: includeKeycloak.value,
    policyJson: policyJson.value,
    trustListJson: trustListJson.value,
    issuer: issuer.value,
    clientId: clientId.value,
    importMode: importMode.value,
    managementApi: managementApi.value,
  })
);
const applied = computed(
  () => Boolean(appliedSignature.value) && appliedSignature.value === settingsSignature.value
);
const policyError = computed(() => (enabled.value ? validatePolicy(policyJson.value) : undefined));
const trustListError = computed(() =>
  enabled.value ? validateTrustList(trustListJson.value) : undefined
);

function onEnabledChanged(value: boolean | null): void {
  if (value) includeKeycloak.value = true;
}

function onKeycloakSelected(value: boolean | null): void {
  if (value) {
    issuer.value = 'http://keycloak.localhost:8080/realms/basyx';
    trustListJson.value = defaultTrustList(issuer.value);
  }
}

function syncFromCompose(): void {
  const env = readServiceEnvironment(compose.value);
  enabled.value = envBoolean(env.ABAC_ENABLED);
  includeKeycloak.value = Boolean(getComposeServices()?.keycloak);
  importMode.value = env.ABAC_POLICY_FILE_IMPORT || 'if_missing';
  managementApi.value = envBoolean(env.ABAC_MANAGEMENT_API_ENABLED);
  const config = appStore.getBasyxInfraConfig?.value as
    { infrastructures?: Record<string, unknown> } | undefined;
  const infrastructures = config?.infrastructures;
  const infra = infrastructures?.[String(infrastructures.default)] as
    { security?: { config?: { issuer?: string; clientId?: string } } } | undefined;
  issuer.value = infra?.security?.config?.issuer || 'http://keycloak.localhost:8080/realms/basyx';
  clientId.value = infra?.security?.config?.clientId || 'basyx-ui';
  if (appStore.trustListJson === defaultTrustList()) {
    trustListJson.value = defaultTrustList(issuer.value);
  }
}

function updateDefaultTrustList(newIssuer: string): void {
  try {
    const entries = JSON.parse(trustListJson.value) as { issuer: string; audience: string }[];
    if (entries.length === 1 && entries[0]?.audience === 'discovery-service') {
      entries[0].issuer = newIssuer;
      trustListJson.value = JSON.stringify(entries, null, 2);
    }
  } catch {
    /* Keep user-entered JSON visible for correction. */
  }
}

async function loadPolicyFile(value: File | File[] | null): Promise<void> {
  const file = Array.isArray(value) ? value[0] : value;
  if (file) policyJson.value = await file.text();
}

function applySettings(): void {
  if (policyError.value || trustListError.value) return;
  const securityEnabled = enabled.value;
  const local = securityEnabled && includeKeycloak.value;
  appStore.accessPolicyJson = policyJson.value;
  appStore.trustListJson = trustListJson.value;
  appStore.updateServiceEnvironment(
    'aas-environment',
    {
      ABAC_ENABLED: String(securityEnabled),
      ...(securityEnabled
        ? {
            ABAC_MODELPATH: '/security_env/access-rules.json',
            OIDC_TRUSTLISTPATH: '/security_env/trustlist.json',
            ABAC_POLICY_FILE_IMPORT: importMode.value,
            ABAC_MANAGEMENT_API_ENABLED: String(managementApi.value),
          }
        : {}),
    },
    securityEnabled
      ? []
      : [
          'ABAC_MODELPATH',
          'OIDC_TRUSTLISTPATH',
          'ABAC_POLICY_FILE_IMPORT',
          'ABAC_MANAGEMENT_API_ENABLED',
        ]
  );

  const databaseEnv = readServiceEnvironment(appStore.getDockerComposeConfig?.value);
  updateOptionalServices(
    local
      ? localKeycloakService({
          host: databaseEnv.POSTGRES_HOST || 'db',
          port: databaseEnv.POSTGRES_PORT || '5432',
          name: databaseEnv.POSTGRES_DBNAME || 'basyxTestDB',
          user: databaseEnv.POSTGRES_USER || 'admin',
          password: databaseEnv.POSTGRES_PASSWORD || 'admin123',
          local: Boolean(getComposeServices()?.db),
        })
      : {},
    ['keycloak']
  );
  const config = appStore.getDockerComposeConfig;
  if (config?.value && typeof config.value === 'object' && 'services' in config.value) {
    const updated = JSON.parse(JSON.stringify(config)) as typeof config;
    const services = (
      updated.value as { services: Record<string, { volumes?: string[]; extra_hosts?: string[] }> }
    ).services;
    const service = services['aas-environment'];
    if (service) {
      service.volumes = (service.volumes || []).filter(item => !item.startsWith('./security_env:'));
      if (securityEnabled) service.volumes.push('./security_env:/security_env:ro');
    }
    for (const name of ['aas-environment', 'aas-ui']) {
      const item = services[name];
      if (!item) continue;
      item.extra_hosts = (item.extra_hosts || []).filter(
        host => !host.startsWith('keycloak.localhost:')
      );
      if (!item.extra_hosts.length) delete item.extra_hosts;
    }
    appStore.setDockerComposeConfig(updated);
  }

  const infraConfig = appStore.getBasyxInfraConfig;
  if (
    infraConfig?.value &&
    typeof infraConfig.value === 'object' &&
    'infrastructures' in infraConfig.value
  ) {
    const updated = JSON.parse(JSON.stringify(infraConfig)) as typeof infraConfig;
    const infrastructures = (updated.value as { infrastructures: Record<string, unknown> })
      .infrastructures;
    const infra = infrastructures[String(infrastructures.default)] as Record<string, unknown>;
    infra.security = securityEnabled
      ? {
          type: 'oauth2',
          config: {
            flow: 'auth_code',
            issuer: issuer.value.trim(),
            clientId: clientId.value.trim(),
          },
        }
      : { type: 'none' };
    appStore.setBasyxInfraConfig(updated);
  }
  appliedSignature.value = settingsSignature.value;
}

function finalizeSettings(): void {
  if (policyError.value || trustListError.value) return;
  applySettings();
  navigateTo('/get-started/download');
}

watch(compose, syncFromCompose, { immediate: true });
</script>
