// Utilities
import * as yaml from 'js-yaml';
import { defineStore } from 'pinia';
import {
  buildAasEnvironmentExternalUrl,
  buildExternalServiceUrl,
  DEFAULT_AAS_ENVIRONMENT_EXTERNAL_PORT,
  DEFAULT_AAS_UI_EXTERNAL_PORT,
  DEFAULT_EXTERNAL_BASE_URL,
  getExplicitUrlPort,
  getUrlPath,
  joinBaseUrl,
  normalizeExternalBaseUrl,
  replaceExplicitUrlPort,
  replaceUrlPath,
} from '@/utils/externalUrls';

interface ContainerPort {
  id: string;
  port: number | undefined;
}

interface ContainerName {
  id: string;
  name: string | undefined;
}

interface ContextPath {
  id: string;
  contextPath: string | undefined;
}

interface BasyxConfigChild {
  id: string;
  title: string;
  type: string;
}

interface BasyxConfigItem {
  id: string;
  title: string;
  children: BasyxConfigChild[];
}

interface ConfigObject {
  name?: string;
  value?: string | Record<string, unknown>;
}

interface DockerComposeService {
  ports?: string[];
  environment?: Record<string, string> | string[];
}

export interface SerializableStarterState {
  registryIntegration: boolean;
  discoveryIntegration: boolean;
  externalBaseUrl: string;
  mqtt: boolean;
  timeSeriesData: boolean;
  userInterface: boolean;
  dashboard: boolean;
  aasDiscovery: boolean;
  syncBranding: boolean;
  customColor: string;
  lightPrimaryColor: string;
  darkPrimaryColor: string;
  containerPorts: ContainerPort[];
  containerNames: ContainerName[];
  contextPathes: ContextPath[];
  basyxConfig: BasyxConfigItem[];
  dockerComposeConfig?: ConfigObject;
  basyxInfraConfig?: ConfigObject;
}

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isConfigObject(value: unknown): value is ConfigObject {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const config = value as ConfigObject;
  const hasValidName = config.name === undefined || typeof config.name === 'string';
  const hasValidValue =
    config.value === undefined ||
    typeof config.value === 'string' ||
    (typeof config.value === 'object' && config.value !== null);
  return hasValidName && hasValidValue;
}

function isContainerPortArray(value: unknown): value is ContainerPort[] {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        (item.port === undefined || typeof item.port === 'number')
    )
  );
}

function isContainerNameArray(value: unknown): value is ContainerName[] {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        (item.name === undefined || typeof item.name === 'string')
    )
  );
}

function isContextPathArray(value: unknown): value is ContextPath[] {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        (item.contextPath === undefined || typeof item.contextPath === 'string')
    )
  );
}

function isBasyxConfigArray(value: unknown): value is BasyxConfigItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        Array.isArray(item.children)
    )
  );
}

function setOrReplaceEnvVar(env: string[], key: string, value: string): void {
  const prefix = `${key}=`;
  const idx = env.findIndex(item => item.startsWith(prefix));
  if (idx >= 0) {
    env[idx] = `${key}=${value}`;
  } else {
    env.push(`${key}=${value}`);
  }
}

function getContainerPortValue(
  containerPorts: ContainerPort[],
  serviceName: string
): number | undefined {
  return containerPorts.find(item => item.id === serviceName)?.port;
}

function getContextPathValue(
  contextPathes: ContextPath[],
  serviceName: string
): string | undefined {
  return contextPathes.find(item => item.id === serviceName)?.contextPath;
}

function setDockerComposeServicePort(
  services: Record<string, DockerComposeService>,
  serviceName: string,
  port: number | undefined
): void {
  if (!port) {
    return;
  }

  const service = services[serviceName];
  if (!service?.ports || !Array.isArray(service.ports) || service.ports.length === 0) {
    return;
  }

  if (serviceName === 'aas-environment') {
    service.ports[0] = `${port}:${port}`;
    if (service.environment && Array.isArray(service.environment)) {
      setOrReplaceEnvVar(service.environment, 'SERVER_PORT', String(port));
    }
    return;
  }

  const currentMapping = service.ports[0];
  if (!currentMapping) {
    return;
  }
  const parts = currentMapping.split(':');
  const internal = parts.length >= 2 ? parts[1] : String(port);
  service.ports[0] = `${port}:${internal}`;
}

