<template>
  <v-container class="py-0 px-4 px-sm-8 px-md-12" fluid>
    <v-breadcrumbs class="px-0 pb-0 text-body-2 mb-3" divider="›" :items="breadcrumbs" />
    <h1 class="mb-8 text-header">Time Series Data</h1>
    <p class="text-normalText mt-8 mb-5 text-subtitle-1">
      In the context of Digital Twins and AAS in particular, time series data offers significant
      advantages in the operation of assets. These include, but are not limited to, gaining insight
      into patterns, trends and anomalies in asset behaviour. This information is essential for
      predictive maintenance to minimise downtime and extend asset life.
    </p>
    <p class="text-normalText mt-3 mb-2 text-subtitle-1">
      <a
        class="text-primary"
        style="text-decoration: none"
        href="https://industrialdigitaltwin.org/wp-content/uploads/2023/03/IDTA-02008-1-1_Submodel_TimeSeriesData.pdf"
        target="_blank"
        >Time Series Data</a
      >
      is also an AAS submodel specification. A distinction is made between data within the AAS
      (internal segment), data from files (external segment) and data from time series databases
      (linked segment). The latter requires a database and a tool to collect data from the asset.
    </p>
    <p class="text-normalText mt-3 mb-2 text-subtitle-1">
      Here,
      <a
        class="text-primary"
        style="text-decoration: none"
        href="https://www.influxdata.com/"
        target="_blank"
        >InfluxDB</a
      >
      is used as a time series database, optionally with
      <a
        class="text-primary"
        style="text-decoration: none"
        href="https://www.influxdata.com/time-series-platform/telegraf/"
        target="_blank"
        >Telegraf</a
      >
      as a tool for the collection of metrics.
    </p>

    <v-alert color="primary" variant="outlined" class="bg-alertCard mt-8 mb-8">
      <v-radio-group
        v-model="selection"
        color="primary"
        hide-details
        class="text-normalText font-weight-medium"
      >
        <v-radio label="Don't include time series data from a linked database" value="noTSD" />
        <v-radio label="Include time series data from a linked database" value="addTSD" />
      </v-radio-group>
    </v-alert>

    <v-slide-y-transition>
      <div v-if="selection === 'addTSD'" class="mb-5">
        <v-divider class="mt-12 mb-8" />
        <h2 class="text-header">InfluxDB Settings</h2>
        <p class="text-normalText mt-8 mb-5 text-subtitle-1">
          Include a local InfluxDB container or connect to an existing instance. The API token is
          also passed to the BaSyx UI when it is enabled.
        </p>
        <v-switch
          v-model="includeLocalInfluxdb"
          label="Include local InfluxDB container"
          color="primary"
          hint="Turn off to use an existing InfluxDB instance."
          persistent-hint
          @update:model-value="onInfluxModeChange"
        />

        <v-alert v-if="includeLocalInfluxdb" color="alertCard" class="mt-2 mb-8">
          <v-row align="center">
            <v-col cols="auto" class="pr-0">
              <v-icon color="subheader">mdi-database-cog</v-icon>
            </v-col>
            <v-col>
              <div class="font-weight-medium text-header">What these settings control</div>
            </v-col>
          </v-row>
          <ul class="text-subheader font-weight-medium mt-2 ms-6">
            <li>
              <v-kbd>DOCKER_INFLUXDB_INIT_USERNAME</v-kbd> and
              <v-kbd>DOCKER_INFLUXDB_INIT_PASSWORD</v-kbd> define the bootstrap user.
            </li>
            <li>
              <v-kbd>DOCKER_INFLUXDB_INIT_ORG</v-kbd> and
              <v-kbd>DOCKER_INFLUXDB_INIT_BUCKET</v-kbd> define the default workspace for writes.
            </li>
            <li>
              <v-kbd>DOCKER_INFLUXDB_INIT_ADMIN_TOKEN</v-kbd> is generated and used by integrated
              consumers such as the BaSyx UI.
            </li>
          </ul>
        </v-alert>

        <v-row density="compact">
          <v-col v-if="includeLocalInfluxdb" cols="12" md="6">
            <v-text-field
              v-model="influxInitUsername"
              variant="solo-filled"
              label="DOCKER_INFLUXDB_INIT_USERNAME"
              hide-details="auto"
              hint="Bootstrap username for InfluxDB initialization."
              persistent-hint
            />
          </v-col>
          <v-col v-if="includeLocalInfluxdb" cols="12" md="6">
            <v-text-field
              v-model="influxInitPassword"
              variant="solo-filled"
              label="DOCKER_INFLUXDB_INIT_PASSWORD"
              :type="showInfluxPassword ? 'text' : 'password'"
              :append-inner-icon="showInfluxPassword ? 'mdi-eye-off' : 'mdi-eye'"
              hide-details="auto"
              hint="Bootstrap password for the configured user."
              persistent-hint
              @click:append-inner="showInfluxPassword = !showInfluxPassword"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="influxInitOrg"
              variant="solo-filled"
              :label="includeLocalInfluxdb ? 'DOCKER_INFLUXDB_INIT_ORG' : 'InfluxDB organization'"
              hide-details="auto"
              hint="Default organization created in InfluxDB."
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="influxInitBucket"
              variant="solo-filled"
              :label="includeLocalInfluxdb ? 'DOCKER_INFLUXDB_INIT_BUCKET' : 'InfluxDB bucket'"
              hide-details="auto"
              hint="Default bucket used for time-series data."
              persistent-hint
            />
          </v-col>
          <v-col v-if="!includeLocalInfluxdb" cols="12">
            <v-text-field
              v-model="externalInfluxUrl"
              variant="solo-filled"
              label="External InfluxDB URL"
              placeholder="https://influx.example.org:8086"
              :hint="
                includeTelegraf
                  ? 'Use an address reachable from inside the Telegraf container, not localhost.'
                  : 'Use the address required by your deployed consumers.'
              "
              persistent-hint
              :error="!externalInfluxUrl.trim()"
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="influxInitToken"
              variant="solo-filled"
              :type="showInfluxToken ? 'text' : 'password'"
              :append-inner-icon="showInfluxToken ? 'mdi-eye-off' : 'mdi-eye'"
              :label="
                includeLocalInfluxdb
                  ? 'DOCKER_INFLUXDB_INIT_ADMIN_TOKEN'
                  : 'External InfluxDB API token'
              "
              hide-details="auto"
              :hint="
                includeLocalInfluxdb
                  ? 'Admin token shared with BaSyx UI as INFLUXDB_TOKEN.'
                  : 'Used by configured consumers and shared with BaSyx UI as INFLUXDB_TOKEN.'
              "
              persistent-hint
              :error="!includeLocalInfluxdb && !influxInitToken.trim()"
              @click:append-inner="showInfluxToken = !showInfluxToken"
            />
          </v-col>
        </v-row>

        <v-btn
          class="mt-4 mb-2"
          block
          variant="tonal"
          :disabled="!influxSettingsValid"
          @click="applyInfluxSettings()"
        >
          Apply InfluxDB Settings
        </v-btn>
        <v-btn
          v-if="includeLocalInfluxdb"
          class="mb-2"
          block
          variant="tonal"
          color="secondary"
          @click="regenerateInfluxToken()"
        >
          Regenerate InfluxDB Token
        </v-btn>
        <v-btn
          v-if="includeLocalInfluxdb"
          class="mb-8"
          block
          color="secondary"
          variant="text"
          @click="resetInfluxDefaults()"
        >
          Reset InfluxDB Defaults
        </v-btn>

        <v-alert color="secondary" variant="tonal" class="mb-8">
          <template v-if="includeLocalInfluxdb">
            The Starter Kit automatically adds the local InfluxDB container's HTTP origin to the Web
            UI's trusted origins. If you expose it through an HTTPS reverse proxy, replace this
            entry with the public origin on the next page under
            <strong>Expert: infrastructure endpoint management</strong>.
          </template>
          <template v-else>
            On the next page, open <strong>Expert: infrastructure endpoint management</strong> and
            add the external InfluxDB origin to the trust list. Use its browser-accessible origin if
            that differs from the address reachable inside Telegraf. The API token alone does not
            authorize the Web UI to contact that origin.
          </template>
        </v-alert>

        <v-divider class="mt-12 mb-8" />
        <h2 class="text-header">Metrics Collection</h2>
        <v-switch
          v-model="includeTelegraf"
          label="Include local Telegraf collector"
          color="primary"
          hint="Turn off if no collector is needed or metrics are collected outside this setup."
          persistent-hint
          @update:model-value="onTelegrafModeChange"
        />
        <div v-if="includeTelegraf">
          <p class="text-normalText mt-8 mb-5 text-subtitle-1">
            Telegraf is configured using a configuration file. This file contains the necessary
            information about the asset endpoints that provide data to be stored in the time series
            database.
          </p>
          <p class="text-normalText mt-3 mb-6 text-subtitle-1">
            Edit the starter TOML below or upload an existing <code>telegraf.conf</code>. The
            starter collects Telegraf's own metrics; replace its input plugin with one for your
            asset. The InfluxDB token is passed through an environment variable, not stored in this
            file.
          </p>
          <v-file-input
            v-model="telegrafConfigFile"
            variant="solo-filled"
            prepend-inner-icon="$file"
            prepend-icon=""
            label="Upload telegraf.conf File"
            accept=".conf,.toml,text/plain"
            density="compact"
            hide-details
            @update:model-value="loadTelegrafConf()"
          />
          <label class="d-block mt-5 mb-2 text-body-2">Telegraf configuration (TOML)</label>
          <TelegrafConfigEditor v-model="telegrafConfigText" :error="Boolean(telegrafError)" />
          <p v-if="telegrafError" class="text-error text-body-2 mt-2">{{ telegrafError }}</p>
          <p class="text-medium-emphasis text-caption mt-2">
            TOML syntax and input/output sections are checked here. Plugin-specific options should
            also be checked with Telegraf before deployment.
          </p>
        </div>
      </div>
    </v-slide-y-transition>

    <v-card-actions class="px-0 mb-8">
      <v-btn variant="tonal" prepend-icon="mdi-arrow-left" to="/get-started/behaviour/eventing"
        >Back</v-btn
      >
      <v-spacer />
      <v-btn
        variant="tonal"
        color="primary"
        append-icon="mdi-arrow-right"
        :disabled="
          selection === 'addTSD' &&
          ((includeTelegraf && Boolean(telegrafError)) || !influxSettingsValid)
        "
        @click="goNext"
        >Next</v-btn
      >
    </v-card-actions>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useAppStore } from '@/stores/app';
