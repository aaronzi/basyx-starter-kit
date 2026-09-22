import { defaultTelegrafConfig, validateTelegrafConfig } from '@/utils/telegrafConfig';

describe('Telegraf TOML configuration', () => {
  it('provides a valid starter with environment-based connection settings', () => {
    const config = defaultTelegrafConfig();
    expect(validateTelegrafConfig(config)).toEqual({});
    expect(config).toContain('${INFLUX_TOKEN}');
    expect(config).toContain('[[inputs.internal]]');
  });

  it('rejects invalid TOML and configurations without input or output plugins', () => {
    expect(validateTelegrafConfig('[[inputs.internal]\n').message).toMatch(/Invalid TOML/);
    expect(validateTelegrafConfig('[[outputs.influxdb_v2]]').message).toMatch(/inputs/);
    expect(validateTelegrafConfig('[[inputs.internal]]').message).toMatch(/outputs/);
  });
});