function setDockerComposeServiceContextPath(
  services: Record<string, DockerComposeService>,
  serviceName: string,
  contextPath: string | undefined
): void {
  const service = services[serviceName];
  if (!service) {
    return;
  }

  if (serviceName === 'aas-environment') {
    if (!service.environment || !Array.isArray(service.environment)) {
      service.environment = [];
    }
    if (contextPath) {
      setOrReplaceEnvVar(service.environment, 'SERVER_CONTEXTPATH', contextPath);
    } else {
      service.environment = service.environment.filter(
        entry => !entry.startsWith('SERVER_CONTEXTPATH=')
      );
    }
  }

  if (serviceName === 'aas-ui') {
    if (!service.environment || Array.isArray(service.environment)) {
      service.environment = {};
    }
    if (contextPath) {
      service.environment.BASE_PATH = contextPath;
    } else {
      delete service.environment.BASE_PATH;
    }
  }
}

function createDefaultDockerComposeConfig(
  externalBaseUrl = DEFAULT_EXTERNAL_BASE_URL,
  aasEnvironmentExternalPort = DEFAULT_AAS_ENVIRONMENT_EXTERNAL_PORT,
  aasEnvironmentContextPath?: string
): ConfigObject {
  const aasEnvironmentExternalUrl = buildAasEnvironmentExternalUrl(
    externalBaseUrl,
    aasEnvironmentExternalPort,
    aasEnvironmentContextPath
  );
  return {
    name: 'docker-compose.yml',
    value: {
      services: {
        'aas-environment': {
          container_name: 'aas-environment',
          image: 'eclipsebasyx/aasenvironment-go:latest',
          pull_policy: 'always',
          ports: ['8082:8082'],
          environment: [
            'SERVER_PORT=8082',
            'CORS_ALLOWEDORIGINS=*',
            'CORS_ALLOWEDHEADERS=*',
            'CORS_ALLOWEDCREDENTIALS=true',
            'CORS_ALLOWEDMETHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS',
            'POSTGRES_HOST=db',
            'POSTGRES_PORT=5432',
            'POSTGRES_USER=admin',
            'POSTGRES_PASSWORD=admin123',
            'POSTGRES_DBNAME=basyxTestDB',
            'POSTGRES_MAXOPENCONNECTIONS=500',
            'POSTGRES_MAXIDLECONNECTIONS=500',
            'POSTGRES_CONNMAXLIFETIMEMINUTES=5',
            'JWS_PRIVATEKEYPATH=/app/rsa-key.pem',
            'ABAC_ENABLED=false',
            'GENERAL_AASREGISTRYINTEGRATION=true',
            'GENERAL_SUBMODELREGISTRYINTEGRATION=true',
            'GENERAL_DISCOVERYINTEGRATION=true',
            `GENERAL_EXTERNALURL=${aasEnvironmentExternalUrl}`,
            'GENERAL_AAS_PRECONFIG_PATHS=/app/preconfiguration',
          ],
          volumes: ['./basyx/rsa-key.pem:/app/rsa-key.pem:ro', './aas:/app/preconfiguration:ro'],
          depends_on: {
            basyx_configuration: {
              condition: 'service_completed_successfully',
            },
          },
          restart: 'unless-stopped',
        },
        db: {
          container_name: 'postgres_db',
          image: 'postgres:18',
          environment: {
            POSTGRES_USER: 'admin',
            POSTGRES_PASSWORD: 'admin123',
            POSTGRES_DB: 'basyxTestDB',
          },
          command: ['postgres', '-c', 'listen_addresses=*'],
          healthcheck: {
            test: ['CMD-SHELL', 'pg_isready -U admin -d basyxTestDB'],
            interval: '10s',
            timeout: '5s',
            retries: 5,
          },
          restart: 'unless-stopped',
        },
        basyx_configuration: {
          container_name: 'basyx_configuration',
          image: 'eclipsebasyx/basyxconfigurationservice-go:latest',
          environment: [
            'POSTGRES_HOST=db',
            'POSTGRES_PORT=5432',
            'POSTGRES_USER=admin',
            'POSTGRES_PASSWORD=admin123',
            'POSTGRES_DBNAME=basyxTestDB',
            'POSTGRES_MAXOPENCONNECTIONS=500',
            'POSTGRES_MAXIDLECONNECTIONS=500',
            'POSTGRES_CONNMAXLIFETIMEMINUTES=5',
          ],
          depends_on: {
            db: {
              condition: 'service_healthy',
            },
          },
        },
        'aas-ui': {
          container_name: 'aas-web-ui',
          image: 'eclipsebasyx/aas-gui:latest',
          pull_policy: 'always',
          ports: ['3000:3000'],
          environment: {
            ENDPOINT_CONFIG_AVAILABLE: 'false',
            ALLOW_EDITING: 'true',
            ALLOW_UPLOADING: 'true',
            ALLOW_LOGOUT: 'true',
            SM_VIEWER_EDITOR: 'true',
            START_PAGE_ROUTE_NAME: 'AASViewer',
          },
          volumes: ['./basyx-infra.yml:/basyx-infra.yml:ro'],
          depends_on: {
            'aas-environment': {
              condition: 'service_started',
            },
          },
          restart: 'unless-stopped',
        },
      },
    },
  };
}