import { defaultTelegrafConfig, validateTelegrafConfig } from '@/utils/telegrafConfig';

interface BasyxConfigItem {
  id: string;
  title: string;
  children?: BasyxConfigChild[];
}

interface BasyxConfigChild {
  id: string;
  title: string;
  type: string;
}

interface DockerService {
  image?: string;
  container_name?: string;
  ports?: string[];
  volumes?: string[];
  restart?: string;
  depends_on?: string[];
  environment?: Record<string, string> | string[];
  hostname?: string;
}

interface DockerComposeConfigValue {
  [key: string]: unknown;
  services: Record<string, DockerService>;
}

interface InfluxSettings {
  username: string;
  password: string;
  org: string;
  bucket: string;
  token: string;
}

defineOptions({
  name: 'TimeSeries',
});

useSeoMeta({
  title: 'Time Series Data | Eclipse BaSyx™',
  ogTitle: 'Time Series Data | Eclipse BaSyx™',
});

const INFLUX_DEFAULTS = {
  username: 'admin',
  password: 'influxpassword',
  org: 'basyx',
  bucket: 'basyx',
};

const appStore = useAppStore();

const breadcrumbs = ref([
  { title: 'Home', to: '/' },
  { title: 'Get Started', to: '/get-started/introduction' },
  { title: 'Time Series Data', to: '/get-started/behaviour/time-series' },
]);

