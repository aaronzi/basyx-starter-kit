import type { ComposeService } from '@/utils/optionalServices';

export type BrokerKind = 'mqtt' | 'kafka' | 'amqp' | 'none';

export const BROKER_SERVICE_NAMES = ['mqtt', 'kafka', 'kafka-init', 'rabbitmq'];

export function localPostgresService(
  user: string,
  password: string,
  database: string
): ComposeService {
  return {
    container_name: 'postgres_db',
    image: 'postgres:18',
    environment: { POSTGRES_USER: user, POSTGRES_PASSWORD: password, POSTGRES_DB: database },
    command: ['postgres', '-c', 'listen_addresses=*'],
    healthcheck: {
      test: ['CMD-SHELL', 'pg_isready -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'],
      interval: '10s',
      timeout: '5s',
      retries: 5,
    },
    restart: 'unless-stopped',
  };
}

export function localBrokerServices(
  kind: BrokerKind,
  topic = 'basyx.events'
): Record<string, ComposeService> {
  if (kind === 'mqtt') {
    return {
      mqtt: {
        image: 'eclipse-mosquitto:2.0.22',
        ports: ['127.0.0.1:1883:1883'],
        volumes: ['./mosquitto.conf:/mosquitto/config/mosquitto.conf:ro'],
        restart: 'unless-stopped',
      },
    };
  }
  if (kind === 'kafka') {
    return {
      kafka: {
        image: 'apache/kafka:4.1.1',
        environment: {
          KAFKA_NODE_ID: '1',
          KAFKA_PROCESS_ROLES: 'broker,controller',
          KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka:29093',
          KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER',
          KAFKA_LISTENERS: 'INTERNAL://:19092,EXTERNAL://:9092,CONTROLLER://:29093',
          KAFKA_ADVERTISED_LISTENERS: 'INTERNAL://kafka:19092,EXTERNAL://localhost:9092',
          KAFKA_LISTENER_SECURITY_PROTOCOL_MAP:
            'INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT',
          KAFKA_INTER_BROKER_LISTENER_NAME: 'INTERNAL',
          KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: '1',
          KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false',
        },
        ports: ['127.0.0.1:9092:9092'],
        healthcheck: {
          test: [
            'CMD',
            '/opt/kafka/bin/kafka-topics.sh',
            '--bootstrap-server',
            'kafka:19092',
            '--list',
          ],
          interval: '5s',
          timeout: '10s',
          retries: 30,
        },
      },
      'kafka-init': {
        image: 'apache/kafka:4.1.1',
        entrypoint: ['/opt/kafka/bin/kafka-topics.sh'],
        command: [
          '--bootstrap-server',
          'kafka:19092',
          '--create',
          '--if-not-exists',
          '--topic',
          topic,
          '--partitions',
          '3',
          '--replication-factor',
          '1',
        ],
        depends_on: { kafka: { condition: 'service_healthy' } },
      },
    };
  }
  if (kind === 'amqp') {
    return {
      rabbitmq: {
        image: 'rabbitmq:4.2.0-management',
        environment: { RABBITMQ_DEFAULT_USER: 'basyx', RABBITMQ_DEFAULT_PASS: 'basyx-demo' },
        ports: ['127.0.0.1:5672:5672', '127.0.0.1:15672:15672'],
        volumes: [
          './rabbitmq.conf:/etc/rabbitmq/rabbitmq.conf:ro',
          './rabbitmq-definitions.json:/etc/rabbitmq/definitions.json:ro',
        ],
        healthcheck: {
          test: ['CMD', 'rabbitmq-diagnostics', '-q', 'check_running'],
          interval: '5s',
          timeout: '10s',
          retries: 30,
        },
        restart: 'unless-stopped',
      },
    };
  }
  return {};
}