function createDefaultInfraConfig(
  externalBaseUrl = DEFAULT_EXTERNAL_BASE_URL,
  aasEnvironmentExternalPort = DEFAULT_AAS_ENVIRONMENT_EXTERNAL_PORT,
  aasEnvironmentContextPath?: string
): ConfigObject {
  const aasEnvironmentExternalUrl = buildAasEnvironmentExternalUrl(
    externalBaseUrl,
    aasEnvironmentExternalPort,
    aasEnvironmentContextPath
  );
  return {
    name: 'basyx-infra.yml',
    value: {
      infrastructures: {
        default: 'infra1',
        infra1: {
          name: 'Minimal BaSyx',
          components: {
            aasDiscovery: {
              baseUrl: joinBaseUrl(aasEnvironmentExternalUrl, 'lookup/shells'),
            },
            aasRegistry: {
              baseUrl: joinBaseUrl(aasEnvironmentExternalUrl, 'shell-descriptors'),
              hasDiscoveryIntegration: true,
            },
            submodelRegistry: {
              baseUrl: joinBaseUrl(aasEnvironmentExternalUrl, 'submodel-descriptors'),
            },
            aasRepository: {
              baseUrl: joinBaseUrl(aasEnvironmentExternalUrl, 'shells'),
              hasRegistryIntegration: true,
            },
            submodelRepository: {
              baseUrl: joinBaseUrl(aasEnvironmentExternalUrl, 'submodels'),
              hasRegistryIntegration: true,
            },
            conceptDescriptionRepository: {
              baseUrl: joinBaseUrl(aasEnvironmentExternalUrl, 'concept-descriptions'),
            },
          },
          security: {
            type: 'none',
          },
        },
      },
    },
  };
}

