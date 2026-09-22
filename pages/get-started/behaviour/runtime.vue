<template>
  <v-container class="py-0 px-4 px-sm-8 px-md-12" fluid>
    <v-breadcrumbs class="px-0 pb-0 text-body-2 mb-3" divider="›" :items="breadcrumbs" />
    <h1 class="mb-8 text-header">BaSyx Go Runtime</h1>
    <p class="text-normalText mt-8 mb-5 text-subtitle-1">
      Configure HTTP behavior, model verification, CORS, and resource limits for the BaSyx Go AAS
      Environment. The selected values are rendered as environment variables in
      <code>docker-compose.yml</code>.
    </p>

    <v-alert color="alertCard" class="mb-8">
      <div class="font-weight-medium text-header">Safe starting point</div>
      <p class="text-subheader font-weight-medium mt-2 mb-0">
        Timeouts and limits follow the BaSyx Go defaults. CORS follows the official local minimal
        example so the generated Web UI can connect. Restrict CORS before exposing the setup.
      </p>
    </v-alert>

    <v-expansion-panels class="setup-config-panels mb-8" multiple :model-value="[0]">
      <v-expansion-panel title="HTTP server and verification">
        <v-expansion-panel-text>
          <v-row density="compact" class="runtime-field-row">
            <v-col cols="12" md="6">
              <v-select
                v-model="strictVerification"
                :items="verificationModes"
                label="SERVER_STRICTVERIFICATION"
                variant="solo-filled"
                hint="permissive validates when possible; strict rejects unverifiable models."
                persistent-hint
              >
                <template #append-inner
                  ><HelpTooltip
                    text="Permissive accepts models that cannot be fully verified; strict rejects them. Use strict after checking your AAS data."
                /></template>
              </v-select>
            </v-col>
            <v-col cols="12" md="6" class="runtime-field-stack">
              <v-switch
                v-model="verificationEndpointAvailable"
                color="primary"
                label="Expose verification endpoint"
                hide-details
              />
              <v-switch
                v-model="cacheEnabled"
                color="primary"
                label="Enable response cache"
                hide-details
              />
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel title="Advanced HTTP timeouts">
        <v-expansion-panel-text>
          <v-row density="compact" class="runtime-field-row">
            <v-col
              v-for="(timeout, index) in timeoutFields"
              :key="timeout.key"
              cols="12"
              :md="index === timeoutFields.length - 1 ? 12 : 6"
            >
              <v-number-input
                v-model="timeout.model.value"
                :label="timeout.key"
                :min="1"
                variant="solo-filled"
                hide-details="auto"
                :hint="timeout.hint"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel title="CORS">
        <v-expansion-panel-text>
          <v-row density="compact" class="runtime-field-row">
            <v-col cols="12">
              <v-text-field
                v-model="corsOrigins"
                label="CORS_ALLOWEDORIGINS"
                variant="solo-filled"
                hint="Comma-separated origins. Use * only for local or intentionally public setups."
                persistent-hint
              >
                <template #append-inner
                  ><HelpTooltip
                    text="Set exact browser origins in production. Wildcard origins are only suitable for local or deliberately public setups."
                /></template>
              </v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="corsMethods"
                label="CORS_ALLOWEDMETHODS"
                variant="solo-filled"
                hint="Comma-separated HTTP methods."
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="corsHeaders"
                label="CORS_ALLOWEDHEADERS"
                variant="solo-filled"
                hint="Comma-separated headers."
                persistent-hint
              />
            </v-col>
            <v-col cols="12">
              <v-switch
                v-model="corsAllowCredentials"
                color="primary"
                label="Allow credentials in cross-origin requests"
                hide-details
              />
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel title="Model and upload limits">
        <v-expansion-panel-text>
          <v-row density="compact" class="runtime-field-row runtime-limits-row">
            <v-col cols="12" md="6" class="runtime-field-stack runtime-limit-main">
              <v-switch
                v-model="enableImplicitCasts"
                color="primary"
                label="Enable implicit value casts"
                hide-details
              />
              <v-switch
                v-model="enableDescriptorDebug"
                color="primary"
                label="Enable descriptor query diagnostics"
                hide-details
              />
              <v-switch
                v-model="enableCustomHeaderInjection"
                color="primary"
                label="Enable custom middleware header injection"
                hide-details
              />
              <v-switch
                v-model="singularSupplementalSemanticId"
                color="primary"
                label="Use singular supplementalSemanticId"
                hide-details
              />
              <v-switch
                v-model="trustProxyHeaders"
                color="primary"
                label="Trust forwarded proxy headers"
                hide-details
              />
              <v-text-field
                v-if="trustProxyHeaders"
                v-model="trustedProxyCidrs"
                label="GENERAL_TRUSTEDPROXYCIDRS"
                variant="solo-filled"
                hint="Comma-separated CIDRs whose forwarded headers may be trusted."
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="6" class="runtime-field-stack runtime-limit-main">
              <v-number-input
                v-model="bulkBatchLimit"
                label="Bulk batch limit"
                :min="1"
                variant="solo-filled"
                control-variant="stacked"
                hint="Rows per generated bulk SQL statement."
                persistent-hint
              />
              <v-number-input
                v-model="uploadMaxMiB"
                label="Maximum upload size (MiB)"
                :min="1"
                variant="solo-filled"
                control-variant="stacked"
                hint="Saved to Compose as bytes."
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-number-input
                v-model="aasxMaxPartCount"
                label="AASX part count limit"
                :min="1"
                variant="solo-filled"
                control-variant="stacked"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-number-input
                v-model="aasxMaxTotalMiB"
                label="Expanded AASX limit (MiB)"
                :min="1"
                variant="solo-filled"
                control-variant="stacked"
                hint="Must be at least as large as the configured per-part limit."
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="4" class="runtime-limit-small">
              <v-number-input
                v-model="aasxMetadataMiB"
                label="OPC metadata limit (MiB)"
                :min="1"
                variant="solo-filled"
                control-variant="stacked"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12" md="4" class="runtime-limit-small">
              <v-number-input
                v-model="aasxPartMiB"
                label="Expanded part limit (MiB)"
                :min="1"
                variant="solo-filled"
                control-variant="stacked"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="12" md="4" class="runtime-limit-small">
              <v-number-input
                v-model="aasxThumbnailMiB"
                label="Thumbnail limit (MiB)"
                :min="1"
                variant="solo-filled"
                control-variant="stacked"
                hide-details="auto"
              />
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-btn class="mb-2" block variant="tonal" @click="applySettings">Apply Runtime Settings</v-btn>
    <v-btn class="mb-8" block color="secondary" variant="text" @click="resetToDefaults">
      Reset To Defaults
    </v-btn>

    <v-card-actions class="px-0 mb-8">
      <v-btn variant="tonal" prepend-icon="mdi-arrow-left" to="/get-started/application"
        >Back</v-btn
      >
      <v-spacer />
      <v-btn variant="tonal" color="primary" append-icon="mdi-arrow-right" @click="goNext"
        >Next</v-btn
      >
    </v-card-actions>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAppStore } from '@/stores/app';
