<template>
  <v-container class="py-0 px-4 px-sm-8 px-md-12" fluid>
    <v-breadcrumbs class="px-0 pb-0 text-body-2 mb-3" divider="›" :items="breadcrumbs" />
    <h1 class="mb-8 text-header">History and Audit</h1>
    <p class="text-normalText mt-8 mb-5 text-subtitle-1">
      BaSyx Go can retain earlier AAS and Submodel states. History is stored in PostgreSQL and can
      be queried through the standardized <code>$history</code> endpoints.
    </p>

    <v-alert color="alertCard" class="mb-8">
      <div class="font-weight-medium text-header">Choose the required guarantee</div>
      <ul class="text-subheader font-weight-medium mt-2 ms-6">
        <li><code>off</code> disables PostgreSQL history.</li>
        <li><code>api</code> records versions for history API queries.</li>
        <li><code>audit</code> additionally records request identity information.</li>
        <li>
          <code>postgres_guarded</code> prevents ordinary database operations from bypassing
          history.
        </li>
      </ul>
    </v-alert>

    <v-row density="compact">
      <v-col cols="12" md="6">
        <v-select
          v-model="historyMode"
          :items="historyModes"
          label="BASYX_HISTORY_MODE"
          variant="solo-filled"
          hint="History is disabled by default."
          persistent-hint
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-number-input
          v-model="fullSnapshotInterval"
          label="BASYX_HISTORY_FULL_SNAPSHOT_INTERVAL"
          :min="1"
          variant="solo-filled"
          hint="1 stores every version as a complete snapshot; higher values use intermediate diffs."
          persistent-hint
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-select
          v-model="immutability"
          :items="immutabilityModes"
          label="BASYX_HISTORY_IMMUTABILITY"
          variant="solo-filled"
          hint="The guarded mode is database-wide and should be enabled deliberately."
          persistent-hint
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-select
          v-model="auditIdentityMode"
          :items="identityModes"
          label="BASYX_AUDIT_IDENTITY_MODE"
          variant="solo-filled"
          :disabled="historyMode !== 'audit'"
          hint="Controls how much authenticated request identity is retained."
          persistent-hint
        />
      </v-col>
    </v-row>

    <v-alert v-if="immutability === 'postgres_guarded'" type="warning" variant="tonal" class="my-6">
      The PostgreSQL guard persists in the database. Switching this field back to
      <code>none</code> later is not sufficient to disable an existing guard.
    </v-alert>

    <v-divider class="mt-12 mb-8" />
    <h2 class="text-header">Optional WORM Evidence</h2>
    <p class="text-normalText mt-8 mb-5 text-subtitle-1">
      Evidence writes an immutable mutation chain to an existing S3-compatible object store. The
      Starter Kit configures the connection but does not deploy an object store or create the
      bucket.
    </p>
    <v-switch
      v-model="evidenceEnabled"
      color="primary"
      label="Enable S3-compatible history evidence"
      hide-details
      class="mb-4"
    />

    <v-row v-if="evidenceEnabled" density="compact">
      <v-col cols="12" md="6">
        <v-text-field v-model="evidenceEndpoint" label="Evidence endpoint" variant="solo-filled" />
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field v-model="evidenceBucket" label="Evidence bucket" variant="solo-filled" />
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field v-model="evidenceRegion" label="Evidence region" variant="solo-filled" />
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="evidencePrefix"
          label="Evidence object prefix"
          variant="solo-filled"
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="evidenceAccessKey"
          label="Evidence access key ID"
          variant="solo-filled"
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="evidenceSecretKey"
          label="Evidence secret access key"
          type="password"
          variant="solo-filled"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-select
          v-model="evidenceRetentionMode"
          :items="retentionModes"
          label="Object-lock retention mode"
          variant="solo-filled"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-number-input
          v-model="evidenceRetentionDays"
          label="Evidence retention days"
          :min="1"
          variant="solo-filled"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-switch v-model="evidencePathStyle" label="Use path-style S3 URLs" color="primary" />
      </v-col>
    </v-row>

    <v-alert v-if="evidenceEnabled && !evidenceComplete" type="error" variant="tonal" class="mb-6">
      A bucket, retention mode, positive retention period, and a complete optional access-key pair
      are required when evidence is enabled.
    </v-alert>

    <v-btn class="mb-2" block variant="tonal" :disabled="!evidenceComplete" @click="applySettings">
      Apply History Settings
    </v-btn>
    <v-btn class="mb-8" block color="secondary" variant="text" @click="resetToDefaults">
      Reset To Defaults
    </v-btn>

    <v-card-actions class="px-0 mb-8">
      <v-btn variant="tonal" prepend-icon="mdi-arrow-left" to="/get-started/behaviour/persistence"
        >Back</v-btn
      >
      <v-spacer />
      <v-btn
        variant="tonal"
        color="primary"
        append-icon="mdi-arrow-right"
        :disabled="!evidenceComplete"
        @click="goNext"
        >Next</v-btn
      >
    </v-card-actions>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAppStore } from '@/stores/app';