const selection = computed({
  get: () => (appStore.getTimeSeriesData ? 'addTSD' : 'noTSD'),
  set: value => {
    appStore.updateTimeSeriesData(value === 'addTSD');
  },
});

const telegrafConfigFile = ref<File | undefined>(undefined);
const telegrafConfigText = ref('');
const telegrafError = computed(() =>
  hasMounted.value && includeTelegraf.value
    ? validateTelegrafConfig(telegrafConfigText.value).message
    : undefined
);
const initialServices = (() => {
  const value = appStore.getDockerComposeConfig?.value;
  return value && typeof value === 'object' && 'services' in value
    ? (value.services as Record<string, DockerService>)
    : {};
})();
const storedExternalInfluxSettings = appStore.getExternalInfluxSettings;
const initialExternalEnv =
  initialServices.telegraf && !initialServices.influxdb
    ? getInfluxEnvAsArray(initialServices.telegraf)
    : [];
const initialLocalEnv = initialServices.influxdb
  ? getInfluxEnvAsArray(initialServices.influxdb)
  : [];
const initialExternalSettings = appStore.getIncludeLocalInfluxDb
  ? { url: '', org: '', bucket: '', token: '' }
  : storedExternalInfluxSettings;
const includeLocalInfluxdb = ref(appStore.getIncludeLocalInfluxDb);
const includeTelegraf = ref(appStore.getIncludeTelegraf);
const externalInfluxUrl = ref(
  initialExternalSettings.url || getEnvVar(initialExternalEnv, 'INFLUX_URL', '')
);
const influxSettingsValid = computed(
  () =>
    includeLocalInfluxdb.value ||
    (Boolean(externalInfluxUrl.value.trim()) && Boolean(influxInitToken.value.trim()))
);
const influxInitUsername = ref(
  getEnvVar(initialLocalEnv, 'DOCKER_INFLUXDB_INIT_USERNAME', INFLUX_DEFAULTS.username)
);
const influxInitPassword = ref(
  getEnvVar(initialLocalEnv, 'DOCKER_INFLUXDB_INIT_PASSWORD', INFLUX_DEFAULTS.password)
);
const influxInitOrg = ref(
  getEnvVar(
    initialLocalEnv,
    'DOCKER_INFLUXDB_INIT_ORG',
    initialExternalSettings.org || getEnvVar(initialExternalEnv, 'INFLUX_ORG', INFLUX_DEFAULTS.org)
  )
);
const influxInitBucket = ref(
  getEnvVar(
    initialLocalEnv,
    'DOCKER_INFLUXDB_INIT_BUCKET',
    initialExternalSettings.bucket ||
      getEnvVar(initialExternalEnv, 'INFLUX_BUCKET', INFLUX_DEFAULTS.bucket)
  )
);
const influxInitToken = ref(
  getEnvVar(
    initialLocalEnv,
    'DOCKER_INFLUXDB_INIT_ADMIN_TOKEN',
    initialExternalSettings.token || getEnvVar(initialExternalEnv, 'INFLUX_TOKEN', '')
  )
);
const showInfluxPassword = ref(false);
const showInfluxToken = ref(false);
const hasMounted = ref(false);