export function localObservabilityServices(
  telemetry = true,
  logs = false
): Record<string, ComposeService> {
  const services: Record<string, ComposeService> = telemetry
    ? {
        'otel-collector': {
          image: 'otel/opentelemetry-collector-contrib:0.157.0',
          command: ['--config=/etc/otelcol-contrib/config.yaml'],
          volumes: ['./otel-collector.yaml:/etc/otelcol-contrib/config.yaml:ro'],
          depends_on: { tempo: { condition: 'service_started' } },
          restart: 'unless-stopped',
        },
        prometheus: {
          image: 'prom/prometheus:v3.13.1',
          command: ['--config.file=/etc/prometheus/prometheus.yml'],
          ports: ['127.0.0.1:9090:9090'],
          volumes: [
            './prometheus.yml:/etc/prometheus/prometheus.yml:ro',
            'prometheus-data:/prometheus',
          ],
          restart: 'unless-stopped',
        },
        tempo: {
          image: 'grafana/tempo:3.0.2',
          command: ['-target=all', '-config.file=/etc/tempo.yaml'],
          ports: ['127.0.0.1:3200:3200'],
          volumes: ['./tempo.yaml:/etc/tempo.yaml:ro', 'tempo-data:/var/tempo'],
          restart: 'unless-stopped',
        },
      }
    : {};
  if (logs) {
    services.loki = {
      image: 'grafana/loki:3.7.4',
      command: ['-config.file=/etc/loki/local-config.yaml'],
      ports: ['127.0.0.1:3100:3100'],
      volumes: ['./loki.yaml:/etc/loki/local-config.yaml:ro'],
      restart: 'unless-stopped',
    };
    services.alloy = {
      image: 'grafana/alloy:v1.18.0',
      command: [
        'run',
        '--server.http.listen-addr=0.0.0.0:12345',
        '--storage.path=/var/lib/alloy',
        '/etc/alloy/config.alloy',
      ],
      volumes: [
        './alloy/config.alloy:/etc/alloy/config.alloy:ro',
        '/var/run/docker.sock:/var/run/docker.sock:ro',
        'alloy-data:/var/lib/alloy',
      ],
      depends_on: { loki: { condition: 'service_started' } },
      restart: 'unless-stopped',
    };
  }
  if (telemetry || logs) {
    services.grafana = {
      image: 'grafana/grafana:13.1.1',
      ports: ['127.0.0.1:3001:3000'],
      environment: {
        GF_AUTH_ANONYMOUS_ENABLED: 'true',
        GF_AUTH_ANONYMOUS_ORG_ROLE: 'Viewer',
        GF_AUTH_DISABLE_LOGIN_FORM: 'true',
      },
      volumes: ['./grafana/provisioning/datasources:/etc/grafana/provisioning/datasources:ro'],
      depends_on: Object.fromEntries(
        [...(telemetry ? ['tempo', 'prometheus'] : []), ...(logs ? ['loki'] : [])].map(name => [
          name,
          { condition: 'service_started' },
        ])
      ),
      restart: 'unless-stopped',
    };
  }
  return services;
}

export const MOSQUITTO_CONFIG = 'listener 1883\nallow_anonymous true\npersistence false\n';
export const RABBITMQ_CONFIG =
  'definitions.import_backend = local_filesystem\ndefinitions.local.path = /etc/rabbitmq/definitions.json\n';
export function rabbitmqDefinitions(address = '/queues/basyx.events'): string {
  const queueName = address.startsWith('/queues/')
    ? address.slice('/queues/'.length)
    : 'basyx.events';
  return JSON.stringify(
    {
      vhosts: [{ name: '/' }],
      queues: [{ name: queueName, vhost: '/', durable: true, auto_delete: false, arguments: {} }],
      users: [
        {
          name: 'basyx',
          password_hash: 'YW1xcIAUfhs7dcFzae7p33b8XgKORYujUq8ItpQTyXkwjEhd',
          hashing_algorithm: 'rabbit_password_hashing_sha256',
          tags: ['administrator'],
        },
      ],
      permissions: [{ user: 'basyx', vhost: '/', configure: '.*', write: '.*', read: '.*' }],
    },
    null,
    2
  );
}

export const OTEL_COLLECTOR_CONFIG = `receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
processors:
  batch:
exporters:
  otlp_grpc/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true
  prometheus:
    endpoint: 0.0.0.0:8889
    resource_to_telemetry_conversion:
      enabled: true
service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp_grpc/tempo]
`;
export const PROMETHEUS_CONFIG = `global:
  scrape_interval: 15s
scrape_configs:
  - job_name: otel-collector
    static_configs:
      - targets: [otel-collector:8889]
`;
export const TEMPO_CONFIG = `stream_over_http_enabled: true
server:
  http_listen_port: 3200
distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
storage:
  trace:
    backend: local
    wal:
      path: /var/tempo/wal
    local:
      path: /var/tempo/blocks
usage_report:
  reporting_enabled: false
`;
export const LOKI_CONFIG = `auth_enabled: false
server:
  http_listen_port: 3100
common:
  path_prefix: /loki
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h
limits_config:
  allow_structured_metadata: true
`;
export const ALLOY_CONFIG = `discovery.docker "local" {
  host = "unix:///var/run/docker.sock"
}
discovery.relabel "basyx_logs" {
  targets = discovery.docker.local.targets
  rule {
    source_labels = ["__meta_docker_container_label_com_eclipse_basyx_observability_logs"]
    regex = "true"
    action = "keep"
  }
  rule {
    source_labels = ["__meta_docker_container_label_com_eclipse_basyx_service_name"]
    target_label = "service_name"
  }
}
loki.source.docker "basyx" {
  host = "unix:///var/run/docker.sock"
  targets = discovery.relabel.basyx_logs.output
  forward_to = [loki.write.local.receiver]
}
loki.write "local" {
  endpoint { url = "http://loki:3100/loki/api/v1/push" }
}
`;
export function grafanaDatasources(telemetry: boolean, logs: boolean): string {
  const entries = [
    ...(telemetry
      ? [
          '  - name: Prometheus\n    type: prometheus\n    access: proxy\n    url: http://prometheus:9090\n    isDefault: true',
          '  - name: Tempo\n    type: tempo\n    access: proxy\n    url: http://tempo:3200',
        ]
      : []),
    ...(logs
      ? ['  - name: Loki\n    type: loki\n    access: proxy\n    url: http://loki:3100']
      : []),
  ];
  return `apiVersion: 1\ndatasources:\n${entries.join('\n')}\n`;
}