import { envBoolean, envNumber, readServiceEnvironment } from '@/utils/dockerEnvironment';

defineOptions({ name: 'HistoryConfiguration' });

useSeoMeta({
  title: 'History and Audit | Eclipse BaSyx™',
  ogTitle: 'History and Audit | Eclipse BaSyx™',
});

const DEFAULTS = {
  mode: 'off',
  fullSnapshotInterval: 1,
  immutability: 'none',
  identityMode: 'none',
  endpoint: '',
  bucket: '',
  region: 'us-east-1',
  prefix: 'basyx-history-evidence',
  retentionMode: 'governance',
  retentionDays: 7,
};

const appStore = useAppStore();
const compose = computed(() => appStore.getDockerComposeConfig?.value);
const breadcrumbs = ref([
  { title: 'Home', to: '/' },
  { title: 'Get Started', to: '/get-started/introduction' },
  { title: 'History and Audit', to: '/get-started/behaviour/history' },
]);
const historyModes = ['off', 'api', 'audit'];
const immutabilityModes = ['none', 'postgres_guarded'];
const identityModes = ['none', 'minimal', 'extended'];
const retentionModes = ['governance', 'compliance'];

const historyMode = ref(DEFAULTS.mode);
const fullSnapshotInterval = ref(DEFAULTS.fullSnapshotInterval);
const immutability = ref(DEFAULTS.immutability);
const auditIdentityMode = ref(DEFAULTS.identityMode);
const evidenceEnabled = ref(false);
const evidenceEndpoint = ref(DEFAULTS.endpoint);
const evidenceBucket = ref(DEFAULTS.bucket);
const evidenceRegion = ref(DEFAULTS.region);
const evidencePrefix = ref(DEFAULTS.prefix);
const evidenceAccessKey = ref('');
const evidenceSecretKey = ref('');
const evidenceRetentionMode = ref(DEFAULTS.retentionMode);
const evidenceRetentionDays = ref(DEFAULTS.retentionDays);
const evidencePathStyle = ref(false);

const evidenceComplete = computed(
  () =>
    !evidenceEnabled.value ||
    Boolean(
      evidenceBucket.value.trim() &&
      evidenceRetentionMode.value &&
      evidenceRetentionDays.value > 0 &&
      ((!evidenceAccessKey.value.trim() && !evidenceSecretKey.value) ||
        (evidenceAccessKey.value.trim() && evidenceSecretKey.value))
    )
);

function syncFromCompose(): void {
  const env = readServiceEnvironment(compose.value);
  historyMode.value = env.BASYX_HISTORY_MODE || DEFAULTS.mode;
  fullSnapshotInterval.value = envNumber(
    env.BASYX_HISTORY_FULL_SNAPSHOT_INTERVAL,
    DEFAULTS.fullSnapshotInterval
  );
  immutability.value = env.BASYX_HISTORY_IMMUTABILITY || DEFAULTS.immutability;
  auditIdentityMode.value = env.BASYX_AUDIT_IDENTITY_MODE || DEFAULTS.identityMode;
  evidenceEnabled.value = envBoolean(env.BASYX_HISTORY_EVIDENCE_ENABLED);
  evidenceEndpoint.value = env.BASYX_HISTORY_EVIDENCE_ENDPOINT || DEFAULTS.endpoint;
  evidenceBucket.value = env.BASYX_HISTORY_EVIDENCE_BUCKET || DEFAULTS.bucket;
  evidenceRegion.value = env.BASYX_HISTORY_EVIDENCE_REGION || DEFAULTS.region;
  evidencePrefix.value = env.BASYX_HISTORY_EVIDENCE_PREFIX || DEFAULTS.prefix;
  evidenceAccessKey.value = env.BASYX_HISTORY_EVIDENCE_ACCESS_KEY_ID || '';
  evidenceSecretKey.value = env.BASYX_HISTORY_EVIDENCE_SECRET_ACCESS_KEY || '';
  evidenceRetentionMode.value = env.BASYX_HISTORY_EVIDENCE_RETENTION_MODE || DEFAULTS.retentionMode;
  evidenceRetentionDays.value = envNumber(
    env.BASYX_HISTORY_EVIDENCE_RETENTION_DAYS,
    DEFAULTS.retentionDays
  );
  evidencePathStyle.value = envBoolean(env.BASYX_HISTORY_EVIDENCE_PATH_STYLE);
}

