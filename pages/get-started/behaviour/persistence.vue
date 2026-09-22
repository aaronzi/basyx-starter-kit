<template>
  <v-container class="py-0 px-4 px-sm-8 px-md-12" fluid>
    <v-breadcrumbs class="px-0 pb-0 text-body-2 mb-3" divider="›" :items="breadcrumbs" />
    <h1 class="mb-8 text-header">Persistence Backend</h1>
    <p class="text-normalText mt-8 mb-5 text-subtitle-1">
      The Go-based setup uses PostgreSQL as the persistence backend for BaSyx core services.
    </p>
    <p class="text-normalText mt-3 mb-2 text-subtitle-1">
      Configure the PostgreSQL connection and pool settings below. These values are written to the
      AAS Environment and Configuration Service environment variables.
    </p>

    <v-switch
      v-model="includeLocalDatabase"
      color="primary"
      label="Include a local PostgreSQL container"
      hint="Turn off to use an existing PostgreSQL server. The connection fields below remain available."
      persistent-hint
      @update:model-value="onDatabaseModeChanged"
    />

    <v-alert color="alertCard" class="mt-8 mb-8">
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
          <v-kbd>POSTGRES_HOST</v-kbd> and <v-kbd>POSTGRES_PORT</v-kbd> define the database
          endpoint.
        </li>
        <li>
          <v-kbd>POSTGRES_DBNAME</v-kbd>, <v-kbd>POSTGRES_USER</v-kbd>, and
          <v-kbd>POSTGRES_PASSWORD</v-kbd> define credentials.
        </li>
        <li><v-kbd>POSTGRES_MAXOPENCONNECTIONS</v-kbd> limits total open DB connections.</li>
        <li>
          <v-kbd>POSTGRES_MAXIDLECONNECTIONS</v-kbd> controls how many idle connections are kept.
        </li>
        <li>
          <v-kbd>POSTGRES_CONNMAXLIFETIMEMINUTES</v-kbd> sets how long a connection can be reused.
        </li>
      </ul>
    </v-alert>

    <v-divider class="mt-12 mb-8" />
    <h2 class="text-header">PostgreSQL Settings</h2>
    <v-row class="mt-4" density="compact">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="postgresHost"
          variant="solo-filled"
          label="POSTGRES_HOST"
          :disabled="includeLocalDatabase"
          hide-details="auto"
          hint="Hostname of the PostgreSQL service (usually db)."
          persistent-hint
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-number-input
          v-model="postgresPort"
          variant="solo-filled"
          label="POSTGRES_PORT"
          :disabled="includeLocalDatabase"
          hide-details="auto"
          hint="PostgreSQL port used by BaSyx components."
          persistent-hint
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="postgresDbName"
          variant="solo-filled"
          label="POSTGRES_DBNAME"
          hide-details="auto"
          hint="Database name used by BaSyx."
          persistent-hint
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="postgresUser"
          variant="solo-filled"
          label="POSTGRES_USER"
          hide-details="auto"
          hint="Database user account."
          persistent-hint
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="postgresPassword"
          variant="solo-filled"
          label="POSTGRES_PASSWORD"
          :type="showPostgresPassword ? 'text' : 'password'"
          :append-inner-icon="showPostgresPassword ? 'mdi-eye-off' : 'mdi-eye'"
          hide-details="auto"
          hint="Password for the configured database user."
          persistent-hint
          @click:append-inner="showPostgresPassword = !showPostgresPassword"
        />
      </v-col>
    </v-row>

    <v-expansion-panels class="setup-config-panels mt-6">
      <v-expansion-panel title="Expert: connection pool, TLS, and schema">
        <v-expansion-panel-text>
          <v-row density="compact">
            <v-col cols="12" md="4">
              <v-number-input
                v-model="postgresMaxOpenConnections"
                variant="solo-filled"
                label="POSTGRES_MAXOPENCONNECTIONS"
                hide-details="auto"
                hint="Upper limit for concurrent open DB connections."
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-number-input
                v-model="postgresMaxIdleConnections"
                variant="solo-filled"
                label="POSTGRES_MAXIDLECONNECTIONS"
                hide-details="auto"
                hint="How many idle connections stay pooled."
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-number-input
                v-model="postgresConnectionLifetimeMinutes"
                variant="solo-filled"
                label="POSTGRES_CONNMAXLIFETIMEMINUTES"
                hide-details="auto"
                hint="Maximum connection lifetime in minutes."
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="postgresSslMode"
                :items="postgresSslModes"
                variant="solo-filled"
                label="POSTGRES_SSLMODE"
                hide-details="auto"
                hint="Use verify-full for production TLS with hostname verification."
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-number-input
                v-model="postgresConnectTimeoutSeconds"
                variant="solo-filled"
                label="POSTGRES_CONNECTTIMEOUTSECONDS"
                :min="0"
                hide-details="auto"
                hint="0 uses the PostgreSQL driver default."
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-number-input
                v-model="postgresConnectionIdleMinutes"
                variant="solo-filled"
                label="POSTGRES_CONNMAXIDLETIMEMINUTES"
                :min="0"
                hide-details="auto"
                hint="0 disables idle-time recycling."
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="postgresSearchPath"
                variant="solo-filled"
                label="POSTGRES_SEARCHPATH"
                hide-details="auto"
                hint="Optional PostgreSQL schema search path."
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="postgresTimezone"
                variant="solo-filled"
                label="POSTGRES_TIMEZONE"
                hide-details="auto"
                hint="Optional session timezone, for example UTC."
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-btn
      class="mt-6 mb-2"
      block
      variant="tonal"
      :disabled="!externalPasswordValid"
      @click="applyPersistenceSettings()"
    >
      Apply Persistence Settings
    </v-btn>
    <v-alert v-if="!externalPasswordValid" type="error" variant="tonal" class="mb-6">
      Enter the external PostgreSQL password before applying these settings.
    </v-alert>
    <v-btn class="mb-8" block color="secondary" variant="text" @click="resetToDefaults()">
      Reset To Defaults
    </v-btn>

    <v-card-actions class="px-0 mb-8">
      <v-btn variant="tonal" prepend-icon="mdi-arrow-left" to="/get-started/behaviour/runtime"
        >Back</v-btn
      >
      <v-spacer />
      <v-btn
        variant="tonal"
        color="primary"
        append-icon="mdi-arrow-right"
        :disabled="!externalPasswordValid"
        @click="goNext"
      >
        Next
      </v-btn>
    </v-card-actions>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAppStore } from '@/stores/app';