import { envBoolean, envNumber, readServiceEnvironment } from '@/utils/dockerEnvironment';

defineOptions({ name: 'RuntimeConfiguration' });

useSeoMeta({
  title: 'BaSyx Go Runtime | Eclipse BaSyx™',
  ogTitle: 'BaSyx Go Runtime | Eclipse BaSyx™',
});

const MIB = 1024 * 1024;
const DEFAULTS = {
  strictVerification: 'permissive',
  verificationEndpointAvailable: true,
  cacheEnabled: false,
  readHeaderTimeout: 15,
  readTimeout: 300,
  writeTimeout: 300,
  idleTimeout: 60,
  shutdownTimeout: 10,
  corsOrigins: '*',
  corsMethods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  corsHeaders: '*',
  corsAllowCredentials: true,
  enableImplicitCasts: true,
  enableDescriptorDebug: false,
  enableCustomHeaderInjection: false,
  singularSupplementalSemanticId: false,
  trustProxyHeaders: false,
  trustedProxyCidrs: '',
  bulkBatchLimit: 1000,
  uploadMaxMiB: 128,
  aasxMaxPartCount: 10000,
  aasxMetadataMiB: 16,
  aasxPartMiB: 128,
  aasxMaxTotalMiB: 512,
  aasxThumbnailMiB: 16,
};

const appStore = useAppStore();
const compose = computed(() => appStore.getDockerComposeConfig?.value);
const breadcrumbs = ref([
  { title: 'Home', to: '/' },
  { title: 'Get Started', to: '/get-started/introduction' },
  { title: 'BaSyx Go Runtime', to: '/get-started/behaviour/runtime' },
]);
const verificationModes = ['off', 'permissive', 'strict'];