function initialState() {
  return {
    // feature toggles
    registryIntegration: true,
    discoveryIntegration: true,
    externalBaseUrl: DEFAULT_EXTERNAL_BASE_URL,
    mqtt: false,
    timeSeriesData: false,
    userInterface: true,
    dashboard: false,
    aasDiscovery: true,
    syncBranding: false,

    // design/upload state
    customColor: '',
    lightPrimaryColor: '',
    darkPrimaryColor: '',
    appIcon: undefined as File | undefined,
    logo: undefined as File | undefined,
    logoLight: undefined as File | undefined,
    logoDark: undefined as File | undefined,
    telegrafConf: undefined as File | undefined,
    aasFiles: undefined as File[] | undefined,

    // editable docker settings
    containerPorts: [
      { id: 'aas-environment', port: DEFAULT_AAS_ENVIRONMENT_EXTERNAL_PORT as number | undefined },
      { id: 'aas-ui', port: DEFAULT_AAS_UI_EXTERNAL_PORT as number | undefined },
      { id: 'influxdb', port: 8086 as number | undefined },
    ] as ContainerPort[],
    containerNames: [
      { id: 'aas-environment', name: 'aas-environment' as string | undefined },
      { id: 'db', name: 'postgres_db' as string | undefined },
      { id: 'basyx_configuration', name: 'basyx_configuration' as string | undefined },
      { id: 'aas-ui', name: 'aas-web-ui' as string | undefined },
      { id: 'influxdb', name: 'influxdb' as string | undefined },
      { id: 'telegraf', name: 'telegraf' as string | undefined },
    ] as ContainerName[],
    contextPathes: [
      { id: 'aas-environment', contextPath: undefined as string | undefined },
      { id: 'aas-ui', contextPath: undefined as string | undefined },
    ] as ContextPath[],

    // right-side output tree
    basyxConfig: [
      {
        id: 'comp-aas-environment',
        title: 'AAS Environment',
        children: [
          {
            id: 'ovw-aas-environment-summary',
            title: 'Runtime & Endpoints',
            type: 'overview',
          },
          {
            id: 'ovw-aas-environment-integrations',
            title: 'Integrations',
            type: 'overview',
          },
          {
            id: 'ovw-aas-environment-security',
            title: 'Security',
            type: 'overview',
          },
          { id: 'cfg-aas-environment', title: 'Docker', type: 'config' },
        ],
      },
      {
        id: 'comp-postgres',
        title: 'PostgreSQL',
        children: [
          { id: 'ovw-postgres-summary', title: 'Database Settings', type: 'overview' },
          { id: 'cfg-postgres', title: 'Docker', type: 'config' },
        ],
      },
      {
        id: 'comp-basyx-configuration',
        title: 'Configuration Service',
        children: [
          {
            id: 'ovw-basyx-configuration-summary',
            title: 'Connection Settings',
            type: 'overview',
          },
          {
            id: 'cfg-basyx-configuration',
            title: 'Docker',
            type: 'config',
          },
        ],
      },
      {
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
      },
    ] as BasyxConfigItem[],

    selectedOutput: undefined as BasyxConfigItem | undefined,
    selectedOutputConfig: undefined as ConfigObject | undefined,

    // generated files
    dockerComposeConfig: undefined as ConfigObject | undefined,
    basyxInfraConfig: undefined as ConfigObject | undefined,

    // legacy config slots (kept to avoid breakage while migrating pages)
    aasEnvConfig: undefined as ConfigObject | undefined,
    aasRegistryConfig: undefined as ConfigObject | undefined,
    submodelRegistryConfig: undefined as ConfigObject | undefined,
    aasDiscoveryConfig: undefined as ConfigObject | undefined,
    dashboardConfig: undefined as ConfigObject | undefined,
  };
}