const basyxConfig = computed(() => appStore.getBasyxConfig);
const isUIEnabled = computed(() => appStore.getUserInterface);
const telegrafConfigStore = computed(() => appStore.getTelegrafConf);
const dockerComposeConfigObject = computed(() => appStore.getDockerComposeConfig);

watch(
  () => appStore.getTimeSeriesData,
  enabled => {
    updateConfig(enabled);
  },
  { immediate: true }
);

watch(telegrafConfigText, text => {
  appStore.setTelegrafConf(
    !includeTelegraf.value || validateTelegrafConfig(text).message
      ? undefined
      : new File([text], 'telegraf.conf', { type: 'text/plain' })
  );
});

watch(
  () => dockerComposeConfigObject.value?.value,
  () => {
    syncInfluxSettingsFromCompose();
  },
  { immediate: true }
);

onMounted(async () => {
  hasMounted.value = true;
  ensureInfluxTokenAfterHydration();
  if (telegrafConfigStore.value) {
    telegrafConfigFile.value = telegrafConfigStore.value;
    telegrafConfigText.value = await telegrafConfigStore.value.text();
  } else {
    telegrafConfigText.value = defaultTelegrafConfig();
  }
  if (!includeTelegraf.value) {
    appStore.setTelegrafConf(undefined);
  }
});