const strictVerification = ref(DEFAULTS.strictVerification);
const verificationEndpointAvailable = ref(DEFAULTS.verificationEndpointAvailable);
const cacheEnabled = ref(DEFAULTS.cacheEnabled);
const readHeaderTimeout = ref(DEFAULTS.readHeaderTimeout);
const readTimeout = ref(DEFAULTS.readTimeout);
const writeTimeout = ref(DEFAULTS.writeTimeout);
const idleTimeout = ref(DEFAULTS.idleTimeout);
const shutdownTimeout = ref(DEFAULTS.shutdownTimeout);
const corsOrigins = ref(DEFAULTS.corsOrigins);
const corsMethods = ref(DEFAULTS.corsMethods);
const corsHeaders = ref(DEFAULTS.corsHeaders);
const corsAllowCredentials = ref(DEFAULTS.corsAllowCredentials);
const enableImplicitCasts = ref(DEFAULTS.enableImplicitCasts);
const enableDescriptorDebug = ref(DEFAULTS.enableDescriptorDebug);
const enableCustomHeaderInjection = ref(DEFAULTS.enableCustomHeaderInjection);
const singularSupplementalSemanticId = ref(DEFAULTS.singularSupplementalSemanticId);
const trustProxyHeaders = ref(DEFAULTS.trustProxyHeaders);
const trustedProxyCidrs = ref(DEFAULTS.trustedProxyCidrs);
const bulkBatchLimit = ref(DEFAULTS.bulkBatchLimit);
const uploadMaxMiB = ref(DEFAULTS.uploadMaxMiB);
const aasxMaxPartCount = ref(DEFAULTS.aasxMaxPartCount);
const aasxMetadataMiB = ref(DEFAULTS.aasxMetadataMiB);
const aasxPartMiB = ref(DEFAULTS.aasxPartMiB);
const aasxMaxTotalMiB = ref(DEFAULTS.aasxMaxTotalMiB);
const aasxThumbnailMiB = ref(DEFAULTS.aasxThumbnailMiB);

const timeoutFields = [
  {
    key: 'SERVER_READ_HEADER_TIMEOUT_SECONDS',
    model: readHeaderTimeout,
    hint: 'Header read timeout.',
  },
  {
    key: 'SERVER_READ_TIMEOUT_SECONDS',
    model: readTimeout,
    hint: 'Complete request read timeout.',
  },
  { key: 'SERVER_WRITE_TIMEOUT_SECONDS', model: writeTimeout, hint: 'Response write timeout.' },
  { key: 'SERVER_IDLE_TIMEOUT_SECONDS', model: idleTimeout, hint: 'Keep-alive idle timeout.' },
  {
    key: 'SERVER_SHUTDOWN_TIMEOUT_SECONDS',
    model: shutdownTimeout,
    hint: 'Graceful shutdown timeout.',
  },
];