import { localPostgresService } from '@/utils/localStacks';

interface DockerService {
  environment?: Record<string, string> | string[];
}

defineOptions({
  name: 'Persistence',
});

useSeoMeta({
  title: 'Persistence Backend | Eclipse BaSyx™',
  ogTitle: 'Persistence Backend | Eclipse BaSyx™',
});

const DEFAULTS = {
  host: 'db',
  port: '5432',
  dbName: 'basyxTestDB',
  user: 'admin',
  password: 'admin123',
  maxOpen: '50',
  maxIdle: '25',
  maxLifetimeMinutes: '5',
  maxIdleTimeMinutes: '0',
  sslMode: 'disable',
  connectTimeoutSeconds: '0',
  searchPath: '',
  timezone: '',
};

const appStore = useAppStore();

const breadcrumbs = ref([
  { title: 'Home', to: '/' },
  { title: 'Get Started', to: '/get-started/introduction' },
  { title: 'Persistence Backend', to: '/get-started/behaviour/persistence' },
]);

const dockerComposeConfigObject = computed(() => appStore.getDockerComposeConfig);

const postgresHost = ref(DEFAULTS.host);
const includeLocalDatabase = ref(true);
const postgresPort = ref(Number(DEFAULTS.port));
const postgresDbName = ref(DEFAULTS.dbName);
const postgresUser = ref(DEFAULTS.user);
const postgresPassword = ref(DEFAULTS.password);
const externalPasswordValid = computed(
  () => includeLocalDatabase.value || Boolean(postgresPassword.value.trim())
);
const showPostgresPassword = ref(false);
const postgresMaxOpenConnections = ref(Number(DEFAULTS.maxOpen));
const postgresMaxIdleConnections = ref(Number(DEFAULTS.maxIdle));
const postgresConnectionLifetimeMinutes = ref(Number(DEFAULTS.maxLifetimeMinutes));
const postgresConnectionIdleMinutes = ref(Number(DEFAULTS.maxIdleTimeMinutes));
const postgresSslMode = ref(DEFAULTS.sslMode);
const postgresConnectTimeoutSeconds = ref(Number(DEFAULTS.connectTimeoutSeconds));
const postgresSearchPath = ref(DEFAULTS.searchPath);
const postgresTimezone = ref(DEFAULTS.timezone);
const postgresSslModes = ['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'];