function createInfluxToken(): string {
  const bytes = new Uint8Array(32);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function getEnvVar(env: string[], key: string, fallback: string): string {
  const prefix = `${key}=`;
  const entry = env.find(item => item.startsWith(prefix));
  if (!entry) {
    return fallback;
  }
  return entry.slice(prefix.length);
}

function setEnvVar(env: string[], key: string, value: string): void {
  const prefix = `${key}=`;
  const index = env.findIndex(item => item.startsWith(prefix));
  if (index >= 0) {
    env[index] = `${key}=${value}`;
    return;
  }
  env.push(`${key}=${value}`);
}

function getDockerServices(): {
  localDockerComposeConfig: { name?: string; value?: string | Record<string, unknown> };
  dockerComposeConfig: DockerComposeConfigValue;
  services: Record<string, DockerService>;
} | null {
  if (!dockerComposeConfigObject.value) {
    return null;
  }

  const localDockerComposeConfig = { ...dockerComposeConfigObject.value };
  const dockerComposeConfig = localDockerComposeConfig.value;
  if (
    !dockerComposeConfig ||
    typeof dockerComposeConfig === 'string' ||
    !dockerComposeConfig.services
  ) {
    return null;
  }

  const typedDockerComposeConfig = dockerComposeConfig as DockerComposeConfigValue;
  return {
    localDockerComposeConfig,
    dockerComposeConfig: typedDockerComposeConfig,
    services: typedDockerComposeConfig.services,
  };
}

function getInfluxEnvAsArray(service: DockerService): string[] {
  if (Array.isArray(service.environment)) {
    return service.environment;
  }

  if (service.environment && typeof service.environment === 'object') {
    const envArray = Object.entries(service.environment).map(([key, value]) => `${key}=${value}`);
    service.environment = envArray;
    return envArray;
  }

  const envArray: string[] = [];
  service.environment = envArray;
  return envArray;
}

function normalizeInfluxSettings(): InfluxSettings {
  const token = influxInitToken.value.trim();
  influxInitToken.value = token;

  return {
    username: influxInitUsername.value.trim() || INFLUX_DEFAULTS.username,
    password: influxInitPassword.value || INFLUX_DEFAULTS.password,
    org: influxInitOrg.value.trim() || INFLUX_DEFAULTS.org,
    bucket: influxInitBucket.value.trim() || INFLUX_DEFAULTS.bucket,
    token,
  };
}

function syncAasUiInfluxToken(services: Record<string, DockerService>, token: string): void {
  if (!isUIEnabled.value || !services['aas-ui']) {
    return;
  }

  const aasUi = services['aas-ui'];
  if (!aasUi.environment) {
    aasUi.environment = {};
  }

  if (Array.isArray(aasUi.environment)) {
    setEnvVar(aasUi.environment, 'INFLUXDB_TOKEN', token);
    return;
  }

  aasUi.environment.INFLUXDB_TOKEN = token;
}

function syncTelegrafInfluxSettings(services: Record<string, DockerService>, token: string): void {
  const telegraf = services.telegraf;
  if (!telegraf) return;
  const environment = getInfluxEnvAsArray(telegraf);
  setEnvVar(
    environment,
    'INFLUX_URL',
    includeLocalInfluxdb.value ? 'http://influxdb:8086' : externalInfluxUrl.value.trim()
  );
  setEnvVar(environment, 'INFLUX_TOKEN', token);
  setEnvVar(environment, 'INFLUX_ORG', influxInitOrg.value.trim());
  setEnvVar(environment, 'INFLUX_BUCKET', influxInitBucket.value.trim());
  if (includeLocalInfluxdb.value) telegraf.depends_on = ['influxdb'];
  else delete telegraf.depends_on;
}

function removeAasUiInfluxToken(services: Record<string, DockerService>): void {
  if (!isUIEnabled.value || !services['aas-ui']?.environment) {
    return;
  }

  const aasUiEnv = services['aas-ui'].environment;
  if (Array.isArray(aasUiEnv)) {
    const tokenVarIndex = aasUiEnv.findIndex(item => item.startsWith('INFLUXDB_TOKEN='));
    if (tokenVarIndex >= 0) {
      aasUiEnv.splice(tokenVarIndex, 1);
    }
    return;
  }

  delete aasUiEnv.INFLUXDB_TOKEN;
}

function upsertInfluxService(
  services: Record<string, DockerService>,
  settings: InfluxSettings,
  createFreshTokenIfMissing: boolean
): void {
  if (!services['influxdb']) {
    if (createFreshTokenIfMissing && hasMounted.value) {
      settings.token = createInfluxToken();
      influxInitToken.value = settings.token;
    }

    services['influxdb'] = {
      image: 'influxdb:2',
      container_name: 'influxdb',
      ports: ['8086:8086', '9999:9999'],
      volumes: ['./influxdb/data:/var/lib/influxdb2', './influxdb/config:/etc/influxdb2'],
      environment: [
        'DOCKER_INFLUXDB_INIT_MODE=setup',
        `DOCKER_INFLUXDB_INIT_USERNAME=${settings.username}`,
        `DOCKER_INFLUXDB_INIT_PASSWORD=${settings.password}`,
        `DOCKER_INFLUXDB_INIT_ORG=${settings.org}`,
        `DOCKER_INFLUXDB_INIT_BUCKET=${settings.bucket}`,
        `DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=${settings.token}`,
      ],
      restart: 'always',
    };
    return;
  }

  const influxdbService = services['influxdb'];
  if (!influxdbService.ports) {
    influxdbService.ports = ['8086:8086', '9999:9999'];
  }
  if (!influxdbService.volumes) {
    influxdbService.volumes = [
      './influxdb/data:/var/lib/influxdb2',
      './influxdb/config:/etc/influxdb2',
    ];
  }
  if (!influxdbService.restart) {
    influxdbService.restart = 'always';
  }

  const env = getInfluxEnvAsArray(influxdbService);
  const currentToken = getEnvVar(env, 'DOCKER_INFLUXDB_INIT_ADMIN_TOKEN', '');
  const finalToken =
    settings.token ||
    currentToken ||
    (createFreshTokenIfMissing && hasMounted.value ? createInfluxToken() : '');
  influxInitToken.value = finalToken;

  setEnvVar(env, 'DOCKER_INFLUXDB_INIT_MODE', 'setup');
  setEnvVar(env, 'DOCKER_INFLUXDB_INIT_USERNAME', settings.username);
  setEnvVar(env, 'DOCKER_INFLUXDB_INIT_PASSWORD', settings.password);
  setEnvVar(env, 'DOCKER_INFLUXDB_INIT_ORG', settings.org);
  setEnvVar(env, 'DOCKER_INFLUXDB_INIT_BUCKET', settings.bucket);
  setEnvVar(env, 'DOCKER_INFLUXDB_INIT_ADMIN_TOKEN', finalToken);
}

function syncInfluxSettingsFromCompose(): void {
  const compose = getDockerServices();
  if (!compose) {
    return;
  }

  const influxService = compose.services['influxdb'];
  if (!influxService) {
    const stored = appStore.getExternalInfluxSettings;
    const env = compose.services.telegraf ? getInfluxEnvAsArray(compose.services.telegraf) : [];
    const url = stored.url || getEnvVar(env, 'INFLUX_URL', '');
    externalInfluxUrl.value = url;
    influxInitOrg.value = stored.org || getEnvVar(env, 'INFLUX_ORG', INFLUX_DEFAULTS.org);
    influxInitBucket.value =
      stored.bucket || getEnvVar(env, 'INFLUX_BUCKET', INFLUX_DEFAULTS.bucket);
    influxInitToken.value = stored.token || getEnvVar(env, 'INFLUX_TOKEN', '');
    return;
  }

  includeLocalInfluxdb.value = true;

  const env = getInfluxEnvAsArray(influxService);
  influxInitUsername.value = getEnvVar(
    env,
    'DOCKER_INFLUXDB_INIT_USERNAME',
    INFLUX_DEFAULTS.username
  );
  influxInitPassword.value = getEnvVar(
    env,
    'DOCKER_INFLUXDB_INIT_PASSWORD',
    INFLUX_DEFAULTS.password
  );
  influxInitOrg.value = getEnvVar(env, 'DOCKER_INFLUXDB_INIT_ORG', INFLUX_DEFAULTS.org);
  influxInitBucket.value = getEnvVar(env, 'DOCKER_INFLUXDB_INIT_BUCKET', INFLUX_DEFAULTS.bucket);
  influxInitToken.value = getEnvVar(env, 'DOCKER_INFLUXDB_INIT_ADMIN_TOKEN', '');
}

function addInfluxDBToDockerCompose(createFreshTokenIfMissing = true): void {
  const compose = getDockerServices();
  if (!compose) {
    return;
  }

  const settings = normalizeInfluxSettings();
  if (includeLocalInfluxdb.value)
    upsertInfluxService(compose.services, settings, createFreshTokenIfMissing);
  else {
    delete compose.services.influxdb;
    appStore.updateExternalInfluxSettings({
      url: externalInfluxUrl.value,
      org: settings.org,
      bucket: settings.bucket,
      token: settings.token,
    });
  }

  const influxService = compose.services.influxdb;
  const env = influxService ? getInfluxEnvAsArray(influxService) : [];
  const token = includeLocalInfluxdb.value
    ? getEnvVar(env, 'DOCKER_INFLUXDB_INIT_ADMIN_TOKEN', settings.token)
    : settings.token;
  syncAasUiInfluxToken(compose.services, token);
  syncTelegrafInfluxSettings(compose.services, token);

  compose.localDockerComposeConfig.value = compose.dockerComposeConfig;
  appStore.setDockerComposeConfig(compose.localDockerComposeConfig);
}

function ensureInfluxTokenAfterHydration(): void {
  if (!appStore.getTimeSeriesData || !includeLocalInfluxdb.value || influxInitToken.value.trim()) {
    return;
  }

  influxInitToken.value = createInfluxToken();
  addInfluxDBToDockerCompose(false);
}

function removeInfluxDBFromDockerCompose(): void {
  const compose = getDockerServices();
  if (!compose) {
    return;
  }

  if (compose.services['influxdb']) {
    delete compose.services['influxdb'];
  }

  removeAasUiInfluxToken(compose.services);

  compose.localDockerComposeConfig.value = compose.dockerComposeConfig;
  appStore.setDockerComposeConfig(compose.localDockerComposeConfig);
}

function addTelegrafToDockerCompose(): void {
  const compose = getDockerServices();
  if (!compose) {
    return;
  }

  if (!compose.services['telegraf']) {
    compose.services['telegraf'] = {
      image: 'telegraf:1.29.1',
      container_name: 'telegraf',
      volumes: ['./telegraf/telegraf.conf:/etc/telegraf/telegraf.conf:ro'],
      hostname: 'basyx_host',
      restart: 'always',
      ...(includeLocalInfluxdb.value ? { depends_on: ['influxdb'] } : {}),
      environment: [],
    };
  }
  syncTelegrafInfluxSettings(compose.services, influxInitToken.value);
  compose.localDockerComposeConfig.value = compose.dockerComposeConfig;
  appStore.setDockerComposeConfig(compose.localDockerComposeConfig);
}

function removeTelegrafFromDockerCompose(): void {
  const compose = getDockerServices();
  if (!compose) {
    return;
  }

  if (compose.services['telegraf']) {
    delete compose.services['telegraf'];
    compose.localDockerComposeConfig.value = compose.dockerComposeConfig;
    appStore.setDockerComposeConfig(compose.localDockerComposeConfig);
  }
}

function applyInfluxSettings(): void {
  if (!influxSettingsValid.value) return;
  if (!appStore.getTimeSeriesData) {
    appStore.updateTimeSeriesData(true);
  }
  addInfluxDBToDockerCompose(false);
}

function goNext(): void {
  if (selection.value === 'addTSD') {
    if ((includeTelegraf.value && telegrafError.value) || !influxSettingsValid.value) return;
    applyInfluxSettings();
  }
  navigateTo('/get-started/visualization/ui');
}

function onInfluxModeChange(): void {
  // An external provider must supply its own token; never reuse a generated local admin token.
  appStore.updateIncludeLocalInfluxDb(includeLocalInfluxdb.value);
  influxInitToken.value = includeLocalInfluxdb.value ? createInfluxToken() : '';
  if (appStore.getTimeSeriesData) {
    addInfluxDBToDockerCompose(false);
    if (includeTelegraf.value) addTelegrafToDockerCompose();
    else removeTelegrafFromDockerCompose();
    updateInfluxConfigItem();
  }
}

function onTelegrafModeChange(): void {
  appStore.updateIncludeTelegraf(includeTelegraf.value);
  if (!appStore.getTimeSeriesData) return;

  addInfluxDBToDockerCompose(false);
  if (includeTelegraf.value) {
    addTelegrafToDockerCompose();
    if (!telegrafConfigText.value) telegrafConfigText.value = defaultTelegrafConfig();
    if (!validateTelegrafConfig(telegrafConfigText.value).message) {
      appStore.setTelegrafConf(
        new File([telegrafConfigText.value], 'telegraf.conf', { type: 'text/plain' })
      );
    }
  } else {
    removeTelegrafFromDockerCompose();
    appStore.setTelegrafConf(undefined);
  }
  updateTelegrafConfigItem();
}

function regenerateInfluxToken(): void {
  influxInitToken.value = createInfluxToken();
  if (appStore.getTimeSeriesData) {
    addInfluxDBToDockerCompose(false);
  }
}

function resetInfluxDefaults(): void {
  influxInitUsername.value = INFLUX_DEFAULTS.username;
  influxInitPassword.value = INFLUX_DEFAULTS.password;
  influxInitOrg.value = INFLUX_DEFAULTS.org;
  influxInitBucket.value = INFLUX_DEFAULTS.bucket;
  influxInitToken.value = createInfluxToken();
  if (appStore.getTimeSeriesData) {
    addInfluxDBToDockerCompose(false);
  }
}

function updateInfluxConfigItem(): void {
  const items = basyxConfig.value.filter((item: BasyxConfigItem) => item.id !== 'comp-influxdb');
  if (appStore.getTimeSeriesData && includeLocalInfluxdb.value) {
    items.push({
      id: 'comp-influxdb',
      title: 'InfluxDB',
      children: [
        { id: 'ovw-influxdb-summary', title: 'Runtime & Storage', type: 'overview' },
        { id: 'cfg-influxdb', title: 'Docker', type: 'config' },
      ],
    });
  }
  appStore.updateBasyxConfig(items);
}

function updateTelegrafConfigItem(): void {
  const items = basyxConfig.value.filter((item: BasyxConfigItem) => item.id !== 'comp-telegraf');
  if (appStore.getTimeSeriesData && includeTelegraf.value) {
    items.push({
      id: 'comp-telegraf',
      title: 'Telegraf',
      children: [
        { id: 'ovw-telegraf-summary', title: 'Collector Setup', type: 'overview' },
        { id: 'cfg-telegraf', title: 'Docker', type: 'config' },
      ],
    });
  }
  appStore.updateBasyxConfig(items);
}

async function loadTelegrafConf(): Promise<void> {
  const file = telegrafConfigFile.value;
  if (file) telegrafConfigText.value = await file.text();
}

function updateConfig(enabled = appStore.getTimeSeriesData): void {
  if (enabled) {
    addInfluxDBToDockerCompose(true);
    if (includeTelegraf.value) addTelegrafToDockerCompose();
    else removeTelegrafFromDockerCompose();

    const basyxConfigCopy = [...basyxConfig.value];

    if (
      includeLocalInfluxdb.value &&
      !basyxConfigCopy.some((item: BasyxConfigItem) => item.id === 'comp-influxdb')
    ) {
      basyxConfigCopy.push({
        id: 'comp-influxdb',
        title: 'InfluxDB',
        children: [
          {
            id: 'ovw-influxdb-summary',
            title: 'Runtime & Storage',
            type: 'overview',
          },
          {
            id: 'cfg-influxdb',
            title: 'Docker',
            type: 'config',
          },
        ],
      });
    }
    if (!includeLocalInfluxdb.value) {
      const index = basyxConfigCopy.findIndex(item => item.id === 'comp-influxdb');
      if (index !== -1) basyxConfigCopy.splice(index, 1);
    }

    if (
      includeTelegraf.value &&
      !basyxConfigCopy.some((item: BasyxConfigItem) => item.id === 'comp-telegraf')
    ) {
      basyxConfigCopy.push({
        id: 'comp-telegraf',
        title: 'Telegraf',
        children: [
          {
            id: 'ovw-telegraf-summary',
            title: 'Collector Setup',
            type: 'overview',
          },
          {
            id: 'cfg-telegraf',
            title: 'Docker',
            type: 'config',
          },
        ],
      });
    }
    if (!includeTelegraf.value) {
      const index = basyxConfigCopy.findIndex(item => item.id === 'comp-telegraf');
      if (index !== -1) basyxConfigCopy.splice(index, 1);
    }

    appStore.updateBasyxConfig(basyxConfigCopy);
  } else {
    removeInfluxDBFromDockerCompose();
    removeTelegrafFromDockerCompose();

    let basyxConfigCopy = [...basyxConfig.value];
    basyxConfigCopy = basyxConfigCopy.filter(
      (item: BasyxConfigItem) => item.id !== 'comp-influxdb'
    );
    basyxConfigCopy = basyxConfigCopy.filter(
      (item: BasyxConfigItem) => item.id !== 'comp-telegraf'
    );

    appStore.updateBasyxConfig(basyxConfigCopy);
  }
}
</script>