function syncFromCompose(): void {
  const env = readServiceEnvironment(compose.value);
  strictVerification.value = env.SERVER_STRICTVERIFICATION || DEFAULTS.strictVerification;
  verificationEndpointAvailable.value = envBoolean(
    env.SERVER_VERIFICATIONENDPOINTAVAILABLE,
    DEFAULTS.verificationEndpointAvailable
  );
  cacheEnabled.value = envBoolean(env.SERVER_CACHEENABLED, DEFAULTS.cacheEnabled);
  readHeaderTimeout.value = envNumber(
    env.SERVER_READ_HEADER_TIMEOUT_SECONDS,
    DEFAULTS.readHeaderTimeout
  );
  readTimeout.value = envNumber(env.SERVER_READ_TIMEOUT_SECONDS, DEFAULTS.readTimeout);
  writeTimeout.value = envNumber(env.SERVER_WRITE_TIMEOUT_SECONDS, DEFAULTS.writeTimeout);
  idleTimeout.value = envNumber(env.SERVER_IDLE_TIMEOUT_SECONDS, DEFAULTS.idleTimeout);
  shutdownTimeout.value = envNumber(env.SERVER_SHUTDOWN_TIMEOUT_SECONDS, DEFAULTS.shutdownTimeout);
  corsOrigins.value = env.CORS_ALLOWEDORIGINS || DEFAULTS.corsOrigins;
  corsMethods.value = env.CORS_ALLOWEDMETHODS || DEFAULTS.corsMethods;
  corsHeaders.value = env.CORS_ALLOWEDHEADERS || DEFAULTS.corsHeaders;
  corsAllowCredentials.value = envBoolean(env.CORS_ALLOWCREDENTIALS, DEFAULTS.corsAllowCredentials);
  enableImplicitCasts.value = envBoolean(
    env.GENERAL_ENABLEIMPLICITCASTS,
    DEFAULTS.enableImplicitCasts
  );
  enableDescriptorDebug.value = envBoolean(
    env.GENERAL_ENABLEDESCRIPTORDEBUG,
    DEFAULTS.enableDescriptorDebug
  );
  enableCustomHeaderInjection.value = envBoolean(
    env.GENERAL_ENABLECUSTOMMIDDLEWAREHEADERINJECTION,
    DEFAULTS.enableCustomHeaderInjection
  );
  singularSupplementalSemanticId.value = envBoolean(
    env.GENERAL_SUPPORTSSINGULARSUPPLEMENTALSEMANTICID,
    DEFAULTS.singularSupplementalSemanticId
  );
  trustProxyHeaders.value = envBoolean(env.GENERAL_TRUSTPROXYHEADERS, DEFAULTS.trustProxyHeaders);
  trustedProxyCidrs.value = env.GENERAL_TRUSTEDPROXYCIDRS || DEFAULTS.trustedProxyCidrs;
  bulkBatchLimit.value = envNumber(env.GENERAL_BULK_BATCH_LIMIT, DEFAULTS.bulkBatchLimit);
  uploadMaxMiB.value = Math.round(
    envNumber(env.GENERAL_UPLOADMAXSIZEBYTES, DEFAULTS.uploadMaxMiB * MIB) / MIB
  );
  aasxMaxPartCount.value = envNumber(env.GENERAL_AASXMAXPARTCOUNT, DEFAULTS.aasxMaxPartCount);
  aasxMetadataMiB.value = Math.round(
    envNumber(env.GENERAL_AASXMAXOPCMETADATASIZEBYTES, DEFAULTS.aasxMetadataMiB * MIB) / MIB
  );
  aasxPartMiB.value = Math.round(
    envNumber(env.GENERAL_AASXMAXPARTEXPANDEDSIZEBYTES, DEFAULTS.aasxPartMiB * MIB) / MIB
  );
  aasxMaxTotalMiB.value = Math.round(
    envNumber(env.GENERAL_AASXMAXTOTALEXPANDEDSIZEBYTES, DEFAULTS.aasxMaxTotalMiB * MIB) / MIB
  );
  aasxThumbnailMiB.value = Math.round(
    envNumber(env.GENERAL_AASXMAXTHUMBNAILSIZEBYTES, DEFAULTS.aasxThumbnailMiB * MIB) / MIB
  );
}