export const useAppStore = defineStore('app', {
  state: initialState,
  getters: {
    getRegistryIntegration: state => state.registryIntegration,
    getDiscoveryIntegration: state => state.discoveryIntegration,
    getExternalBaseUrl: state => state.externalBaseUrl,
    getEffectiveAasEnvironmentExternalUrl: state =>
      buildAasEnvironmentExternalUrl(
        state.externalBaseUrl,
        getContainerPortValue(state.containerPorts, 'aas-environment'),
        getContextPathValue(state.contextPathes, 'aas-environment')
      ),
    getAasWebUiExternalUrl: state =>
      buildExternalServiceUrl(
        state.externalBaseUrl,
        getContainerPortValue(state.containerPorts, 'aas-ui'),
        getContextPathValue(state.contextPathes, 'aas-ui')
      ),
    getAasDiscovery: state => state.aasDiscovery,
    getMQTT: state => state.mqtt,
    getTimeSeriesData: state => state.timeSeriesData,
    getUserInterface: state => state.userInterface,
    getDashboard: state => state.dashboard,
    getSyncBranding: state => state.syncBranding,

    getPrimaryColor: state => state.customColor,
    getPrimaryLightColor: state => state.lightPrimaryColor,
    getPrimaryDarkColor: state => state.darkPrimaryColor,
    getAppIcon: state => state.appIcon,
    getLogo: state => state.logo,
    getLogoLight: state => state.logoLight,
    getLogoDark: state => state.logoDark,
    getTelegrafConf: state => state.telegrafConf,
    getAasFiles: state => state.aasFiles,
    getBasyxConfig: state => state.basyxConfig,
    getSelectedOutput: state => state.selectedOutput,
    getSelectedOutputConfig: state => state.selectedOutputConfig,

    getDockerComposeConfigAsString: state => {
      const dockerComposeConfigObject = { ...state.dockerComposeConfig };
      const yamlDockerComposeString = yaml.dump(dockerComposeConfigObject.value);
      dockerComposeConfigObject.value = yamlDockerComposeString;
      return dockerComposeConfigObject;
    },
    getDockerComposeConfigService: state => (serviceName: string) => {
      const dockerComposeConfigObject = { ...state.dockerComposeConfig };
      if (
        dockerComposeConfigObject.value &&
        typeof dockerComposeConfigObject.value === 'object' &&
        'services' in dockerComposeConfigObject.value
      ) {
        const services = dockerComposeConfigObject.value.services as Record<string, unknown>;
        const service = services[serviceName];
        const servicesString = yaml.dump({ services: { [serviceName]: service } });
        dockerComposeConfigObject.value = servicesString;
      }
      return dockerComposeConfigObject;
    },
    getBasyxInfraConfigAsString: state => {
      const infraConfigObject = { ...state.basyxInfraConfig };
      const yamlInfraString = yaml.dump(infraConfigObject.value);
      infraConfigObject.value = yamlInfraString;
      return infraConfigObject;
    },

    // legacy getters
    getAasEnvConfigAsString: state => {
      const obj = { ...state.aasEnvConfig };
      if (obj.value && typeof obj.value === 'object') {
        let raw = '';
        for (const key in obj.value) {
          raw += `${key}=${obj.value[key]}\n`;
        }
        obj.value = raw;
      }
      return obj;
    },
    getAasRegistryConfigAsString: state => {
      const obj = { ...state.aasRegistryConfig };
      obj.value = yaml.dump(obj.value);
      return obj;
    },
    getSubmodelRegistryConfigAsString: state => {
      const obj = { ...state.submodelRegistryConfig };
      obj.value = yaml.dump(obj.value);
      return obj;
    },
    getAasDiscoveryConfigAsString: state => {
      const obj = { ...state.aasDiscoveryConfig };
      if (obj.value && typeof obj.value === 'object') {
        let raw = '';
        for (const key in obj.value) {
          raw += `${key}=${obj.value[key]}\n`;
        }
        obj.value = raw;
      }
      return obj;
    },
    getDashboardConfigAsString: state => {
      const obj = { ...state.dashboardConfig };
      obj.value = yaml.dump(obj.value);
      return obj;
    },

    getDockerComposeConfig: state => state.dockerComposeConfig,
    getBasyxInfraConfig: state => state.basyxInfraConfig,
    getAasEnvConfig: state => state.aasEnvConfig,
    getAasRegistryConfig: state => state.aasRegistryConfig,
    getSubmodelRegistryConfig: state => state.submodelRegistryConfig,
    getAasDiscoveryConfig: state => state.aasDiscoveryConfig,
    getDashboardConfig: state => state.dashboardConfig,
    getContainerPort: state => (serviceName: string) => {
      const port = state.containerPorts.find(item => item.id === serviceName);
      return port?.port;
    },
    getContainerName: state => (serviceName: string) => {
      const name = state.containerNames.find(item => item.id === serviceName);
      return name?.name;
    },
    getContextPath: state => (serviceName: string) => {
      const contextPath = state.contextPathes.find(item => item.id === serviceName);
      return contextPath?.contextPath;
    },
  },
  actions: {
    updateRegistryIntegration(value: boolean) {
      this.registryIntegration = value;
    },
    updateDiscoveryIntegration(value: boolean) {
      this.discoveryIntegration = value;
    },
    updateExternalBaseUrl(value: string) {
      this.externalBaseUrl = value;
      this.setContextPath('aas-environment', getUrlPath(value));
      const explicitPort = getExplicitUrlPort(value);
      if (explicitPort) {
        this.setContainerPort('aas-environment', explicitPort);
        return;
      }
      this.applyExternalBaseUrlToGeneratedConfigs();
    },
    updateAasDiscovery(value: boolean) {
      this.aasDiscovery = value;
    },
    updateMQTT(value: boolean) {
      this.mqtt = value;
    },
    updateTimeSeriesData(value: boolean) {
      this.timeSeriesData = value;
    },
    updateUserInterface(value: boolean) {
      this.userInterface = value;
    },
    updateDashboard(value: boolean) {
      this.dashboard = value;
    },
    updateSyncBranding(value: boolean) {
      this.syncBranding = value;
    },

    setPrimaryColor(color: string) {
      this.customColor = color;
    },
    setPrimaryLightColor(color: string) {
      this.lightPrimaryColor = color;
    },
    setPrimaryDarkColor(color: string) {
      this.darkPrimaryColor = color;
    },
    setAppIcon(icon: File | undefined) {
      if (icon) {
        const oldFile = icon;
        const newFile = new File([oldFile], 'favicon.ico', { type: oldFile.type });
        this.appIcon = newFile;
      } else {
        this.appIcon = icon;
      }
    },
    setLogo(logo: File | undefined) {
      this.logo = logo;
    },
    setLogoLight(logo: File | undefined) {
      this.logoLight = logo;
    },
    setLogoDark(logo: File | undefined) {
      this.logoDark = logo;
    },
    setTelegrafConf(conf: File | undefined) {
      this.telegrafConf = conf;
    },
    setAasFiles(files: File[] | undefined) {
      this.aasFiles = files;
    },
    updateBasyxConfig(config: BasyxConfigItem[]) {
      this.basyxConfig = config;
    },

    selectOutput(output: BasyxConfigItem) {
      this.selectedOutput = output;
      this.selectedOutputConfig = undefined;
    },

    setDockerComposeConfig(config: ConfigObject) {
      this.dockerComposeConfig = config;
    },
    setBasyxInfraConfig(config: ConfigObject) {
      this.basyxInfraConfig = config;
    },
    initializeStarterDefaults() {
      this.updateUserInterface(true);
      this.externalBaseUrl = normalizeExternalBaseUrl(this.externalBaseUrl);
      const aasEnvironmentExternalPort =
        getContainerPortValue(this.containerPorts, 'aas-environment') ??
        DEFAULT_AAS_ENVIRONMENT_EXTERNAL_PORT;
      const aasEnvironmentContextPath = getContextPathValue(this.contextPathes, 'aas-environment');

      if (!this.dockerComposeConfig?.value) {
        this.setDockerComposeConfig(
          createDefaultDockerComposeConfig(
            this.externalBaseUrl,
            aasEnvironmentExternalPort,
            aasEnvironmentContextPath
          )
        );
      }

      if (!this.basyxInfraConfig?.value) {
        this.setBasyxInfraConfig(
          createDefaultInfraConfig(
            this.externalBaseUrl,
            aasEnvironmentExternalPort,
            aasEnvironmentContextPath
          )
        );
      }
      this.applyExternalBaseUrlToGeneratedConfigs();
    },
    applyExternalBaseUrlToGeneratedConfigs() {
      const externalBaseUrl = buildAasEnvironmentExternalUrl(
        this.externalBaseUrl,
        getContainerPortValue(this.containerPorts, 'aas-environment'),
        getContextPathValue(this.contextPathes, 'aas-environment')
      );

      if (
        this.dockerComposeConfig?.value &&
        typeof this.dockerComposeConfig.value === 'object' &&
        'services' in this.dockerComposeConfig.value
      ) {
        const dockerComposeConfig = { ...this.dockerComposeConfig };
        const services = (dockerComposeConfig.value as { services: Record<string, unknown> })
          .services;
        const aasEnvironment = services['aas-environment'] as
          { environment?: string[] } | undefined;
        if (aasEnvironment?.environment && Array.isArray(aasEnvironment.environment)) {
          setOrReplaceEnvVar(aasEnvironment.environment, 'GENERAL_EXTERNALURL', externalBaseUrl);
          this.setDockerComposeConfig(dockerComposeConfig);
        }
      }

      if (
        this.basyxInfraConfig?.value &&
        typeof this.basyxInfraConfig.value === 'object' &&
        'infrastructures' in this.basyxInfraConfig.value
      ) {
        const basyxInfraConfig = { ...this.basyxInfraConfig };
        const infrastructures = (
          basyxInfraConfig.value as {
            infrastructures: Record<string, unknown>;
          }
        ).infrastructures;
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
        const componentPaths: Record<string, string> = {
          aasDiscovery: 'lookup/shells',
          aasRegistry: 'shell-descriptors',
          submodelRegistry: 'submodel-descriptors',
          aasRepository: 'shells',
          submodelRepository: 'submodels',
          conceptDescriptionRepository: 'concept-descriptions',
        };

        Object.entries(componentPaths).forEach(([componentName, path]) => {
          if (components[componentName]) {
            components[componentName].baseUrl = joinBaseUrl(externalBaseUrl, path);
          }
        });

        infraRecord.components = components;
        infrastructures[defaultKey] = infraRecord;
        basyxInfraConfig.value = { infrastructures };
        this.setBasyxInfraConfig(basyxInfraConfig);
      }
    },
    createSerializableSnapshot(): SerializableStarterState {
      return cloneSerializable({
        registryIntegration: this.registryIntegration,
        discoveryIntegration: this.discoveryIntegration,
        externalBaseUrl: this.externalBaseUrl,
        mqtt: this.mqtt,
        timeSeriesData: this.timeSeriesData,
        userInterface: this.userInterface,
        dashboard: this.dashboard,
        aasDiscovery: this.aasDiscovery,
        syncBranding: this.syncBranding,
        customColor: this.customColor,
        lightPrimaryColor: this.lightPrimaryColor,
        darkPrimaryColor: this.darkPrimaryColor,
        containerPorts: this.containerPorts,
        containerNames: this.containerNames,
        contextPathes: this.contextPathes,
        basyxConfig: this.basyxConfig,
        dockerComposeConfig: this.dockerComposeConfig,
        basyxInfraConfig: this.basyxInfraConfig,
      });
    },
    applySerializableSnapshot(snapshot: unknown) {
      if (!snapshot || typeof snapshot !== 'object') {
        return;
      }

      const data = snapshot as Record<string, unknown>;

      const booleanKeys = [
        'registryIntegration',
        'discoveryIntegration',
        'mqtt',
        'timeSeriesData',
        'userInterface',
        'dashboard',
        'aasDiscovery',
        'syncBranding',
      ] as const;
      booleanKeys.forEach(key => {
        if (typeof data[key] === 'boolean') {
          this[key] = data[key];
        }
      });

      const stringKeys = [
        'externalBaseUrl',
        'customColor',
        'lightPrimaryColor',
        'darkPrimaryColor',
      ] as const;
      stringKeys.forEach(key => {
        if (typeof data[key] === 'string') {
          this[key] = data[key];
        }
      });

      if (isContainerPortArray(data.containerPorts)) {
        this.containerPorts = cloneSerializable(data.containerPorts);
      }
      if (isContainerNameArray(data.containerNames)) {
        this.containerNames = cloneSerializable(data.containerNames);
      }
      if (isContextPathArray(data.contextPathes)) {
        this.contextPathes = cloneSerializable(data.contextPathes);
      }
      if (isBasyxConfigArray(data.basyxConfig)) {
        this.basyxConfig = cloneSerializable(data.basyxConfig);
      }
      if (isConfigObject(data.dockerComposeConfig)) {
        this.dockerComposeConfig = cloneSerializable(data.dockerComposeConfig);
      }
      if (isConfigObject(data.basyxInfraConfig)) {
        this.basyxInfraConfig = cloneSerializable(data.basyxInfraConfig);
      }
      if (typeof data.externalBaseUrl === 'string') {
        this.applyExternalBaseUrlToGeneratedConfigs();
      }
    },

    // legacy setters
    setAasEnvConfig(config: ConfigObject) {
      this.aasEnvConfig = config;
    },
    setAasRegistryConfig(config: ConfigObject) {
      this.aasRegistryConfig = config;
    },
    setSubmodelRegistryConfig(config: ConfigObject) {
      this.submodelRegistryConfig = config;
    },
    setAasDiscoveryConfig(config: ConfigObject) {
      this.aasDiscoveryConfig = config;
    },
    setDashboardConfig(config: ConfigObject) {
      this.dashboardConfig = config;
    },

    setContainerPort(serviceName: string, port: number | undefined) {
      const containerPort = this.containerPorts.find(item => item.id === serviceName);
      if (containerPort) {
        containerPort.port = port;
      }
      if (
        this.dockerComposeConfig?.value &&
        typeof this.dockerComposeConfig.value === 'object' &&
        'services' in this.dockerComposeConfig.value
      ) {
        const dockerComposeConfig = { ...this.dockerComposeConfig };
        const services = (
          dockerComposeConfig.value as { services: Record<string, DockerComposeService> }
        ).services;
        setDockerComposeServicePort(services, serviceName, port);
        this.setDockerComposeConfig(dockerComposeConfig);
      }
      if (serviceName === 'aas-environment') {
        this.externalBaseUrl = replaceExplicitUrlPort(this.externalBaseUrl, port);
        this.applyExternalBaseUrlToGeneratedConfigs();
      }
    },
    setContainerName(serviceName: string, name: string | undefined) {
      const containerName = this.containerNames.find(item => item.id === serviceName);
      if (containerName) {
        containerName.name = name;
      }
    },
    setContextPath(serviceName: string, contextPath: string | undefined) {
      const normalizedContextPath =
        contextPath && contextPath.trim() !== '' ? contextPath.trim() : undefined;
      const contextPathObj = this.contextPathes.find(item => item.id === serviceName);
      if (contextPathObj) {
        contextPathObj.contextPath = normalizedContextPath;
      }
      if (
        this.dockerComposeConfig?.value &&
        typeof this.dockerComposeConfig.value === 'object' &&
        'services' in this.dockerComposeConfig.value
      ) {
        const dockerComposeConfig = { ...this.dockerComposeConfig };
        const services = (
          dockerComposeConfig.value as { services: Record<string, DockerComposeService> }
        ).services;
        setDockerComposeServiceContextPath(services, serviceName, normalizedContextPath);
        this.setDockerComposeConfig(dockerComposeConfig);
      }
      if (serviceName === 'aas-environment') {
        this.externalBaseUrl = replaceUrlPath(this.externalBaseUrl, normalizedContextPath);
        this.applyExternalBaseUrlToGeneratedConfigs();
      }
    },
    reset() {
      Object.assign(this, initialState());
    },
  },
});