function applySettings(): void {
  const values: Record<string, string> = {
    BASYX_HISTORY_MODE: historyMode.value,
    BASYX_HISTORY_RETENTION_DAYS: '0',
    BASYX_HISTORY_FULL_SNAPSHOT_INTERVAL: String(Math.max(1, fullSnapshotInterval.value)),
    BASYX_HISTORY_IMMUTABILITY: immutability.value,
    BASYX_AUDIT_IDENTITY_MODE: historyMode.value === 'audit' ? auditIdentityMode.value : 'none',
    BASYX_HISTORY_EVIDENCE_ENABLED: String(evidenceEnabled.value),
    BASYX_HISTORY_INTEGRITY_ANCHOR_PROVIDER: 'none',
  };

  const evidenceKeys = [
    'BASYX_HISTORY_EVIDENCE_PROVIDER',
    'BASYX_HISTORY_EVIDENCE_ENDPOINT',
    'BASYX_HISTORY_EVIDENCE_BUCKET',
    'BASYX_HISTORY_EVIDENCE_REGION',
    'BASYX_HISTORY_EVIDENCE_PREFIX',
    'BASYX_HISTORY_EVIDENCE_ACCESS_KEY_ID',
    'BASYX_HISTORY_EVIDENCE_SECRET_ACCESS_KEY',
    'BASYX_HISTORY_EVIDENCE_PATH_STYLE',
    'BASYX_HISTORY_EVIDENCE_RETENTION_MODE',
    'BASYX_HISTORY_EVIDENCE_RETENTION_DAYS',
    'BASYX_HISTORY_EVIDENCE_WRITE_TIMEOUT_SECONDS',
  ];

  if (evidenceEnabled.value) {
    Object.assign(values, {
      BASYX_HISTORY_EVIDENCE_PROVIDER: 's3',
      BASYX_HISTORY_EVIDENCE_ENDPOINT: evidenceEndpoint.value.trim(),
      BASYX_HISTORY_EVIDENCE_BUCKET: evidenceBucket.value.trim(),
      BASYX_HISTORY_EVIDENCE_REGION: evidenceRegion.value.trim() || DEFAULTS.region,
      BASYX_HISTORY_EVIDENCE_PREFIX: evidencePrefix.value.trim() || DEFAULTS.prefix,
      BASYX_HISTORY_EVIDENCE_ACCESS_KEY_ID: evidenceAccessKey.value.trim(),
      BASYX_HISTORY_EVIDENCE_SECRET_ACCESS_KEY: evidenceSecretKey.value,
      BASYX_HISTORY_EVIDENCE_PATH_STYLE: String(evidencePathStyle.value),
      BASYX_HISTORY_EVIDENCE_RETENTION_MODE: evidenceRetentionMode.value,
      BASYX_HISTORY_EVIDENCE_RETENTION_DAYS: String(evidenceRetentionDays.value),
      BASYX_HISTORY_EVIDENCE_WRITE_TIMEOUT_SECONDS: '10',
    });
  }

  appStore.updateServiceEnvironment(
    'aas-environment',
    values,
    evidenceEnabled.value ? [] : evidenceKeys
  );
}

function goNext(): void {
  if (!evidenceComplete.value) return;
  applySettings();
  navigateTo('/get-started/behaviour/eventing');
}

function resetToDefaults(): void {
  historyMode.value = DEFAULTS.mode;
  fullSnapshotInterval.value = DEFAULTS.fullSnapshotInterval;
  immutability.value = DEFAULTS.immutability;
  auditIdentityMode.value = DEFAULTS.identityMode;
  evidenceEnabled.value = false;
  evidenceEndpoint.value = DEFAULTS.endpoint;
  evidenceBucket.value = DEFAULTS.bucket;
  evidenceRegion.value = DEFAULTS.region;
  evidencePrefix.value = DEFAULTS.prefix;
  evidenceAccessKey.value = '';
  evidenceSecretKey.value = '';
  evidenceRetentionMode.value = DEFAULTS.retentionMode;
  evidenceRetentionDays.value = DEFAULTS.retentionDays;
  evidencePathStyle.value = false;
  applySettings();
}

watch(compose, syncFromCompose, { immediate: true });
</script>