function applySettings(): void {
  appStore.updateServiceEnvironment(
    'aas-environment',
    {
      SERVER_CACHEENABLED: String(cacheEnabled.value),
      SERVER_STRICTVERIFICATION: strictVerification.value,
      SERVER_VERIFICATIONENDPOINTAVAILABLE: String(verificationEndpointAvailable.value),
      SERVER_READ_HEADER_TIMEOUT_SECONDS: String(Math.max(1, readHeaderTimeout.value)),
      SERVER_READ_TIMEOUT_SECONDS: String(Math.max(1, readTimeout.value)),
      SERVER_WRITE_TIMEOUT_SECONDS: String(Math.max(1, writeTimeout.value)),
      SERVER_IDLE_TIMEOUT_SECONDS: String(Math.max(1, idleTimeout.value)),
      SERVER_SHUTDOWN_TIMEOUT_SECONDS: String(Math.max(1, shutdownTimeout.value)),
      CORS_ALLOWEDORIGINS: corsOrigins.value.trim() || DEFAULTS.corsOrigins,
      CORS_ALLOWEDMETHODS: corsMethods.value.trim() || DEFAULTS.corsMethods,
      CORS_ALLOWEDHEADERS: corsHeaders.value.trim() || DEFAULTS.corsHeaders,
      CORS_ALLOWCREDENTIALS: String(corsAllowCredentials.value),
      GENERAL_ENABLEIMPLICITCASTS: String(enableImplicitCasts.value),
      GENERAL_ENABLEDESCRIPTORDEBUG: String(enableDescriptorDebug.value),
      GENERAL_ENABLECUSTOMMIDDLEWAREHEADERINJECTION: String(enableCustomHeaderInjection.value),
      GENERAL_SUPPORTSSINGULARSUPPLEMENTALSEMANTICID: String(singularSupplementalSemanticId.value),
      GENERAL_TRUSTPROXYHEADERS: String(trustProxyHeaders.value),
      GENERAL_TRUSTEDPROXYCIDRS: trustProxyHeaders.value ? trustedProxyCidrs.value.trim() : '',
      GENERAL_BULK_BATCH_LIMIT: String(Math.max(1, bulkBatchLimit.value)),
      GENERAL_UPLOADMAXSIZEBYTES: String(Math.max(1, uploadMaxMiB.value) * MIB),
      GENERAL_AASXMAXPARTCOUNT: String(Math.max(1, aasxMaxPartCount.value)),
      GENERAL_AASXMAXOPCMETADATASIZEBYTES: String(Math.max(1, aasxMetadataMiB.value) * MIB),
      GENERAL_AASXMAXPARTEXPANDEDSIZEBYTES: String(Math.max(1, aasxPartMiB.value) * MIB),
      GENERAL_AASXMAXTOTALEXPANDEDSIZEBYTES: String(
        Math.max(aasxPartMiB.value, aasxMaxTotalMiB.value) * MIB
      ),
      GENERAL_AASXMAXTHUMBNAILSIZEBYTES: String(
        Math.min(Math.max(1, aasxThumbnailMiB.value), Math.max(1, aasxPartMiB.value)) * MIB
      ),
    },
    ['CORS_ALLOWEDCREDENTIALS']
  );
}

function goNext(): void {
  applySettings();
  navigateTo('/get-started/behaviour/persistence');
}

function resetToDefaults(): void {
  strictVerification.value = DEFAULTS.strictVerification;
  verificationEndpointAvailable.value = DEFAULTS.verificationEndpointAvailable;
  cacheEnabled.value = DEFAULTS.cacheEnabled;
  readHeaderTimeout.value = DEFAULTS.readHeaderTimeout;
  readTimeout.value = DEFAULTS.readTimeout;
  writeTimeout.value = DEFAULTS.writeTimeout;
  idleTimeout.value = DEFAULTS.idleTimeout;
  shutdownTimeout.value = DEFAULTS.shutdownTimeout;
  corsOrigins.value = DEFAULTS.corsOrigins;
  corsMethods.value = DEFAULTS.corsMethods;
  corsHeaders.value = DEFAULTS.corsHeaders;
  corsAllowCredentials.value = DEFAULTS.corsAllowCredentials;
  enableImplicitCasts.value = DEFAULTS.enableImplicitCasts;
  enableDescriptorDebug.value = DEFAULTS.enableDescriptorDebug;
  enableCustomHeaderInjection.value = DEFAULTS.enableCustomHeaderInjection;
  singularSupplementalSemanticId.value = DEFAULTS.singularSupplementalSemanticId;
  trustProxyHeaders.value = DEFAULTS.trustProxyHeaders;
  trustedProxyCidrs.value = DEFAULTS.trustedProxyCidrs;
  bulkBatchLimit.value = DEFAULTS.bulkBatchLimit;
  uploadMaxMiB.value = DEFAULTS.uploadMaxMiB;
  aasxMaxPartCount.value = DEFAULTS.aasxMaxPartCount;
  aasxMetadataMiB.value = DEFAULTS.aasxMetadataMiB;
  aasxPartMiB.value = DEFAULTS.aasxPartMiB;
  aasxMaxTotalMiB.value = DEFAULTS.aasxMaxTotalMiB;
  aasxThumbnailMiB.value = DEFAULTS.aasxThumbnailMiB;
  applySettings();
}

watch(compose, syncFromCompose, { immediate: true });
</script>

<style scoped>
.runtime-field-row {
  row-gap: 12px;
}

.runtime-field-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.runtime-field-stack > :deep(.v-number-input) {
  flex: 0 0 auto;
}

.runtime-limits-row {
  container-type: inline-size;
}

@container (max-width: 700px) {
  .runtime-limits-row > .runtime-limit-small {
    flex: 0 0 100%;
    max-width: 100%;
  }
}

@container (max-width: 600px) {
  .runtime-limits-row > .runtime-limit-main {
    flex: 0 0 100%;
    max-width: 100%;
  }
}
</style>