function onDatabaseModeChanged(value: boolean | null): void {
  if (value) {
    postgresHost.value = 'db';
    postgresPort.value = 5432;
  }
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

function syncFromCompose(): void {
  const compose = dockerComposeConfigObject.value?.value;
  if (!compose || typeof compose !== 'object' || !('services' in compose)) {
    return;
  }

  const services = compose.services as Record<string, DockerService>;
  includeLocalDatabase.value = Boolean(services.db);
  const aasEnvService = services['aas-environment'];
  if (!aasEnvService?.environment || !Array.isArray(aasEnvService.environment)) {
    return;
  }

  postgresHost.value = getEnvVar(aasEnvService.environment, 'POSTGRES_HOST', DEFAULTS.host);
  postgresPort.value = Number(getEnvVar(aasEnvService.environment, 'POSTGRES_PORT', DEFAULTS.port));
  postgresDbName.value = getEnvVar(aasEnvService.environment, 'POSTGRES_DBNAME', DEFAULTS.dbName);
  postgresUser.value = getEnvVar(aasEnvService.environment, 'POSTGRES_USER', DEFAULTS.user);
  postgresPassword.value = getEnvVar(
    aasEnvService.environment,
    'POSTGRES_PASSWORD',
    includeLocalDatabase.value ? DEFAULTS.password : ''
  );
  postgresMaxOpenConnections.value = Number(
    getEnvVar(aasEnvService.environment, 'POSTGRES_MAXOPENCONNECTIONS', DEFAULTS.maxOpen)
  );
  postgresMaxIdleConnections.value = Number(
    getEnvVar(aasEnvService.environment, 'POSTGRES_MAXIDLECONNECTIONS', DEFAULTS.maxIdle)
  );
  postgresConnectionLifetimeMinutes.value = Number(
    getEnvVar(
      aasEnvService.environment,
      'POSTGRES_CONNMAXLIFETIMEMINUTES',
      DEFAULTS.maxLifetimeMinutes
    )
  );
  postgresConnectionIdleMinutes.value = Number(
    getEnvVar(
      aasEnvService.environment,
      'POSTGRES_CONNMAXIDLETIMEMINUTES',
      DEFAULTS.maxIdleTimeMinutes
    )
  );
  postgresSslMode.value = getEnvVar(
    aasEnvService.environment,
    'POSTGRES_SSLMODE',
    DEFAULTS.sslMode
  );
  postgresConnectTimeoutSeconds.value = Number(
    getEnvVar(
      aasEnvService.environment,
      'POSTGRES_CONNECTTIMEOUTSECONDS',
      DEFAULTS.connectTimeoutSeconds
    )
  );
  postgresSearchPath.value = getEnvVar(
    aasEnvService.environment,
    'POSTGRES_SEARCHPATH',
    DEFAULTS.searchPath
  );
  postgresTimezone.value = getEnvVar(
    aasEnvService.environment,
    'POSTGRES_TIMEZONE',
    DEFAULTS.timezone
  );
}

watch(
  () => dockerComposeConfigObject.value?.value,
  () => {
    syncFromCompose();
  },
  { immediate: true }
);

function applyPersistenceSettings(): void {
  if (!externalPasswordValid.value) return;
  if (
    !dockerComposeConfigObject.value?.value ||
    typeof dockerComposeConfigObject.value.value !== 'object'
  ) {
    return;
  }

  const localDockerComposeConfig = JSON.parse(
    JSON.stringify(dockerComposeConfigObject.value)
  ) as typeof dockerComposeConfigObject.value;
  const dockerConfig = localDockerComposeConfig.value as {
    services: Record<string, DockerService>;
  };

  const services = dockerConfig.services;
  const aasEnvService = services['aas-environment'];
  const configurationService = services['basyx_configuration'];
  const postgresService = services.db;

  if (
    !aasEnvService ||
    !configurationService ||
    !Array.isArray(aasEnvService.environment) ||
    !Array.isArray(configurationService.environment)
  ) {
    return;
  }

  const values = {
    host: includeLocalDatabase.value ? 'db' : postgresHost.value.trim() || DEFAULTS.host,
    port: includeLocalDatabase.value ? '5432' : String(postgresPort.value || Number(DEFAULTS.port)),
    dbName: postgresDbName.value.trim() || DEFAULTS.dbName,
    user: postgresUser.value.trim() || DEFAULTS.user,
    password: postgresPassword.value || DEFAULTS.password,
    maxOpen: String(postgresMaxOpenConnections.value || Number(DEFAULTS.maxOpen)),
    maxIdle: String(postgresMaxIdleConnections.value || Number(DEFAULTS.maxIdle)),
    maxLifetimeMinutes: String(
      postgresConnectionLifetimeMinutes.value || Number(DEFAULTS.maxLifetimeMinutes)
    ),
    maxIdleTimeMinutes: String(Math.max(0, postgresConnectionIdleMinutes.value)),
    sslMode: postgresSslMode.value,
    connectTimeoutSeconds: String(Math.max(0, postgresConnectTimeoutSeconds.value)),
    searchPath: postgresSearchPath.value.trim(),
    timezone: postgresTimezone.value.trim(),
  };

  const envTargets = [aasEnvService.environment, configurationService.environment];
  envTargets.forEach(env => {
    setEnvVar(env, 'POSTGRES_HOST', values.host);
    setEnvVar(env, 'POSTGRES_PORT', values.port);
    setEnvVar(env, 'POSTGRES_DBNAME', values.dbName);
    setEnvVar(env, 'POSTGRES_USER', values.user);
    setEnvVar(env, 'POSTGRES_PASSWORD', values.password);
    setEnvVar(env, 'POSTGRES_MAXOPENCONNECTIONS', values.maxOpen);
    setEnvVar(env, 'POSTGRES_MAXIDLECONNECTIONS', values.maxIdle);
    setEnvVar(env, 'POSTGRES_CONNMAXLIFETIMEMINUTES', values.maxLifetimeMinutes);
    setEnvVar(env, 'POSTGRES_CONNMAXIDLETIMEMINUTES', values.maxIdleTimeMinutes);
    setEnvVar(env, 'POSTGRES_SSLMODE', values.sslMode);
    setEnvVar(env, 'POSTGRES_CONNECTTIMEOUTSECONDS', values.connectTimeoutSeconds);
    setEnvVar(env, 'POSTGRES_SEARCHPATH', values.searchPath);
    setEnvVar(env, 'POSTGRES_TIMEZONE', values.timezone);
  });

  if (postgresService?.environment && !Array.isArray(postgresService.environment)) {
    postgresService.environment.POSTGRES_USER = values.user;
    postgresService.environment.POSTGRES_PASSWORD = values.password;
    postgresService.environment.POSTGRES_DB = values.dbName;
  }

  if (includeLocalDatabase.value) {
    if (!postgresService) {
      services.db = localPostgresService(values.user, values.password, values.dbName);
    }
    (
      configurationService as DockerService & { depends_on?: Record<string, { condition: string }> }
    ).depends_on = {
      ...((
        configurationService as DockerService & {
          depends_on?: Record<string, { condition: string }>;
        }
      ).depends_on || {}),
      db: { condition: 'service_healthy' },
    };
  } else {
    delete services.db;
    const configWithDependencies = configurationService as DockerService & {
      depends_on?: Record<string, { condition: string }>;
    };
    if (configWithDependencies.depends_on) {
      configWithDependencies.depends_on = Object.fromEntries(
        Object.entries(configWithDependencies.depends_on).filter(([name]) => name !== 'db')
      );
    }
  }

  const keycloak = services.keycloak as
    (DockerService & { depends_on?: Record<string, { condition: string }> }) | undefined;
  if (keycloak) {
    keycloak.environment = {
      ...(Array.isArray(keycloak.environment)
        ? Object.fromEntries(
            keycloak.environment
              .filter(entry => entry.includes('='))
              .map(entry => [
                entry.slice(0, entry.indexOf('=')),
                entry.slice(entry.indexOf('=') + 1),
              ])
          )
        : keycloak.environment || {}),
      KC_DB_URL: `jdbc:postgresql://${values.host}:${values.port}/${values.dbName}`,
      KC_DB_USERNAME: values.user,
      KC_DB_PASSWORD: values.password,
    };
    const dependencies = { ...(keycloak.depends_on || {}) };
    if (includeLocalDatabase.value) dependencies.db = { condition: 'service_healthy' };
    else delete dependencies.db;
    if (Object.keys(dependencies).length) keycloak.depends_on = dependencies;
    else delete keycloak.depends_on;
  }

  localDockerComposeConfig.value = dockerConfig;
  appStore.setDockerComposeConfig(localDockerComposeConfig);
}

function goNext(): void {
  if (!externalPasswordValid.value) return;
  applyPersistenceSettings();
  navigateTo('/get-started/behaviour/history');
}

function resetToDefaults(): void {
  includeLocalDatabase.value = true;
  postgresHost.value = DEFAULTS.host;
  postgresPort.value = Number(DEFAULTS.port);
  postgresDbName.value = DEFAULTS.dbName;
  postgresUser.value = DEFAULTS.user;
  postgresPassword.value = DEFAULTS.password;
  postgresMaxOpenConnections.value = Number(DEFAULTS.maxOpen);
  postgresMaxIdleConnections.value = Number(DEFAULTS.maxIdle);
  postgresConnectionLifetimeMinutes.value = Number(DEFAULTS.maxLifetimeMinutes);
  postgresConnectionIdleMinutes.value = Number(DEFAULTS.maxIdleTimeMinutes);
  postgresSslMode.value = DEFAULTS.sslMode;
  postgresConnectTimeoutSeconds.value = Number(DEFAULTS.connectTimeoutSeconds);
  postgresSearchPath.value = DEFAULTS.searchPath;
  postgresTimezone.value = DEFAULTS.timezone;
  applyPersistenceSettings();
}
</script>
